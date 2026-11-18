import { useState } from 'preact/hooks';
import { db } from '../db/db';
import { activeWorkout, exerciseMap, startWorkout } from '../db/queries';
import { daysSince, weekStats } from '../logic/week';
import { applyCatchUp, catchUp, thisWeek, workoutMuscleSets } from '../logic/volume';
import { daySec, trimToBudget } from '../logic/timeMode';
import { checkDeload } from '../logic/deload';
import { secondDayAdjust, yesterdaysWorkouts } from '../logic/backToBack';
import { monthKey, monthLabel, parseMonthKey, shiftMonth } from '../logic/month';
import { MUSCLE_LABELS } from '../logic/muscles';
import { go, useLive } from '../state';
import { unlockAudio } from '../device';
import { Icons, Ring, Segment, Sheet, Switch, fmtNum } from './components';
import { WeekFigure, priorityProgress } from './MuscleMap';
import { DeloadCard, deloadActive } from './Deload';
import type { Exercise, PlanDay, PlanEntry } from '../db/types';

type Budget = 'full' | '60' | '45' | '30';

function names(entries: PlanEntry[], exMap: Map<string, Exercise>): string[] {
  return entries.filter((e) => e.kind !== 'warmup').map((e) => e.kind === 'superset'
    ? (e.children ?? []).map((c) => exMap.get(c.exerciseId ?? '')?.name).join(' + ')
    : exMap.get(e.exerciseId ?? '')?.name ?? '');
}

export function Today() {
  const data = useLive(async () => {
    const [settings, plans, workouts, exMap, active] = await Promise.all([
      db.settings.get('main'), db.plans.toArray(), db.workouts.where('status').equals('done').toArray(), exerciseMap(), activeWorkout(),
    ]);
    const gym = settings ? await db.gyms.get(settings.currentGymId) : undefined;
    return { settings: settings!, plan: plans[0], workouts, exMap, active, gym };
  }, []);
  const [pickDay, setPickDay] = useState(false);
  const [budget, setBudget] = useState<Budget>('full');
  const [useCatchUp, setUseCatchUp] = useState(true);
  const [useB2B, setUseB2B] = useState(true);
  const [lightDay, setLightDay] = useState(false);
  if (!data) return <div class="screen" />;
  const { settings, plan, workouts, exMap, active, gym } = data;
  const stats = weekStats(workouts.map((w) => w.startedAt), settings.weeklyGoal);
  const last = workouts.slice().sort((a, b) => b.startedAt - a.startedAt)[0];
  const since = daysSince(last?.startedAt);
  const day = plan.days[plan.nextDayIndex % plan.days.length];
  const weekDone = thisWeek(workouts);
  const weekSets = workoutMuscleSets(weekDone, exMap);
  const prio = priorityProgress(weekSets);
  const cu = catchUp({ weekDone, plan, exMap, goal: settings.weeklyGoal });
  const deload = checkDeload(workouts, settings.currentGymId, exMap);
  const backupDue = (settings.lastBackupAt ?? settings.installedAt) < Date.now() - 14 * 86400000 && workouts.length > 0;

  /** Einträge für einen Tag: plus Nachholübungen, gekürzt aufs Zeitbudget. */
  const hasCu = !!cu && (cu.add.length > 0 || cu.extra.length > 0);
  // Gestern trainiert? Dann ist heute der zweite Tag in Folge.
  const yesterday = yesterdaysWorkouts(workouts);
  const b2bFor = (d: PlanDay) => secondDayAdjust(d.entries, yesterday, exMap);
  const b2b = b2bFor(day);
  const hasB2B = b2b.changes.length > 0;
  const plannedFor = (d: PlanDay, withCatchUp: boolean) => {
    const adjusted = useB2B ? b2bFor(d).entries : d.entries;
    const base = withCatchUp && cu ? applyCatchUp(adjusted, cu) : adjusted;
    if (budget === 'full') return { entries: base, trim: null };
    const trim = trimToBudget(base, Number(budget), exMap);
    return { entries: trim.entries, trim };
  };
  const preview = plannedFor(day, useCatchUp && hasCu);
  const estimateMin = Math.round(daySec(preview.entries, exMap) / 60 / 5) * 5;

  const start = async (d: PlanDay) => {
    unlockAudio();
    if (active) { go('/training'); return; }
    const withCu = useCatchUp && hasCu && d.id === day.id;
    const p = plannedFor(d, withCu);
    await startWorkout(d, plan.id, {
      entries: p.entries, timeBudgetMin: budget === 'full' ? undefined : Number(budget), catchUp: withCu,
      lightDay, secondDay: useB2B && b2bFor(d).changes.length > 0,
    });
    go('/training');
  };

  return (
    <div class="screen">
      <div class="page-title">
        <div><h1>Heute</h1><p class="sub">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}{gym ? ` · ${gym.name}` : ''}</p></div>
      </div>
      <div class="screen-body">
        {(() => {
          // In der ersten Woche eines Monats: Rückblick auf den Vormonat anbieten
          const now = new Date();
          if (now.getDate() > 7) return null;
          const prev = shiftMonth(monthKey(now), -1);
          const { year, month } = parseMonthKey(prev);
          const had = workouts.some((w) => { const d = new Date(w.startedAt); return d.getFullYear() === year && d.getMonth() === month; });
          return had ? (
            <button class="banner" onClick={() => go(`/monat/${prev}`)}><Icons.progress /><span><b>Dein Rückblick für {monthLabel(prev).split(' ')[0]}</b> ist da.</span></button>
          ) : null;
        })()}
        {backupDue && (
          <button class="banner" onClick={() => go('/einstellungen')}><Icons.info /><span><b>Backup fällig.</b> Dein letztes Backup ist über 2 Wochen her.</span></button>
        )}
        <div class="card">
          <div class="meta" style="margin:0 0 6px">
            <span class="tag accent">{active ? 'Läuft gerade' : 'Als Nächstes'}</span>
            {deloadActive(settings) && <span class="tag">Leichte Woche</span>}
            {since !== null && <span>Zuletzt {since === 0 ? 'heute' : since === 1 ? 'gestern' : `vor ${since} Tagen`} · {last?.dayName}</span>}
          </div>
          <h2 style="font-size:28px">{active ? active.dayName : day.name}</h2>
          <p style="color:var(--muted);font-size:14px;margin-top:6px;line-height:1.4">{(() => { const n = names(preview.entries, exMap); return `${n.slice(0, 4).join(' · ')}${n.length > 4 ? ` · +${n.length - 4} weitere` : ''}`; })()}</p>
          {!active && (
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
              <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="section-label" style="padding:0">Zeit</span><span class="num" style="font-size:13px;color:var(--muted)">etwa {estimateMin} min</span></div>
              <Segment value={budget} options={[{ value: 'full', label: 'Voll' }, { value: '60', label: '60 min' }, { value: '45', label: '45 min' }, { value: '30', label: '30 min' }]} onChange={setBudget} />
              {preview.trim && (preview.trim.removed.length > 0 || preview.trim.reduced.length > 0) && (
                <p style="font-size:13px;color:var(--muted);line-height:1.45">
                  {preview.trim.removed.length > 0 && <>Ohne {preview.trim.removed.map((e) => e.kind === 'warmup' ? 'Aufwärmen' : exMap.get(e.exerciseId ?? '')?.name).join(', ')}. </>}
                  {preview.trim.reduced.length > 0 && <>Weniger Sätze bei {preview.trim.reduced.map((r) => `${exMap.get(r.entry.exerciseId ?? '')?.name ?? 'Supersatz'} (${r.to})`).join(', ')}. </>}
                  Grundübungen sowie Arme und Schultern bleiben.
                  {!preview.trim.fits && <span style="color:var(--warn)"> Kürzer geht es nicht ohne Grundübungen.</span>}
                </p>
              )}
              <div class="row" style="padding:0;min-height:48px">
                <div class="grow">
                  <div class="title" style="font-size:15px">Morgen trainiere ich wieder</div>
                  <div class="sub" style="white-space:normal">{lightDay ? 'Heute nicht steigern, letzter Satz 2 bis 3 Wdh vor dem Versagen' : 'Dann wird heute etwas leichter'}</div>
                </div>
                <Switch on={lightDay} onChange={setLightDay} label="Morgen trainiere ich wieder" />
              </div>
            </div>
          )}
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
            <button class="btn primary" onClick={() => start(day)}><Icons.play /> {active ? 'Training fortsetzen' : 'Training starten'}</button>
            {!active && <button class="btn ghost small" onClick={() => setPickDay(true)}>Anderen Tag wählen</button>}
          </div>
        </div>

        {!active && hasB2B && (
          <div class="card" style="display:flex;flex-direction:column;gap:10px">
            <div class="row" style="padding:0;min-height:44px">
              <div class="grow">
                <h2 style="font-size:18px">Zweiter Tag in Folge</h2>
                <div class="sub" style="white-space:normal">Gestern: {yesterday.map((w) => w.dayName).join(', ')}. Muskeln von gestern werden heute geschont.</div>
              </div>
              <Switch on={useB2B} onChange={setUseB2B} label="Anpassung für den zweiten Tag übernehmen" />
            </div>
            <div class="list" style="background:var(--card2)">
              {b2b.changes.map((c) => (
                <div class="row" style="min-height:44px">
                  <div class="grow">
                    <div class="title" style="font-size:14px;white-space:normal">
                      {c.kind === 'swap' ? `${exMap.get(c.exerciseId)?.name} → ${exMap.get(c.toExerciseId!)?.name}` : `${exMap.get(c.exerciseId)?.name}: ${c.from} → ${c.to} Sätze`}
                    </div>
                    <div class="sub">{c.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!active && cu && (
          <div class="card" style="display:flex;flex-direction:column;gap:10px">
            <h2 style="font-size:18px">Diese Woche fehlt noch</h2>
            <p style="font-size:13px;color:var(--muted);line-height:1.45">
              {cu.sessionsLeft === 1 ? 'Diese Woche ist nur noch eine Einheit drin.' : `Noch ${cu.sessionsLeft} Einheiten diese Woche.`} Auch wenn du die wie geplant machst, fehlen diesen Muskeln Sätze:
            </p>
            <div class="chips" style="margin:0">
              {cu.missing.slice(0, 6).map((m) => <span class="chip" style="padding:6px 10px;font-size:13px">{MUSCLE_LABELS[m.id].replace(/ \(.*\)/, '')} <b class="num">{fmtNum(m.sets)}</b></span>)}
            </div>
            {cu.skipped.length > 0 && <p style="font-size:13px;color:var(--muted)">Beim letzten Mal ausgelassen: {cu.skipped.map((id) => exMap.get(id)?.name).join(', ')}</p>}
            {hasCu && (
              <div class="row" style="padding:0;min-height:48px">
                <div class="grow">
                  <div class="title" style="font-size:15px;white-space:normal">Heute zusätzlich</div>
                  <div class="sub" style="white-space:normal">{[
                    ...cu.extra.map((x) => `${exMap.get(x.exerciseId)?.name} +${x.sets} ${x.sets === 1 ? 'Satz' : 'Sätze'}`),
                    ...cu.add.map((a) => `${exMap.get(a.exerciseId ?? '')?.name} · ${a.sets} Sätze`),
                  ].join(', ')}</div>
                </div>
                <Switch on={useCatchUp} onChange={setUseCatchUp} label="Nachholübungen heute mitmachen" />
              </div>
            )}
          </div>
        )}

        <DeloadCard check={deload} settings={settings} />

        <div class="card" style="display:flex;align-items:center;gap:18px">
          <Ring value={stats.thisWeek} max={stats.goal} label="diese Woche" />
          <div style="flex:1">
            <div style="font-size:13px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em">Serie</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="color:var(--accent)"><Icons.flame /></span><b class="num" style="font-size:34px;font-weight:800;letter-spacing:-.03em">{stats.streakWeeks}</b><span style="color:var(--muted)">{stats.streakWeeks === 1 ? 'Woche' : 'Wochen'}</span></div>
            <p style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.4">
              {stats.goalReachedThisWeek ? 'Wochenziel geschafft. Stark.' : `Noch ${stats.goal - stats.thisWeek} ${stats.goal - stats.thisWeek === 1 ? 'Einheit' : 'Einheiten'} bis zum Wochenziel.`}
            </p>
          </div>
        </div>

        <button class="card" style="display:flex;align-items:center;gap:14px;text-align:left;width:100%" onClick={() => go('/fortschritt')}>
          <WeekFigure sets={weekSets} height={130} />
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em">Muskeln diese Woche</div>
            <p style="font-size:15px;margin-top:6px;line-height:1.4">Arme und Schultern: <b class="num">{prio.ok} von {prio.total}</b> im Ziel</p>
            <p style="font-size:13px;color:var(--accent);margin-top:6px;font-weight:600">Muskelkarte ansehen</p>
          </div>
        </button>

        {pickDay && (
          <Sheet title="Welchen Tag?" onClose={() => setPickDay(false)}>
            <div class="list">
              {plan.days.map((d, i) => (
                <button class="row" onClick={() => { setPickDay(false); start(d); }}>
                  <div class="grow"><div class="title">{d.name}{i === plan.nextDayIndex ? ' · dran' : ''}</div><div class="sub">{d.entries.filter((e) => e.kind !== 'warmup').length} Übungen</div></div>
                  <Icons.chev />
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </div>
    </div>
  );
}

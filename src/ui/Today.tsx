import { useState } from 'preact/hooks';
import { db } from '../db/db';
import { activeWorkout, exerciseMap, startWorkout } from '../db/queries';
import { daysSince, weekStats } from '../logic/week';
import { go, useLive } from '../state';
import { unlockAudio } from '../device';
import { Icons, Ring, Sheet } from './components';
import type { PlanDay } from '../db/types';

export function Today() {
  const data = useLive(async () => {
    const [settings, plans, workouts, exMap, active] = await Promise.all([
      db.settings.get('main'), db.plans.toArray(), db.workouts.where('status').equals('done').toArray(), exerciseMap(), activeWorkout(),
    ]);
    const gym = settings ? await db.gyms.get(settings.currentGymId) : undefined;
    return { settings: settings!, plan: plans[0], workouts, exMap, active, gym };
  }, []);
  const [pickDay, setPickDay] = useState(false);
  if (!data) return <div class="screen" />;
  const { settings, plan, workouts, exMap, active, gym } = data;
  const stats = weekStats(workouts.map((w) => w.startedAt), settings.weeklyGoal);
  const last = workouts.slice().sort((a, b) => b.startedAt - a.startedAt)[0];
  const since = daysSince(last?.startedAt);
  const day = plan.days[plan.nextDayIndex % plan.days.length];
  const names = day.entries.filter((e) => e.kind !== 'warmup').map((e) => e.kind === 'superset' ? (e.children ?? []).map((c) => exMap.get(c.exerciseId ?? '')?.name).join(' + ') : exMap.get(e.exerciseId ?? '')?.name ?? '');
  const backupDue = (settings.lastBackupAt ?? settings.installedAt) < Date.now() - 14 * 86400000 && workouts.length > 0;

  const start = async (d: PlanDay) => {
    unlockAudio();
    if (active) { go('/training'); return; }
    await startWorkout(d, plan.id);
    go('/training');
  };

  return (
    <div class="screen">
      <div class="page-title">
        <div><h1>Heute</h1><p class="sub">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}{gym ? ` · ${gym.name}` : ''}</p></div>
      </div>
      <div class="screen-body">
        {backupDue && (
          <button class="banner" onClick={() => go('/einstellungen')}><Icons.info /><span><b>Backup fällig.</b> Dein letztes Backup ist über 2 Wochen her.</span></button>
        )}
        <div class="card">
          <div class="meta" style="margin:0 0 6px"><span class="tag accent">{active ? 'Läuft gerade' : 'Als Nächstes'}</span>{since !== null && <span>Zuletzt {since === 0 ? 'heute' : since === 1 ? 'gestern' : `vor ${since} Tagen`} · {last?.dayName}</span>}</div>
          <h2 style="font-size:28px">{active ? active.dayName : day.name}</h2>
          <p style="color:var(--muted);font-size:14px;margin-top:6px;line-height:1.4">{names.slice(0, 4).join(' · ')}{names.length > 4 ? ` · +${names.length - 4} weitere` : ''}</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
            <button class="btn primary" onClick={() => start(day)}><Icons.play /> {active ? 'Training fortsetzen' : 'Training starten'}</button>
            {!active && <button class="btn ghost small" onClick={() => setPickDay(true)}>Anderen Tag wählen</button>}
          </div>
        </div>
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

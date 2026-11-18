// Monatsrückblick: Trainings, Wochenziel, Körpergewicht, Muskeln, Fortschritt und Rekorde eines Monats.
import { db } from '../db/db';
import { exerciseMap } from '../db/queries';
import { monthKey, monthLabel, monthReview, shiftMonth } from '../logic/month';
import { fmtDuration } from '../logic/timer';
import { back, go, useLive } from '../state';
import { Icons, TopBar, fmtNum } from './components';
import { MapLegend, WeekFigure, priorityProgress } from './MuscleMap';
import { recordText } from './Summary';

export function MonthReviewScreen(props: { monthKey?: string }) {
  const key = props.monthKey && /^\d{4}-\d{2}$/.test(props.monthKey) ? props.monthKey : monthKey(new Date());
  const data = useLive(async () => {
    const [workouts, bw, settings, exMap] = await Promise.all([db.workouts.toArray(), db.bodyWeights.toArray(), db.settings.get('main'), exerciseMap()]);
    return { r: monthReview(key, workouts, bw, exMap, settings?.weeklyGoal ?? 3) };
  }, [key]);
  const isCurrent = key === monthKey(new Date());
  const nav = (by: number) => go(`/monat/${shiftMonth(key, by)}`);
  if (!data) return <div class="screen"><TopBar title="Monatsrückblick" onBack={back} /></div>;
  const r = data.r;
  const prio = priorityProgress(r.weeklyMuscleSets);
  const diff = r.workouts - r.prevWorkouts;
  return (
    <div class="screen">
      <TopBar title="Monatsrückblick" onBack={back} />
      <div class="screen-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <button class="ib" aria-label="Vormonat" onClick={() => nav(-1)}><Icons.back /></button>
          <h2 style="font-size:22px;font-weight:800;text-align:center">{monthLabel(key)}{isCurrent && <span style="display:block;font-size:12px;color:var(--muted);font-weight:600">bis heute</span>}</h2>
          <button class="ib" aria-label="Nächster Monat" onClick={() => nav(1)} disabled={isCurrent}><Icons.chev /></button>
        </div>

        {r.workouts === 0 ? <p class="empty">In diesem Monat gibt es keine Trainings.</p> : (
          <>
            <div class="stats">
              <div class="stat"><b class="num">{r.workouts}</b><span>Trainings{r.prevWorkouts > 0 || diff !== 0 ? ` · ${diff >= 0 ? '+' : ''}${diff} zum Vormonat` : ''}</span></div>
              <div class="stat"><b class="num">{fmtDuration(r.durationSec)}</b><span>Trainingszeit</span></div>
              <div class="stat"><b class="num">{r.sets}</b><span>Arbeitssätze</span></div>
              <div class="stat"><b class="num">{fmtNum(Math.round(r.volumeKg / 100) / 10)} t</b><span>Bewegtes Gewicht</span></div>
            </div>

            <div class="card" style="display:flex;flex-direction:column;gap:8px">
              <div class="section-label" style="padding:0">Regelmäßigkeit</div>
              <p style="font-size:15px">Wochenziel in <b class="num">{r.weeks.reached} von {r.weeks.total}</b> {r.weeks.total === 1 ? 'Woche' : 'Wochen'} erreicht.</p>
              <div class="chips" style="margin:0">
                {Object.entries(r.byDay).sort().map(([d, n]) => <span class="chip" style="padding:6px 10px;font-size:13px">{d} <b class="num">{n}×</b></span>)}
              </div>
            </div>

            {r.body && (
              <div class="card" style="display:flex;flex-direction:column;gap:6px">
                <div class="section-label" style="padding:0">Körpergewicht</div>
                <p style="font-size:15px" class="num">
                  {fmtNum(r.body.start)} kg → <b>{fmtNum(r.body.end)} kg</b>{' '}
                  <span style={`color:${r.body.change > 0 ? 'var(--good)' : 'var(--muted)'}`}>({r.body.change >= 0 ? '+' : ''}{fmtNum(r.body.change)} kg)</span>
                </p>
                <p style="font-size:13px;color:var(--muted)">Schnitt der ersten und der letzten Woche mit Einträgen. Dein Ziel sind etwa +0,8 kg pro Monat.</p>
              </div>
            )}

            <div class="card" style="display:flex;flex-direction:column;gap:10px">
              <div class="section-label" style="padding:0">Muskeln · Sätze pro Woche im Schnitt</div>
              <div style="display:flex;justify-content:center"><WeekFigure sets={r.weeklyMuscleSets} height={260} label /></div>
              <MapLegend />
              <p style="font-size:14px">Arme und Schultern: <b class="num">{prio.ok} von {prio.total}</b> im Schnitt im Ziel.</p>
            </div>

            {r.improvements.length > 0 && (
              <>
                <div class="section-label">Besser geworden</div>
                <div class="list">
                  {r.improvements.map((i) => (
                    <button class="row" onClick={() => go(`/uebung/${i.exerciseId}`)}>
                      <div class="grow">
                        <div class="title">{i.name}</div>
                        <div class="sub num">{fmtNum(i.from)} → {fmtNum(i.to)} {i.unit}{i.unit === 'kg' ? ' geschätztes Maximum' : ''}</div>
                      </div>
                      <b class="num" style="color:var(--good)">+{fmtNum(i.pct)} %</b>
                    </button>
                  ))}
                </div>
              </>
            )}

            {r.records.length > 0 && (
              <>
                <div class="section-label">Rekorde</div>
                <div class="list">
                  {r.records.map((rec) => (
                    <div class="record"><span class="medal"><Icons.trophy /></span><div class="grow"><div style="font-weight:600">{rec.exerciseName}</div><div style="color:var(--muted);font-size:13px">{recordText(rec)}</div></div></div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

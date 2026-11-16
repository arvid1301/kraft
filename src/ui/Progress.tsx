import { useState } from 'preact/hooks';
import { db } from '../db/db';
import { trend, weeklyAverages } from '../logic/bodyweight';
import { bestsFromHistory } from '../logic/records';
import { isoDate } from '../logic/week';
import { toast, useLive } from '../state';
import { Icons, Sheet, Stepper, fmtNum } from './components';

export function Progress() {
  const data = useLive(async () => {
    const [bw, settings, workouts, exercises] = await Promise.all([db.bodyWeights.orderBy('date').toArray(), db.settings.get('main'), db.workouts.where('status').equals('done').toArray(), db.exercises.toArray()]);
    return { bw, settings: settings!, workouts, exercises };
  }, []);
  const [entering, setEntering] = useState(false);
  const [kg, setKg] = useState(70);
  if (!data) return <div class="screen" />;
  const { bw, settings, workouts, exercises } = data;
  const t = trend(bw, settings.targetKg, settings.ratePerWeek);
  const weeks = weeklyAverages(bw).slice(-8);
  const today = isoDate();
  const todayEntry = bw.find((b) => b.date === today);
  const latest = bw[bw.length - 1];
  const bests = bestsFromHistory(workouts, settings.currentGymId);
  const min = Math.min(...weeks.map((w) => w.avg), 999), max = Math.max(...weeks.map((w) => w.avg), 0);

  const open = () => { setKg(todayEntry?.kg ?? latest?.kg ?? 70); setEntering(true); };
  const save = async () => {
    await db.bodyWeights.put({ id: today, date: today, kg });
    setEntering(false); toast('Gewicht gespeichert');
  };

  return (
    <div class="screen">
      <div class="page-title"><div><h1>Fortschritt</h1><p class="sub">Ziel {fmtNum(settings.targetKg)} kg · +{fmtNum(settings.ratePerWeek)} kg pro Woche</p></div></div>
      <div class="screen-body">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div>
              <div class="section-label" style="padding:0">Körpergewicht</div>
              <div class="hero-num num" style="margin-top:6px">{latest ? fmtNum(latest.kg) : '–'}<span style="font-size:18px;color:var(--muted);font-weight:600"> kg</span></div>
              <p style="color:var(--muted);font-size:13px;margin-top:4px">{latest ? `${todayEntry ? 'heute' : `zuletzt ${new Date(latest.date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`}` : 'Noch kein Eintrag'}</p>
            </div>
            <button class="btn primary small" onClick={open}><Icons.plus size={16} /> {todayEntry ? 'Ändern' : 'Heute eintragen'}</button>
          </div>
          {weeks.length > 0 && (
            <div class="bars" aria-label="Wochenschnitt der letzten Wochen">
              {weeks.map((w) => {
                const h = max > min ? 20 + ((w.avg - min) / (max - min)) * 70 : 50;
                return <div class="bar"><b class="num">{fmtNum(w.avg)}</b><i style={`height:${h}%`} /><small>{w.week.slice(8, 10)}.{w.week.slice(5, 7)}.</small></div>;
              })}
            </div>
          )}
          {t.current !== undefined && (
            <p style="font-size:14px;margin-top:12px;line-height:1.45">
              Wochenschnitt <b class="num">{fmtNum(t.current)} kg</b>
              {t.perWeek !== undefined && <> · Trend <b class="num" style={t.perWeek >= settings.ratePerWeek * 0.75 ? 'color:var(--good)' : 'color:var(--warn)'}>{t.perWeek >= 0 ? '+' : ''}{fmtNum(t.perWeek)} kg</b> pro Woche</>}
              {t.weeksToTarget !== undefined && <span style="color:var(--muted)"> · bei Plan noch etwa {t.weeksToTarget} Wochen bis {fmtNum(settings.targetKg)} kg</span>}
            </p>
          )}
          {t.stalled && <div class="banner" style="margin-top:12px"><Icons.info /><span>{t.hint}</span></div>}
          {bw.length > 0 && bw.length < 7 && <p style="color:var(--muted);font-size:13px;margin-top:10px">Tipp: morgens nach dem Aufstehen wiegen, dann schwankt es am wenigsten.</p>}
        </div>

        <div class="section-label">Bestwerte an diesem Gym</div>
        {bests.size === 0 ? <p class="empty">Nach dem ersten Training erscheinen hier deine Bestwerte je Übung.</p> : (
          <div class="list">
            {[...bests.entries()].map(([id, b]) => {
              const ex = exercises.find((e) => e.id === id); if (!ex) return null;
              const text = ex.input === 'kg' || ex.input === 'bodyweight'
                ? `${ex.input === 'bodyweight' && !b.weight ? 'Körpergewicht' : `${fmtNum(b.weight)} kg`}${b.weightReps ? ` × ${b.weightReps}` : ''}${b.e1rm ? ` · max. ca. ${fmtNum(b.e1rm)} kg` : ''}`
                : ex.input === 'time' ? `${b.timeSec} s` : `${b.reps} Wdh`;
              return <div class="row"><div class="grow"><div class="title">{ex.name}</div><div class="sub">{text}</div></div><span class="medal" style="width:32px;height:32px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center"><Icons.trophy size={16} /></span></div>;
            })}
          </div>
        )}
        {entering && (
          <Sheet title="Körpergewicht heute" onClose={() => setEntering(false)}>
            <Stepper label="Morgens, nüchtern" unit="kg" value={kg} step={0.1} min={30} max={200} format={(v) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} onChange={setKg} />
            <button class="btn primary" onClick={save}>Speichern</button>
          </Sheet>
        )}
      </div>
    </div>
  );
}

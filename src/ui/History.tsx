import { useState } from 'preact/hooks';
import { db } from '../db/db';
import type { Workout } from '../db/types';
import { monthGrid, monthKey, monthLabel, parseMonthKey, shiftMonth, weekReached } from '../logic/month';
import { entryName, exerciseMap } from '../db/queries';
import { fmtDuration } from '../logic/timer';
import { allEntries } from '../logic/records';
import { back, go, useLive } from '../state';
import { Icons, TopBar, fmtNum } from './components';
import { lastText } from './Workout';
import { recordText } from './Summary';

export function History() {
  const data = useLive(async () => {
    const [workouts, gyms, settings] = await Promise.all([db.workouts.where('status').equals('done').toArray(), db.gyms.toArray(), db.settings.get('main')]);
    return { workouts: workouts.sort((a, b) => b.startedAt - a.startedAt), gyms: new Map(gyms.map((g) => [g.id, g.name])), goal: settings?.weeklyGoal ?? 3 };
  }, []);
  const [shown, setShown] = useState(monthKey(new Date()));
  if (!data) return <div class="screen" />;
  const { year, month } = parseMonthKey(shown);
  const inShown = data.workouts.filter((w) => { const d = new Date(w.startedAt); return d.getFullYear() === year && d.getMonth() === month; });
  return (
    <div class="screen">
      <div class="page-title"><div><h1>Verlauf</h1><p class="sub">{data.workouts.length} {data.workouts.length === 1 ? 'Training' : 'Trainings'} insgesamt</p></div></div>
      <div class="screen-body">
        <Calendar monthKey={shown} workouts={data.workouts} goal={data.goal} onMonth={setShown} />
        <button class="card" style="display:flex;align-items:center;gap:12px;text-align:left;width:100%" onClick={() => go(`/monat/${shown}`)}>
          <span class="medal" style="width:40px;height:40px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:none"><Icons.progress /></span>
          <div class="grow"><div class="title" style="font-weight:700">Monatsrückblick {monthLabel(shown).split(' ')[0]}</div><div class="sub" style="color:var(--muted);font-size:13px">Trainings, Rekorde, Gewicht, Muskeln</div></div>
          <Icons.chev />
        </button>
        {data.workouts.length === 0 && <p class="empty">Noch kein Training gespeichert. Dein erstes wartet unter „Heute“.</p>}
        {data.workouts.length > 0 && inShown.length === 0 && <p class="empty">In {monthLabel(shown)} gibt es keine Trainings.</p>}
        {inShown.length > 0 && (
          <div class="list">
            {inShown.map((w) => (
              <button class="row" onClick={() => go(`/verlauf/${w.id}`)}>
                <div class="grow">
                  <div class="title">{w.dayName} · {new Date(w.startedAt).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div class="sub">{w.summary ? `${fmtDuration(w.summary.durationSec)} · ${w.summary.workingSets} Sätze · ${fmtNum(w.summary.volumeKg)} kg` : ''}{w.summary?.records.length ? ` · ${w.summary.records.length} Rekord${w.summary.records.length > 1 ? 'e' : ''}` : ''} · {data.gyms.get(w.gymId) ?? 'Gym'}</div>
                </div>
                <Icons.chev />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function Calendar(props: { monthKey: string; workouts: Workout[]; goal: number; onMonth: (k: string) => void }) {
  const { year, month } = parseMonthKey(props.monthKey);
  const grid = monthGrid(year, month);
  const today = new Date();
  const isCurrent = props.monthKey === monthKey(today);
  const byDay = new Map<string, Workout[]>();
  for (const w of props.workouts) {
    const d = new Date(w.startedAt);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(k, [...(byDay.get(k) ?? []), w]);
  }
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return (
    <div class="card cal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <button class="ib plain" aria-label="Vormonat" onClick={() => props.onMonth(shiftMonth(props.monthKey, -1))}><Icons.back /></button>
        <b style="font-size:17px">{monthLabel(props.monthKey)}</b>
        <button class="ib plain" aria-label="Nächster Monat" onClick={() => props.onMonth(shiftMonth(props.monthKey, 1))} disabled={isCurrent}><Icons.chev /></button>
      </div>
      <div class="cal-grid" role="grid" aria-label={`Trainings im ${monthLabel(props.monthKey)}`}>
        {WEEKDAYS.map((d) => <span class="cal-head">{d}</span>)}
        <span class="cal-head" aria-label="Wochenziel">Ziel</span>
        {grid.map((week) => {
          const monday = week.find(Boolean)!;
          const mon = new Date(monday); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
          const started = mon <= today;
          const reached = started && weekReached(mon, props.workouts, props.goal);
          return (
            <>
              {week.map((d) => {
                if (!d) return <span />;
                const ws = byDay.get(keyOf(d)) ?? [];
                const isToday = keyOf(d) === keyOf(today);
                const letter = ws.length ? ws.map((w) => w.dayName.replace('Tag ', '')).join('') : '';
                const label = `${d.getDate()}. ${ws.length ? ws.map((w) => w.dayName).join(' und ') : 'kein Training'}`;
                return ws.length ? (
                  <button class={`cal-day on ${isToday ? 'today' : ''}`} aria-label={label} onClick={() => go(`/verlauf/${ws[0].id}`)}>
                    <span class="d">{d.getDate()}</span><span class="t">{letter}</span>
                  </button>
                ) : (
                  <span class={`cal-day ${isToday ? 'today' : ''} ${d > today ? 'future' : ''}`} aria-label={label}><span class="d">{d.getDate()}</span></span>
                );
              })}
              <span class="cal-goal" aria-label={reached ? 'Wochenziel erreicht' : 'Wochenziel nicht erreicht'}>{reached ? <Icons.check size={16} /> : ''}</span>
            </>
          );
        })}
      </div>
    </div>
  );
}

export function WorkoutDetail(props: { id: string }) {
  const data = useLive(async () => ({ w: await db.workouts.get(props.id), exMap: await exerciseMap() }), [props.id]);
  if (!data) return <div class="screen" />;
  const { w, exMap } = data;
  if (!w) return <div class="screen"><TopBar title="Training" onBack={back} /><p class="empty">Nicht gefunden.</p></div>;
  const del = async () => {
    if (!confirmDelete()) return;
    await db.workouts.delete(w.id); back();
  };
  return (
    <div class="screen">
      <TopBar title={`${w.dayName} · ${new Date(w.startedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`} onBack={back} right={<button class="ib plain" aria-label="Löschen" onClick={del}><Icons.trash /></button>} />
      <div class="screen-body">
        {w.summary && (
          <div class="stats">
            <div class="stat"><b class="num">{fmtDuration(w.summary.durationSec)}</b><span>Dauer</span></div>
            <div class="stat"><b class="num">{w.summary.workingSets}</b><span>Arbeitssätze</span></div>
            <div class="stat" style="grid-column:1/-1"><b class="num">{fmtNum(w.summary.volumeKg)} kg</b><span>Bewegtes Gesamtgewicht</span></div>
          </div>
        )}
        {w.summary?.records.length ? (
          <div class="list">{w.summary.records.map((r) => <div class="record"><span class="medal"><Icons.trophy /></span><div class="grow"><div style="font-weight:600">{r.exerciseName}</div><div style="color:var(--muted);font-size:13px">{recordText(r)}</div></div></div>)}</div>
        ) : null}
        <div class="list">
          {allEntries(w).map((e) => {
            const ex = exMap.get(e.exerciseId ?? '');
            const done = e.sets.filter((s) => s.done && !s.warmup);
            return (
              <div class="row" style={e.skipped || done.length === 0 ? 'opacity:.5' : ''}>
                <div class="grow">
                  <div class="title">{entryName(e, exMap)}</div>
                  <div class="sub">{e.skipped ? 'Übersprungen' : done.length === 0 ? 'Nicht gemacht' : ex ? lastText(ex, done) : `${done.length} Sätze`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function confirmDelete(): boolean {
  // Der Browser-Dialog ist hier bewusst in Ordnung: Löschen ist selten.
  return window.confirm('Dieses Training endgültig löschen?');
}

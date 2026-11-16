import { useEffect, useState } from 'preact/hooks';
import type { Exercise, Workout } from '../db/types';
import { fmtDuration } from '../logic/timer';
import { reduceMotion } from '../state';
import { Confetti, Icons, fmtNum } from './components';

export function Summary(props: { workout: Workout; exMap: Map<string, Exercise>; onDone: () => void }) {
  const s = props.workout.summary!;
  const [party, setParty] = useState(false);
  useEffect(() => {
    if (s.records.length && !reduceMotion()) { setParty(true); const t = setTimeout(() => setParty(false), 2600); return () => clearTimeout(t); }
  }, []);
  return (
    <div class="screen">
      {party && <Confetti />}
      <div class="page-title"><div><h1>Geschafft</h1><p class="sub">{props.workout.dayName} · {new Date(props.workout.startedAt).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
      <div class="screen-body no-tabs">
        <div class="stats">
          <div class="stat"><b class="num">{fmtDuration(s.durationSec)}</b><span>Dauer</span></div>
          <div class="stat"><b class="num">{s.workingSets}</b><span>Arbeitssätze</span></div>
          <div class="stat" style="grid-column:1/-1"><b class="num">{fmtNum(s.volumeKg)} kg</b><span>Bewegtes Gesamtgewicht</span></div>
        </div>
        {s.records.length > 0 ? (
          <>
            <div class="section-label">Neue Rekorde</div>
            <div class="list">
              {s.records.map((r) => (
                <div class="record">
                  <span class="medal"><Icons.trophy /></span>
                  <div class="grow"><div class="title" style="font-weight:600">{r.exerciseName}</div><div class="sub" style="color:var(--muted);font-size:13px">{recordText(r)}</div></div>
                </div>
              ))}
            </div>
          </>
        ) : <p class="empty">Keine neuen Rekorde heute. Dranbleiben zählt.</p>}
        <button class="btn primary" onClick={props.onDone}>Fertig</button>
      </div>
    </div>
  );
}

export function recordText(r: { kind: string; value: number; reps?: number; previous?: number }): string {
  if (r.kind === 'weight') return `${fmtNum(r.value)} kg${r.reps ? ` × ${r.reps}` : ''} (vorher ${fmtNum(r.previous ?? 0)} kg)`;
  if (r.kind === 'e1rm') return `Geschätztes Maximum ${fmtNum(r.value)} kg (vorher ${fmtNum(r.previous ?? 0)} kg)`;
  if (r.kind === 'time') return `${r.value} Sekunden (vorher ${r.previous ?? 0})`;
  return `${r.value} Wiederholungen (vorher ${r.previous ?? 0})`;
}

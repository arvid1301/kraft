// Verlauf einer Übung an einem Gym: Diagramm des besten Werts je Training und Liste aller Sätze.
import { useState } from 'preact/hooks';
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from '../db/types';
import { exerciseHistory } from '../db/queries';
import { sessionValue } from '../logic/deload';
import { FEEL_LABEL } from '../logic/progression';
import { useLive } from '../state';
import { fmtNum } from './components';

function metricOf(ex: Exercise): { label: string; unit: string } {
  switch (ex.input) {
    case 'kg': return { label: 'Geschätztes Maximum', unit: 'kg' };
    case 'bodyweight': return { label: 'Geschätztes Maximum inkl. Körpergewicht', unit: 'kg' };
    case 'time': return { label: 'Längste Zeit', unit: 's' };
    default: return { label: 'Beste Wiederholungen', unit: 'Wdh' };
  }
}

function setText(ex: Exercise, s: WorkoutSet): string {
  switch (ex.input) {
    case 'kg': return `${fmtNum(s.weight ?? 0)} × ${s.reps ?? 0}`;
    case 'bodyweight': return s.weight ? `${s.weight > 0 ? '+' : ''}${fmtNum(s.weight)} kg × ${s.reps ?? 0}` : `${s.reps ?? 0} Wdh`;
    case 'trx': return `Füße ${s.trxPos ?? '-'}, Hilfe ${s.trxHelp ?? '-'} × ${s.reps ?? 0}`;
    case 'time': return `${s.side === 'L' ? 'L ' : s.side === 'R' ? 'R ' : ''}${s.timeSec ?? 0} s`;
    default: return `${s.reps ?? 0}`;
  }
}

/** Schöne Rasterwerte für die Y-Achse. */
function niceTicks(min: number, max: number, count = 3): number[] {
  if (max === min) { max = min + 1; min = Math.max(0, min - 1); }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function Chart(props: { points: { t: number; v: number }[]; unit: string; selected: number; onSelect: (i: number) => void }) {
  const W = 340, H = 150, L = 34, R = 10, T = 10, B = 24;
  const pts = props.points;
  const ticks = niceTicks(Math.min(...pts.map((p) => p.v)), Math.max(...pts.map((p) => p.v)));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t: number) => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1).toFixed(1)} ${H - B} L${x(t0).toFixed(1)} ${H - B} Z`;
  const fmtD = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const sel = pts[props.selected];
  return (
    <svg class="hist-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verlauf über ${pts.length} Trainings`}>
      {ticks.map((v) => (
        <g>
          <line class="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text class="axis" x={L - 6} y={y(v) + 4} text-anchor="end">{fmtNum(v)}</text>
        </g>
      ))}
      <path class="area" d={area} />
      <path class="line" d={line} />
      {sel && <line x1={x(sel.t)} x2={x(sel.t)} y1={T} y2={H - B} stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" />}
      {pts.map((p, i) => <circle class="dot" cx={x(p.t)} cy={y(p.v)} r={i === props.selected ? 6 : 4} />)}
      {pts.map((p, i) => {
        // Trefferfläche größer als der Punkt
        const prev = i ? x(pts[i - 1].t) : L, next = i < pts.length - 1 ? x(pts[i + 1].t) : W - R;
        const a = i ? (prev + x(p.t)) / 2 : L, b = i < pts.length - 1 ? (x(p.t) + next) / 2 : W - R;
        return <rect class="hit" x={a} y={T} width={Math.max(1, b - a)} height={H - T - B} onClick={() => props.onSelect(i)}><title>{`${fmtD(p.t)}: ${fmtNum(p.v)} ${props.unit}`}</title></rect>;
      })}
      <text class="axis" x={L} y={H - 6} text-anchor="start">{fmtD(t0)}</text>
      {t1 !== t0 && <text class="axis" x={W - R} y={H - 6} text-anchor="end">{fmtD(t1)}</text>}
    </svg>
  );
}

export function ExerciseHistory(props: { exercise: Exercise; gymId: string }) {
  const ex = props.exercise;
  const hist = useLive(() => exerciseHistory(props.gymId, ex.id), [props.gymId, ex.id]);
  const [sel, setSel] = useState<number | null>(null);
  if (!hist) return null;
  if (hist.length === 0) return <p class="empty">Noch keine Trainings mit dieser Übung an diesem Gym.</p>;
  const metric = metricOf(ex);
  const chrono = [...hist].reverse();
  const points = chrono.map((h: { workout: Workout; entry: WorkoutEntry }) => ({ t: h.workout.startedAt, v: Math.round(sessionValue(h.entry, ex, h.workout.bodyWeightKg ?? 70) * 10) / 10 }));
  const selected = sel ?? points.length - 1;
  const p = points[selected];
  return (
    <div style="display:flex;flex-direction:column;gap:12px">
      {points.length >= 2 && (
        <div class="card pad-sm" style="background:var(--card2)">
          <div style="font-size:12px;color:var(--muted);font-weight:600">{metric.label}</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin:2px 0 6px">
            <b class="num" style="font-size:26px;font-weight:800;letter-spacing:-.02em">{fmtNum(p.v)} <span style="font-size:14px;color:var(--muted);font-weight:600">{metric.unit}</span></b>
            <span style="font-size:13px;color:var(--muted)">{new Date(p.t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</span>
          </div>
          <Chart points={points} unit={metric.unit} selected={selected} onSelect={setSel} />
        </div>
      )}
      <div class="list">
        {hist.map((h) => {
          const sets = h.entry.sets.filter((s) => s.done && !s.warmup);
          return (
            <div class="row" style="align-items:flex-start">
              <div class="num" style="font-size:13px;color:var(--muted);width:58px;flex:none;padding-top:2px;white-space:nowrap">{new Date(h.workout.startedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}{h.workout.deload ? <div style="font-size:11px">leicht</div> : null}</div>
              <div class="grow" style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:14px">
                {sets.map((s) => (
                  <span class="num" style="white-space:nowrap">
                    {setText(ex, s)}
                    {s.feel && <span style="color:var(--muted);font-size:12px"> {FEEL_LABEL[s.feel]}</span>}
                    {s.complaint && <span style="color:var(--bad);font-size:12px"> {s.complaint}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

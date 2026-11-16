// Körperfigur von vorne und hinten. Muskeln leuchten je nach Rolle unterschiedlich stark.
import { MUSCLE_LABELS, type MuscleId, type Role } from '../logic/muscles';

type Shape = { id: MuscleId; d: string; view: 'front' | 'back' };

// Alle Formen für die linke Körperhälfte (x < 100), die rechte wird gespiegelt. Koordinatenraum je Ansicht 0..200 x 0..300.
const SHAPES: { id: MuscleId; view: 'front' | 'back'; d: string; mirror?: boolean }[] = [
  // ---- Vorne ----
  { id: 'traps', view: 'front', d: 'M93 44 L73 56 Q84 52 95 54 Z', mirror: true },
  { id: 'front_delts', view: 'front', d: 'M62 58 Q74 52 84 60 Q82 74 70 78 Q58 72 62 58 Z', mirror: true },
  { id: 'side_delts', view: 'front', d: 'M54 66 Q58 56 64 58 Q60 70 60 80 Q52 76 54 66 Z', mirror: true },
  { id: 'chest', view: 'front', d: 'M72 62 Q86 58 99 62 L99 92 Q84 98 74 90 Q66 76 72 62 Z', mirror: true },
  { id: 'biceps', view: 'front', d: 'M56 82 Q66 80 68 90 L62 120 Q54 124 50 116 Z', mirror: true },
  { id: 'forearms', view: 'front', d: 'M50 122 Q58 118 62 124 L56 162 Q50 166 46 160 Z', mirror: true },
  { id: 'abs', view: 'front', d: 'M88 96 L99 96 L99 142 Q92 146 88 140 Z', mirror: true },
  { id: 'obliques', view: 'front', d: 'M74 94 Q82 98 86 100 L86 138 Q80 136 76 128 Q72 112 74 94 Z', mirror: true },
  { id: 'adductors', view: 'front', d: 'M92 160 L99 160 L99 206 Q95 208 92 200 Z', mirror: true },
  { id: 'quads', view: 'front', d: 'M72 156 L90 158 L92 212 Q84 228 76 222 Q66 200 72 156 Z', mirror: true },
  { id: 'calves', view: 'front', d: 'M74 232 Q84 228 90 234 L88 272 Q82 280 76 272 Z', mirror: true },
  // ---- Hinten ----
  { id: 'traps', view: 'back', d: 'M99 42 L72 60 Q86 74 94 96 L99 96 Z', mirror: true },
  { id: 'rear_delts', view: 'back', d: 'M56 60 Q66 52 76 60 Q76 74 66 80 Q54 76 56 60 Z', mirror: true },
  { id: 'upper_back', view: 'back', d: 'M72 62 Q82 72 92 98 L80 100 Q70 86 72 62 Z', mirror: true },
  { id: 'lats', view: 'back', d: 'M70 92 Q84 100 96 100 L99 100 L99 134 Q90 142 86 140 Q76 124 70 92 Z', mirror: true },
  { id: 'lower_back', view: 'back', d: 'M88 128 L99 128 L99 156 L90 156 Q86 142 88 128 Z', mirror: true },
  { id: 'triceps', view: 'back', d: 'M54 80 Q64 78 68 86 L62 120 Q54 124 50 114 Z', mirror: true },
  { id: 'forearms', view: 'back', d: 'M50 122 Q58 118 62 124 L56 162 Q50 166 46 160 Z', mirror: true },
  { id: 'glutes', view: 'back', d: 'M74 154 Q92 150 99 158 L99 182 Q86 190 74 180 Q68 166 74 154 Z', mirror: true },
  { id: 'hamstrings', view: 'back', d: 'M72 186 L96 186 L94 226 Q84 236 76 226 Q68 206 72 186 Z', mirror: true },
  { id: 'calves', view: 'back', d: 'M72 232 Q84 226 92 234 L90 272 Q82 282 74 272 Z', mirror: true },
];

const SILHOUETTE = [
  'M100 10 a16 16 0 1 0 0.01 0 Z',                                   // Kopf
  'M92 40 L108 40 L108 50 L92 50 Z',                                 // Hals
  'M60 56 L140 56 L136 100 L130 150 L70 150 L64 100 Z',              // Rumpf
  'M50 60 L72 60 L66 160 L46 160 Z', 'M128 60 L150 60 L154 160 L134 160 Z', // Arme
  'M66 150 L134 150 L130 236 L120 236 L118 284 L104 284 L100 236 L96 284 L82 284 L80 236 L70 236 Z', // Beine
];

function fill(role: Role | undefined): string {
  if (role === 3) return 'var(--accent)';
  if (role === 2) return 'rgba(255,107,26,.6)';
  if (role === 1) return 'rgba(255,107,26,.3)';
  return 'var(--card3)';
}

export function MuscleFigure(props: { roles: Partial<Record<MuscleId, Role>>; height?: number; onTap?: (id: MuscleId) => void; label?: boolean }) {
  const h = props.height ?? 160;
  const w = h * (400 / 300);
  const render = (view: 'front' | 'back', dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      {SILHOUETTE.map((d) => <path d={d} fill="var(--card2)" />)}
      {SHAPES.filter((s) => s.view === view).flatMap((s) => {
        const role = props.roles[s.id];
        const common = { fill: fill(role), stroke: 'var(--card)', 'stroke-width': 1, style: props.onTap ? 'cursor:pointer' : '', onClick: props.onTap ? () => props.onTap!(s.id) : undefined };
        const el = [<path d={s.d} {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>];
        if (s.mirror) el.push(<path d={s.d} transform="translate(200 0) scale(-1 1)" {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>);
        return el;
      })}
      {props.label && <text x="100" y="296" text-anchor="middle" font-size="12" fill="var(--muted)" font-weight="600">{view === 'front' ? 'Vorne' : 'Hinten'}</text>}
    </g>
  );
  return (
    <svg viewBox="0 0 400 300" width={w} height={h} role="img" aria-label="Beanspruchte Muskeln" style="max-width:100%;height:auto;display:block">
      {render('front', 0)}
      {render('back', 200)}
    </svg>
  );
}

export function MuscleLegend() {
  return (
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
      {([3, 2, 1] as Role[]).map((r) => (
        <span style="display:inline-flex;align-items:center;gap:6px"><i style={`display:inline-block;width:12px;height:12px;border-radius:3px;background:${fill(r)}`} />{r === 3 ? 'Hauptmuskel' : r === 2 ? 'Unterstützend' : 'Stabilisator'}</span>
      ))}
    </div>
  );
}

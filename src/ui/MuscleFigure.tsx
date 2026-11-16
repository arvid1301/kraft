// Körperfigur von vorne und hinten. Muskeln leuchten je nach Rolle unterschiedlich stark.
import { MUSCLE_LABELS, type MuscleId, type Role } from '../logic/muscles';

// Formen für die linke Körperhälfte (x < 100), die rechte wird gespiegelt. Koordinatenraum je Ansicht 0..200 x 0..300.
const SHAPES: { id: MuscleId; view: 'front' | 'back'; d: string }[] = [
  // ---- Vorne ----
  { id: 'traps_upper', view: 'front', d: 'M93 44 L73 56 Q84 52 95 54 Z' },
  { id: 'front_delts', view: 'front', d: 'M64 58 Q74 52 84 60 Q82 72 72 76 Q60 72 64 58 Z' },
  { id: 'side_delts', view: 'front', d: 'M54 66 Q58 56 64 58 Q62 70 62 80 Q52 76 54 66 Z' },
  { id: 'chest_upper', view: 'front', d: 'M72 62 Q86 58 99 62 L99 72 L72 72 Z' },
  { id: 'chest_mid', view: 'front', d: 'M71 72 L99 72 L99 84 Q84 86 72 84 Z' },
  { id: 'chest_lower', view: 'front', d: 'M72 84 Q84 86 99 84 L99 92 Q84 98 76 92 Z' },
  { id: 'serratus', view: 'front', d: 'M69 86 L75 90 L79 104 L73 102 Z' },
  { id: 'biceps_long', view: 'front', d: 'M54 82 Q60 80 62 86 L58 118 Q52 120 50 114 Z' },
  { id: 'biceps_short', view: 'front', d: 'M62 86 Q66 82 68 88 L64 120 Q60 122 58 118 Z' },
  { id: 'brachialis', view: 'front', d: 'M49 112 L57 118 L56 124 L48 122 Z' },
  { id: 'brachioradialis', view: 'front', d: 'M48 124 Q52 120 55 124 L52 146 Q48 146 46 140 Z' },
  { id: 'forearm_flexors', view: 'front', d: 'M56 124 Q60 120 62 126 L56 162 Q50 164 50 158 L54 146 Z' },
  { id: 'abs_upper', view: 'front', d: 'M88 96 L99 96 L99 118 L88 118 Z' },
  { id: 'abs_lower', view: 'front', d: 'M88 118 L99 118 L99 142 Q92 146 88 140 Z' },
  { id: 'obliques', view: 'front', d: 'M74 96 Q82 100 86 102 L86 138 Q80 136 76 128 Q72 112 74 96 Z' },
  { id: 'hip_flexors', view: 'front', d: 'M84 142 L92 142 L92 158 L84 156 Z' },
  { id: 'adductors', view: 'front', d: 'M92 160 L99 160 L99 206 Q95 208 92 200 Z' },
  { id: 'vastus_lateralis', view: 'front', d: 'M72 156 L80 158 L80 214 Q74 222 70 214 Q66 196 72 156 Z' },
  { id: 'rectus_femoris', view: 'front', d: 'M80 158 L88 158 L90 200 L82 214 L80 214 Z' },
  { id: 'vastus_medialis', view: 'front', d: 'M88 158 L92 160 L92 212 Q88 226 82 214 L90 200 Z' },
  { id: 'tibialis', view: 'front', d: 'M77 232 Q83 228 87 234 L85 272 Q81 280 77 272 Z' },
  { id: 'gastrocnemius', view: 'front', d: 'M87 234 L92 236 L90 262 L86 262 Z' },
  // ---- Hinten ----
  { id: 'traps_upper', view: 'back', d: 'M99 42 L72 60 L99 66 Z' },
  { id: 'traps_mid', view: 'back', d: 'M86 62 L99 66 L99 90 L90 86 Z' },
  { id: 'traps_lower', view: 'back', d: 'M88 88 L99 90 L99 112 Z' },
  { id: 'rhomboids', view: 'back', d: 'M76 66 L86 64 L90 88 L80 92 Z' },
  { id: 'rear_delts', view: 'back', d: 'M56 60 Q66 52 76 60 Q76 72 66 78 Q54 74 56 60 Z' },
  { id: 'rotator_cuff', view: 'back', d: 'M66 78 Q72 74 78 78 L78 90 Q70 92 66 86 Z' },
  { id: 'teres_major', view: 'back', d: 'M68 90 L78 90 L80 100 L72 102 Z' },
  { id: 'lats', view: 'back', d: 'M70 102 Q84 104 99 104 L99 132 Q90 142 86 140 Q76 124 70 102 Z' },
  { id: 'erectors', view: 'back', d: 'M90 112 L99 112 L99 158 L92 158 Q88 136 90 112 Z' },
  { id: 'triceps_long', view: 'back', d: 'M60 80 Q68 78 68 86 L64 110 L58 108 Z' },
  { id: 'triceps_lateral', view: 'back', d: 'M52 82 Q58 78 60 84 L58 110 Q52 114 50 108 Z' },
  { id: 'triceps_medial', view: 'back', d: 'M58 108 L64 110 L62 122 Q56 124 54 118 Z' },
  { id: 'forearm_extensors', view: 'back', d: 'M50 124 Q58 118 62 124 L56 162 Q50 166 46 160 Z' },
  { id: 'glute_med', view: 'back', d: 'M72 150 Q84 148 90 152 L86 162 Q76 166 72 160 Z' },
  { id: 'glute_max', view: 'back', d: 'M72 160 Q86 162 99 158 L99 184 Q86 192 74 182 Q68 172 72 160 Z' },
  { id: 'biceps_femoris', view: 'back', d: 'M72 186 L84 186 L84 226 Q78 234 74 226 Q68 206 72 186 Z' },
  { id: 'semis', view: 'back', d: 'M84 186 L96 186 L94 226 Q90 234 84 226 Z' },
  { id: 'gastrocnemius', view: 'back', d: 'M72 232 Q84 226 92 234 L90 256 L74 256 Z' },
  { id: 'soleus', view: 'back', d: 'M74 256 L90 256 L88 272 Q82 282 76 272 Z' },
];

const SILHOUETTE = [
  'M100 10 a16 16 0 1 0 0.01 0 Z',                                   // Kopf
  'M92 40 L108 40 L108 50 L92 50 Z',                                 // Hals
  'M60 56 L140 56 L136 100 L130 150 L70 150 L64 100 Z',              // Rumpf
  'M50 60 L72 60 L66 160 L46 160 Z', 'M128 60 L150 60 L154 160 L134 160 Z', // Arme
  'M66 150 L134 150 L130 236 L120 236 L118 284 L104 284 L100 236 L96 284 L82 284 L80 236 L70 236 Z', // Beine
];

export function roleFill(role: Role | undefined): string {
  if (role === 3) return 'var(--accent)';
  if (role === 2) return 'rgba(255,107,26,.6)';
  if (role === 1) return 'rgba(255,107,26,.3)';
  return 'var(--card3)';
}

export function MuscleFigure(props: { roles: Partial<Record<MuscleId, Role>>; height?: number; onTap?: (id: MuscleId) => void; label?: boolean; highlight?: MuscleId | null }) {
  const h = props.height ?? 160;
  const w = h * (400 / 300);
  const render = (view: 'front' | 'back', dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      {SILHOUETTE.map((d) => <path d={d} fill="var(--card2)" />)}
      {SHAPES.filter((s) => s.view === view).flatMap((s) => {
        const role = props.roles[s.id];
        const hl = props.highlight === s.id;
        const common = {
          fill: roleFill(role), stroke: hl ? '#fff' : 'var(--card)', 'stroke-width': hl ? 1.5 : 0.8,
          style: props.onTap ? 'cursor:pointer' : '', onClick: props.onTap ? () => props.onTap!(s.id) : undefined,
        };
        return [
          <path d={s.d} {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>,
          <path d={s.d} transform="translate(200 0) scale(-1 1)" {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>,
        ];
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
        <span style="display:inline-flex;align-items:center;gap:6px"><i style={`display:inline-block;width:12px;height:12px;border-radius:3px;background:${roleFill(r)}`} />{r === 3 ? 'Hauptmuskel' : r === 2 ? 'Unterstützend' : 'Stabilisator'}</span>
      ))}
    </div>
  );
}

// Anatomische Körperfigur von vorne und hinten. Jede Fläche ist ein Muskel oder Muskelkopf.
// Gezeichnet wird die linke Bildhälfte (x < 100), die rechte entsteht durch Spiegelung.
// Koordinaten je Ansicht: 0..200 breit, 0..430 hoch.
import { MUSCLE_LABELS, type MuscleId, type Role } from '../logic/muscles';

type View = 'front' | 'back';
const SHAPES: { id: MuscleId; view: View; d: string }[] = [
  // ---------- Vorne ----------
  { id: 'traps_upper', view: 'front', d: 'M91 62 C85 69 74 75 61 80 L70 84 C79 80 88 75 93 70 Z' },
  { id: 'side_delts', view: 'front', d: 'M58 80 C49 83 43 92 42 104 C42 114 45 122 50 128 C51 112 54 96 62 85 Z' },
  { id: 'front_delts', view: 'front', d: 'M62 85 C56 95 53 110 54 126 C61 119 68 106 73 93 C71 87 67 84 62 85 Z' },
  { id: 'chest_upper', view: 'front', d: 'M98 86 C89 84 79 85 73 91 L75 101 C83 98 92 98 98 100 Z' },
  { id: 'chest_mid', view: 'front', d: 'M98 100 C92 98 83 98 75 101 L69 115 C77 119 89 121 98 121 Z' },
  { id: 'chest_lower', view: 'front', d: 'M98 121 C89 121 77 119 69 115 C71 125 79 133 89 135 C93 135 96 133 98 131 Z' },
  { id: 'serratus', view: 'front', d: 'M70 127 L78 131 L73 137 L80 141 L74 147 L80 151 L72 156 C68 146 67 135 70 127 Z' },
  { id: 'abs_upper', view: 'front', d: 'M98 137 L89 139 C86 151 86 164 87 177 L98 177 Z' },
  { id: 'abs_lower', view: 'front', d: 'M98 179 L87 179 C87 197 89 213 94 229 L98 231 Z' },
  { id: 'obliques', view: 'front', d: 'M86 141 C80 143 74 151 72 161 C70 177 72 193 76 205 C82 211 87 217 91 225 C88 207 86 191 86 177 C86 163 85 151 86 141 Z' },
  { id: 'hip_flexors', view: 'front', d: 'M77 209 C82 216 86 224 90 233 L84 237 C79 227 75 218 73 211 Z' },
  { id: 'biceps_long', view: 'front', d: 'M52 124 C46 130 42 142 42 152 C42 158 44 162 48 164 L51 164 L51 126 Z' },
  { id: 'biceps_short', view: 'front', d: 'M52 124 L51 164 L55 164 C59 158 61 148 60 138 C59 130 56 125 52 124 Z' },
  { id: 'brachialis', view: 'front', d: 'M42 154 C40 159 40 164 42 169 L48 167 C46 163 44 159 42 154 Z' },
  { id: 'brachioradialis', view: 'front', d: 'M42 168 C36 174 34 186 34 198 C34 208 35 215 36 223 L40 223 C40 207 42 187 46 171 Z' },
  { id: 'forearm_flexors', view: 'front', d: 'M46 169 C52 169 56 173 56 181 C56 197 50 212 44 225 L40 223 C40 207 42 187 46 171 Z' },
  { id: 'adductors', view: 'front', d: 'M91 228 C96 228 98 232 98 238 L98 262 C96 273 92 282 88 271 C90 257 91 242 91 228 Z' },
  { id: 'vastus_lateralis', view: 'front', d: 'M70 215 C66 237 66 263 70 285 C72 297 76 307 80 313 L82 301 C78 281 76 253 78 223 Z' },
  { id: 'rectus_femoris', view: 'front', d: 'M78 217 C82 214 87 217 90 225 C91 250 89 277 86 300 L82 301 C78 281 76 253 78 223 Z' },
  { id: 'vastus_medialis', view: 'front', d: 'M88 271 C92 281 94 295 92 307 C88 313 84 313 82 307 L86 300 C88 291 89 281 88 271 Z' },
  { id: 'tibialis', view: 'front', d: 'M76 323 C72 337 72 357 74 373 C75 383 77 391 79 395 L82 395 C82 377 82 347 82 325 Z' },
  { id: 'gastrocnemius', view: 'front', d: 'M84 323 C90 331 94 345 93 359 C91 369 88 375 85 379 L83 361 C83 347 83 335 84 323 Z' },
  { id: 'soleus', view: 'front', d: 'M85 379 C88 375 91 369 92 363 C92 377 90 387 86 395 L84 395 Z' },
  // ---------- Hinten ----------
  { id: 'rhomboids', view: 'back', d: 'M86 102 C83 108 83 117 85 125 L93 131 C91 121 91 112 93 105 Z' },
  { id: 'traps_upper', view: 'back', d: 'M99 62 C92 66 80 74 62 80 L72 86 C82 84 92 84 99 86 Z' },
  { id: 'traps_mid', view: 'back', d: 'M99 86 C92 86 82 86 73 90 C79 96 89 102 99 106 Z' },
  { id: 'traps_lower', view: 'back', d: 'M99 106 C95 112 93 124 95 138 L99 150 Z' },
  { id: 'rear_delts', view: 'back', d: 'M56 82 C48 86 44 96 44 108 C46 116 50 122 54 126 C58 116 62 104 70 94 C66 88 62 84 56 82 Z' },
  { id: 'rotator_cuff', view: 'back', d: 'M71 96 C65 104 63 112 65 120 C71 124 78 124 83 120 C83 110 80 101 75 95 Z' },
  { id: 'teres_major', view: 'back', d: 'M64 123 C62 129 64 135 68 139 L79 133 C76 128 71 124 64 123 Z' },
  { id: 'lats', view: 'back', d: 'M66 137 C66 153 68 169 72 183 C78 195 86 203 94 207 L99 207 L99 160 C94 150 89 140 85 129 C80 133 74 137 66 137 Z' },
  { id: 'erectors', view: 'back', d: 'M92 150 L99 152 L99 214 L92 214 C90 196 90 172 92 150 Z' },
  { id: 'triceps_lateral', view: 'back', d: 'M44 108 C40 120 40 136 42 150 L48 152 C48 136 48 121 50 111 Z' },
  { id: 'triceps_long', view: 'back', d: 'M50 111 C56 109 60 115 62 125 C62 139 58 151 54 157 L48 152 C48 136 48 121 50 111 Z' },
  { id: 'triceps_medial', view: 'back', d: 'M42 150 L54 157 C52 163 50 167 46 167 C44 163 42 157 42 150 Z' },
  { id: 'forearm_extensors', view: 'back', d: 'M42 169 C36 177 34 191 34 205 C34 213 35 219 36 225 L42 226 C46 210 52 192 56 177 C54 171 48 167 42 169 Z' },
  { id: 'glute_med', view: 'back', d: 'M72 197 C70 205 70 212 72 218 C78 214 86 210 92 207 C86 201 80 197 72 197 Z' },
  { id: 'glute_max', view: 'back', d: 'M72 219 C70 231 72 243 78 251 C86 257 94 257 99 253 L99 211 C92 209 82 213 72 219 Z' },
  { id: 'biceps_femoris', view: 'back', d: 'M72 257 C70 271 70 291 74 305 L82 307 C80 289 80 271 82 257 Z' },
  { id: 'semis', view: 'back', d: 'M82 257 C80 271 80 289 82 307 L90 307 C94 291 96 273 96 257 C92 259 86 259 82 257 Z' },
  { id: 'adductors', view: 'back', d: 'M96 255 L99 255 L98 285 C96 281 96 269 96 255 Z' },
  { id: 'gastrocnemius', view: 'back', d: 'M74 323 C70 335 72 351 78 359 L87 359 C92 353 94 337 90 323 C86 319 78 319 74 323 Z' },
  { id: 'soleus', view: 'back', d: 'M77 359 C74 371 76 383 80 393 L86 393 C90 383 90 369 87 359 Z' },
];

// Umriss der linken Körperhälfte (wird gespiegelt)
const OUTLINE = 'M100 10 C88 10 82 20 82 34 C82 46 88 56 92 60 L91 70 C84 74 70 78 58 80 C48 82 42 92 41 106 C40 122 40 140 40 160 C38 172 34 186 32 200 C31 212 31 220 32 228 C29 236 28 246 31 256 C34 260 38 258 40 252 C42 244 42 236 42 228 C46 214 52 196 56 180 C58 168 60 150 62 134 C64 130 66 128 68 128 C68 146 70 166 72 180 C70 194 68 204 68 214 C66 240 66 270 70 296 C72 306 74 312 76 318 C72 334 72 356 74 376 C76 386 76 394 76 400 C72 404 72 410 80 410 L90 410 C92 404 90 398 88 392 C92 376 94 352 92 330 C92 320 90 314 90 306 C94 286 96 262 98 240 L100 236 Z';

// Feine Linien: Bauchsegmente, Kniescheibe, Wadenköpfe
const DETAILS: Record<View, string> = {
  front: 'M88 151 L99 151 M87 164 L99 164 M87 178 L99 178 M84 312 C86 318 90 320 94 316',
  back: 'M82 323 L82 352',
};

export function roleFill(role: Role | undefined): string {
  if (role === 3) return 'var(--accent)';
  if (role === 2) return 'rgba(255,107,26,.6)';
  if (role === 1) return 'rgba(255,107,26,.3)';
  return 'var(--card3)';
}

export function MuscleFigure(props: {
  roles?: Partial<Record<MuscleId, Role>>;
  fills?: Partial<Record<MuscleId, string>>;
  height?: number;
  onTap?: (id: MuscleId) => void;
  label?: boolean;
}) {
  const h = props.height ?? 160;
  const vbH = props.label ? 440 : 416;
  const w = h * (400 / vbH);
  const fillOf = (id: MuscleId) => props.fills?.[id] ?? roleFill(props.roles?.[id]);
  const mirror = 'translate(200 0) scale(-1 1)';
  const render = (view: View, dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      <path d={OUTLINE} fill="var(--card2)" />
      <path d={OUTLINE} transform={mirror} fill="var(--card2)" />
      {SHAPES.filter((s) => s.view === view).flatMap((s) => {
        const common = {
          fill: fillOf(s.id), stroke: 'var(--card)', 'stroke-width': 0.9, 'stroke-linejoin': 'round' as const,
          style: props.onTap ? 'cursor:pointer' : '', onClick: props.onTap ? () => props.onTap!(s.id) : undefined,
        };
        return [
          <path d={s.d} {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>,
          <path d={s.d} transform={mirror} {...common}><title>{MUSCLE_LABELS[s.id]}</title></path>,
        ];
      })}
      <g fill="none" stroke="var(--card)" stroke-width="0.9" stroke-linecap="round" style="pointer-events:none">
        <path d={DETAILS[view]} />
        <path d={DETAILS[view]} transform={mirror} />
      </g>
      {props.label && <text x="100" y="434" text-anchor="middle" font-size="16" fill="var(--muted)" font-weight="600">{view === 'front' ? 'Vorne' : 'Hinten'}</text>}
    </g>
  );
  return (
    <svg viewBox={`0 0 400 ${vbH}`} width={w} height={h} role="img" aria-label="Muskeln, vorne und hinten" style="max-width:100%;height:auto;display:block">
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

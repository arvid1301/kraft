// Muskelkarte: harte Sätze je Muskel in einer Woche, eingefärbt nach Zielbereich.
import { MUSCLE_LABELS, MUSCLE_REGIONS, type MuscleId } from '../logic/muscles';
import { PRIORITY_MUSCLES, TARGETS, targetStatus, type MuscleSets, type TargetStatus } from '../logic/volume';
import { MuscleFigure } from './MuscleFigure';
import { fmtNum } from './components';

// Eine Farbe (Orange), hell nach kräftig: je näher am Ziel, desto kräftiger.
const STEP = ['var(--card3)', 'rgba(255,107,26,.28)', 'rgba(255,107,26,.6)', 'var(--accent)'];

export function mapFill(id: MuscleId, sets: number): string {
  if (sets <= 0) return STEP[0];
  const tg = TARGETS[id];
  const ratio = tg ? sets / tg.min : sets / 6;
  if (ratio >= 1) return tg ? STEP[3] : STEP[2];
  if (ratio >= 0.5) return STEP[2];
  return STEP[1];
}

export const STATUS_TEXT: Record<TargetStatus, string> = {
  none: 'Noch nichts', low: 'Unter Ziel', ok: 'Im Ziel', high: 'Über Ziel', untracked: '',
};

export function MapLegend() {
  const items = [['0 Sätze', STEP[0]], ['Unter der Hälfte', STEP[1]], ['Fast da', STEP[2]], ['Im Ziel', STEP[3]]];
  return (
    <div style="display:flex;gap:10px 14px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
      {items.map(([label, c]) => <span style="display:inline-flex;align-items:center;gap:6px"><i style={`display:inline-block;width:12px;height:12px;border-radius:3px;background:${c}`} />{label}</span>)}
    </div>
  );
}

export function figureFills(sets: MuscleSets): Partial<Record<MuscleId, string>> {
  const out: Partial<Record<MuscleId, string>> = {};
  for (const r of MUSCLE_REGIONS) for (const id of r.ids) out[id] = mapFill(id, sets[id] ?? 0);
  return out;
}

/** Wie viele der Prioritätsmuskeln (Arme, Schultern) sind im Ziel? */
export function priorityProgress(sets: MuscleSets): { ok: number; total: number } {
  const tracked = PRIORITY_MUSCLES.filter((id) => TARGETS[id]);
  return { ok: tracked.filter((id) => (sets[id] ?? 0) >= TARGETS[id]!.min).length, total: tracked.length };
}

export function MuscleMapDetail(props: { sets: MuscleSets }) {
  return (
    <div style="display:flex;flex-direction:column;gap:10px">
      {MUSCLE_REGIONS.map((region) => (
        <>
          <div class="section-label">{region.title}</div>
          <div class="list">
            {region.ids.map((id) => {
              const v = props.sets[id] ?? 0;
              const tg = TARGETS[id];
              const st = targetStatus(id, v);
              const prio = PRIORITY_MUSCLES.includes(id);
              const scaleMax = tg ? tg.max * 1.1 : 12;
              return (
                <div class="row" style="flex-direction:column;align-items:stretch;gap:6px;min-height:0;padding:10px 14px">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
                    <span style="font-size:14px;font-weight:600;min-width:0">
                      {MUSCLE_LABELS[id]}{prio && <span class="tag accent" style="margin-left:6px;font-size:10px;padding:1px 6px">Priorität</span>}
                    </span>
                    <span class="num" style="font-size:13px;color:var(--muted);white-space:nowrap">
                      <b style="color:var(--fg)">{fmtNum(v)}</b>{tg ? ` / ${tg.min} bis ${tg.max}` : ' Sätze'}{st !== 'untracked' && st !== 'ok' ? '' : ''}
                    </span>
                  </div>
                  {tg && (
                    <div class="mbar" role="img" aria-label={`${fmtNum(v)} von ${tg.min} bis ${tg.max} Sätzen, ${STATUS_TEXT[st]}`}>
                      <i class="mbar-zone" style={`left:${(tg.min / scaleMax) * 100}%;width:${((tg.max - tg.min) / scaleMax) * 100}%`} />
                      <i class="mbar-fill" style={`width:${Math.min(100, (v / scaleMax) * 100)}%;background:${mapFill(id, v)}`} />
                    </div>
                  )}
                  {tg && <span style={`font-size:12px;color:${st === 'ok' ? 'var(--good)' : st === 'high' ? 'var(--warn)' : 'var(--muted)'}`}>{STATUS_TEXT[st]}</span>}
                </div>
              );
            })}
          </div>
        </>
      ))}
      <p style="font-size:12px;color:var(--muted);line-height:1.45">Gezählt werden abgehakte Arbeitssätze: voll für Hauptmuskeln, halb für unterstützende, Stabilisatoren und Aufwärmsätze zählen nicht. Der helle Bereich im Balken ist der Zielbereich pro Woche.</p>
    </div>
  );
}

export function WeekFigure(props: { sets: MuscleSets; height?: number; label?: boolean }) {
  return <MuscleFigure fills={figureFills(props.sets)} height={props.height ?? 220} label={props.label} />;
}

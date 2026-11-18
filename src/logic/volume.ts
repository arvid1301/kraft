// Harte Sätze je Muskel pro Woche, Zielbereiche und Nachholvorschlag.
import type { Exercise, Plan, PlanEntry, Workout } from '../db/types';
import { allEntries } from './records';
import { isKnownMuscle, type MuscleId } from './muscles';
import { weekKey } from './week';
import { uid } from '../db/db';

export type MuscleSets = Partial<Record<MuscleId, number>>;

// Ein Satz zählt voll für Hauptmuskeln, halb für unterstützende, gar nicht für Stabilisatoren.
export const ROLE_WEIGHT: Record<1 | 2 | 3, number> = { 3: 1, 2: 0.5, 1: 0 };

// Arme und Schultern haben Priorität
export const PRIORITY_MUSCLES: MuscleId[] = [
  'side_delts', 'rear_delts', 'front_delts', 'biceps_long', 'biceps_short', 'brachialis', 'triceps_long', 'triceps_lateral', 'triceps_medial',
];

export interface Target { min: number; max: number }
const t = (min: number, max: number): Target => ({ min, max });

/** Wöchentliche Zielbereiche in harten Sätzen. Muskeln ohne Eintrag werden angezeigt, aber nicht bewertet. */
export const TARGETS: Partial<Record<MuscleId, Target>> = {
  chest_upper: t(6, 12), chest_mid: t(6, 12), chest_lower: t(4, 10),
  front_delts: t(6, 12), side_delts: t(10, 20), rear_delts: t(8, 16),
  traps_upper: t(4, 10), traps_mid: t(6, 12), traps_lower: t(4, 10), rhomboids: t(8, 16), lats: t(10, 20), teres_major: t(6, 12), erectors: t(4, 10),
  biceps_long: t(10, 20), biceps_short: t(10, 20), brachialis: t(8, 16),
  triceps_long: t(10, 20), triceps_lateral: t(10, 20), triceps_medial: t(10, 20),
  abs_upper: t(4, 10), abs_lower: t(4, 10), obliques: t(3, 8),
  glute_max: t(8, 16), glute_med: t(4, 10),
  rectus_femoris: t(8, 16), vastus_lateralis: t(8, 16), vastus_medialis: t(8, 16), adductors: t(4, 10),
  biceps_femoris: t(6, 12), semis: t(6, 12),
  gastrocnemius: t(4, 10),
};

export type TargetStatus = 'none' | 'low' | 'ok' | 'high' | 'untracked';

export function targetStatus(id: MuscleId, sets: number): TargetStatus {
  const tg = TARGETS[id];
  if (!tg) return 'untracked';
  if (sets <= 0) return 'none';
  if (sets < tg.min) return 'low';
  if (sets > tg.max) return 'high';
  return 'ok';
}

function add(map: MuscleSets, id: string, v: number) {
  if (!isKnownMuscle(id) || v <= 0) return;
  map[id] = Math.round(((map[id] ?? 0) + v) * 100) / 100;
}

/** Erledigte Arbeitssätze je Muskel. */
export function workoutMuscleSets(workouts: Workout[], exMap: Map<string, Exercise>): MuscleSets {
  const out: MuscleSets = {};
  for (const w of workouts) {
    for (const entry of allEntries(w)) {
      const ex = entry.exerciseId ? exMap.get(entry.exerciseId) : undefined;
      if (!ex?.muscles) continue;
      for (const s of entry.sets) {
        if (!s.done || s.warmup) continue;
        const count = s.side ? 0.5 : 1; // links und rechts zusammen sind ein Satz
        for (const m of ex.muscles) add(out, m.id, ROLE_WEIGHT[m.role] * count);
      }
    }
  }
  return out;
}

export function flattenPlan(entries: PlanEntry[]): PlanEntry[] {
  return entries.flatMap((e) => (e.kind === 'superset' ? e.children ?? [] : [e]));
}

/** Geplante Sätze je Muskel für eine Liste von Plan-Einträgen. */
export function plannedMuscleSets(entries: PlanEntry[], exMap: Map<string, Exercise>): MuscleSets {
  const out: MuscleSets = {};
  for (const e of flattenPlan(entries)) {
    if (e.kind !== 'exercise' || !e.exerciseId) continue;
    const ex = exMap.get(e.exerciseId);
    for (const m of ex?.muscles ?? []) add(out, m.id, ROLE_WEIGHT[m.role] * e.sets);
  }
  return out;
}

export function sumSets(a: MuscleSets, b: MuscleSets, factor = 1): MuscleSets {
  const out: MuscleSets = { ...a };
  for (const [k, v] of Object.entries(b)) add(out, k, (v ?? 0) * factor);
  return out;
}

export function thisWeek(workouts: Workout[], now: Date = new Date()): Workout[] {
  const k = weekKey(now);
  return workouts.filter((w) => w.status === 'done' && weekKey(new Date(w.startedAt)) === k);
}

export interface CatchUp {
  missing: { id: MuscleId; sets: number }[];
  add: PlanEntry[];          // zusätzliche Übungen für heute
  extra: { exerciseId: string; sets: number }[]; // Zusatzsätze bei Übungen, die heute ohnehin dran sind
  skipped: string[];         // beim letzten Training ausgelassene Übungen (IDs)
  sessionsLeft: number;
}

/** Wendet einen Nachholvorschlag auf die Einträge eines Tages an. */
export function applyCatchUp(entries: PlanEntry[], cu: CatchUp): PlanEntry[] {
  const more = (e: PlanEntry): PlanEntry => {
    if (e.kind === 'superset') return { ...e, children: (e.children ?? []).map(more) };
    const x = cu.extra.find((c) => c.exerciseId === e.exerciseId);
    return x ? { ...e, sets: e.sets + x.sets } : e;
  };
  return [...entries.map(more), ...cu.add];
}

/**
 * Was fehlt in dieser Woche, selbst wenn die restlichen Einheiten wie geplant laufen?
 * Liefert null, wenn nichts fehlt.
 */
export function catchUp(params: { weekDone: Workout[]; plan: Plan; exMap: Map<string, Exercise>; goal: number; now?: Date }): CatchUp | null {
  const { weekDone, plan, exMap, goal } = params;
  const now = params.now ?? new Date();
  const open = goal - weekDone.length;
  if (open <= 0 || plan.days.length === 0) return null;
  const weekday = (now.getDay() + 6) % 7; // Mo = 0
  const sessionsLeft = Math.max(1, Math.min(open, 7 - weekday));

  // Soll: ein voller Durchlauf des Plans, umgerechnet auf das Wochenziel
  let planWeek: MuscleSets = {};
  for (const d of plan.days) planWeek = sumSets(planWeek, plannedMuscleSets(d.entries, exMap), goal / plan.days.length);

  // Prognose: bereits erledigt + die nächsten Tage in der Reihenfolge A, B, C
  let projected = workoutMuscleSets(weekDone, exMap);
  for (let i = 0; i < sessionsLeft; i++) {
    const day = plan.days[(plan.nextDayIndex + i) % plan.days.length];
    projected = sumSets(projected, plannedMuscleSets(day.entries, exMap));
  }

  const missing = (Object.entries(planWeek) as [MuscleId, number][])
    .filter(([id, v]) => v >= 2 && TARGETS[id])
    .map(([id, v]) => ({ id, sets: Math.floor((v - (projected[id] ?? 0)) * 2) / 2 }))
    .filter((m) => m.sets >= 1.5)
    .sort((a, b) => Number(PRIORITY_MUSCLES.includes(b.id)) - Number(PRIORITY_MUSCLES.includes(a.id)) || b.sets - a.sets);
  if (missing.length === 0) return null;

  // Beim letzten Training ausgelassen oder nicht fertig
  const last = [...weekDone].sort((a, b) => b.startedAt - a.startedAt)[0];
  const skipped = last
    ? allEntries(last).filter((e) => e.exerciseId && (e.skipped || !e.sets.some((s) => s.done && !s.warmup))).map((e) => e.exerciseId!)
    : [];

  // Vorschlag für die nächste Einheit: was die größte Lücke schließt.
  // Ist die Übung heute ohnehin dran, gibt es bis zu 2 Zusatzsätze, sonst kommt sie mit bis zu 3 Sätzen dazu.
  const nextDay = plan.days[plan.nextDayIndex % plan.days.length];
  const inNext = new Set(flattenPlan(nextDay.entries).map((e) => e.exerciseId));
  const seen = new Set<string>();
  const candidates = plan.days.flatMap((d) => flattenPlan(d.entries)).filter((e) => {
    if (e.kind !== 'exercise' || !e.exerciseId || seen.has(e.exerciseId)) return false;
    seen.add(e.exerciseId);
    return true;
  });
  const deficit: MuscleSets = Object.fromEntries(missing.map((m) => [m.id, m.sets]));
  const add: PlanEntry[] = [];
  const extra: { exerciseId: string; sets: number }[] = [];
  const picked = new Set<string>();
  for (let round = 0; round < 2; round++) {
    let best: { e: PlanEntry; gain: number; sets: number; isExtra: boolean } | null = null;
    for (const c of candidates) {
      if (picked.has(c.exerciseId!)) continue;
      const ex = exMap.get(c.exerciseId!);
      const isExtra = inNext.has(c.exerciseId!);
      const sets = isExtra ? Math.min(c.sets, 2) : Math.min(c.sets, 3);
      let gain = 0;
      for (const m of ex?.muscles ?? []) {
        if (!isKnownMuscle(m.id)) continue;
        const g = Math.min(deficit[m.id] ?? 0, ROLE_WEIGHT[m.role] * sets);
        gain += g * (PRIORITY_MUSCLES.includes(m.id) ? 1.5 : 1);
      }
      if (skipped.includes(c.exerciseId!)) gain += 1;
      if (!best || gain > best.gain) best = { e: c, gain, sets, isExtra };
    }
    if (!best || best.gain < 1.5) break;
    picked.add(best.e.exerciseId!);
    if (best.isExtra) extra.push({ exerciseId: best.e.exerciseId!, sets: best.sets });
    else add.push({ ...best.e, id: uid(), sets: best.sets });
    const ex = exMap.get(best.e.exerciseId!);
    for (const m of ex?.muscles ?? []) {
      if (isKnownMuscle(m.id) && deficit[m.id]) deficit[m.id] = Math.max(0, deficit[m.id]! - ROLE_WEIGHT[m.role] * best.sets);
    }
  }
  return { missing, add, extra, skipped, sessionsLeft };
}

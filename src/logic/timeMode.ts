// Zeitmodus: Dauer einer Einheit schätzen und sie auf ein Zeitbudget kürzen.
// Grundübungen sowie Arme und Schultern bleiben, der Rest fällt zuerst weg.
import type { Exercise, PlanEntry } from '../db/types';
import { PRIORITY_MUSCLES } from './volume';
import type { MuscleId } from './muscles';

const WORK = 35;        // Sekunden pro Satz
const SETUP = 45;       // Gerät einstellen, Wechsel
const WARMUP_SETS = 120; // zwei Aufwärmsätze vor Grundübungen

function exerciseSec(e: PlanEntry, ex: Exercise | undefined): { work: number; rest: number; extra: number } {
  if (!ex) return { work: WORK, rest: 90, extra: SETUP };
  const sides = ex.unilateral ? 2 : 1;
  const work = ex.input === 'time' ? (e.timeSec ?? 30) * sides + 15 : WORK * sides;
  return { work, rest: ex.restSec, extra: SETUP + (ex.warmup && ex.input === 'kg' ? WARMUP_SETS : 0) };
}

export function entrySec(e: PlanEntry, exMap: Map<string, Exercise>): number {
  if (e.kind === 'warmup') return e.sets * 60 + 30;
  if (e.kind === 'superset') {
    const kids = (e.children ?? []).map((c) => ({ c, s: exerciseSec(c, exMap.get(c.exerciseId ?? '')) }));
    const rounds = Math.max(0, ...kids.map((k) => k.c.sets));
    const work = kids.reduce((a, k) => a + k.s.work, 0);
    const rest = Math.max(0, ...kids.map((k) => k.s.rest));
    return rounds * (work + rest) + kids.reduce((a, k) => a + k.s.extra, 0);
  }
  const s = exerciseSec(e, exMap.get(e.exerciseId ?? ''));
  return e.sets * (s.work + s.rest) + s.extra;
}

export function daySec(entries: PlanEntry[], exMap: Map<string, Exercise>): number {
  return entries.reduce((a, e) => a + entrySec(e, exMap), 0);
}

/** Grundübung oder Arme/Schultern: bleibt im Zeitmodus. */
export function isKeeper(e: PlanEntry, exMap: Map<string, Exercise>): boolean {
  if (e.kind === 'warmup') return true;
  if (e.kind === 'superset') return (e.children ?? []).some((c) => isKeeper(c, exMap));
  const ex = exMap.get(e.exerciseId ?? '');
  if (!ex) return false;
  const compound = ex.warmup || (ex.restSec >= 150 && (ex.input === 'kg' || ex.input === 'bodyweight'));
  const armsShoulders = (ex.muscles ?? []).some((m) => m.role === 3 && PRIORITY_MUSCLES.includes(m.id as MuscleId));
  return compound || armsShoulders;
}

export interface TrimResult {
  entries: PlanEntry[];
  removed: PlanEntry[];
  reduced: { entry: PlanEntry; from: number; to: number }[];
  estimateSec: number;
  fits: boolean;
}

function setsOf(e: PlanEntry): number {
  return e.kind === 'superset' ? Math.max(0, ...(e.children ?? []).map((c) => c.sets)) : e.sets;
}
function withSets(e: PlanEntry, n: number): PlanEntry {
  if (e.kind === 'superset') return { ...e, children: (e.children ?? []).map((c) => ({ ...c, sets: Math.min(c.sets, n) })) };
  return { ...e, sets: n };
}

export function trimToBudget(entries: PlanEntry[], budgetMin: number, exMap: Map<string, Exercise>): TrimResult {
  const budget = budgetMin * 60;
  let list = entries.slice();
  const removed: PlanEntry[] = [];
  const reducedMap = new Map<string, { entry: PlanEntry; from: number; to: number }>();
  const fits = () => daySec(list, exMap) <= budget;

  // 1. Übungen, die keine Grundübung und nicht Arme/Schultern sind, von hinten entfernen
  for (let i = list.length - 1; i >= 0 && !fits(); i--) {
    if (!isKeeper(list[i], exMap)) { removed.unshift(list[i]); list.splice(i, 1); }
  }
  // 2. Sätze reduzieren, reihum von hinten, minimal 2 Sätze
  let changed = true;
  while (!fits() && changed) {
    changed = false;
    for (let i = list.length - 1; i >= 0 && !fits(); i--) {
      const e = list[i];
      if (e.kind === 'warmup') continue;
      const n = setsOf(e);
      if (n <= 2) continue;
      const prev = reducedMap.get(e.id);
      reducedMap.set(e.id, { entry: e, from: prev?.from ?? n, to: n - 1 });
      list[i] = withSets(e, n - 1);
      changed = true;
    }
  }
  // 3. Aufwärm-Block weglassen
  for (let i = list.length - 1; i >= 0 && !fits(); i--) {
    if (list[i].kind === 'warmup') { removed.unshift(list[i]); list.splice(i, 1); }
  }
  return { entries: list, removed, reduced: [...reducedMap.values()], estimateSec: daySec(list, exMap), fits: fits() };
}

// Baut aus einem Plan-Tag die Einträge für ein neues Training, inklusive Aufwärmsätzen.
import type { Exercise, PlanDay, PlanEntry, WorkoutEntry, WorkoutSet } from '../db/types';
import { uid } from '../db/db';
import { warmupSets } from './warmup';

export interface LastPerformance { weight?: number; reps?: number; trxPos?: number; trxHelp?: number; timeSec?: number }
export type LastLookup = (exerciseId: string) => LastPerformance | undefined;

function makeSets(entry: PlanEntry, ex: Exercise | undefined, last: LastPerformance | undefined, withWarmup: boolean): WorkoutSet[] {
  const sets: WorkoutSet[] = [];
  if (withWarmup && ex && ex.input === 'kg' && last?.weight) {
    for (const w of warmupSets(last.weight, ex.step)) sets.push({ id: uid(), warmup: true, weight: w.weight, reps: w.reps, done: false });
  }
  for (let i = 0; i < entry.sets; i++) {
    const base: WorkoutSet = { id: uid(), warmup: false, done: false };
    if (!ex) { sets.push({ ...base, reps: entry.repMin || undefined }); continue; }
    switch (ex.input) {
      case 'kg':
      case 'bodyweight':
        sets.push({ ...base, weight: last?.weight ?? 0, reps: last?.reps ?? entry.repMin }); break;
      case 'trx':
        sets.push({ ...base, trxPos: last?.trxPos ?? 3, trxHelp: last?.trxHelp ?? 3, reps: last?.reps ?? entry.repMin }); break;
      case 'reps':
        sets.push({ ...base, reps: last?.reps ?? (entry.repMin || 10) }); break;
      case 'time': {
        const t = entry.timeSec ?? last?.timeSec ?? 30;
        if (ex.unilateral) {
          sets.push({ ...base, timeSec: t, side: 'L' });
          sets.push({ id: uid(), warmup: false, done: false, timeSec: t, side: 'R' });
        } else sets.push({ ...base, timeSec: t });
        break;
      }
    }
  }
  return sets;
}

export function buildWorkoutEntries(day: PlanDay, exercises: Map<string, Exercise>, last: LastLookup): WorkoutEntry[] {
  const warmedMuscles = new Set<string>();
  const build = (p: PlanEntry): WorkoutEntry => {
    if (p.kind === 'superset') {
      return { id: uid(), kind: 'superset', label: p.label, repMin: 0, repMax: 0, sets: [], skipped: false, children: (p.children ?? []).map(build) };
    }
    if (p.kind === 'warmup') {
      const sets: WorkoutSet[] = Array.from({ length: p.sets }, () => ({ id: uid(), warmup: true, reps: p.repMin, done: false }));
      return { id: uid(), kind: 'warmup', label: p.label, repMin: p.repMin, repMax: p.repMax, sets, skipped: false };
    }
    const ex = p.exerciseId ? exercises.get(p.exerciseId) : undefined;
    // Aufwärmsätze nur vor der ersten schweren Übung einer Muskelgruppe
    let withWarmup = false;
    if (ex?.warmup && !warmedMuscles.has(ex.muscle)) { withWarmup = true; warmedMuscles.add(ex.muscle); }
    return {
      id: uid(), kind: 'exercise', exerciseId: p.exerciseId, repMin: p.repMin, repMax: p.repMax, timeSec: p.timeSec,
      sets: makeSets(p, ex, p.exerciseId ? last(p.exerciseId) : undefined, withWarmup), skipped: false,
    };
  };
  return day.entries.map(build);
}

/** Eintrag für eine getauschte oder neu eingefügte Übung im laufenden Training. */
export function buildSingleEntry(exercise: Exercise, sets: number, repMin: number, repMax: number, last: LastPerformance | undefined, withWarmup: boolean, timeSec?: number): WorkoutEntry {
  const p: PlanEntry = { id: uid(), kind: 'exercise', exerciseId: exercise.id, sets, repMin, repMax, timeSec };
  return { id: uid(), kind: 'exercise', exerciseId: exercise.id, repMin, repMax, timeSec, sets: makeSets(p, exercise, last, withWarmup), skipped: false };
}

/** Aufwärmsätze an das aktuelle Arbeitsgewicht anpassen (solange noch keiner abgehakt ist). */
export function refreshWarmup(entry: WorkoutEntry, ex: Exercise): WorkoutEntry {
  if (ex.input !== 'kg') return entry;
  const warm = entry.sets.filter((s) => s.warmup);
  if (warm.length === 0 || warm.some((s) => s.done)) return entry;
  const first = entry.sets.find((s) => !s.warmup);
  const fresh = warmupSets(first?.weight ?? 0, ex.step);
  const work = entry.sets.filter((s) => !s.warmup);
  const newWarm: WorkoutSet[] = fresh.map((w, i) => ({ id: warm[i]?.id ?? uid(), warmup: true, weight: w.weight, reps: w.reps, done: false }));
  return { ...entry, sets: [...newWarm, ...work] };
}

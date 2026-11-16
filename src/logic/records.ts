// Rekorde und Volumen.
import type { Exercise, PersonalRecord, Workout, WorkoutEntry, WorkoutSet } from '../db/types';

export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10; // Epley
}

export function allEntries(w: Workout): WorkoutEntry[] {
  return w.entries.flatMap((e) => (e.kind === 'superset' ? e.children ?? [] : [e]));
}

export function workingSets(w: Workout): { entry: WorkoutEntry; set: WorkoutSet }[] {
  return allEntries(w).flatMap((entry) => entry.sets.filter((s) => s.done && !s.warmup).map((set) => ({ entry, set })));
}

/** Bewegtes Gesamtgewicht. Körpergewichtsübungen zählen Körpergewicht + Zusatz. */
export function volumeKg(w: Workout, exercises: Map<string, Exercise>): number {
  let v = 0;
  for (const { entry, set } of workingSets(w)) {
    const ex = entry.exerciseId ? exercises.get(entry.exerciseId) : undefined;
    if (!ex) continue;
    if (ex.input === 'kg') v += (set.weight ?? 0) * (set.reps ?? 0);
    else if (ex.input === 'bodyweight') v += ((w.bodyWeightKg ?? 0) + (set.weight ?? 0)) * (set.reps ?? 0);
  }
  return Math.round(v);
}

export interface Best { weight: number; e1rm: number; reps: number; weightReps?: number; timeSec: number }

/** Bestwerte pro Übung aus Trainings am selben Gym. */
export function bestsFromHistory(history: Workout[], gymId: string): Map<string, Best> {
  const best = new Map<string, Best>();
  for (const w of history) {
    if (w.gymId !== gymId || w.status !== 'done') continue;
    for (const { entry, set } of workingSets(w)) {
      if (!entry.exerciseId) continue;
      const b = best.get(entry.exerciseId) ?? { weight: 0, e1rm: 0, reps: 0, timeSec: 0 };
      const wt = set.weight ?? 0, r = set.reps ?? 0;
      if (wt > b.weight) { b.weight = wt; b.weightReps = r; }
      b.e1rm = Math.max(b.e1rm, e1rm(wt, r));
      b.reps = Math.max(b.reps, r);
      b.timeSec = Math.max(b.timeSec, set.timeSec ?? 0);
      best.set(entry.exerciseId, b);
    }
  }
  return best;
}

export function findRecords(w: Workout, history: Workout[], exercises: Map<string, Exercise>): PersonalRecord[] {
  const prev = bestsFromHistory(history.filter((h) => h.id !== w.id), w.gymId);
  const todays = bestsFromHistory([{ ...w, status: 'done' }], w.gymId);
  const out: PersonalRecord[] = [];
  for (const [id, b] of todays) {
    const ex = exercises.get(id);
    const p = prev.get(id);
    if (!ex || !p) continue; // beim ersten Mal an diesem Gym kein Rekord
    if (ex.input === 'kg' || ex.input === 'bodyweight') {
      if (b.weight > p.weight) out.push({ exerciseId: id, exerciseName: ex.name, kind: 'weight', value: b.weight, reps: b.weightReps, previous: p.weight });
      else if (b.e1rm > p.e1rm) out.push({ exerciseId: id, exerciseName: ex.name, kind: 'e1rm', value: b.e1rm, previous: p.e1rm });
    } else if (ex.input === 'reps' || ex.input === 'trx') {
      if (b.reps > p.reps) out.push({ exerciseId: id, exerciseName: ex.name, kind: 'reps', value: b.reps, previous: p.reps });
    } else if (ex.input === 'time') {
      if (b.timeSec > p.timeSec) out.push({ exerciseId: id, exerciseName: ex.name, kind: 'time', value: b.timeSec, previous: p.timeSec });
    }
  }
  return out;
}

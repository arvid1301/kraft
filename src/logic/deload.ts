// Deload-Hinweis: Wenn mehrere Übungen seit zwei Wochen stagnieren oder schlechter werden, ist eine leichte Woche sinnvoll.
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from '../db/types';
import { allEntries, e1rm } from './records';
import { roundToStep } from './progression';

const DAY = 86400000;

export interface StalledExercise { exerciseId: string; name: string; status: 'stalled' | 'falling'; baseline: number; recent: number }
export interface DeloadCheck { flagged: StalledExercise[]; suggest: boolean }

/** Leistungswert einer Übung in einem Training: geschätztes Maximum, sonst Wiederholungen oder Zeit. */
export function sessionValue(entry: WorkoutEntry, ex: Exercise, bodyWeight: number): number {
  const sets = entry.sets.filter((s) => s.done && !s.warmup);
  if (sets.length === 0) return 0;
  switch (ex.input) {
    case 'kg': return Math.max(...sets.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)));
    case 'bodyweight': return Math.max(...sets.map((s) => e1rm(bodyWeight + (s.weight ?? 0), s.reps ?? 0)));
    case 'time': return Math.max(...sets.map((s) => s.timeSec ?? 0));
    default: return Math.max(...sets.map((s) => s.reps ?? 0));
  }
}

/**
 * Stagnation je Übung (nur am selben Gym, Deload-Trainings zählen nicht):
 * bestes Ergebnis der letzten 14 Tage ist nicht besser als das beste der 3 Wochen davor.
 * Fallend: das letzte Ergebnis liegt mehr als 3 % darunter.
 */
export function checkDeload(workouts: Workout[], gymId: string, exMap: Map<string, Exercise>, now: number = Date.now(), minExercises = 3): DeloadCheck {
  const relevant = workouts
    .filter((w) => w.status === 'done' && w.gymId === gymId && !w.deload && w.startedAt >= now - 35 * DAY)
    .sort((a, b) => a.startedAt - b.startedAt);
  const series = new Map<string, { t: number; v: number }[]>();
  for (const w of relevant) {
    for (const e of allEntries(w)) {
      const ex = e.exerciseId ? exMap.get(e.exerciseId) : undefined;
      if (!ex) continue;
      const v = sessionValue(e, ex, w.bodyWeightKg ?? 70);
      if (v <= 0) continue;
      series.set(ex.id, [...(series.get(ex.id) ?? []), { t: w.startedAt, v }]);
    }
  }
  const flagged: StalledExercise[] = [];
  for (const [id, pts] of series) {
    const recent = pts.filter((p) => p.t >= now - 14 * DAY);
    const older = pts.filter((p) => p.t < now - 14 * DAY);
    if (recent.length < 2 || older.length < 1) continue;
    const baseline = Math.max(...older.map((p) => p.v));
    const best = Math.max(...recent.map((p) => p.v));
    const last = recent[recent.length - 1].v;
    if (last < baseline * 0.97) flagged.push({ exerciseId: id, name: exMap.get(id)!.name, status: 'falling', baseline, recent: last });
    else if (best <= baseline) flagged.push({ exerciseId: id, name: exMap.get(id)!.name, status: 'stalled', baseline, recent: best });
  }
  return { flagged, suggest: flagged.length >= minExercises };
}

/** Leichte Woche: etwa 60 % der Arbeitssätze (mindestens 1) und 10 % weniger Gewicht. */
export function applyDeload(entries: WorkoutEntry[], exMap: Map<string, Exercise>): WorkoutEntry[] {
  const one = (e: WorkoutEntry): WorkoutEntry => {
    if (e.kind === 'superset') return { ...e, children: (e.children ?? []).map(one) };
    if (e.kind !== 'exercise') return e;
    const ex = exMap.get(e.exerciseId ?? '');
    const warm = e.sets.filter((s) => s.warmup);
    const work = e.sets.filter((s) => !s.warmup);
    const perSide = work.some((s) => s.side) ? 2 : 1;
    const keep = Math.max(1, Math.round((work.length / perSide) * 0.6)) * perSide;
    const lighter = (s: WorkoutSet): WorkoutSet =>
      ex && (ex.input === 'kg' || (ex.input === 'bodyweight' && (s.weight ?? 0) > 0)) && s.weight
        ? { ...s, weight: Math.max(0, roundToStep(s.weight * 0.9, Math.min(ex.step || 2.5, 2.5))) }
        : s;
    return { ...e, sets: [...warm.map(lighter), ...work.slice(0, keep).map(lighter)] };
  };
  return entries.map(one);
}

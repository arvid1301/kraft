// Zwei Tage hintereinander: Tag 1 etwas leichter, Tag 2 andere Übungen oder weniger Sätze für Muskeln, die gestern schon dran waren.
import type { Exercise, PlanEntry, Workout } from '../db/types';
import { allEntries } from './records';
import { workoutMuscleSets } from './volume';
import { daysSince } from './week';
import type { MuscleId } from './muscles';

export interface B2BChange {
  entryId: string;
  exerciseId: string;
  kind: 'swap' | 'fewer';
  toExerciseId?: string;
  from?: number;
  to?: number;
  reason: string;
}

/** Abgeschlossene Trainings von gestern (Kalendertag). */
export function yesterdaysWorkouts(workouts: Workout[], now: Date = new Date()): Workout[] {
  return workouts.filter((w) => w.status === 'done' && daysSince(w.startedAt, now) === 1);
}

/**
 * Passt die Einträge für den zweiten Tag an:
 * - Übung gestern schon gemacht: gegen eine feste Alternative tauschen, die gestern nicht dran war, sonst 1 Satz weniger.
 * - Hauptmuskel gestern mit 3 oder mehr Sätzen belastet: 1 Satz weniger (mindestens 2).
 */
export function secondDayAdjust(entries: PlanEntry[], yesterday: Workout[], exMap: Map<string, Exercise>): { entries: PlanEntry[]; changes: B2BChange[] } {
  if (yesterday.length === 0) return { entries, changes: [] };
  const loaded = workoutMuscleSets(yesterday, exMap);
  const doneYesterday = new Set(
    yesterday.flatMap((w) => allEntries(w)).filter((e) => e.exerciseId && e.sets.some((s) => s.done && !s.warmup)).map((e) => e.exerciseId!),
  );
  const usedToday = new Set(entries.flatMap((e) => (e.kind === 'superset' ? e.children ?? [] : [e])).map((e) => e.exerciseId).filter(Boolean) as string[]);
  const changes: B2BChange[] = [];

  const adjust = (e: PlanEntry): PlanEntry => {
    if (e.kind === 'superset') return { ...e, children: (e.children ?? []).map(adjust) };
    if (e.kind !== 'exercise' || !e.exerciseId) return e;
    const ex = exMap.get(e.exerciseId);
    if (!ex) return e;
    const fewer = (reason: string): PlanEntry => {
      if (e.sets <= 2) return e;
      changes.push({ entryId: e.id, exerciseId: ex.id, kind: 'fewer', from: e.sets, to: e.sets - 1, reason });
      return { ...e, sets: e.sets - 1 };
    };
    if (doneYesterday.has(ex.id)) {
      const alt = ex.alternatives
        .map((id) => exMap.get(id))
        .find((a) => a && !a.archived && !doneYesterday.has(a.id) && !usedToday.has(a.id));
      if (alt) {
        usedToday.add(alt.id);
        changes.push({ entryId: e.id, exerciseId: ex.id, kind: 'swap', toExerciseId: alt.id, reason: 'gestern schon gemacht' });
        return { ...e, exerciseId: alt.id };
      }
      return fewer('gestern schon gemacht');
    }
    const primary = (ex.muscles ?? []).filter((m) => m.role === 3).map((m) => m.id as MuscleId);
    const maxLoad = Math.max(0, ...primary.map((id) => loaded[id] ?? 0));
    if (maxLoad >= 3) return fewer('Muskel gestern schon belastet');
    return e;
  };
  return { entries: entries.map(adjust), changes };
}

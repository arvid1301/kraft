// Beschwerden: "Schmerz" oder "Knacken" bei einer Übung. Ab zwei Trainings mit Beschwerde schlägt die App eine Alternative vor.
import type { Exercise, Workout } from '../db/types';
import { allEntries } from './records';

export interface ComplaintInfo { count: number; kinds: ('Schmerz' | 'Knacken')[]; lastAt: number }

/** Anzahl der Trainings, in denen bei einer Übung eine Beschwerde markiert wurde (alle Gyms). */
export function complaintCounts(workouts: Workout[]): Map<string, ComplaintInfo> {
  const out = new Map<string, ComplaintInfo>();
  for (const w of workouts) {
    if (w.status === 'aborted') continue;
    const seenHere = new Set<string>();
    for (const e of allEntries(w)) {
      if (!e.exerciseId) continue;
      const kinds = e.sets.map((s) => s.complaint).filter((k): k is 'Schmerz' | 'Knacken' => !!k);
      if (kinds.length === 0 || seenHere.has(e.exerciseId)) continue;
      seenHere.add(e.exerciseId);
      const cur = out.get(e.exerciseId) ?? { count: 0, kinds: [], lastAt: 0 };
      cur.count++;
      for (const k of kinds) if (!cur.kinds.includes(k)) cur.kinds.push(k);
      cur.lastAt = Math.max(cur.lastAt, w.startedAt);
      out.set(e.exerciseId, cur);
    }
  }
  return out;
}

export const COMPLAINT_LIMIT = 2;

/** Schonendere Alternative: zuerst die festen Alternativen, dann Übungen mit gleichem Hauptmuskel, jeweils ohne eigene Beschwerden. */
export function gentlerAlternative(ex: Exercise, all: Exercise[], counts: Map<string, ComplaintInfo>): Exercise | undefined {
  const ok = (e: Exercise) => e.id !== ex.id && !e.archived && (counts.get(e.id)?.count ?? 0) === 0;
  const fixed = ex.alternatives.map((id) => all.find((e) => e.id === id)).filter((e): e is Exercise => !!e && ok(e));
  if (fixed.length) return fixed[0];
  const primary = new Set((ex.muscles ?? []).filter((m) => m.role === 3).map((m) => m.id));
  const scored = all
    .filter(ok)
    .map((e) => ({ e, score: (e.muscles ?? []).filter((m) => m.role === 3 && primary.has(m.id)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.e;
}

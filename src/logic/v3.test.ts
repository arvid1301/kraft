import { describe, expect, it } from 'vitest';
import { buildSeed } from '../db/seed';
import type { Workout } from '../db/types';
import { buildWorkoutEntries } from './workoutBuild';
import { secondDayAdjust, yesterdaysWorkouts } from './backToBack';
import { monthGrid, monthKey, monthReview, shiftMonth, weekReached } from './month';

const seed = buildSeed('Test');
const exMap = new Map(seed.exercises.map((e) => [e.id, e]));
const byName = (n: string) => seed.exercises.find((e) => e.name === n)!;
const day = (i: number) => seed.plan.days[i];

function doneWorkout(dayIndex: number, startedAt: number, opts: { weight?: number; reps?: number; gymId?: string; durationSec?: number } = {}): Workout {
  const entries = buildWorkoutEntries(day(dayIndex), exMap, () => ({ weight: opts.weight ?? 50, reps: opts.reps ?? 10 }));
  for (const e of entries.flatMap((x) => (x.kind === 'superset' ? x.children ?? [] : [x]))) e.sets.forEach((s) => (s.done = true));
  return {
    id: Math.random().toString(), gymId: opts.gymId ?? 'g', planId: seed.plan.id, dayId: day(dayIndex).id, dayName: day(dayIndex).name,
    startedAt, status: 'done', entries, bodyWeightKg: 70,
    summary: { durationSec: opts.durationSec ?? 3600, workingSets: 30, volumeKg: 5000, records: [] },
  };
}

describe('Zwei Tage hintereinander', () => {
  const today = new Date(2026, 10, 18, 17);
  const yesterdayA = doneWorkout(0, new Date(2026, 10, 17, 18).getTime());

  it('erkennt das Training von gestern, nicht von vorgestern', () => {
    const older = doneWorkout(1, new Date(2026, 10, 16, 18).getTime());
    expect(yesterdaysWorkouts([yesterdayA, older], today)).toEqual([yesterdayA]);
  });
  it('ohne Training gestern bleibt alles gleich', () => {
    const r = secondDayAdjust(day(1).entries, [], exMap);
    expect(r.changes).toHaveLength(0);
    expect(r.entries).toBe(day(1).entries);
  });
  it('Tag B nach Tag A: gleiche Übung wird reduziert, belastete Muskeln bekommen einen Satz weniger', () => {
    const r = secondDayAdjust(day(1).entries, [yesterdayA], exMap);
    const name = (id: string) => exMap.get(id)!.name;
    const byEx = new Map(r.changes.map((c) => [name(c.exerciseId), c]));
    // Seitheben war gestern dran und hat keine feste Alternative: 4 → 3 Sätze
    expect(byEx.get('Seitheben am Kabel')).toMatchObject({ kind: 'fewer', from: 4, to: 3, reason: 'gestern schon gemacht' });
    // Wadenheben war gestern dran
    expect(byEx.get('Wadenheben')?.kind).toBe('fewer');
    // Trizeps gestern belastet (Overhead 4 Sätze) → Pushdown einen Satz weniger
    expect(byEx.get('Trizeps Pushdown einarmig')).toMatchObject({ kind: 'fewer', reason: 'Muskel gestern schon belastet' });
    // Beinstrecker: Quadrizeps gestern über die Beinpresse belastet
    expect(byEx.get('Beinstrecker')?.kind).toBe('fewer');
    // Nie unter 2 Sätze
    for (const e of r.entries) if (e.kind === 'exercise') expect(e.sets).toBeGreaterThanOrEqual(2);
  });
  it('gleiche Übung mit fester Alternative wird getauscht', () => {
    // Gestern Tag C (Bayesian Curl), heute Tag A (auch Bayesian Curl) → Kurzhantel Curls auf der Schrägbank
    const yesterdayC = doneWorkout(2, new Date(2026, 10, 17, 18).getTime());
    const r = secondDayAdjust(day(0).entries, [yesterdayC], exMap);
    const swap = r.changes.find((c) => c.exerciseId === byName('Bayesian Curl').id)!;
    expect(swap.kind).toBe('swap');
    expect(exMap.get(swap.toExerciseId!)!.name).toBe('Kurzhantel Curls auf der Schrägbank');
    expect(r.entries.some((e) => e.exerciseId === byName('Kurzhantel Curls auf der Schrägbank').id)).toBe(true);
    // Brustpresse (A) hat als Alternative nichts; Brustpresse neutral war gestern dran, das ist eine andere Übung
    expect(r.entries.find((e) => e.exerciseId === byName('Brustpresse').id)).toBeDefined();
  });
});

describe('Kalender', () => {
  it('November 2026 beginnt an einem Sonntag: 6 Leerfelder, Wochen ab Montag', () => {
    const g = monthGrid(2026, 10);
    expect(g[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(g[0][6]!.getDate()).toBe(1);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });
  it('Monatsschlüssel und Blättern', () => {
    expect(monthKey(new Date(2026, 10, 18))).toBe('2026-11');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
  it('Woche mit Ziel erreicht', () => {
    const ws = [9, 11, 13].map((d) => doneWorkout(0, new Date(2026, 10, d, 18).getTime()));
    expect(weekReached(new Date(2026, 10, 10), ws, 3)).toBe(true);
    expect(weekReached(new Date(2026, 10, 17), ws, 3)).toBe(false);
  });
});

describe('Monatsrückblick', () => {
  const now = new Date(2026, 11, 1, 10);
  const nov = [2, 4, 6, 9, 11, 13, 16, 18, 23].map((d, i) => doneWorkout(i % 3, new Date(2026, 10, d, 18).getTime(), { weight: 100 + i * 2.5, reps: 10 }));
  const oct = [27, 29].map((d) => doneWorkout(0, new Date(2026, 9, d, 18).getTime()));
  const bw = [
    { id: '1', date: '2026-11-02', kg: 70.0 }, { id: '2', date: '2026-11-04', kg: 70.2 },
    { id: '3', date: '2026-11-25', kg: 70.8 }, { id: '4', date: '2026-11-28', kg: 71.0 },
  ];
  const r = monthReview('2026-11', [...nov, ...oct], bw, exMap, 3, now);

  it('zählt Trainings, Zeit und Vergleich zum Vormonat', () => {
    expect(r.workouts).toBe(9);
    expect(r.prevWorkouts).toBe(2);
    expect(r.durationSec).toBe(9 * 3600);
    expect(r.byDay).toEqual({ 'Tag A': 3, 'Tag B': 3, 'Tag C': 3 });
  });
  it('Wochenziel: abgeschlossene Wochen ab Montag im Monat, 2 von 4 erreicht', () => {
    // Montage im November 2026: 2., 9., 16., 23., 30. Die Woche ab 30. läuft am 1.12. noch.
    expect(r.weeks.total).toBe(4);
    expect(r.weeks.reached).toBe(2); // Wochen ab 2. und 9. je 3 Trainings, danach weniger
  });
  it('Körpergewicht: Anfang und Ende des Monats', () => {
    expect(r.body).toEqual({ start: 70.1, end: 70.9, change: 0.8 });
  });
  it('zeigt Übungen, die besser geworden sind', () => {
    expect(r.improvements.length).toBeGreaterThan(0);
    expect(r.improvements[0].to).toBeGreaterThan(r.improvements[0].from);
    expect(r.improvements.every((i) => i.pct > 0)).toBe(true);
  });
  it('laufende Woche ohne erreichtes Ziel zählt noch nicht', () => {
    const mid = monthReview('2026-11', [...nov, ...oct], bw, exMap, 3, new Date(2026, 10, 18, 12));
    // Wochen ab 2. und 9. abgeschlossen und erreicht, Woche ab 16. läuft noch (2 Trainings)
    expect(mid.weeks).toEqual({ reached: 2, total: 2 });
  });
  it('Muskeln: Sätze pro Woche im Schnitt', () => {
    // 9 Trainings, jedes mit 4 Sätzen Seitheben → 36 Sätze in 30 Tagen ≈ 8,4 pro Woche
    expect(r.weeklyMuscleSets.side_delts).toBeCloseTo(36 / (30 / 7), 1);
  });
});

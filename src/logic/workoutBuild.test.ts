import { describe, expect, it } from 'vitest';
import { buildWorkoutEntries, refreshWarmup } from './workoutBuild';
import { buildSeed } from '../db/seed';
import { findRecords, volumeKg } from './records';
import { trend } from './bodyweight';
import type { Workout } from '../db/types';

describe('Training aus dem Plan bauen', () => {
  const seed = buildSeed('Test');
  const exMap = new Map(seed.exercises.map((e) => [e.id, e]));
  const byName = (n: string) => seed.exercises.find((e) => e.name === n)!;

  it('Tag A hat Aufwärm-Block, Aufwärmsätze nur bei der ersten Übung je Muskelgruppe', () => {
    const dayA = seed.plan.days[0];
    const entries = buildWorkoutEntries(dayA, exMap, (id) => (id === byName('Beinpresse').id ? { weight: 120, reps: 12 } : { weight: 50, reps: 10 }));
    expect(entries[0].kind).toBe('warmup');
    const bein = entries.find((e) => e.exerciseId === byName('Beinpresse').id)!;
    expect(bein.sets.filter((s) => s.warmup).map((s) => s.weight)).toEqual([60, 85]);
    expect(bein.sets.filter((s) => !s.warmup)).toHaveLength(3);
    // Beinbeuger ist auch "Beine", aber ohne Aufwärmen
    const beuger = entries.find((e) => e.exerciseId === byName('Beinbeuger').id)!;
    expect(beuger.sets.some((s) => s.warmup)).toBe(false);
  });
  it('ohne letztes Gewicht keine Aufwärmsätze, sie kommen, sobald ein Gewicht da ist', () => {
    const dayA = seed.plan.days[0];
    const entries = buildWorkoutEntries(dayA, exMap, () => undefined);
    const bein = entries.find((e) => e.exerciseId === byName('Beinpresse').id)!;
    expect(bein.sets.some((s) => s.warmup)).toBe(false);
    bein.sets[0].weight = 100;
    const refreshed = refreshWarmup(bein, byName('Beinpresse'));
    expect(refreshed.sets.filter((s) => s.warmup).map((s) => s.weight)).toEqual([]); // ohne vorhandene Aufwärmsätze bleibt es dabei
  });
  it('Standwaage bekommt pro Satz links und rechts', () => {
    const dayA = seed.plan.days[0];
    const entries = buildWorkoutEntries(dayA, exMap, () => undefined);
    const sw = entries.find((e) => e.exerciseId === byName('Standwaage auf dem Bosu').id)!;
    expect(sw.sets).toHaveLength(6);
    expect(sw.sets.map((s) => s.side)).toEqual(['L', 'R', 'L', 'R', 'L', 'R']);
    expect(sw.sets[0].timeSec).toBe(30);
  });
  it('TRX-Übungen bekommen Skalenwerte statt Kilo', () => {
    const dayB = seed.plan.days[1];
    const entries = buildWorkoutEntries(dayB, exMap, () => undefined);
    const trx = entries.find((e) => e.exerciseId === byName('TRX einbeinige Kniebeuge, untere Hälfte').id)!;
    expect(trx.sets[0].trxPos).toBe(3);
    expect(trx.sets[0].weight).toBeUndefined();
  });

  it('erkennt Rekorde und berechnet Volumen', () => {
    const bp = byName('Beinpresse');
    const mk = (id: string, weight: number, reps: number, startedAt: number): Workout => ({
      id, gymId: 'g', planId: 'p', dayId: 'd', dayName: 'Tag A', startedAt, status: 'done', bodyWeightKg: 70,
      entries: [{ id: 'e', kind: 'exercise', exerciseId: bp.id, repMin: 8, repMax: 12, skipped: false,
        sets: [{ id: 's0', warmup: true, weight: 60, reps: 8, done: true }, { id: 's1', warmup: false, weight, reps, done: true }, { id: 's2', warmup: false, weight, reps, done: true }] }],
    });
    const old = mk('w1', 120, 12, 1);
    const today = mk('w2', 125, 10, 2);
    expect(volumeKg(today, exMap)).toBe(2500);
    const recs = findRecords(today, [old, today], exMap);
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe('weight');
    expect(recs[0].value).toBe(125);
    expect(findRecords(old, [old], exMap)).toHaveLength(0);
  });
});

describe('Körpergewicht', () => {
  it('Wochenschnitt und Hinweis bei Stillstand', () => {
    const e = [
      { id: '1', date: '2026-10-26', kg: 70 }, { id: '2', date: '2026-10-28', kg: 70.2 },
      { id: '3', date: '2026-11-02', kg: 70.1 }, { id: '4', date: '2026-11-04', kg: 70.1 },
      { id: '5', date: '2026-11-09', kg: 70.0 }, { id: '6', date: '2026-11-11', kg: 70.2 },
    ];
    const t = trend(e, 76, 0.2);
    expect(t.current).toBe(70.1);
    expect(t.stalled).toBe(true);
    expect(t.hint).toContain('200 kcal');
  });
  it('kein Hinweis, wenn es aufwärts geht', () => {
    const e = [
      { id: '1', date: '2026-10-26', kg: 70 }, { id: '3', date: '2026-11-02', kg: 70.3 }, { id: '5', date: '2026-11-09', kg: 70.5 },
    ];
    const t = trend(e, 76, 0.2);
    expect(t.stalled).toBe(false);
    expect(t.perWeek).toBeCloseTo(0.25, 2);
    expect(t.weeksToTarget).toBe(28);
  });
});

import { describe, expect, it } from 'vitest';
import { buildSeed } from '../db/seed';
import type { Exercise, Workout, WorkoutSet } from '../db/types';
import { buildWorkoutEntries } from './workoutBuild';
import { applyCatchUp, catchUp, plannedMuscleSets, targetStatus, thisWeek, workoutMuscleSets } from './volume';
import { daySec, trimToBudget } from './timeMode';
import { applyDeload, checkDeload } from './deload';
import { complaintCounts, gentlerAlternative } from './complaints';
import { suggest } from './progression';

const seed = buildSeed('Test');
const exMap = new Map(seed.exercises.map((e) => [e.id, e]));
const byName = (n: string) => seed.exercises.find((e) => e.name === n)!;
const DAY = 86400000;

/** Training aus einem Plan-Tag, alle Sätze erledigt. */
function doneWorkout(dayIndex: number, startedAt: number, opts: { weight?: number; reps?: number; skip?: string[]; gymId?: string } = {}): Workout {
  const entries = buildWorkoutEntries(seed.plan.days[dayIndex], exMap, () => ({ weight: opts.weight ?? 50, reps: opts.reps ?? 10 }));
  for (const e of entries.flatMap((x) => (x.kind === 'superset' ? x.children ?? [] : [x]))) {
    const name = exMap.get(e.exerciseId ?? '')?.name;
    if (name && opts.skip?.includes(name)) { e.skipped = true; continue; }
    e.sets.forEach((s) => (s.done = true));
  }
  return { id: Math.random().toString(), gymId: opts.gymId ?? 'g', planId: seed.plan.id, dayId: seed.plan.days[dayIndex].id, dayName: seed.plan.days[dayIndex].name, startedAt, status: 'done', entries, bodyWeightKg: 70 };
}

describe('Muskelkarte: harte Sätze je Muskel', () => {
  it('zählt Hauptmuskeln voll, unterstützende halb, Stabilisatoren nicht, Aufwärmsätze nicht', () => {
    const w = doneWorkout(0, Date.now());
    const sets = workoutMuscleSets([w], exMap);
    // Seitheben 4 Sätze Hauptmuskel
    expect(sets.side_delts).toBe(4);
    // Gesäß: Beinpresse 3 Sätze + Standwaage 3 Sätze (links und rechts zusammen), beide als Hauptmuskel
    expect(sets.glute_max).toBe(6);
    // Waden sind bei der Beinpresse nur Stabilisator, beim Beinbeuger unterstützend (3 × 0,5)
    expect(sets.gastrocnemius).toBe(1.5);
  });
  it('Standwaage zählt links und rechts zusammen als einen Satz', () => {
    const w = doneWorkout(0, Date.now());
    const only = { ...w, entries: w.entries.filter((e) => e.exerciseId === byName('Standwaage auf dem Bosu').id) };
    expect(workoutMuscleSets([only], exMap).glute_med).toBe(3);
  });
  it('Plan A, B, C ergibt pro Woche für Arme und Schultern Werte im Zielbereich', () => {
    let week = {} as Record<string, number>;
    for (const d of seed.plan.days) {
      const p = plannedMuscleSets(d.entries, exMap);
      for (const [k, v] of Object.entries(p)) week[k] = (week[k] ?? 0) + (v ?? 0);
    }
    expect(targetStatus('side_delts', week.side_delts)).toBe('ok');
    expect(targetStatus('biceps_long', week.biceps_long)).toBe('ok');
    expect(targetStatus('triceps_long', week.triceps_long)).toBe('ok');
    expect(targetStatus('gastrocnemius', 3)).toBe('untracked');
    expect(targetStatus('lats', 0)).toBe('none');
  });
  it('nimmt nur Trainings dieser Woche', () => {
    const now = new Date(2026, 10, 18);
    const ws = [doneWorkout(0, new Date(2026, 10, 16).getTime()), doneWorkout(1, new Date(2026, 10, 12).getTime())];
    expect(thisWeek(ws, now)).toHaveLength(1);
  });
});

describe('Nachholvorschlag', () => {
  it('Montag ohne Training: nichts fehlt', () => {
    expect(catchUp({ weekDone: [], plan: seed.plan, exMap, goal: 3, now: new Date(2026, 10, 16) })).toBeNull();
  });
  it('Sonntag, erst ein Training: schlägt Übungen vor, die die Lücke schließen, Arme und Schultern zuerst', () => {
    const plan = { ...seed.plan, nextDayIndex: 1 };
    const done = [doneWorkout(0, new Date(2026, 10, 16).getTime())];
    const r = catchUp({ weekDone: done, plan, exMap, goal: 3, now: new Date(2026, 10, 22) })!;
    expect(r).not.toBeNull();
    expect(r.sessionsLeft).toBe(1);
    expect(r.missing.length).toBeGreaterThan(0);
    expect(r.add.length + r.extra.length).toBeGreaterThan(0);
    // Neue Übungen stammen nicht aus Tag B, Zusatzsätze nur für Übungen aus Tag B
    const inB = new Set(seed.plan.days[1].entries.map((e) => e.exerciseId));
    for (const a of r.add) expect(inB.has(a.exerciseId)).toBe(false);
    for (const x of r.extra) expect(inB.has(x.exerciseId)).toBe(true);
    // Muskeln ohne Zielbereich (z. B. Rotatorenmanschette) tauchen nicht auf
    expect(r.missing.some((m) => m.id === 'rotator_cuff')).toBe(false);
  });
  it('ausgelassenes Seitheben: Zusatzsätze beim Seitheben, das heute ohnehin dran ist', () => {
    const plan = { ...seed.plan, nextDayIndex: 1 };
    const done = [doneWorkout(0, new Date(2026, 10, 16).getTime(), { skip: ['Seitheben am Kabel', 'Bayesian Curl'] })];
    const r = catchUp({ weekDone: done, plan, exMap, goal: 3, now: new Date(2026, 10, 17) })!;
    expect(r.skipped).toContain(byName('Seitheben am Kabel').id);
    expect(r.missing.some((m) => m.id === 'side_delts')).toBe(true);
    expect(r.extra.map((x) => x.exerciseId)).toContain(byName('Seitheben am Kabel').id);
    const applied = applyCatchUp(plan.days[1].entries, r);
    const sh = applied.find((e) => e.exerciseId === byName('Seitheben am Kabel').id)!;
    expect(sh.sets).toBeGreaterThan(4);
  });
  it('Wochenziel erreicht: kein Vorschlag', () => {
    const done = [0, 1, 2].map((i) => doneWorkout(i, new Date(2026, 10, 16 + i).getTime()));
    expect(catchUp({ weekDone: done, plan: seed.plan, exMap, goal: 3, now: new Date(2026, 10, 20) })).toBeNull();
  });
});

describe('Zeitmodus', () => {
  const dayA = seed.plan.days[0].entries;
  const name = (id?: string) => exMap.get(id ?? '')?.name;
  it('schätzt eine volle Einheit realistisch (über eine Stunde)', () => {
    expect(daySec(dayA, exMap) / 60).toBeGreaterThan(60);
    expect(daySec(dayA, exMap) / 60).toBeLessThan(120);
  });
  it('45 Minuten: behält Grundübungen sowie Arme und Schultern', () => {
    const r = trimToBudget(dayA, 45, exMap);
    expect(r.fits).toBe(true);
    expect(r.estimateSec).toBeLessThanOrEqual(45 * 60);
    const kept = r.entries.map((e) => name(e.exerciseId));
    for (const n of ['Beinpresse', 'Brustpresse', 'Rudern enger Griff', 'Seitheben am Kabel', 'Bayesian Curl', 'Trizeps Overhead am Kabel']) expect(kept).toContain(n);
    const gone = r.removed.map((e) => name(e.exerciseId));
    for (const n of ['Beinbeuger', 'Bauchroller auf den Knien', 'Standwaage auf dem Bosu']) expect(gone).toContain(n);
  });
  it('60 Minuten: kürzt weniger als 45 Minuten', () => {
    const r60 = trimToBudget(dayA, 60, exMap);
    const r45 = trimToBudget(dayA, 45, exMap);
    expect(r60.estimateSec).toBeGreaterThan(r45.estimateSec);
    expect(r60.fits).toBe(true);
  });
  it('reichlich Zeit: nichts wird gekürzt', () => {
    const r = trimToBudget(dayA, 180, exMap);
    expect(r.removed).toHaveLength(0);
    expect(r.reduced).toHaveLength(0);
  });
});

describe('Deload', () => {
  const now = new Date(2026, 10, 30).getTime();
  it('erkennt Stillstand bei mehreren Übungen über zwei Wochen', () => {
    const ws = [
      doneWorkout(0, now - 25 * DAY, { weight: 100, reps: 10 }),
      doneWorkout(0, now - 10 * DAY, { weight: 100, reps: 9 }),
      doneWorkout(0, now - 3 * DAY, { weight: 100, reps: 9 }),
    ];
    const r = checkDeload(ws, 'g', exMap, now);
    expect(r.flagged.length).toBeGreaterThanOrEqual(3);
    expect(r.suggest).toBe(true);
  });
  it('kein Hinweis, wenn es aufwärts geht', () => {
    const ws = [
      doneWorkout(0, now - 25 * DAY, { weight: 100, reps: 8 }),
      doneWorkout(0, now - 10 * DAY, { weight: 100, reps: 10 }),
      doneWorkout(0, now - 3 * DAY, { weight: 105, reps: 9 }),
    ];
    expect(checkDeload(ws, 'g', exMap, now).suggest).toBe(false);
  });
  it('anderes Gym zählt nicht', () => {
    const ws = [
      doneWorkout(0, now - 25 * DAY, { weight: 100, reps: 10, gymId: 'alt' }),
      doneWorkout(0, now - 10 * DAY, { weight: 100, reps: 9 }),
      doneWorkout(0, now - 3 * DAY, { weight: 100, reps: 9 }),
    ];
    expect(checkDeload(ws, 'g', exMap, now).flagged).toHaveLength(0);
  });
  it('leichte Woche: weniger Sätze, 10 % weniger Gewicht', () => {
    const entries = buildWorkoutEntries(seed.plan.days[0], exMap, () => ({ weight: 100, reps: 10 }));
    const light = applyDeload(entries, exMap);
    const bp = light.find((e) => e.exerciseId === byName('Beinpresse').id)!;
    const work = bp.sets.filter((s) => !s.warmup);
    expect(work).toHaveLength(2);
    expect(work[0].weight).toBe(90);
    const sw = light.find((e) => e.exerciseId === byName('Standwaage auf dem Bosu').id)!;
    expect(sw.sets).toHaveLength(4); // 2 × links und rechts
  });
});

describe('Beschwerden', () => {
  const lm = byName('Landmine Press einarmig, kniend');
  const mk = (complaint: 'Schmerz' | 'Knacken' | null, t: number): Workout => {
    const set: WorkoutSet = { id: 's', warmup: false, done: true, weight: 20, reps: 10, complaint };
    return { id: String(t), gymId: 'g', planId: 'p', dayId: 'd', dayName: 'Tag C', startedAt: t, status: 'done', entries: [{ id: 'e', kind: 'exercise', exerciseId: lm.id, repMin: 8, repMax: 12, skipped: false, sets: [set, { ...set, id: 's2' }] }] };
  };
  it('zählt Trainings mit Beschwerde, nicht einzelne Sätze', () => {
    const c = complaintCounts([mk('Knacken', 1), mk(null, 2), mk('Schmerz', 3)]);
    expect(c.get(lm.id)?.count).toBe(2);
    expect(c.get(lm.id)?.kinds).toEqual(['Knacken', 'Schmerz']);
  });
  it('schlägt zuerst die feste Alternative vor', () => {
    const c = complaintCounts([mk('Knacken', 1), mk('Knacken', 2)]);
    expect(gentlerAlternative(lm, seed.exercises, c)?.name).toBe('Schrägbankdrücken an der Maschine');
  });
  it('ohne feste Alternative: Übung mit gleichem Hauptmuskel', () => {
    const solo: Exercise = { ...lm, alternatives: [] };
    const alt = gentlerAlternative(solo, seed.exercises, new Map());
    expect(alt?.muscles?.some((m) => m.role === 3 && (m.id === 'chest_upper' || m.id === 'front_delts'))).toBe(true);
  });
});

describe('Progression mit "Wie war der Satz?"', () => {
  const ex = byName('Beinpresse');
  const s = (reps: number, feel?: WorkoutSet['feel']): WorkoutSet => ({ id: Math.random().toString(), warmup: false, done: true, weight: 100, reps, feel });
  it('fast oben und letzter Satz leicht: mehr Gewicht', () => {
    const r = suggest(ex, [s(12), s(12), s(11, 'easy')], 8, 12);
    expect(r.action).toBe('increase');
    expect(r.text).toContain('leicht');
  });
  it('zu früh am Versagen: halten', () => {
    const r = suggest(ex, [s(10, 'fail'), s(9), s(8)], 8, 12);
    expect(r.action).toBe('hold');
    expect(r.text).toContain('Satz 1');
  });
  it('ohne Gefühl bleibt die alte Regel', () => {
    expect(suggest(ex, [s(12), s(12), s(12)], 8, 12).action).toBe('increase');
    expect(suggest(ex, [s(12), s(12), s(11)], 8, 12).action).toBe('hold');
  });
});

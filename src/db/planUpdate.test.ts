import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { updatePlanNov2026 } from './planUpdate';
import type { Exercise, Plan } from './types';

const NEW_NAMES = ['Brustpresse an der Maschine mit neutralem Griff', 'Rückenstrecker an der Maschine', 'Wadenheben'];

/** Simuliert eine bestehende Installation mit dem alten Plan. */
function oldInstall(): { exercises: Exercise[]; plan: Plan } {
  const seed = buildSeed('Test');
  const removed = new Set(seed.exercises.filter((e) => NEW_NAMES.includes(e.name)).map((e) => e.id));
  const exercises = seed.exercises
    .filter((e) => !removed.has(e.id))
    .map((e) => ({
      ...e,
      name: e.name === 'Schrägbank Brustpresse an der Maschine' ? 'Schrägbankdrücken an der Maschine' : e.name,
      alternatives: e.alternatives.filter((id) => !removed.has(id)),
    }));
  const id = (n: string) => exercises.find((e) => e.name === n)!.id;
  const plan: Plan = {
    ...seed.plan,
    nextDayIndex: 2,
    days: seed.plan.days.map((d) => ({
      ...d,
      entries: [
        { id: 'w', kind: 'warmup', label: 'Ausfallschritt mit Rotation', sets: 2, repMin: 6, repMax: 6 },
        { id: 'x', kind: 'exercise', exerciseId: id('Landmine Press einarmig, kniend'), sets: 3, repMin: 8, repMax: 12 },
        { id: 'y', kind: 'exercise', exerciseId: id('Standwaage auf dem Bosu'), sets: 3, repMin: 0, repMax: 0, timeSec: 30 },
      ],
    })),
  };
  return { exercises, plan };
}

function dayList(plan: Plan, exercises: Exercise[], i: number): string[] {
  return plan.days[i].entries.map((e) => {
    if (e.kind === 'warmup') return e.label!;
    const n = exercises.find((x) => x.id === e.exerciseId)!.name;
    return `${n} ${e.sets}`;
  });
}

describe('Plan-Update vom 18.11.2026 für bestehende Daten', () => {
  const before = oldInstall();
  const r = updatePlanNov2026(before.exercises, before.plan);

  it('Tag A in genau der gewünschten Reihenfolge', () => {
    expect(dayList(r.plan, r.exercises, 0)).toEqual([
      'Brustpresse 3', 'Rudern enger Griff 3', 'Ausfallschritt mit Rotation', 'Beinpresse 3', 'Seitheben am Kabel 4', 'Bayesian Curl 4',
      'Trizeps Overhead am Kabel 4', 'Beinbeuger 4', 'Wadenheben 3', 'Bauchroller auf den Knien 3', 'Standwaage auf dem Bosu 3',
    ]);
  });
  it('Tag B in genau der gewünschten Reihenfolge', () => {
    expect(dayList(r.plan, r.exercises, 1)).toEqual([
      'Klimmzüge 3', 'Schrägbank Brustpresse an der Maschine 3', 'TRX einbeinige Kniebeuge, untere Hälfte 3', 'Rückenstrecker an der Maschine 3',
      'Seitheben am Kabel 4', 'Reverse Butterfly 3', 'Seilcurls 4', 'Trizeps Pushdown einarmig 4', 'Beinstrecker 3', 'Wadenheben 3',
    ]);
  });
  it('Tag C in genau der gewünschten Reihenfolge, ohne Ausfallschritt, Standwaage und Landmine', () => {
    const c = dayList(r.plan, r.exercises, 2);
    expect(c).toEqual([
      'Brustpresse an der Maschine mit neutralem Griff 3', 'Latzug breiter Griff 3', 'Beinpresse 3', 'TRX Rudern mit erhöhten Füßen 3',
      'Butterfly einarmig an der Maschine 3', 'Seitheben am Kabel 4', 'Reverse Butterfly 3', 'Bayesian Curl 4', 'Trizeps Overhead am Kabel 4',
      'Beinbeuger 4', 'Bauchroller auf den Knien 3',
    ]);
  });
  it('Wiederholungsbereiche und Zeiten stimmen', () => {
    const a = r.plan.days[0].entries;
    const wade = a[8];
    expect([wade.repMin, wade.repMax]).toEqual([10, 15]);
    expect(a[10].timeSec).toBe(30);
    const roller = a[9];
    expect([roller.repMin, roller.repMax]).toEqual([0, 0]); // bis kurz vor Versagen
    const rs = r.plan.days[1].entries[3];
    expect([rs.repMin, rs.repMax]).toEqual([10, 15]);
  });
  it('legt neue Übungen genau einmal an und benennt die Schrägbank-Maschine um', () => {
    for (const n of NEW_NAMES) expect(r.exercises.filter((e) => e.name === n)).toHaveLength(1);
    expect(r.exercises.some((e) => e.name === 'Schrägbankdrücken an der Maschine')).toBe(false);
    const wade = r.exercises.find((e) => e.name === 'Wadenheben')!;
    expect(wade.muscles?.some((m) => m.id === 'gastrocnemius' && m.role === 3)).toBe(true);
  });
  it('alte Übungen bleiben in der Bibliothek, Tag-IDs und nächster Tag bleiben', () => {
    expect(r.exercises.some((e) => e.name === 'Landmine Press einarmig, kniend' && !e.archived)).toBe(true);
    expect(r.exercises.some((e) => e.name === 'Hyperextensions 45 Grad')).toBe(true);
    expect(r.plan.days.map((d) => d.id)).toEqual(before.plan.days.map((d) => d.id));
    expect(r.plan.nextDayIndex).toBe(2);
  });
  it('verknüpft die neuen festen Alternativen', () => {
    const byName = (n: string) => r.exercises.find((e) => e.name === n)!;
    expect(byName('Rückenstrecker an der Maschine').alternatives).toContain(byName('Hyperextensions 45 Grad').id);
    expect(byName('Brustpresse an der Maschine mit neutralem Griff').alternatives).toContain(byName('Landmine Press einarmig, kniend').id);
    expect(byName('Landmine Press einarmig, kniend').alternatives).toContain(byName('Schrägbank Brustpresse an der Maschine').id);
  });
  it('zweimal ausgeführt ändert nichts mehr an der Bibliothek', () => {
    const again = updatePlanNov2026(r.exercises, r.plan);
    expect(again.changed).toHaveLength(0);
    expect(again.exercises).toHaveLength(r.exercises.length);
    expect(dayList(again.plan, again.exercises, 1)).toEqual(dayList(r.plan, r.exercises, 1));
  });
  it('neue Installation bekommt denselben Plan', () => {
    const seed = buildSeed('Neu');
    expect(dayList(seed.plan, seed.exercises, 0)).toEqual(dayList(r.plan, r.exercises, 0));
    expect(dayList(seed.plan, seed.exercises, 1)).toEqual(dayList(r.plan, r.exercises, 1));
    expect(dayList(seed.plan, seed.exercises, 2)).toEqual(dayList(r.plan, r.exercises, 2));
  });
});

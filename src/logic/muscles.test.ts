import { describe, expect, it } from 'vitest';
import { buildSeed } from '../db/seed';
import { DEFAULT_MUSCLES, cycleRole, defaultMuscles, isKnownMuscle, musclesText } from './muscles';

describe('Muskeln je Übung', () => {
  it('jede Übung aus dem Startplan hat eine genaue Zuordnung mit mindestens einem Hauptmuskel', () => {
    const seed = buildSeed('Test');
    for (const e of seed.exercises) {
      expect(DEFAULT_MUSCLES[e.name], e.name).toBeDefined();
      expect(e.muscles?.some((m) => m.role === 3), e.name).toBe(true);
    }
  });
  it('unbekannte Übungen bekommen eine Zuordnung aus der Muskelgruppe', () => {
    const m = defaultMuscles('Irgendwas Neues', 'Trizeps');
    expect(m.map((x) => x.id)).toEqual(['triceps_long', 'triceps_lateral', 'triceps_medial']);
  });
  it('Tippen wechselt die Rolle: Haupt, unterstützend, Stabilisator, keine', () => {
    let list = cycleRole([], 'chest_mid');
    expect(list).toEqual([{ id: 'chest_mid', role: 3 }]);
    list = cycleRole(list, 'chest_mid'); expect(list[0].role).toBe(2);
    list = cycleRole(list, 'chest_mid'); expect(list[0].role).toBe(1);
    list = cycleRole(list, 'chest_mid'); expect(list).toEqual([]);
  });
  it('Kurztext nennt Haupt- und Nebenmuskeln', () => {
    expect(musclesText(DEFAULT_MUSCLES['Beinstrecker'])).toBe('Quadrizeps Mitte (Rectus femoris), Quadrizeps außen (Vastus lateralis), Quadrizeps innen (VMO)');
    expect(musclesText(DEFAULT_MUSCLES['Beinbeuger'])).toContain('unterstützend: Wade (Gastrocnemius)');
  });
  it('jeder Muskel aus der Zuordnung existiert in der Liste', () => {
    for (const [name, list] of Object.entries(DEFAULT_MUSCLES)) for (const x of list) expect(isKnownMuscle(x.id), `${name}: ${x.id}`).toBe(true);
  });
});

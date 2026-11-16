import { describe, expect, it } from 'vitest';
import { buildSeed } from '../db/seed';
import { DEFAULT_MUSCLES, cycleRole, defaultMuscles, musclesText } from './muscles';

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
    expect(m).toEqual([{ id: 'triceps', role: 3 }]);
  });
  it('Tippen wechselt die Rolle: Haupt, unterstützend, Stabilisator, keine', () => {
    let list = cycleRole([], 'chest');
    expect(list).toEqual([{ id: 'chest', role: 3 }]);
    list = cycleRole(list, 'chest'); expect(list[0].role).toBe(2);
    list = cycleRole(list, 'chest'); expect(list[0].role).toBe(1);
    list = cycleRole(list, 'chest'); expect(list).toEqual([]);
  });
  it('Kurztext nennt Haupt- und Nebenmuskeln', () => {
    expect(musclesText(DEFAULT_MUSCLES['Beinpresse'])).toBe('Oberschenkel vorn, Gesäß · unterstützend: Oberschenkel hinten, Innenschenkel · stabilisierend: Waden');
  });
});

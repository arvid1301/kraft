import { describe, expect, it } from 'vitest';
import { isEntryDone, move, nextOpenIndex, nextSupersetSet, pushToEnd, setSkipped } from './reorder';
import type { WorkoutEntry, WorkoutSet } from '../db/types';

const set = (done = false, warmup = false): WorkoutSet => ({ id: Math.random().toString(), warmup, done, weight: 10, reps: 10 });
const ex = (id: string, sets: WorkoutSet[] = [set(), set()]): WorkoutEntry => ({ id, kind: 'exercise', exerciseId: id, repMin: 8, repMax: 12, sets, skipped: false });
const superset = (id: string, a: WorkoutEntry, b: WorkoutEntry): WorkoutEntry => ({ id, kind: 'superset', repMin: 0, repMax: 0, sets: [], skipped: false, children: [a, b] });

describe('Umsortieren im Training', () => {
  it('verschiebt eine Übung an eine neue Position', () => {
    const list = [ex('a'), ex('b'), ex('c'), ex('d')];
    expect(move(list, 0, 2).map((e) => e.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(move(list, 3, 0).map((e) => e.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(move(list, 9, 0).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('"Gerät besetzt" schiebt die Übung ans Ende', () => {
    const list = [ex('a'), ex('b'), ex('c')];
    expect(pushToEnd(list, 0).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('Supersätze bleiben beim Verschieben als Block zusammen', () => {
    const ss = superset('ss', ex('curl'), ex('trizeps'));
    const list = [ex('a'), ss, ex('c')];
    const moved = move(list, 1, 2);
    expect(moved.map((e) => e.id)).toEqual(['a', 'c', 'ss']);
    expect(moved[2].children?.map((c) => c.id)).toEqual(['curl', 'trizeps']);
  });
  it('Überspringen markiert die Übung als erledigt', () => {
    const list = setSkipped([ex('a'), ex('b')], 0);
    expect(list[0].skipped).toBe(true);
    expect(isEntryDone(list[0])).toBe(true);
    expect(isEntryDone(list[1])).toBe(false);
  });
  it('erledigt heißt: alle Arbeitssätze abgehakt, Aufwärmsätze egal', () => {
    expect(isEntryDone(ex('a', [set(false, true), set(true), set(true)]))).toBe(true);
    expect(isEntryDone(ex('a', [set(true, true), set(true), set(false)]))).toBe(false);
  });
  it('springt zur nächsten offenen Übung', () => {
    const list = [ex('a', [set(true), set(true)]), ex('b'), ex('c')];
    expect(nextOpenIndex(list)).toBe(1);
    expect(nextOpenIndex(list, 2)).toBe(2);
    expect(nextOpenIndex([ex('a', [set(true)])])).toBe(-1);
  });
  it('wechselt im Supersatz zwischen beiden Übungen', () => {
    const a = ex('a', [set(true), set(), set()]);
    const b = ex('b', [set(), set(), set()]);
    expect(nextSupersetSet([a, b])).toEqual([1, 0]);
    b.sets[0].done = true;
    expect(nextSupersetSet([a, b])).toEqual([0, 1]);
    a.sets.forEach((s) => (s.done = true)); b.sets.forEach((s) => (s.done = true));
    expect(nextSupersetSet([a, b])).toBeNull();
  });
});

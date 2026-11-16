import { describe, expect, it } from 'vitest';
import { roundToStep, suggest } from './progression';
import type { Exercise, WorkoutSet } from '../db/types';

const ex = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'x', name: 'Beinpresse', muscle: 'Beine', input: 'kg', unilateral: false, notes: '', videoUrl: '',
  step: 5, restSec: 150, warmup: true, alternatives: [], archived: false, createdAt: 0, ...over,
});
const set = (weight: number, reps: number, warmup = false): WorkoutSet => ({ id: Math.random().toString(), warmup, weight, reps, done: true });

describe('Progression', () => {
  it('schlägt mehr Gewicht vor, wenn alle Sätze das obere Ende erreichen', () => {
    const s = suggest(ex(), [set(120, 12), set(120, 12), set(120, 12)], 8, 12);
    expect(s.action).toBe('increase');
    if (s.action === 'increase') { expect(s.weight).toBe(125); expect(s.delta).toBe(5); }
  });
  it('nutzt den Schritt der Übung (2,5 kg bei kleinen Übungen)', () => {
    const s = suggest(ex({ step: 2.5 }), [set(10, 20), set(10, 20), set(10, 20), set(10, 20)], 12, 20);
    expect(s.action).toBe('increase');
    if (s.action === 'increase') expect(s.weight).toBe(12.5);
  });
  it('hält das Gewicht, wenn ein Satz das untere Ende nicht erreicht', () => {
    const s = suggest(ex(), [set(120, 10), set(120, 8), set(120, 7)], 8, 12);
    expect(s.action).toBe('hold');
    if (s.action === 'hold') expect(s.weight).toBe(120);
    expect(s.text).toContain('halten');
  });
  it('hält das Gewicht, wenn die Sätze dazwischen liegen', () => {
    const s = suggest(ex(), [set(120, 12), set(120, 11), set(120, 9)], 8, 12);
    expect(s.action).toBe('hold');
  });
  it('ignoriert Aufwärmsätze und nicht abgehakte Sätze', () => {
    const s = suggest(ex(), [set(60, 8, true), set(120, 12), set(120, 12), { ...set(120, 3), done: false }], 8, 12);
    expect(s.action).toBe('increase');
  });
  it('gibt beim ersten Mal keinen Vorschlag', () => {
    expect(suggest(ex(), [], 8, 12).action).toBe('none');
  });
  it('gibt bei Zeit- und TRX-Übungen keinen Gewichtsvorschlag', () => {
    expect(suggest(ex({ input: 'trx' }), [set(0, 10)], 8, 10).action).toBe('none');
    expect(suggest(ex({ input: 'time' }), [set(0, 0)], 0, 0).action).toBe('none');
  });
  it('rundet auf den Schritt', () => {
    expect(roundToStep(123, 5)).toBe(125);
    expect(roundToStep(61.5, 2.5)).toBe(62.5);
    expect(roundToStep(7.3, 0)).toBe(7.5);
  });
});

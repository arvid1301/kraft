import { describe, expect, it } from 'vitest';
import { warmupSets } from './warmup';

describe('Aufwärmsätze', () => {
  it('berechnet 50 und 70 Prozent, gerundet auf 2,5 kg', () => {
    expect(warmupSets(120, 5)).toEqual([
      { weight: 60, reps: 8, pct: 50 },
      { weight: 85, reps: 5, pct: 70 },
    ]);
    expect(warmupSets(65, 5)).toEqual([
      { weight: 32.5, reps: 8, pct: 50 },
      { weight: 45, reps: 5, pct: 70 },
    ]);
  });
  it('liefert nur einen Aufwärmsatz bei leichten Gewichten', () => {
    expect(warmupSets(15, 2.5)).toEqual([{ weight: 10, reps: 8, pct: 70 }]);
  });
  it('liefert nichts ohne Arbeitsgewicht', () => {
    expect(warmupSets(0, 5)).toEqual([]);
  });
});

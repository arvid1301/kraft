// Aufwärmsätze: 50 % und 70 % des Arbeitsgewichts, gerundet auf 2,5 kg (oder den kleineren Übungsschritt).
import { roundToStep } from './progression';

export interface WarmupSet { weight: number; reps: number; pct: number }

export function warmupSets(workingWeight: number, step: number): WarmupSet[] {
  if (!workingWeight || workingWeight <= 0) return [];
  const s = step > 0 ? Math.min(step, 2.5) : 2.5;
  const w50 = Math.max(s, roundToStep(workingWeight * 0.5, s));
  const w70 = Math.max(s, roundToStep(workingWeight * 0.7, s));
  // Bei sehr leichten Gewichten reicht ein Aufwärmsatz
  if (workingWeight < 20 || w50 === w70) return [{ weight: w70, reps: 8, pct: 70 }];
  return [
    { weight: w50, reps: 8, pct: 50 },
    { weight: w70, reps: 5, pct: 70 },
  ];
}

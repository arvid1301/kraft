// Progressionsvorschlag aus den Arbeitssätzen des letzten Trainings.
import type { Exercise, WorkoutSet } from '../db/types';

export type Suggestion =
  | { action: 'increase'; weight: number; delta: number; text: string }
  | { action: 'hold'; weight: number; text: string }
  | { action: 'none'; text: string };

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 2) / 2;
  return Math.round(value / step) * step;
}

/** lastSets: Sätze des letzten Trainings an diesem Gym (Aufwärmsätze werden ignoriert). */
export function suggest(exercise: Exercise, lastSets: WorkoutSet[], repMin: number, repMax: number): Suggestion {
  const sets = lastSets.filter((s) => s.done && !s.warmup);
  if (sets.length === 0) return { action: 'none', text: 'Erstes Mal hier, Gewicht frei wählen' };
  if (exercise.input === 'time' || exercise.input === 'reps' || exercise.input === 'trx') {
    return { action: 'none', text: 'Letztes Mal wiederholen oder etwas steigern' };
  }
  const weights = sets.map((s) => s.weight ?? 0);
  const lastWeight = Math.max(...weights);
  const reps = sets.map((s) => s.reps ?? 0);
  const step = exercise.step > 0 ? exercise.step : 2.5;

  if (repMax > 0 && reps.every((r) => r >= repMax)) {
    const target = roundToStep(lastWeight + step, step);
    const delta = Math.round((target - lastWeight) * 100) / 100;
    return { action: 'increase', weight: target, delta, text: `Heute ${fmtKg(delta)} kg mehr versuchen: ${fmtKg(target)} kg` };
  }
  if (repMin > 0 && reps.some((r) => r < repMin)) {
    return { action: 'hold', weight: lastWeight, text: `${fmtKg(lastWeight)} kg halten, erst ${repMin} Wdh in allen Sätzen schaffen` };
  }
  return { action: 'hold', weight: lastWeight, text: `${fmtKg(lastWeight)} kg halten, Wiederholungen Richtung ${repMax} steigern` };
}

export function fmtKg(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

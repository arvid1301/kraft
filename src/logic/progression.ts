// Progressionsvorschlag aus den Arbeitssätzen des letzten Trainings, inklusive "Wie war der Satz?".
import type { Exercise, Feel, WorkoutSet } from '../db/types';

export type Suggestion =
  | { action: 'increase'; weight: number; delta: number; text: string }
  | { action: 'hold'; weight: number; text: string }
  | { action: 'none'; text: string };

export const FEELS: { value: Feel; label: string; hint: string }[] = [
  { value: 'easy', label: 'Leicht', hint: '3 oder mehr Wdh wären noch gegangen' },
  { value: 'good', label: 'Passt', hint: '1 bis 2 Wdh wären noch gegangen' },
  { value: 'hard', label: 'Hart', hint: 'Keine Wdh mehr drin' },
  { value: 'fail', label: 'Versagen', hint: 'Letzte Wdh nicht geschafft' },
];
export const FEEL_LABEL: Record<Feel, string> = { easy: 'Leicht', good: 'Passt', hard: 'Hart', fail: 'Versagen' };

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 2) / 2;
  return Math.round(value / step) * step;
}

/** lastSets: Sätze des letzten Trainings an diesem Gym (Aufwärmsätze werden ignoriert). */
export function suggest(exercise: Exercise, lastSets: WorkoutSet[], repMin: number, repMax: number): Suggestion {
  const sets = lastSets.filter((s) => s.done && !s.warmup);
  const noWeight = exercise.input === 'time' || exercise.input === 'reps' || exercise.input === 'trx';
  if (sets.length === 0) return { action: 'none', text: noWeight ? 'Erstes Mal hier' : 'Erstes Mal hier, Gewicht frei wählen' };
  const lastFeel = sets[sets.length - 1].feel;
  if (noWeight) {
    if (lastFeel === 'easy') return { action: 'none', text: 'Letzter Satz war leicht: heute schwerer machen' };
    return { action: 'none', text: 'Letztes Mal wiederholen oder etwas steigern' };
  }
  const weights = sets.map((s) => s.weight ?? 0);
  const lastWeight = Math.max(...weights);
  const reps = sets.map((s) => s.reps ?? 0);
  const step = exercise.step > 0 ? exercise.step : 2.5;
  const bw = exercise.input === 'bodyweight';
  // Bei Körpergewichtsübungen heißt 0 kg "ohne Zusatzgewicht"
  const kgText = (v: number) => (bw ? (v === 0 ? 'Körpergewicht' : `${v > 0 ? '+' : ''}${fmtKg(v)} kg`) : `${fmtKg(v)} kg`);
  const increase = (why: string): Suggestion => {
    const target = roundToStep(lastWeight + step, step);
    const delta = Math.round((target - lastWeight) * 100) / 100;
    const text = bw && lastWeight === 0
      ? `Heute ${fmtKg(target)} kg Zusatzgewicht versuchen${why}`
      : `Heute ${fmtKg(delta)} kg mehr versuchen: ${kgText(target)}${why}`;
    return { action: 'increase', weight: target, delta, text };
  };

  // Regel: alle Sätze am oberen Ende → mehr Gewicht
  if (repMax > 0 && reps.every((r) => r >= repMax)) return increase('');
  // Fast oben und der letzte Satz war leicht → es war noch Luft
  if (repMax > 0 && lastFeel === 'easy' && reps.every((r) => r >= repMax - 1)) return increase(' (letzter Satz war leicht)');

  // Schon vor dem letzten Satz am Versagen → halten
  const earlyFail = sets.slice(0, -1).findIndex((s) => s.feel === 'fail');
  if (earlyFail >= 0) {
    return { action: 'hold', weight: lastWeight, text: `${kgText(lastWeight)} halten, Satz ${earlyFail + 1} war schon am Versagen` };
  }
  if (repMin > 0 && reps.some((r) => r < repMin)) {
    return { action: 'hold', weight: lastWeight, text: `${kgText(lastWeight)} halten, erst ${repMin} Wdh in allen Sätzen schaffen` };
  }
  const tip = lastFeel === 'easy' ? ' · letzter Satz war leicht, näher ans Versagen gehen' : '';
  return { action: 'hold', weight: lastWeight, text: `${kgText(lastWeight)} halten, Wiederholungen Richtung ${repMax} steigern${tip}` };
}

export function fmtKg(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

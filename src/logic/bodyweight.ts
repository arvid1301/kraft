// Körpergewicht: Wochenschnitt und Trend.
import type { BodyWeight } from '../db/types';
import { weekKey } from './week';

export interface WeekAvg { week: string; avg: number; n: number }

export function weeklyAverages(entries: BodyWeight[]): WeekAvg[] {
  const m = new Map<string, number[]>();
  for (const e of entries) {
    const k = weekKey(new Date(e.date + 'T12:00:00'));
    m.set(k, [...(m.get(k) ?? []), e.kg]);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, avg: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100, n: v.length }));
}

export interface Trend {
  current?: number;         // aktueller Wochenschnitt
  perWeek?: number;         // Veränderung pro Woche (über die letzten bis zu 4 Wochen)
  stalled: boolean;         // 2 bis 3 Wochen kein Anstieg
  weeksToTarget?: number;
  hint?: string;
}

export function trend(entries: BodyWeight[], targetKg: number, ratePerWeek: number): Trend {
  const weeks = weeklyAverages(entries);
  if (weeks.length === 0) return { stalled: false };
  const current = weeks[weeks.length - 1].avg;
  const out: Trend = { current, stalled: false };
  if (weeks.length >= 2) {
    const window = weeks.slice(-4);
    const first = window[0], last = window[window.length - 1];
    const span = Math.max(1, window.length - 1);
    out.perWeek = Math.round(((last.avg - first.avg) / span) * 100) / 100;
    // Stillstand: über die letzten 3 Wochen (mindestens 2) kein Anstieg um 0,1 kg
    const recent = weeks.slice(-3);
    const rise = recent[recent.length - 1].avg - recent[0].avg;
    if (recent.length >= 2 && rise < 0.1 && current < targetKg) {
      out.stalled = true;
      out.hint = 'Dein Wochenschnitt steigt seit 2 bis 3 Wochen nicht. Iss etwa 200 kcal pro Tag mehr.';
    }
  }
  if (current < targetKg && ratePerWeek > 0) out.weeksToTarget = Math.ceil((targetKg - current) / ratePerWeek);
  return out;
}

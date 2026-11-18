// Monatsrückblick und Kalenderraster.
import type { BodyWeight, Exercise, PersonalRecord, Workout } from '../db/types';
import { allEntries } from './records';
import { sessionValue } from './deload';
import { workoutMuscleSets, type MuscleSets } from './volume';
import { startOfWeek } from './week';

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function parseMonthKey(k: string): { year: number; month: number } {
  const [y, m] = k.split('-').map(Number);
  return { year: y, month: m - 1 };
}
export function shiftMonth(k: string, by: number): string {
  const { year, month } = parseMonthKey(k);
  return monthKey(new Date(year, month + by, 1));
}
export function monthLabel(k: string): string {
  const { year, month } = parseMonthKey(k);
  return new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

/** Kalenderraster: Wochen ab Montag, Tage außerhalb des Monats sind null. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function inMonth(t: number, year: number, month: number): boolean {
  const d = new Date(t);
  return d.getFullYear() === year && d.getMonth() === month;
}

export interface Improvement { exerciseId: string; name: string; from: number; to: number; unit: string; pct: number }

export interface MonthReview {
  key: string;
  workouts: number;
  prevWorkouts: number;
  durationSec: number;
  sets: number;
  volumeKg: number;
  records: PersonalRecord[];
  weeks: { reached: number; total: number };
  byDay: Record<string, number>;
  body?: { start: number; end: number; change: number };
  weeklyMuscleSets: MuscleSets;   // Durchschnitt pro Woche
  improvements: Improvement[];
}

const unitOf = (ex: Exercise) => (ex.input === 'kg' || ex.input === 'bodyweight' ? 'kg' : ex.input === 'time' ? 's' : 'Wdh');

export function monthReview(key: string, workouts: Workout[], bodyWeights: BodyWeight[], exMap: Map<string, Exercise>, goal: number, now: Date = new Date()): MonthReview {
  const { year, month } = parseMonthKey(key);
  const done = workouts.filter((w) => w.status === 'done');
  const inThis = done.filter((w) => inMonth(w.startedAt, year, month)).sort((a, b) => a.startedAt - b.startedAt);
  const prev = parseMonthKey(shiftMonth(key, -1));
  const prevCount = done.filter((w) => inMonth(w.startedAt, prev.year, prev.month)).length;

  // Wochen, deren Montag in diesem Monat liegt und die schon begonnen haben
  let reached = 0, total = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    if (day.getDay() !== 1 || day > now) continue;
    const end = new Date(day); end.setDate(end.getDate() + 7);
    const count = done.filter((w) => w.startedAt >= day.getTime() && w.startedAt < end.getTime()).length;
    // Eine laufende Woche zählt erst, wenn sie vorbei ist oder das Ziel schon erreicht wurde
    if (end > now && count < goal) continue;
    total++;
    if (count >= goal) reached++;
  }

  const byDay: Record<string, number> = {};
  for (const w of inThis) byDay[w.dayName] = (byDay[w.dayName] ?? 0) + 1;

  // Körpergewicht: Schnitt der ersten und letzten 7 Tage mit Einträgen im Monat
  const bw = bodyWeights.filter((b) => inMonth(new Date(b.date + 'T12:00:00').getTime(), year, month)).sort((a, b) => a.date.localeCompare(b.date));
  let body: MonthReview['body'];
  if (bw.length >= 2) {
    const avg = (xs: BodyWeight[]) => xs.reduce((a, b) => a + b.kg, 0) / xs.length;
    const firstDay = new Date(bw[0].date + 'T12:00:00').getTime();
    const lastDay = new Date(bw[bw.length - 1].date + 'T12:00:00').getTime();
    const start = avg(bw.filter((b) => new Date(b.date + 'T12:00:00').getTime() < firstDay + 7 * 864e5));
    const end = avg(bw.filter((b) => new Date(b.date + 'T12:00:00').getTime() > lastDay - 7 * 864e5));
    body = { start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10, change: Math.round((end - start) * 10) / 10 };
  }

  // Muskeln: Sätze pro Woche im Schnitt (bis heute, im laufenden Monat)
  const lastDay = Math.min(daysInMonth, inMonth(now.getTime(), year, month) ? now.getDate() : daysInMonth);
  const weeksCount = Math.max(1, lastDay / 7);
  const monthSets = workoutMuscleSets(inThis, exMap);
  const weeklyMuscleSets: MuscleSets = {};
  for (const [k, v] of Object.entries(monthSets)) (weeklyMuscleSets as Record<string, number>)[k] = Math.round(((v ?? 0) / weeksCount) * 10) / 10;

  // Fortschritt je Übung: erstes gegen letztes Training im Monat, gleiches Gym
  const series = new Map<string, { t: number; v: number }[]>();
  for (const w of inThis) {
    if (w.deload) continue;
    for (const e of allEntries(w)) {
      const ex = e.exerciseId ? exMap.get(e.exerciseId) : undefined;
      if (!ex) continue;
      const v = sessionValue(e, ex, w.bodyWeightKg ?? 70);
      if (v <= 0) continue;
      const k = `${w.gymId}|${ex.id}`;
      series.set(k, [...(series.get(k) ?? []), { t: w.startedAt, v }]);
    }
  }
  const improvements: Improvement[] = [];
  for (const [k, pts] of series) {
    if (pts.length < 2) continue;
    const ex = exMap.get(k.split('|')[1])!;
    const from = pts[0].v, to = pts[pts.length - 1].v;
    if (to <= from) continue;
    improvements.push({ exerciseId: ex.id, name: ex.name, from: Math.round(from * 10) / 10, to: Math.round(to * 10) / 10, unit: unitOf(ex), pct: Math.round(((to - from) / from) * 1000) / 10 });
  }
  improvements.sort((a, b) => b.pct - a.pct);

  return {
    key,
    workouts: inThis.length,
    prevWorkouts: prevCount,
    durationSec: inThis.reduce((a, w) => a + (w.summary?.durationSec ?? 0), 0),
    sets: inThis.reduce((a, w) => a + (w.summary?.workingSets ?? 0), 0),
    volumeKg: inThis.reduce((a, w) => a + (w.summary?.volumeKg ?? 0), 0),
    records: inThis.flatMap((w) => w.summary?.records ?? []),
    weeks: { reached, total },
    byDay,
    body,
    weeklyMuscleSets,
    improvements: improvements.slice(0, 6),
  };
}

/** Ob eine Kalenderwoche das Wochenziel erreicht hat. */
export function weekReached(monday: Date, workouts: Workout[], goal: number): boolean {
  const start = startOfWeek(monday).getTime();
  const end = start + 7 * 864e5;
  return workouts.filter((w) => w.status === 'done' && w.startedAt >= start && w.startedAt < end).length >= goal;
}

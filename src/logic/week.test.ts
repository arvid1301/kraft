import { describe, expect, it } from 'vitest';
import { daysSince, startOfWeek, weekStats } from './week';

const d = (y: number, m: number, day: number, h = 10) => new Date(y, m - 1, day, h).getTime();

describe('Wochenziel und Serie', () => {
  it('Woche beginnt am Montag', () => {
    expect(startOfWeek(new Date(2026, 10, 15)).getDate()).toBe(9); // So 15.11.2026 -> Mo 9.11.
    expect(startOfWeek(new Date(2026, 10, 16)).getDate()).toBe(16); // Mo bleibt Mo
  });
  it('zählt Trainings der aktuellen Woche', () => {
    const now = new Date(2026, 10, 18); // Mi 18.11.
    const s = weekStats([d(2026, 11, 16), d(2026, 11, 17), d(2026, 11, 10)], 3, now);
    expect(s.thisWeek).toBe(2);
    expect(s.goalReachedThisWeek).toBe(false);
  });
  it('Serie zählt volle Wochen, laufende Woche erst wenn Ziel erreicht', () => {
    const now = new Date(2026, 10, 18);
    const weeks = [
      d(2026, 11, 2), d(2026, 11, 4), d(2026, 11, 6),      // KW 2.11. voll
      d(2026, 11, 9), d(2026, 11, 11), d(2026, 11, 13),    // KW 9.11. voll
      d(2026, 11, 16),                                     // laufende Woche 1 von 3
    ];
    expect(weekStats(weeks, 3, now).streakWeeks).toBe(2);
    const full = [...weeks, d(2026, 11, 17), d(2026, 11, 18)];
    expect(weekStats(full, 3, now).streakWeeks).toBe(3);
  });
  it('Serie bricht bei einer Lücke ab', () => {
    const now = new Date(2026, 10, 18);
    const w = [d(2026, 10, 26), d(2026, 10, 28), d(2026, 10, 30), d(2026, 11, 9), d(2026, 11, 11), d(2026, 11, 13)];
    expect(weekStats(w, 3, now).streakWeeks).toBe(1);
  });
  it('zwei Trainings an einem Tag zählen beide, drei Tage hintereinander auch', () => {
    const now = new Date(2026, 10, 18);
    expect(weekStats([d(2026, 11, 16), d(2026, 11, 17), d(2026, 11, 18)], 3, now).goalReachedThisWeek).toBe(true);
  });
  it('Tage seit dem letzten Training', () => {
    expect(daysSince(d(2026, 11, 15, 22), new Date(2026, 10, 18, 8))).toBe(3);
    expect(daysSince(undefined)).toBeNull();
  });
});

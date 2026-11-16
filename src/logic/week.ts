// Wochenziel und Serie. Woche läuft Montag bis Sonntag.
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Mo=0
  x.setDate(x.getDate() - day);
  return x;
}
export function weekKey(d: Date): string {
  const s = startOfWeek(d);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

export interface WeekStats { thisWeek: number; goal: number; streakWeeks: number; goalReachedThisWeek: boolean }

/** workoutDates: Startzeitpunkte abgeschlossener Trainings. */
export function weekStats(workoutDates: number[], goal: number, now: Date = new Date()): WeekStats {
  const counts = new Map<string, number>();
  for (const t of workoutDates) {
    const k = weekKey(new Date(t));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const thisWeek = counts.get(weekKey(now)) ?? 0;
  const reached = thisWeek >= goal;
  // Serie: aktuelle Woche zählt nur, wenn Ziel schon erreicht, sonst ab letzter Woche zurück.
  let streak = 0;
  const cursor = startOfWeek(now);
  if (!reached) cursor.setDate(cursor.getDate() - 7);
  while ((counts.get(weekKey(cursor)) ?? 0) >= goal) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
    if (streak > 520) break;
  }
  return { thisWeek, goal, streakWeeks: streak, goalReachedThisWeek: reached };
}

export function daysSince(t: number | undefined, now: Date = new Date()): number | null {
  if (!t) return null;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d = new Date(t);
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

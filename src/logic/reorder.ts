// Umsortieren im Training. Supersätze sind ein Eintrag und bleiben so automatisch zusammen.
import type { WorkoutEntry } from '../db/types';

export function move<T>(list: T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  const target = Math.max(0, Math.min(out.length, to));
  out.splice(target, 0, item);
  return out;
}

/** "Gerät besetzt": Übung ans Ende schieben. */
export function pushToEnd(entries: WorkoutEntry[], index: number): WorkoutEntry[] {
  return move(entries, index, entries.length - 1);
}

export function setSkipped(entries: WorkoutEntry[], index: number, skipped = true): WorkoutEntry[] {
  return entries.map((e, i) => (i === index ? { ...e, skipped } : e));
}

export function entrySets(e: WorkoutEntry) {
  return e.kind === 'superset' ? (e.children ?? []).flatMap((c) => c.sets) : e.sets;
}

export function isEntryDone(e: WorkoutEntry): boolean {
  if (e.skipped) return true;
  const sets = entrySets(e).filter((s) => !s.warmup);
  return sets.length > 0 && sets.every((s) => s.done);
}

/** Nächste offene Übung ab Position start (für den automatischen Sprung). -1 wenn alles erledigt. */
export function nextOpenIndex(entries: WorkoutEntry[], start = 0): number {
  for (let i = start; i < entries.length; i++) if (!isEntryDone(entries[i])) return i;
  for (let i = 0; i < start; i++) if (!isEntryDone(entries[i])) return i;
  return -1;
}

/** Im Supersatz: A Satz 1, B Satz 1, A Satz 2, B Satz 2 ... Liefert [childIndex, setIndex] des nächsten offenen Satzes. */
export function nextSupersetSet(children: WorkoutEntry[]): [number, number] | null {
  const max = Math.max(0, ...children.map((c) => c.sets.length));
  for (let s = 0; s < max; s++) {
    for (let c = 0; c < children.length; c++) {
      const set = children[c].sets[s];
      if (set && !set.done) return [c, s];
    }
  }
  return null;
}

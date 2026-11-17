// Datenbank-Zugriffe, die mehrere Bildschirme brauchen.
import { db, uid } from './db';
import type { BackupFile, Exercise, PlanDay, PlanEntry, Settings, Workout, WorkoutEntry } from './types';
import { applyDeload } from '../logic/deload';
import { buildWorkoutEntries, type LastLookup, type LastPerformance } from '../logic/workoutBuild';
import { allEntries, findRecords, volumeKg, workingSets } from '../logic/records';
import { DB_VERSION } from './db';

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main'))!;
}
export async function patchSettings(p: Partial<Settings>) {
  await db.settings.update('main', p);
}

export async function exerciseMap(): Promise<Map<string, Exercise>> {
  const all = await db.exercises.toArray();
  return new Map(all.map((e) => [e.id, e]));
}

/** Letzte Werte je Übung an einem Gym (aus abgeschlossenen Trainings, neueste zuerst). */
export async function lastLookup(gymId: string): Promise<LastLookup> {
  const done = await db.workouts.where('gymId').equals(gymId).and((w) => w.status === 'done').toArray();
  done.sort((a, b) => b.startedAt - a.startedAt);
  const cache = new Map<string, LastPerformance | undefined>();
  return (exerciseId: string) => {
    if (cache.has(exerciseId)) return cache.get(exerciseId);
    let found: LastPerformance | undefined;
    for (const w of done) {
      const e = allEntries(w).find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done && !s.warmup));
      if (e) {
        const sets = e.sets.filter((s) => s.done && !s.warmup);
        const top = sets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a), sets[0]);
        found = { weight: top.weight, reps: top.reps, trxPos: top.trxPos, trxHelp: top.trxHelp, timeSec: top.timeSec };
        break;
      }
    }
    cache.set(exerciseId, found);
    return found;
  };
}

/** Alle Arbeitssätze des letzten Trainings mit dieser Übung an diesem Gym (für Progression und "Letztes Mal"). */
export async function lastSets(gymId: string, exerciseId: string) {
  const done = await db.workouts.where('gymId').equals(gymId).and((w) => w.status === 'done').toArray();
  done.sort((a, b) => b.startedAt - a.startedAt);
  for (const w of done) {
    const e = allEntries(w).find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done && !s.warmup));
    if (e) return { workout: w, sets: e.sets.filter((s) => s.done && !s.warmup) };
  }
  return null;
}

export async function activeWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first();
}

export async function startWorkout(day: PlanDay, planId: string, opts: { entries?: PlanEntry[]; timeBudgetMin?: number; catchUp?: boolean } = {}): Promise<Workout> {
  const s = await getSettings();
  const exMap = await exerciseMap();
  const last = await lastLookup(s.currentGymId);
  const latestBw = (await db.bodyWeights.orderBy('date').reverse().first())?.kg;
  const deload = !!s.deloadUntil && s.deloadUntil > Date.now();
  let entries = buildWorkoutEntries({ ...day, entries: opts.entries ?? day.entries }, exMap, last);
  if (deload) entries = applyDeload(entries, exMap);
  const w: Workout = {
    id: uid(), gymId: s.currentGymId, planId, dayId: day.id, dayName: day.name, startedAt: Date.now(), status: 'active',
    entries, bodyWeightKg: latestBw, timeBudgetMin: opts.timeBudgetMin, deload: deload || undefined, catchUp: opts.catchUp || undefined,
  };
  await db.workouts.add(w);
  return w;
}

export async function saveWorkout(w: Workout) {
  await db.workouts.put(w);
}

export async function finishWorkout(w: Workout): Promise<Workout> {
  const exMap = await exerciseMap();
  const history = await db.workouts.where('gymId').equals(w.gymId).and((x) => x.status === 'done').toArray();
  const endedAt = Date.now();
  const done: Workout = {
    ...w, status: 'done', endedAt,
    summary: {
      durationSec: Math.round((endedAt - w.startedAt) / 1000),
      workingSets: workingSets(w).length,
      volumeKg: volumeKg(w, exMap),
      records: findRecords({ ...w, status: 'done' }, history, exMap),
    },
  };
  await db.workouts.put(done);
  // Nächsten Tag im Plan weiterschalten
  const plan = await db.plans.get(w.planId);
  if (plan) {
    const idx = plan.days.findIndex((d) => d.id === w.dayId);
    if (idx >= 0) await db.plans.put({ ...plan, nextDayIndex: (idx + 1) % plan.days.length });
  }
  return done;
}

/** Alle Trainings mit dieser Übung an diesem Gym, neueste zuerst. */
export async function exerciseHistory(gymId: string, exerciseId: string, limit = 12) {
  const done = await db.workouts.where('gymId').equals(gymId).and((w) => w.status === 'done').toArray();
  done.sort((a, b) => b.startedAt - a.startedAt);
  const out: { workout: Workout; entry: WorkoutEntry }[] = [];
  for (const w of done) {
    const e = allEntries(w).find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done && !s.warmup));
    if (e) out.push({ workout: w, entry: e });
    if (out.length >= limit) break;
  }
  return out;
}

export async function discardWorkout(w: Workout) {
  await db.workouts.delete(w.id);
}

export function hasAnyDoneSet(w: Workout): boolean {
  return allEntries(w).some((e) => e.sets.some((s) => s.done));
}

export function entryName(e: WorkoutEntry, exMap: Map<string, Exercise>): string {
  if (e.kind === 'warmup') return e.label ?? 'Aufwärmen';
  if (e.kind === 'superset') return (e.children ?? []).map((c) => entryName(c, exMap)).join(' + ');
  return exMap.get(e.exerciseId ?? '')?.name ?? 'Übung';
}

export async function exportBackup(): Promise<string> {
  const file: BackupFile = {
    app: 'kraft', version: DB_VERSION, exportedAt: new Date().toISOString(),
    gyms: await db.gyms.toArray(), exercises: await db.exercises.toArray(), plans: await db.plans.toArray(),
    workouts: await db.workouts.toArray(), machineSettings: await db.machineSettings.toArray(),
    bodyWeights: await db.bodyWeights.toArray(), settings: await db.settings.toArray(),
  };
  await patchSettings({ lastBackupAt: Date.now() });
  file.settings = await db.settings.toArray();
  return JSON.stringify(file);
}

export async function importBackup(text: string): Promise<{ workouts: number; exercises: number }> {
  const f = JSON.parse(text) as BackupFile;
  if (f.app !== 'kraft' || !Array.isArray(f.exercises) || !Array.isArray(f.plans)) throw new Error('Das ist keine Kraft-Backup-Datei.');
  await db.transaction('rw', [db.gyms, db.exercises, db.plans, db.workouts, db.machineSettings, db.bodyWeights, db.settings], async () => {
    await Promise.all([db.gyms.clear(), db.exercises.clear(), db.plans.clear(), db.workouts.clear(), db.machineSettings.clear(), db.bodyWeights.clear(), db.settings.clear()]);
    await db.gyms.bulkAdd(f.gyms ?? []);
    await db.exercises.bulkAdd(f.exercises);
    await db.plans.bulkAdd(f.plans);
    await db.workouts.bulkAdd(f.workouts ?? []);
    await db.machineSettings.bulkAdd(f.machineSettings ?? []);
    await db.bodyWeights.bulkAdd(f.bodyWeights ?? []);
    await db.settings.bulkAdd(f.settings ?? []);
  });
  return { workouts: (f.workouts ?? []).length, exercises: f.exercises.length };
}

export async function wipeAll() {
  await db.delete();
  location.reload();
}

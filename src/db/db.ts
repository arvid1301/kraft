import Dexie, { type Table } from 'dexie';
import type { BodyWeight, Exercise, Gym, MachineSetting, Plan, Settings, Workout } from './types';

import { defaultMuscles, isKnownMuscle } from '../logic/muscles';

export const DB_VERSION = 3;

export class KraftDB extends Dexie {
  gyms!: Table<Gym, string>;
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, string>;
  workouts!: Table<Workout, string>;
  machineSettings!: Table<MachineSetting, string>;
  bodyWeights!: Table<BodyWeight, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('kraft');
    // Neue Versionen werden hier als weitere .version(n) ergänzt; Dexie migriert automatisch.
    const stores = {
      gyms: 'id, name',
      exercises: 'id, name, muscle, archived',
      plans: 'id',
      workouts: 'id, gymId, status, startedAt',
      machineSettings: 'id, gymId, exerciseId',
      bodyWeights: 'id, date',
      settings: 'id',
    };
    this.version(1).stores(stores);
    // Version 2: genaue Muskeln je Übung nachtragen
    this.version(2).stores(stores).upgrade((tx) =>
      tx.table('exercises').toCollection().modify((e: Exercise) => {
        if (!e.muscles || e.muscles.length === 0) e.muscles = defaultMuscles(e.name, e.muscle);
      }),
    );
    // Version 3: feinere Muskelliste (einzelne Köpfe). Alte, grobe Zuordnungen werden ersetzt.
    this.version(3).stores(stores).upgrade((tx) =>
      tx.table('exercises').toCollection().modify((e: Exercise) => {
        const fine = (e.muscles ?? []).filter((x) => isKnownMuscle(x.id));
        if (fine.length === 0 || fine.length < (e.muscles ?? []).length) e.muscles = defaultMuscles(e.name, e.muscle);
      }),
    );
  }
}

export const db = new KraftDB();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

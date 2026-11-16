import Dexie, { type Table } from 'dexie';
import type { BodyWeight, Exercise, Gym, MachineSetting, Plan, Settings, Workout } from './types';

export const DB_VERSION = 1;

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
    this.version(DB_VERSION).stores({
      gyms: 'id, name',
      exercises: 'id, name, muscle, archived',
      plans: 'id',
      workouts: 'id, gymId, status, startedAt',
      machineSettings: 'id, gymId, exerciseId',
      bodyWeights: 'id, date',
      settings: 'id',
    });
  }
}

export const db = new KraftDB();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

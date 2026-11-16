// Datenmodell. Jede Tabelle hat eine Versionsnummer in der Datenbank (siehe db.ts),
// damit Version 2 und 3 später Felder ergänzen können, ohne Daten zu verlieren.

export type MuscleGroup =
  | 'Beine' | 'Brust' | 'Rücken' | 'Schultern' | 'Bizeps' | 'Trizeps' | 'Bauch' | 'Gesäß' | 'Waden' | 'Ganzkörper';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Gesäß', 'Bauch', 'Waden', 'Ganzkörper',
];

// Wie wird ein Satz eingetragen?
// kg: Gewicht + Wiederholungen | bodyweight: Zusatzgewicht (kann 0 sein) + Wdh
// trx: Fußposition (1-5) + Armhilfe (1-5) + Wdh | time: Sekunden (ggf. pro Seite) | reps: nur Wiederholungen
export type InputKind = 'kg' | 'bodyweight' | 'trx' | 'time' | 'reps';

export interface Gym {
  id: string;
  name: string;
  createdAt: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  input: InputKind;
  unilateral: boolean;      // einarmig / einbeinig
  notes: string;            // Ausführungshinweise
  videoUrl: string;
  step: number;             // Progressionsschritt in kg
  restSec: number;          // Pause nach einem Satz
  warmup: boolean;          // Aufwärmsätze vor der Übung
  alternatives: string[];   // feste Alternativen (Exercise-IDs)
  archived: boolean;
  createdAt: number;
  // Reserviert für Version 2/3
  complaints?: { date: string; kind: 'Schmerz' | 'Knacken' }[];
}

export type EntryKind = 'exercise' | 'superset' | 'warmup';

export interface PlanEntry {
  id: string;
  kind: EntryKind;
  exerciseId?: string;      // bei exercise
  label?: string;           // bei warmup (Text) und superset (optional)
  sets: number;
  repMin: number;
  repMax: number;           // repMax 0 = "bis kurz vor Versagen"
  timeSec?: number;         // bei Zeitübungen
  children?: PlanEntry[];   // bei superset: genau zwei exercise-Einträge
}

export interface PlanDay {
  id: string;
  name: string;             // "Tag A"
  entries: PlanEntry[];
}

export interface Plan {
  id: string;
  name: string;
  days: PlanDay[];
  nextDayIndex: number;     // welcher Tag ist als Nächstes dran
}

export interface WorkoutSet {
  id: string;
  warmup: boolean;          // Aufwärmsatz, zählt nicht als Arbeitssatz
  weight?: number;          // kg bzw. Zusatzgewicht
  reps?: number;
  trxPos?: number;          // 1-5
  trxHelp?: number;         // 1-5
  timeSec?: number;
  side?: 'L' | 'R';
  done: boolean;
  doneAt?: number;
  complaint?: 'Schmerz' | 'Knacken' | null; // Version 2
}

export interface WorkoutEntry {
  id: string;
  kind: EntryKind;
  exerciseId?: string;
  label?: string;
  repMin: number;
  repMax: number;
  timeSec?: number;
  sets: WorkoutSet[];
  children?: WorkoutEntry[];
  skipped: boolean;
  swappedFromId?: string;   // wenn heute getauscht
}

export interface Workout {
  id: string;
  gymId: string;
  planId: string;
  dayId: string;
  dayName: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'done' | 'aborted';
  entries: WorkoutEntry[];
  bodyWeightKg?: number;    // für Volumen bei Körpergewichtsübungen
  summary?: WorkoutSummary;
}

export interface WorkoutSummary {
  durationSec: number;
  workingSets: number;
  volumeKg: number;
  records: PersonalRecord[];
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  kind: 'weight' | 'e1rm' | 'reps' | 'time';
  value: number;
  reps?: number;
  weight?: number;
  previous?: number;
}

export interface MachineSetting {
  id: string;               // `${gymId}:${exerciseId}`
  gymId: string;
  exerciseId: string;
  fields: { label: string; value: string }[];
  updatedAt: number;
}

export interface BodyWeight {
  id: string;               // Datum YYYY-MM-DD
  date: string;
  kg: number;
}

export interface Settings {
  id: 'main';
  weeklyGoal: number;       // 3
  targetKg: number;         // 76
  ratePerWeek: number;      // 0.2
  currentGymId: string;
  lastBackupAt?: number;
  sound: boolean;
  keepAwake: boolean;
  installedAt: number;
  // Version 2: Protein, Kreatin, Schlaf
}

export interface BackupFile {
  app: 'kraft';
  version: number;
  exportedAt: string;
  gyms: Gym[];
  exercises: Exercise[];
  plans: Plan[];
  workouts: Workout[];
  machineSettings: MachineSetting[];
  bodyWeights: BodyWeight[];
  settings: Settings[];
}

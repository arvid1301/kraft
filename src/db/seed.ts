// Startdaten: Übungsbibliothek und Plan A/B/C. Werden nur beim allerersten Start angelegt.
import { db, uid } from './db';
import type { Exercise, Plan, PlanEntry, Settings, Gym } from './types';
import { defaultMuscles } from '../logic/muscles';

type Spec = Omit<Exercise, 'id' | 'createdAt' | 'archived' | 'alternatives' | 'muscles'> & { key: string };

const BIG = 150;   // Pause große Übungen 2:30
const SMALL = 90;  // Pause kleine Übungen

const EXERCISES: Spec[] = [
  { key: 'beinpresse', name: 'Beinpresse', muscle: 'Beine', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: true, notes: 'Füße schulterbreit, Knie in Richtung Zehen, nicht ganz durchstrecken.', videoUrl: '' },
  { key: 'brustpresse', name: 'Brustpresse', muscle: 'Brust', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: true, notes: 'Schulterblätter zusammen und nach unten, Ellbogen etwa 45 Grad.', videoUrl: '' },
  { key: 'rudern_eng', name: 'Rudern enger Griff', muscle: 'Rücken', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: true, notes: 'Brust raus, Ellbogen eng am Körper nach hinten ziehen, kurz halten.', videoUrl: '' },
  { key: 'seitheben_kabel', name: 'Seitheben am Kabel', muscle: 'Schultern', input: 'kg', unilateral: true, step: 2.5, restSec: SMALL, warmup: false, notes: 'Leicht nach vorn gebeugt, Arm bis Schulterhöhe, oben kurz halten.', videoUrl: '' },
  { key: 'bayesian_curl', name: 'Bayesian Curl', muscle: 'Bizeps', input: 'kg', unilateral: true, step: 2.5, restSec: SMALL, warmup: false, notes: 'Am Kabel, Arm hinter dem Körper, Oberarm bleibt zurück, volle Streckung.', videoUrl: '' },
  { key: 'trizeps_overhead', name: 'Trizeps Overhead am Kabel', muscle: 'Trizeps', input: 'kg', unilateral: false, step: 2.5, restSec: SMALL, warmup: false, notes: 'Ellbogen zeigen nach vorn, volle Dehnung unten.', videoUrl: '' },
  { key: 'beinbeuger', name: 'Beinbeuger', muscle: 'Beine', input: 'kg', unilateral: false, step: 5, restSec: SMALL, warmup: false, notes: 'Langsam ablassen, unten nicht ganz strecken.', videoUrl: '' },
  { key: 'bauchroller', name: 'Bauchroller auf den Knien', muscle: 'Bauch', input: 'reps', unilateral: false, step: 0, restSec: SMALL, warmup: false, notes: 'Becken leicht gekippt, Rücken nicht durchhängen lassen.', videoUrl: '' },
  { key: 'standwaage_bosu', name: 'Standwaage auf dem Bosu', muscle: 'Gesäß', input: 'time', unilateral: true, step: 0, restSec: 30, warmup: false, notes: 'Hüfte gerade, Blick nach unten, Standbein leicht gebeugt.', videoUrl: '' },
  { key: 'klimmzuege', name: 'Klimmzüge', muscle: 'Rücken', input: 'bodyweight', unilateral: false, step: 2.5, restSec: BIG, warmup: true, notes: 'Brust zur Stange, unten fast ganz hängen lassen.', videoUrl: '' },
  { key: 'hyperextensions', name: 'Hyperextensions 45 Grad', muscle: 'Gesäß', input: 'bodyweight', unilateral: false, step: 2.5, restSec: BIG, warmup: false, notes: 'Mit Gesäß hochdrücken, oben nicht überstrecken.', videoUrl: '' },
  { key: 'kabelfly_unten', name: 'Kabelfly einarmig von unten nach oben', muscle: 'Brust', input: 'kg', unilateral: true, step: 2.5, restSec: SMALL, warmup: false, notes: 'Bogen von unten außen nach oben innen, oben anspannen.', videoUrl: '' },
  { key: 'reverse_butterfly', name: 'Reverse Butterfly', muscle: 'Schultern', input: 'kg', unilateral: false, step: 2.5, restSec: SMALL, warmup: false, notes: 'Hintere Schulter, Arme leicht gebeugt, nicht schwingen.', videoUrl: '' },
  { key: 'seilcurls', name: 'Seilcurls', muscle: 'Bizeps', input: 'kg', unilateral: false, step: 2.5, restSec: SMALL, warmup: false, notes: 'Ellbogen fest, oben Handflächen nach außen drehen.', videoUrl: '' },
  { key: 'trizeps_pushdown_einarmig', name: 'Trizeps Pushdown einarmig', muscle: 'Trizeps', input: 'kg', unilateral: true, step: 2.5, restSec: SMALL, warmup: false, notes: 'Ellbogen leicht hinter dem Körper, unten voll strecken.', videoUrl: '' },
  { key: 'beinstrecker', name: 'Beinstrecker', muscle: 'Beine', input: 'kg', unilateral: false, step: 5, restSec: SMALL, warmup: false, notes: 'Oben kurz halten, langsam ablassen.', videoUrl: '' },
  { key: 'trx_kniebeuge', name: 'TRX einbeinige Kniebeuge, untere Hälfte', muscle: 'Beine', input: 'trx', unilateral: true, step: 0, restSec: SMALL, warmup: false, notes: 'Nur die untere Hälfte, Knie stabil, mit den Armen nur so viel helfen wie nötig.', videoUrl: '' },
  { key: 'latzug_breit', name: 'Latzug breiter Griff', muscle: 'Rücken', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: true, notes: 'Ellbogen nach unten außen ziehen, Brust zur Stange.', videoUrl: '' },
  { key: 'landmine_press', name: 'Landmine Press einarmig, kniend', muscle: 'Brust', input: 'kg', unilateral: true, step: 2.5, restSec: BIG, warmup: true, notes: 'Halbkniend, Schulterblatt frei nach vorn drücken.', videoUrl: '' },
  { key: 'trx_rudern', name: 'TRX Rudern mit erhöhten Füßen', muscle: 'Rücken', input: 'trx', unilateral: false, step: 0, restSec: SMALL, warmup: false, notes: 'Körper gerade wie ein Brett, Schulterblätter zusammen.', videoUrl: '' },
  { key: 'butterfly_einarmig', name: 'Butterfly einarmig an der Maschine', muscle: 'Brust', input: 'kg', unilateral: true, step: 2.5, restSec: SMALL, warmup: false, notes: 'Innen kurz anspannen, langsam öffnen.', videoUrl: '' },
  // Alternativen, die nicht im Plan stehen
  { key: 'schraegbank_maschine', name: 'Schrägbankdrücken an der Maschine', muscle: 'Brust', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: true, notes: 'Lehne 30 Grad.', videoUrl: '' },
  { key: 'kh_curl_schraegbank', name: 'Kurzhantel Curls auf der Schrägbank', muscle: 'Bizeps', input: 'kg', unilateral: false, step: 2, restSec: SMALL, warmup: false, notes: 'Arme hängen lassen, volle Dehnung.', videoUrl: '' },
  { key: 'trizeps_pushdown_seil', name: 'Trizeps Pushdown mit Seil', muscle: 'Trizeps', input: 'kg', unilateral: false, step: 2.5, restSec: SMALL, warmup: false, notes: 'Unten die Enden auseinanderziehen.', videoUrl: '' },
  { key: 'pull_through', name: 'Pull Through am Kabel', muscle: 'Gesäß', input: 'kg', unilateral: false, step: 5, restSec: BIG, warmup: false, notes: 'Hüfte nach hinten schieben, mit dem Gesäß nach vorn drücken.', videoUrl: '' },
];

const ALTERNATIVES: [string, string][] = [
  ['klimmzuege', 'latzug_breit'],
  ['landmine_press', 'schraegbank_maschine'],
  ['bayesian_curl', 'kh_curl_schraegbank'],
  ['kabelfly_unten', 'butterfly_einarmig'],
  ['trizeps_pushdown_einarmig', 'trizeps_pushdown_seil'],
  ['hyperextensions', 'pull_through'],
];

// Plan: [key, sets, repMin, repMax] oder Aufwärm-Block oder Zeitübung
type DaySpec = (
  | { ex: string; sets: number; min: number; max: number; time?: number }
  | { warmup: string; sets: number; min: number; max: number }
)[];

const WARMUP_LUNGES = { warmup: 'Ausfallschritt mit Rotation', sets: 2, min: 6, max: 6 };

const DAY_A: DaySpec = [
  WARMUP_LUNGES,
  { ex: 'beinpresse', sets: 3, min: 8, max: 12 },
  { ex: 'brustpresse', sets: 3, min: 8, max: 10 },
  { ex: 'rudern_eng', sets: 3, min: 8, max: 12 },
  { ex: 'seitheben_kabel', sets: 4, min: 12, max: 20 },
  { ex: 'bayesian_curl', sets: 4, min: 8, max: 12 },
  { ex: 'trizeps_overhead', sets: 4, min: 8, max: 12 },
  { ex: 'beinbeuger', sets: 3, min: 10, max: 12 },
  { ex: 'bauchroller', sets: 3, min: 0, max: 0 },
  { ex: 'standwaage_bosu', sets: 3, min: 0, max: 0, time: 30 },
];
const DAY_B: DaySpec = [
  { ex: 'klimmzuege', sets: 3, min: 6, max: 10 },
  { ex: 'hyperextensions', sets: 3, min: 10, max: 15 },
  { ex: 'kabelfly_unten', sets: 3, min: 10, max: 15 },
  { ex: 'seitheben_kabel', sets: 4, min: 12, max: 20 },
  { ex: 'reverse_butterfly', sets: 3, min: 12, max: 15 },
  { ex: 'seilcurls', sets: 4, min: 10, max: 12 },
  { ex: 'trizeps_pushdown_einarmig', sets: 4, min: 10, max: 12 },
  { ex: 'beinstrecker', sets: 3, min: 10, max: 15 },
  { ex: 'trx_kniebeuge', sets: 3, min: 8, max: 10 },
  { ex: 'standwaage_bosu', sets: 3, min: 0, max: 0, time: 30 },
];
const DAY_C: DaySpec = [
  WARMUP_LUNGES,
  { ex: 'latzug_breit', sets: 3, min: 8, max: 12 },
  { ex: 'landmine_press', sets: 3, min: 8, max: 12 },
  { ex: 'beinpresse', sets: 3, min: 8, max: 12 },
  { ex: 'trx_rudern', sets: 3, min: 8, max: 12 },
  { ex: 'butterfly_einarmig', sets: 3, min: 10, max: 15 },
  { ex: 'seitheben_kabel', sets: 4, min: 12, max: 20 },
  { ex: 'reverse_butterfly', sets: 3, min: 12, max: 15 },
  { ex: 'bayesian_curl', sets: 4, min: 8, max: 12 },
  { ex: 'trizeps_overhead', sets: 4, min: 8, max: 12 },
  { ex: 'beinbeuger', sets: 3, min: 10, max: 12 },
  { ex: 'bauchroller', sets: 3, min: 0, max: 0 },
  { ex: 'standwaage_bosu', sets: 3, min: 0, max: 0, time: 30 },
];

export function buildSeed(gymName: string) {
  const now = Date.now();
  const ids = new Map<string, string>();
  for (const e of EXERCISES) ids.set(e.key, uid());
  const altMap = new Map<string, string[]>();
  for (const [a, b] of ALTERNATIVES) {
    altMap.set(a, [...(altMap.get(a) ?? []), ids.get(b)!]);
    altMap.set(b, [...(altMap.get(b) ?? []), ids.get(a)!]);
  }
  const exercises: Exercise[] = EXERCISES.map(({ key, ...rest }) => ({
    ...rest, id: ids.get(key)!, alternatives: altMap.get(key) ?? [], archived: false, createdAt: now,
    muscles: defaultMuscles(rest.name, rest.muscle),
  }));

  const toEntries = (spec: DaySpec): PlanEntry[] => spec.map((s) =>
    'warmup' in s
      ? { id: uid(), kind: 'warmup', label: s.warmup, sets: s.sets, repMin: s.min, repMax: s.max }
      : { id: uid(), kind: 'exercise', exerciseId: ids.get(s.ex)!, sets: s.sets, repMin: s.min, repMax: s.max, timeSec: s.time },
  );
  const plan: Plan = {
    id: uid(), name: 'Ganzkörper 3x', nextDayIndex: 0,
    days: [
      { id: uid(), name: 'Tag A', entries: toEntries(DAY_A) },
      { id: uid(), name: 'Tag B', entries: toEntries(DAY_B) },
      { id: uid(), name: 'Tag C', entries: toEntries(DAY_C) },
    ],
  };
  const gym: Gym = { id: uid(), name: gymName, createdAt: now };
  const settings: Settings = {
    id: 'main', weeklyGoal: 3, targetKg: 76, ratePerWeek: 0.2, currentGymId: gym.id, sound: true, keepAwake: true, installedAt: now,
  };
  return { exercises, plan, gym, settings };
}

export async function ensureSeeded(): Promise<void> {
  const s = await db.settings.get('main');
  if (s) return;
  const seed = buildSeed('Mein Gym');
  await db.transaction('rw', [db.gyms, db.exercises, db.plans, db.settings], async () => {
    await db.gyms.add(seed.gym);
    await db.exercises.bulkAdd(seed.exercises);
    await db.plans.add(seed.plan);
    await db.settings.add(seed.settings);
  });
}

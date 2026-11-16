// Detaillierte Muskeln je Übung: welche Muskeln arbeiten, und wie stark.
import type { MuscleGroup } from '../db/types';

export type MuscleId =
  | 'chest' | 'front_delts' | 'side_delts' | 'rear_delts' | 'traps' | 'upper_back' | 'lats' | 'lower_back'
  | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques' | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'calves';

// 3 = Hauptmuskel, 2 = unterstützend, 1 = Stabilisator
export type Role = 1 | 2 | 3;
export interface MuscleRole { id: MuscleId; role: Role }
export type MuscleRoleLike = { id: string; role: Role };

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: 'Brust', front_delts: 'Vordere Schulter', side_delts: 'Seitliche Schulter', rear_delts: 'Hintere Schulter',
  traps: 'Nacken (Trapez)', upper_back: 'Oberer Rücken', lats: 'Latissimus', lower_back: 'Unterer Rücken',
  biceps: 'Bizeps', triceps: 'Trizeps', forearms: 'Unterarme', abs: 'Bauch', obliques: 'Seitlicher Bauch',
  glutes: 'Gesäß', quads: 'Oberschenkel vorn', hamstrings: 'Oberschenkel hinten', adductors: 'Innenschenkel', calves: 'Waden',
};
export const MUSCLE_IDS = Object.keys(MUSCLE_LABELS) as MuscleId[];

export const ROLE_LABELS: Record<Role, string> = { 3: 'Hauptmuskel', 2: 'Unterstützend', 1: 'Stabilisator' };

type Spec = Partial<Record<MuscleId, Role>>;
const m = (spec: Spec): MuscleRole[] => (Object.entries(spec) as [MuscleId, Role][]).map(([id, role]) => ({ id, role }));

/** Zuordnung für die Übungen aus dem Startplan, nach Name. */
export const DEFAULT_MUSCLES: Record<string, MuscleRole[]> = {
  'Beinpresse': m({ quads: 3, glutes: 3, hamstrings: 2, adductors: 2, calves: 1 }),
  'Brustpresse': m({ chest: 3, front_delts: 2, triceps: 2 }),
  'Rudern enger Griff': m({ lats: 3, upper_back: 3, biceps: 2, rear_delts: 2, forearms: 1 }),
  'Seitheben am Kabel': m({ side_delts: 3, traps: 2, front_delts: 1 }),
  'Bayesian Curl': m({ biceps: 3, forearms: 2 }),
  'Trizeps Overhead am Kabel': m({ triceps: 3, forearms: 1 }),
  'Beinbeuger': m({ hamstrings: 3, calves: 2 }),
  'Bauchroller auf den Knien': m({ abs: 3, obliques: 2, lats: 2, front_delts: 1 }),
  'Standwaage auf dem Bosu': m({ glutes: 3, hamstrings: 2, lower_back: 2, calves: 1, abs: 1 }),
  'Klimmzüge': m({ lats: 3, biceps: 2, upper_back: 2, forearms: 2, rear_delts: 1 }),
  'Hyperextensions 45 Grad': m({ lower_back: 3, glutes: 3, hamstrings: 2 }),
  'Kabelfly einarmig von unten nach oben': m({ chest: 3, front_delts: 2, biceps: 1 }),
  'Reverse Butterfly': m({ rear_delts: 3, upper_back: 2, traps: 2 }),
  'Seilcurls': m({ biceps: 3, forearms: 2 }),
  'Trizeps Pushdown einarmig': m({ triceps: 3, forearms: 1 }),
  'Beinstrecker': m({ quads: 3 }),
  'TRX einbeinige Kniebeuge, untere Hälfte': m({ quads: 3, glutes: 3, hamstrings: 2, adductors: 2, calves: 1, abs: 1 }),
  'Latzug breiter Griff': m({ lats: 3, upper_back: 2, biceps: 2, rear_delts: 1 }),
  'Landmine Press einarmig, kniend': m({ chest: 3, front_delts: 3, triceps: 2, obliques: 1, abs: 1 }),
  'TRX Rudern mit erhöhten Füßen': m({ upper_back: 3, lats: 3, biceps: 2, rear_delts: 2, abs: 1 }),
  'Butterfly einarmig an der Maschine': m({ chest: 3, front_delts: 2 }),
  'Schrägbankdrücken an der Maschine': m({ chest: 3, front_delts: 2, triceps: 2 }),
  'Kurzhantel Curls auf der Schrägbank': m({ biceps: 3, forearms: 2 }),
  'Trizeps Pushdown mit Seil': m({ triceps: 3, forearms: 1 }),
  'Pull Through am Kabel': m({ glutes: 3, hamstrings: 3, lower_back: 2 }),
};

/** Grobe Zuordnung aus der Muskelgruppe, wenn nichts Genaueres bekannt ist. */
export const GROUP_MUSCLES: Record<MuscleGroup, MuscleRole[]> = {
  Brust: m({ chest: 3, front_delts: 2, triceps: 2 }),
  Rücken: m({ lats: 3, upper_back: 3, biceps: 2 }),
  Schultern: m({ side_delts: 3, front_delts: 2, rear_delts: 2 }),
  Bizeps: m({ biceps: 3, forearms: 2 }),
  Trizeps: m({ triceps: 3 }),
  Beine: m({ quads: 3, glutes: 3, hamstrings: 2 }),
  Gesäß: m({ glutes: 3, hamstrings: 2 }),
  Bauch: m({ abs: 3, obliques: 2 }),
  Waden: m({ calves: 3 }),
  Ganzkörper: m({ quads: 2, glutes: 2, chest: 2, upper_back: 2, abs: 2 }),
};

export function defaultMuscles(name: string, group: MuscleGroup): MuscleRole[] {
  return DEFAULT_MUSCLES[name] ?? GROUP_MUSCLES[group] ?? [];
}

export function rolesMap(list: MuscleRoleLike[] | undefined): Partial<Record<MuscleId, Role>> {
  const out: Partial<Record<MuscleId, Role>> = {};
  for (const x of list ?? []) out[x.id as MuscleId] = x.role;
  return out;
}

/** Kurztext: "Oberschenkel vorn, Gesäß · unterstützend: Oberschenkel hinten" */
export function musclesText(list: MuscleRoleLike[] | undefined): string {
  if (!list?.length) return '';
  const by = (r: Role) => list.filter((x) => x.role === r).map((x) => MUSCLE_LABELS[x.id as MuscleId]);
  const parts = [by(3).join(', ')];
  if (by(2).length) parts.push(`unterstützend: ${by(2).join(', ')}`);
  if (by(1).length) parts.push(`stabilisierend: ${by(1).join(', ')}`);
  return parts.filter(Boolean).join(' · ');
}

/** Nächste Rolle beim Antippen: keine → Haupt → unterstützend → Stabilisator → keine */
export function cycleRole(list: MuscleRoleLike[], id: MuscleId): MuscleRoleLike[] {
  const cur = list.find((x) => x.id === id)?.role;
  const next: Role | undefined = cur === undefined ? 3 : cur === 3 ? 2 : cur === 2 ? 1 : undefined;
  const rest = list.filter((x) => x.id !== id);
  return next ? [...rest, { id, role: next }] : rest;
}

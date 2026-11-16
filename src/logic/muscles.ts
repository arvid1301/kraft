// Detaillierte Muskeln je Übung: welche Muskeln arbeiten, und wie stark.
import type { MuscleGroup } from '../db/types';

export type MuscleId =
  // Brust & Schulter
  | 'chest_upper' | 'chest_mid' | 'chest_lower' | 'front_delts' | 'side_delts' | 'rear_delts' | 'rotator_cuff' | 'serratus'
  // Rücken
  | 'traps_upper' | 'traps_mid' | 'traps_lower' | 'rhomboids' | 'lats' | 'teres_major' | 'erectors'
  // Arme
  | 'biceps_long' | 'biceps_short' | 'brachialis' | 'brachioradialis' | 'forearm_flexors' | 'forearm_extensors'
  | 'triceps_long' | 'triceps_lateral' | 'triceps_medial'
  // Rumpf & Hüfte
  | 'abs_upper' | 'abs_lower' | 'obliques' | 'hip_flexors' | 'glute_max' | 'glute_med'
  // Beine
  | 'rectus_femoris' | 'vastus_lateralis' | 'vastus_medialis' | 'adductors' | 'biceps_femoris' | 'semis'
  | 'gastrocnemius' | 'soleus' | 'tibialis';

// 3 = Hauptmuskel, 2 = unterstützend, 1 = Stabilisator
export type Role = 1 | 2 | 3;
export interface MuscleRole { id: MuscleId; role: Role }
export type MuscleRoleLike = { id: string; role: Role };

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest_upper: 'Brust oben (clavicular)', chest_mid: 'Brust Mitte (sternal)', chest_lower: 'Brust unten',
  front_delts: 'Vordere Schulter', side_delts: 'Seitliche Schulter', rear_delts: 'Hintere Schulter',
  rotator_cuff: 'Rotatorenmanschette', serratus: 'Sägemuskel (Serratus)',
  traps_upper: 'Trapez oben (Nacken)', traps_mid: 'Trapez Mitte', traps_lower: 'Trapez unten', rhomboids: 'Rhomboiden',
  lats: 'Latissimus', teres_major: 'Teres major', erectors: 'Rückenstrecker',
  biceps_long: 'Bizeps langer Kopf (außen)', biceps_short: 'Bizeps kurzer Kopf (innen)', brachialis: 'Brachialis',
  brachioradialis: 'Brachioradialis', forearm_flexors: 'Unterarm-Beuger', forearm_extensors: 'Unterarm-Strecker',
  triceps_long: 'Trizeps langer Kopf', triceps_lateral: 'Trizeps äußerer Kopf', triceps_medial: 'Trizeps innerer Kopf',
  abs_upper: 'Bauch oben', abs_lower: 'Bauch unten', obliques: 'Seitlicher Bauch', hip_flexors: 'Hüftbeuger',
  glute_max: 'Großer Gesäßmuskel', glute_med: 'Mittlerer Gesäßmuskel',
  rectus_femoris: 'Quadrizeps Mitte (Rectus femoris)', vastus_lateralis: 'Quadrizeps außen (Vastus lateralis)',
  vastus_medialis: 'Quadrizeps innen (VMO)', adductors: 'Adduktoren (Innenschenkel)',
  biceps_femoris: 'Beinbeuger außen (Biceps femoris)', semis: 'Beinbeuger innen (Semitendinosus)',
  gastrocnemius: 'Wade (Gastrocnemius)', soleus: 'Wade tief (Soleus)', tibialis: 'Schienbeinmuskel',
};
export const MUSCLE_IDS = Object.keys(MUSCLE_LABELS) as MuscleId[];

export const MUSCLE_REGIONS: { title: string; ids: MuscleId[] }[] = [
  { title: 'Brust & Schulter', ids: ['chest_upper', 'chest_mid', 'chest_lower', 'front_delts', 'side_delts', 'rear_delts', 'rotator_cuff', 'serratus'] },
  { title: 'Rücken', ids: ['traps_upper', 'traps_mid', 'traps_lower', 'rhomboids', 'lats', 'teres_major', 'erectors'] },
  { title: 'Arme', ids: ['biceps_long', 'biceps_short', 'brachialis', 'brachioradialis', 'forearm_flexors', 'forearm_extensors', 'triceps_long', 'triceps_lateral', 'triceps_medial'] },
  { title: 'Rumpf & Hüfte', ids: ['abs_upper', 'abs_lower', 'obliques', 'hip_flexors', 'glute_max', 'glute_med'] },
  { title: 'Beine', ids: ['rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'adductors', 'biceps_femoris', 'semis', 'gastrocnemius', 'soleus', 'tibialis'] },
];

export const ROLE_LABELS: Record<Role, string> = { 3: 'Hauptmuskel', 2: 'Unterstützend', 1: 'Stabilisator' };

type Spec = Partial<Record<MuscleId, Role>>;
const m = (spec: Spec): MuscleRole[] => (Object.entries(spec) as [MuscleId, Role][]).map(([id, role]) => ({ id, role }));

/** Zuordnung für die Übungen aus dem Startplan, nach Name. */
export const DEFAULT_MUSCLES: Record<string, MuscleRole[]> = {
  'Beinpresse': m({ vastus_lateralis: 3, vastus_medialis: 3, rectus_femoris: 2, glute_max: 3, biceps_femoris: 2, semis: 2, adductors: 2, gastrocnemius: 1, soleus: 1 }),
  'Brustpresse': m({ chest_mid: 3, chest_lower: 2, chest_upper: 2, front_delts: 2, triceps_lateral: 2, triceps_medial: 2, triceps_long: 1, serratus: 1 }),
  'Rudern enger Griff': m({ lats: 3, rhomboids: 3, traps_mid: 3, traps_lower: 2, teres_major: 2, rear_delts: 2, biceps_short: 2, biceps_long: 2, brachialis: 2, brachioradialis: 1, forearm_flexors: 1, erectors: 1 }),
  'Seitheben am Kabel': m({ side_delts: 3, traps_upper: 2, rotator_cuff: 2, front_delts: 1 }),
  'Bayesian Curl': m({ biceps_long: 3, biceps_short: 2, brachialis: 2, forearm_flexors: 1 }),
  'Trizeps Overhead am Kabel': m({ triceps_long: 3, triceps_lateral: 2, triceps_medial: 2, forearm_extensors: 1 }),
  'Beinbeuger': m({ biceps_femoris: 3, semis: 3, gastrocnemius: 2 }),
  'Bauchroller auf den Knien': m({ abs_upper: 3, abs_lower: 3, obliques: 2, lats: 2, serratus: 2, hip_flexors: 2, front_delts: 1, triceps_long: 1 }),
  'Standwaage auf dem Bosu': m({ glute_max: 3, glute_med: 3, biceps_femoris: 2, semis: 2, erectors: 2, gastrocnemius: 1, soleus: 1, tibialis: 1, abs_lower: 1, obliques: 1 }),
  'Klimmzüge': m({ lats: 3, teres_major: 2, rhomboids: 2, traps_lower: 2, traps_mid: 1, biceps_short: 2, biceps_long: 2, brachialis: 2, brachioradialis: 2, forearm_flexors: 2, rear_delts: 1, abs_lower: 1 }),
  'Hyperextensions 45 Grad': m({ erectors: 3, glute_max: 3, biceps_femoris: 2, semis: 2 }),
  'Kabelfly einarmig von unten nach oben': m({ chest_upper: 3, chest_mid: 2, front_delts: 2, serratus: 1, biceps_short: 1 }),
  'Reverse Butterfly': m({ rear_delts: 3, rhomboids: 2, traps_mid: 2, rotator_cuff: 2, traps_lower: 1 }),
  'Seilcurls': m({ biceps_short: 3, biceps_long: 3, brachialis: 2, forearm_flexors: 2, brachioradialis: 1 }),
  'Trizeps Pushdown einarmig': m({ triceps_lateral: 3, triceps_medial: 3, triceps_long: 2, forearm_extensors: 1 }),
  'Beinstrecker': m({ rectus_femoris: 3, vastus_lateralis: 3, vastus_medialis: 3 }),
  'TRX einbeinige Kniebeuge, untere Hälfte': m({ vastus_medialis: 3, vastus_lateralis: 3, rectus_femoris: 2, glute_max: 3, glute_med: 2, adductors: 2, biceps_femoris: 1, semis: 1, gastrocnemius: 1, abs_lower: 1, obliques: 1 }),
  'Latzug breiter Griff': m({ lats: 3, teres_major: 3, rhomboids: 2, traps_lower: 2, biceps_short: 2, brachialis: 2, biceps_long: 1, rear_delts: 1, forearm_flexors: 1 }),
  'Landmine Press einarmig, kniend': m({ chest_upper: 3, front_delts: 3, triceps_lateral: 2, triceps_medial: 2, triceps_long: 1, serratus: 2, obliques: 2, abs_upper: 1, side_delts: 1 }),
  'TRX Rudern mit erhöhten Füßen': m({ rhomboids: 3, traps_mid: 3, lats: 3, rear_delts: 2, biceps_short: 2, biceps_long: 2, brachialis: 2, forearm_flexors: 2, erectors: 1, abs_upper: 1, glute_max: 1 }),
  'Butterfly einarmig an der Maschine': m({ chest_mid: 3, chest_lower: 2, chest_upper: 2, front_delts: 2, serratus: 1 }),
  'Schrägbankdrücken an der Maschine': m({ chest_upper: 3, chest_mid: 2, front_delts: 2, triceps_lateral: 2, triceps_medial: 2, triceps_long: 1 }),
  'Kurzhantel Curls auf der Schrägbank': m({ biceps_long: 3, biceps_short: 2, brachialis: 2, forearm_flexors: 1 }),
  'Trizeps Pushdown mit Seil': m({ triceps_lateral: 3, triceps_medial: 3, triceps_long: 2, forearm_extensors: 1 }),
  'Pull Through am Kabel': m({ glute_max: 3, biceps_femoris: 3, semis: 3, erectors: 2, adductors: 1 }),
};

/** Grobe Zuordnung aus der Muskelgruppe, wenn nichts Genaueres bekannt ist. */
export const GROUP_MUSCLES: Record<MuscleGroup, MuscleRole[]> = {
  Brust: m({ chest_mid: 3, chest_upper: 2, chest_lower: 2, front_delts: 2, triceps_lateral: 2 }),
  Rücken: m({ lats: 3, rhomboids: 3, traps_mid: 2, biceps_short: 2, rear_delts: 1 }),
  Schultern: m({ side_delts: 3, front_delts: 2, rear_delts: 2, traps_upper: 1 }),
  Bizeps: m({ biceps_long: 3, biceps_short: 3, brachialis: 2, forearm_flexors: 1 }),
  Trizeps: m({ triceps_long: 3, triceps_lateral: 3, triceps_medial: 3 }),
  Beine: m({ vastus_lateralis: 3, vastus_medialis: 3, rectus_femoris: 3, glute_max: 2, biceps_femoris: 2, semis: 2 }),
  Gesäß: m({ glute_max: 3, glute_med: 2, biceps_femoris: 2, semis: 2 }),
  Bauch: m({ abs_upper: 3, abs_lower: 3, obliques: 2 }),
  Waden: m({ gastrocnemius: 3, soleus: 3 }),
  Ganzkörper: m({ vastus_lateralis: 2, glute_max: 2, chest_mid: 2, lats: 2, abs_upper: 2 }),
};

export function defaultMuscles(name: string, group: MuscleGroup): MuscleRole[] {
  return DEFAULT_MUSCLES[name] ?? GROUP_MUSCLES[group] ?? [];
}

export function isKnownMuscle(id: string): id is MuscleId {
  return (MUSCLE_IDS as string[]).includes(id);
}

export function rolesMap(list: MuscleRoleLike[] | undefined): Partial<Record<MuscleId, Role>> {
  const out: Partial<Record<MuscleId, Role>> = {};
  for (const x of list ?? []) if (isKnownMuscle(x.id)) out[x.id] = x.role;
  return out;
}

/** Kurztext: "Quadrizeps außen, ... · unterstützend: ... · stabilisierend: ..." */
export function musclesText(list: MuscleRoleLike[] | undefined): string {
  if (!list?.length) return '';
  const by = (r: Role) => list.filter((x) => x.role === r && isKnownMuscle(x.id)).map((x) => MUSCLE_LABELS[x.id as MuscleId]);
  const parts = [by(3).join(', ')];
  if (by(2).length) parts.push(`unterstützend: ${by(2).join(', ')}`);
  if (by(1).length) parts.push(`stabilisierend: ${by(1).join(', ')}`);
  return parts.filter(Boolean).join(' · ');
}

/** Hauptmuskeln kurz, für Listen. */
export function primaryText(list: MuscleRoleLike[] | undefined): string {
  return (list ?? []).filter((x) => x.role === 3 && isKnownMuscle(x.id)).map((x) => MUSCLE_LABELS[x.id as MuscleId].replace(/ \(.*\)/, '')).join(', ');
}

/** Nächste Rolle beim Antippen: keine → Haupt → unterstützend → Stabilisator → keine */
export function cycleRole(list: MuscleRoleLike[], id: MuscleId): MuscleRoleLike[] {
  const cur = list.find((x) => x.id === id)?.role;
  const next: Role | undefined = cur === undefined ? 3 : cur === 3 ? 2 : cur === 2 ? 1 : undefined;
  const rest = list.filter((x) => x.id !== id);
  return next ? [...rest, { id, role: next }] : rest;
}

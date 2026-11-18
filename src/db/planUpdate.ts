// Einmaliges Update des Trainingsplans (Stand 18.11.2026) für Installationen, die schon Daten haben.
// Trainingsverlauf, Gewichte, Maschineneinstellungen und Einstellungen bleiben unverändert.
import type { Exercise, Plan, PlanEntry } from './types';
import { uid } from './db';
import { ALTERNATIVE_KEYS, DAY_SPECS, EXERCISE_SPECS, type DaySpec } from './seed';
import { defaultMuscles } from '../logic/muscles';

const RENAMED: Record<string, string> = {
  'Schrägbankdrücken an der Maschine': 'Schrägbank Brustpresse an der Maschine',
};

const norm = (s: string) => s.trim().toLowerCase();

export function updatePlanNov2026(input: Exercise[], plan: Plan, now = Date.now()): { exercises: Exercise[]; changed: Exercise[]; plan: Plan } {
  const exercises = input.map((e) => ({ ...e, alternatives: [...e.alternatives] }));
  const changed = new Set<Exercise>();

  // 1. Umbenennen, wenn der neue Name noch nicht vergeben ist
  for (const e of exercises) {
    const to = RENAMED[e.name];
    if (to && !exercises.some((x) => norm(x.name) === norm(to))) { e.name = to; changed.add(e); }
  }

  const find = (name: string): Exercise | undefined => {
    const all = exercises.filter((e) => norm(e.name) === norm(name));
    const hit = all.find((e) => !e.archived) ?? all[0];
    if (hit?.archived) { hit.archived = false; changed.add(hit); }
    return hit;
  };

  // 2. Fehlende Übungen aus dem Plan anlegen
  const usedKeys = new Set(DAY_SPECS.flatMap((d) => d.filter((s): s is Extract<DaySpec[number], { ex: string }> => 'ex' in s).map((s) => s.ex)));
  const idByKey = new Map<string, string>();
  for (const spec of EXERCISE_SPECS) {
    let e = find(spec.name);
    if (!e && usedKeys.has(spec.key)) {
      const { key, ...rest } = spec;
      void key;
      e = { ...rest, id: uid(), alternatives: [], archived: false, createdAt: now, muscles: defaultMuscles(rest.name, rest.muscle) };
      exercises.push(e);
      changed.add(e);
    }
    if (e) idByKey.set(spec.key, e.id);
  }

  // 3. Feste Alternativen verknüpfen (nur wenn beide Übungen existieren)
  for (const [a, b] of ALTERNATIVE_KEYS) {
    const ea = exercises.find((e) => e.id === idByKey.get(a));
    const eb = exercises.find((e) => e.id === idByKey.get(b));
    if (!ea || !eb) continue;
    if (!ea.alternatives.includes(eb.id)) { ea.alternatives.push(eb.id); changed.add(ea); }
    if (!eb.alternatives.includes(ea.id)) { eb.alternatives.push(ea.id); changed.add(eb); }
  }

  // 4. Tage A, B, C neu aufbauen, IDs und Namen der Tage bleiben
  const toEntries = (spec: DaySpec): PlanEntry[] => spec.map((s) =>
    'warmup' in s
      ? { id: uid(), kind: 'warmup', label: s.warmup, sets: s.sets, repMin: s.min, repMax: s.max }
      : { id: uid(), kind: 'exercise', exerciseId: idByKey.get(s.ex)!, sets: s.sets, repMin: s.min, repMax: s.max, timeSec: s.time },
  );
  const names = ['Tag A', 'Tag B', 'Tag C'];
  const days = DAY_SPECS.map((spec, i) => {
    const old = plan.days[i];
    return { id: old?.id ?? uid(), name: old?.name ?? names[i], entries: toEntries(spec) };
  });
  // Weitere, selbst angelegte Tage bleiben erhalten
  const extraDays = plan.days.slice(DAY_SPECS.length);
  const allDays = [...days, ...extraDays];
  return {
    exercises,
    changed: [...changed],
    plan: { ...plan, days: allDays, nextDayIndex: plan.nextDayIndex % allDays.length },
  };
}

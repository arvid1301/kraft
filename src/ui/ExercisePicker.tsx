// Übung auswählen: feste Alternativen oben, dann Bibliothek mit Suche, dann neue Übung anlegen.
import { useState } from 'preact/hooks';
import { db, uid } from '../db/db';
import { MUSCLE_GROUPS, type Exercise, type InputKind, type MuscleGroup } from '../db/types';
import { useLive } from '../state';
import { Field, Icons, Segment, Sheet, TextInput } from './components';

export const INPUT_LABELS: Record<InputKind, string> = {
  kg: 'Gewicht in kg', bodyweight: 'Körpergewicht + Zusatz', trx: 'TRX-Skala', time: 'Zeit', reps: 'Nur Wiederholungen',
};

export function ExercisePicker(props: { title?: string; alternativesOf?: Exercise; exclude?: string[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const exercises = useLive(() => db.exercises.filter((e) => !e.archived).toArray(), []);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  if (!exercises) return null;
  const alts = (props.alternativesOf?.alternatives ?? []).map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e);
  const needle = q.trim().toLowerCase();
  const rest = exercises
    .filter((e) => !props.exclude?.includes(e.id) && e.id !== props.alternativesOf?.id && !alts.includes(e))
    .filter((e) => !needle || e.name.toLowerCase().includes(needle) || e.muscle.toLowerCase().includes(needle))
    .sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name));
  const grouped = new Map<string, Exercise[]>();
  for (const e of rest) grouped.set(e.muscle, [...(grouped.get(e.muscle) ?? []), e]);

  if (creating) return <NewExerciseSheet onClose={() => setCreating(false)} onCreated={(e) => { setCreating(false); props.onPick(e); }} />;

  return (
    <Sheet title={props.title ?? 'Übung wählen'} onClose={props.onClose}>
      <div style="position:relative">
        <span style="position:absolute;left:14px;top:13px;color:var(--muted)"><Icons.search /></span>
        <TextInput style="padding-left:44px" placeholder="Suchen" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      {alts.length > 0 && !needle && (
        <>
          <div class="section-label">Feste Alternativen</div>
          <div class="list">{alts.map((e) => <Row e={e} onPick={props.onPick} accent />)}</div>
        </>
      )}
      <button class="btn" onClick={() => setCreating(true)}><Icons.plus /> Neue Übung anlegen</button>
      {[...grouped.entries()].map(([muscle, list]) => (
        <>
          <div class="section-label">{muscle}</div>
          <div class="list">{list.map((e) => <Row e={e} onPick={props.onPick} />)}</div>
        </>
      ))}
      {rest.length === 0 && <p class="empty">Nichts gefunden.</p>}
    </Sheet>
  );
}

function Row(props: { e: Exercise; onPick: (e: Exercise) => void; accent?: boolean }) {
  return (
    <button class="row" onClick={() => props.onPick(props.e)}>
      <div class="grow"><div class="title" style={props.accent ? 'color:var(--accent)' : ''}>{props.e.name}</div><div class="sub">{props.e.muscle}{props.e.unilateral ? ' · pro Seite' : ''} · {INPUT_LABELS[props.e.input]}</div></div>
      <Icons.chev />
    </button>
  );
}

export function NewExerciseSheet(props: { onClose: () => void; onCreated: (e: Exercise) => void }) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('Brust');
  const [input, setInput] = useState<InputKind>('kg');
  const [unilateral, setUnilateral] = useState(false);
  const [big, setBig] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    const e: Exercise = {
      id: uid(), name: name.trim(), muscle, input, unilateral, notes: '', videoUrl: '',
      step: input === 'kg' || input === 'bodyweight' ? (big ? 5 : 2.5) : 0, restSec: big ? 150 : 90, warmup: big && input === 'kg',
      alternatives: [], archived: false, createdAt: Date.now(),
    };
    await db.exercises.add(e);
    props.onCreated(e);
  };
  return (
    <Sheet title="Neue Übung" onClose={props.onClose}>
      <div class="form">
        <Field label="Name"><TextInput value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="z. B. Schrägbankdrücken" autofocus /></Field>
        <Field label="Muskelgruppe">
          <select class="input" value={muscle} onChange={(e) => setMuscle((e.target as HTMLSelectElement).value as MuscleGroup)}>
            {MUSCLE_GROUPS.map((m) => <option value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Eintragen als">
          <select class="input" value={input} onChange={(e) => setInput((e.target as HTMLSelectElement).value as InputKind)}>
            {(Object.keys(INPUT_LABELS) as InputKind[]).map((k) => <option value={k}>{INPUT_LABELS[k]}</option>)}
          </select>
        </Field>
        <Field label="Seiten"><Segment value={unilateral ? 'ja' : 'nein'} options={[{ value: 'nein', label: 'Beidseitig' }, { value: 'ja', label: 'Pro Seite' }]} onChange={(v) => setUnilateral(v === 'ja')} /></Field>
        <Field label="Art"><Segment value={big ? 'big' : 'small'} options={[{ value: 'small', label: 'Kleine Übung · 90 s' }, { value: 'big', label: 'Grundübung · 2:30' }]} onChange={(v) => setBig(v === 'big')} /></Field>
        <button class="btn primary" disabled={!name.trim()} onClick={save}>Anlegen</button>
      </div>
    </Sheet>
  );
}

// Übungsbibliothek und Übungsdetail.
import { useEffect, useState } from 'preact/hooks';
import { db } from '../db/db';
import { MUSCLE_GROUPS, type Exercise, type InputKind, type MuscleGroup } from '../db/types';
import { back, go, toast, useLive } from '../state';
import { Field, Icons, Segment, Switch, TextInput, TopBar } from './components';
import { ExercisePicker, INPUT_LABELS, NewExerciseSheet } from './ExercisePicker';
import { fmtTime } from '../logic/timer';

export function Library() {
  const exercises = useLive(() => db.exercises.toArray(), []);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  if (!exercises) return <div class="screen" />;
  const needle = q.trim().toLowerCase();
  const list = exercises.filter((e) => !e.archived && (!needle || e.name.toLowerCase().includes(needle) || e.muscle.toLowerCase().includes(needle))).sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name));
  const grouped = new Map<string, Exercise[]>();
  for (const e of list) grouped.set(e.muscle, [...(grouped.get(e.muscle) ?? []), e]);
  return (
    <div class="screen">
      <TopBar title="Übungsbibliothek" onBack={back} right={<button class="ib" aria-label="Neue Übung" onClick={() => setCreating(true)}><Icons.plus /></button>} />
      <div class="screen-body">
        <div style="position:relative"><span style="position:absolute;left:14px;top:13px;color:var(--muted)"><Icons.search /></span><TextInput style="padding-left:44px" placeholder="Suchen" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} /></div>
        {[...grouped.entries()].map(([m, es]) => (
          <>
            <div class="section-label">{m}</div>
            <div class="list">{es.map((e) => <button class="row" onClick={() => go(`/uebung/${e.id}`)}><div class="grow"><div class="title">{e.name}</div><div class="sub">{INPUT_LABELS[e.input]}{e.unilateral ? ' · pro Seite' : ''}</div></div><Icons.chev /></button>)}</div>
          </>
        ))}
      </div>
      {creating && <NewExerciseSheet onClose={() => setCreating(false)} onCreated={(e) => { setCreating(false); go(`/uebung/${e.id}`); }} />}
    </div>
  );
}

export function ExerciseDetail(props: { id: string }) {
  const data = useLive(async () => {
    const [ex, all, settings] = await Promise.all([db.exercises.get(props.id), db.exercises.toArray(), db.settings.get('main')]);
    const gyms = await db.gyms.toArray();
    const machines = await db.machineSettings.where('exerciseId').equals(props.id).toArray();
    return { ex, all, settings: settings!, gyms, machines };
  }, [props.id]);
  const [e, setE] = useState<Exercise | null>(null);
  const [pickAlt, setPickAlt] = useState(false);
  useEffect(() => { if (data?.ex && !e) setE(data.ex); }, [data?.ex]);
  if (!data || !e) return <div class="screen"><TopBar title="Übung" onBack={back} /></div>;
  const save = async () => { await db.exercises.put(e); toast('Gespeichert'); back(); };
  const archive = async () => { await db.exercises.put({ ...e, archived: true }); toast('Übung archiviert'); back(); };
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setE({ ...e, [k]: v });
  const alts = e.alternatives.map((id) => data.all.find((x) => x.id === id)).filter((x): x is Exercise => !!x);

  return (
    <div class="screen">
      <TopBar title={data.ex?.name ?? 'Übung'} onBack={back} right={<button class="btn ghost small" onClick={save}>Sichern</button>} />
      <div class="screen-body form">
        <Field label="Name"><TextInput value={e.name} onInput={(ev) => set('name', (ev.target as HTMLInputElement).value)} /></Field>
        <Field label="Muskelgruppe"><select class="input" value={e.muscle} onChange={(ev) => set('muscle', (ev.target as HTMLSelectElement).value as MuscleGroup)}>{MUSCLE_GROUPS.map((m) => <option value={m}>{m}</option>)}</select></Field>
        <Field label="Eintragen als"><select class="input" value={e.input} onChange={(ev) => set('input', (ev.target as HTMLSelectElement).value as InputKind)}>{(Object.keys(INPUT_LABELS) as InputKind[]).map((k) => <option value={k}>{INPUT_LABELS[k]}</option>)}</select></Field>
        <Field label="Seiten"><Segment value={e.unilateral ? 'ja' : 'nein'} options={[{ value: 'nein', label: 'Beidseitig' }, { value: 'ja', label: 'Einarmig / einbeinig' }]} onChange={(v) => set('unilateral', v === 'ja')} /></Field>
        <div class="inline">
          <Field label="Schritt (kg)"><TextInput type="number" inputMode="decimal" step="0.5" value={e.step} onInput={(ev) => set('step', parseFloat((ev.target as HTMLInputElement).value) || 0)} /></Field>
          <Field label={`Pause (${fmtTime(e.restSec)})`}><TextInput type="number" inputMode="numeric" step="15" value={e.restSec} onInput={(ev) => set('restSec', parseInt((ev.target as HTMLInputElement).value) || 90)} /></Field>
        </div>
        <div class="row" style="padding:0;min-height:44px"><div class="grow"><div class="title">Aufwärmsätze</div><div class="sub">1 bis 2 Sätze mit 50 und 70 % vor dieser Übung</div></div><Switch on={e.warmup} onChange={(v) => set('warmup', v)} label="Aufwärmsätze" /></div>
        <Field label="Ausführungshinweise"><textarea class="input" value={e.notes} onInput={(ev) => set('notes', (ev.target as HTMLTextAreaElement).value)} /></Field>
        <Field label="Videolink"><TextInput type="url" inputMode="url" placeholder="https://" value={e.videoUrl} onInput={(ev) => set('videoUrl', (ev.target as HTMLInputElement).value)} /></Field>
        <Field label="Feste Alternativen">
          <div class="list">
            {alts.map((a) => <div class="row"><div class="grow title">{a.name}</div><button class="ib plain" aria-label="Entfernen" onClick={() => set('alternatives', e.alternatives.filter((id) => id !== a.id))}><Icons.close /></button></div>)}
            <button class="row" onClick={() => setPickAlt(true)}><span style="color:var(--accent)"><Icons.plus /></span><span class="grow title" style="color:var(--accent)">Alternative hinzufügen</span></button>
          </div>
        </Field>
        <Field label="Maschineneinstellungen">
          {data.machines.length === 0 ? <p style="color:var(--muted);font-size:14px">Noch keine. Im Training unter „Einstellungen“ bei der Übung eintragen.</p> : (
            <div class="list">{data.machines.map((m) => <div class="row"><div class="grow"><div class="title">{data.gyms.find((g) => g.id === m.gymId)?.name ?? 'Gym'}</div><div class="sub">{m.fields.map((f) => `${f.label} ${f.value}`).join(' · ')}</div></div></div>)}</div>
          )}
        </Field>
        <button class="btn primary" onClick={save}>Speichern</button>
        <button class="btn danger small" onClick={archive}><Icons.trash size={16} /> Übung archivieren</button>
      </div>
      {pickAlt && <ExercisePicker title="Alternative wählen" exclude={[e.id, ...e.alternatives]} onClose={() => setPickAlt(false)} onPick={(a) => { set('alternatives', [...e.alternatives, a.id]); setPickAlt(false); }} />}
    </div>
  );
}

// Plan ansehen und bearbeiten: Tage, Übungen, Supersätze, Sätze und Wiederholungen.
import { useState } from 'preact/hooks';
import { db, uid } from '../db/db';
import type { Exercise, Plan, PlanDay, PlanEntry } from '../db/types';
import { exerciseMap } from '../db/queries';
import { move } from '../logic/reorder';
import { back, go, toast, useLive } from '../state';
import { Field, Icons, Sheet, Stepper, TextInput, TopBar } from './components';
import { Sortable } from './Sortable';
import { ExercisePicker } from './ExercisePicker';

export function PlanScreen() {
  const data = useLive(async () => ({ plan: (await db.plans.toArray())[0], exMap: await exerciseMap() }), []);
  if (!data) return <div class="screen" />;
  const { plan, exMap } = data;
  return (
    <div class="screen">
      <div class="page-title"><div><h1>Plan</h1><p class="sub">{plan.name}</p></div></div>
      <div class="screen-body">
        <div class="list">
          {plan.days.map((d, i) => (
            <button class="row" onClick={() => go(`/plan/${d.id}`)}>
              <div class="grow">
                <div class="title">{d.name}{i === plan.nextDayIndex ? <span class="tag accent" style="margin-left:8px">dran</span> : null}</div>
                <div class="sub" style="white-space:normal">{d.entries.filter((e) => e.kind !== 'warmup').map((e) => entryLabel(e, exMap)).join(' · ')}</div>
              </div>
              <Icons.chev />
            </button>
          ))}
        </div>
        <button class="btn" onClick={() => go('/bibliothek')}><Icons.list /> Übungsbibliothek</button>
      </div>
    </div>
  );
}

export function entryLabel(e: PlanEntry, exMap: Map<string, Exercise>): string {
  if (e.kind === 'warmup') return e.label ?? 'Aufwärmen';
  if (e.kind === 'superset') return (e.children ?? []).map((c) => entryLabel(c, exMap)).join(' + ');
  return exMap.get(e.exerciseId ?? '')?.name ?? 'Übung';
}
function entrySub(e: PlanEntry, exMap: Map<string, Exercise>): string {
  if (e.kind === 'superset') return 'Supersatz · ' + (e.children ?? []).map((c) => entrySub(c, exMap)).join(' + ');
  const ex = exMap.get(e.exerciseId ?? '');
  const side = ex?.unilateral || e.kind === 'warmup' ? ' pro Seite' : '';
  if (e.timeSec) return `${e.sets} × ${e.timeSec} s${side}`;
  if (!e.repMax) return `${e.sets} Sätze${e.repMin ? ` · ${e.repMin}+` : ' · bis kurz vor Versagen'}`;
  return `${e.sets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin} bis ${e.repMax}`}${side}`;
}

export function DayEditor(props: { dayId: string }) {
  const data = useLive(async () => ({ plan: (await db.plans.toArray())[0], exMap: await exerciseMap() }), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  if (!data) return <div class="screen" />;
  const { plan, exMap } = data;
  const day = plan.days.find((d) => d.id === props.dayId);
  if (!day) return <div class="screen"><TopBar title="Plan" onBack={back} /></div>;
  const savePlan = (p: Plan) => db.plans.put(p);
  const setEntries = (entries: PlanEntry[]) => savePlan({ ...plan, days: plan.days.map((d) => (d.id === day.id ? { ...d, entries } : d)) });

  const addExercise = (ex: Exercise) => {
    const e: PlanEntry = { id: uid(), kind: 'exercise', exerciseId: ex.id, sets: 3, repMin: ex.input === 'time' ? 0 : 8, repMax: ex.input === 'time' ? 0 : 12, timeSec: ex.input === 'time' ? 30 : undefined };
    setEntries([...day.entries, e]); setAdding(false); toast(`${ex.name} hinzugefügt`);
  };
  const editingEntry = editing ? day.entries.find((e) => e.id === editing) : undefined;

  return (
    <div class="screen">
      <TopBar title={day.name} onBack={back} right={<button class="ib" aria-label="Übung hinzufügen" onClick={() => setAdding(true)}><Icons.plus /></button>} />
      <div class="screen-body">
        <Sortable
          items={day.entries}
          keyOf={(e) => e.id}
          onMove={(from, to) => setEntries(move(day.entries, from, to))}
          render={(e) => (
            <button class="grow" style="text-align:left" onClick={() => setEditing(e.id)}>
              <div class="title">{entryLabel(e, exMap)}</div>
              <div class="sub">{entrySub(e, exMap)}</div>
            </button>
          )}
        />
        <button class="btn" onClick={() => setAdding(true)}><Icons.plus /> Übung hinzufügen</button>
        <button class="btn ghost small" onClick={() => { const e: PlanEntry = { id: uid(), kind: 'warmup', label: 'Aufwärmen', sets: 2, repMin: 6, repMax: 6 }; setEntries([...day.entries, e]); }}>Aufwärm-Block hinzufügen</button>
      </div>
      {adding && <ExercisePicker title="Übung hinzufügen" onClose={() => setAdding(false)} onPick={addExercise} />}
      {editingEntry && <EntrySheet plan={plan} day={day} entry={editingEntry} exMap={exMap} onClose={() => setEditing(null)} onSave={savePlan} />}
    </div>
  );
}

function EntrySheet(props: { plan: Plan; day: PlanDay; entry: PlanEntry; exMap: Map<string, Exercise>; onClose: () => void; onSave: (p: Plan) => Promise<unknown> }) {
  const { plan, day, entry, exMap } = props;
  const [e, setE] = useState<PlanEntry>(entry);
  const [swapping, setSwapping] = useState<string | null>(null); // id des (Kind-)Eintrags, der getauscht wird
  const [label, setLabel] = useState(entry.label ?? '');
  const idx = day.entries.findIndex((x) => x.id === entry.id);
  const next = day.entries[idx + 1];
  const replaceEntries = (entries: PlanEntry[], dayId = day.id) => props.onSave({ ...plan, days: plan.days.map((d) => (d.id === dayId ? { ...d, entries } : d)) });

  const save = async () => { await replaceEntries(day.entries.map((x) => (x.id === e.id ? { ...e, label: e.kind === 'warmup' ? label : e.label } : x))); props.onClose(); };
  const remove = async () => { await replaceEntries(day.entries.filter((x) => x.id !== e.id)); props.onClose(); toast('Entfernt'); };
  const moveTo = async (target: PlanDay) => {
    const without = day.entries.filter((x) => x.id !== e.id);
    await props.onSave({ ...plan, days: plan.days.map((d) => (d.id === day.id ? { ...d, entries: without } : d.id === target.id ? { ...d, entries: [...d.entries, e] } : d)) });
    props.onClose(); toast(`Nach ${target.name} verschoben`);
  };
  const makeSuperset = async () => {
    if (!next || next.kind !== 'exercise' || e.kind !== 'exercise') return;
    const ss: PlanEntry = { id: uid(), kind: 'superset', sets: 0, repMin: 0, repMax: 0, children: [e, next] };
    await replaceEntries(day.entries.filter((x) => x.id !== next.id).map((x) => (x.id === e.id ? ss : x)));
    props.onClose(); toast('Supersatz gebildet');
  };
  const dissolve = async () => {
    const kids = e.children ?? [];
    await replaceEntries(day.entries.flatMap((x) => (x.id === e.id ? kids : [x])));
    props.onClose(); toast('Supersatz aufgelöst');
  };
  const swapExercise = (targetId: string, ex: Exercise) => {
    if (e.id === targetId) setE({ ...e, exerciseId: ex.id });
    else setE({ ...e, children: (e.children ?? []).map((c) => (c.id === targetId ? { ...c, exerciseId: ex.id } : c)) });
    setSwapping(null);
  };
  const otherDays = plan.days.filter((d) => d.id !== day.id);

  const setFields = (x: PlanEntry, onChange: (n: PlanEntry) => void) => {
    const ex = exMap.get(x.exerciseId ?? '');
    const isTime = ex?.input === 'time';
    return (
      <div class="form">
        <div class="steppers">
          <Stepper compact label="Sätze" value={x.sets} step={1} min={1} max={10} onChange={(v) => onChange({ ...x, sets: v })} />
          {isTime ? <Stepper compact label="Sekunden" value={x.timeSec ?? 30} step={5} min={5} onChange={(v) => onChange({ ...x, timeSec: v })} /> : <Stepper compact label="Wdh min" value={x.repMin} step={1} min={0} max={50} onChange={(v) => onChange({ ...x, repMin: v, repMax: Math.max(v, x.repMax) })} />}
        </div>
        {!isTime && <div class="steppers"><Stepper compact label="Wdh max (0 = bis kurz vor Versagen)" value={x.repMax} step={1} min={0} max={50} onChange={(v) => onChange({ ...x, repMax: v })} /></div>}
        {x.kind === 'exercise' && <button class="btn small" onClick={() => setSwapping(x.id)}><Icons.swap size={16} /> {ex?.name ?? 'Übung'} tauschen</button>}
      </div>
    );
  };

  if (swapping) {
    const cur = swapping === e.id ? e : (e.children ?? []).find((c) => c.id === swapping);
    return <ExercisePicker title="Übung tauschen" alternativesOf={exMap.get(cur?.exerciseId ?? '')} onClose={() => setSwapping(null)} onPick={(ex) => swapExercise(swapping, ex)} />;
  }

  return (
    <Sheet title={entryLabel(e, exMap)} onClose={props.onClose}>
      {e.kind === 'warmup' && <Field label="Bezeichnung"><TextInput value={label} onInput={(ev) => setLabel((ev.target as HTMLInputElement).value)} /></Field>}
      {e.kind === 'superset' ? (
        <>
          {(e.children ?? []).map((c, i) => (
            <div class="card pad-sm" style="background:var(--card2)">
              <div class="section-label" style="padding:0 0 8px">{i + 1}. {entryLabel(c, exMap)}</div>
              {setFields(c, (n) => setE({ ...e, children: (e.children ?? []).map((k) => (k.id === c.id ? n : k)) }))}
            </div>
          ))}
          <button class="btn small" onClick={dissolve}>Supersatz auflösen</button>
        </>
      ) : setFields(e, setE)}
      {e.kind === 'exercise' && next?.kind === 'exercise' && <button class="btn small" onClick={makeSuperset}>Supersatz mit „{entryLabel(next, exMap)}“ bilden</button>}
      <button class="btn primary" onClick={save}>Speichern</button>
      <div class="section-label">Verschieben nach</div>
      <div class="inline">{otherDays.map((d) => <button class="btn small" onClick={() => moveTo(d)}>{d.name}</button>)}</div>
      <button class="btn danger small" onClick={remove}><Icons.trash size={16} /> Aus {day.name} entfernen</button>
    </Sheet>
  );
}

// Trainingsmodus (Richtung A): Übung mit Satzliste, Steuerung fest unten, Pausentimer als Leiste.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { db } from '../db/db';
import type { Exercise, MachineSetting, PlanEntry, Workout as WorkoutT, WorkoutEntry, WorkoutSet } from '../db/types';
import { activeWorkout, discardWorkout, entryName, finishWorkout, hasAnyDoneSet, lastLookup, lastSets, saveWorkout } from '../db/queries';
import { suggest, type Suggestion } from '../logic/progression';
import { RestTimer, fmtTime } from '../logic/timer';
import { isEntryDone, nextOpenIndex, nextSupersetSet, pushToEnd, setSkipped, move } from '../logic/reorder';
import { buildSingleEntry, refreshWarmup } from '../logic/workoutBuild';
import { beep, keepAwake, unlockAudio } from '../device';
import { go, toast, useLive } from '../state';
import { Confirm, Icons, Sheet, Stepper, fmtNum } from './components';
import { Sortable } from './Sortable';
import { ExercisePicker } from './ExercisePicker';
import { Summary } from './Summary';

const rest = new RestTimer();
const countdown = new RestTimer();

type SheetKind = null | 'reorder' | 'swap' | 'end' | 'machine' | 'swapScope';

export function Workout() {
  const [w, setW] = useState<WorkoutT | null>(null);
  const [cur, setCur] = useState(0);
  const [activeSet, setActiveSet] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [pendingSwap, setPendingSwap] = useState<Exercise | null>(null);
  const [, setTick] = useState(0);
  const [flash, setFlash] = useState(false);
  const [pop, setPop] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkoutT | null>(null);
  const [countdownSet, setCountdownSet] = useState<string | null>(null);
  const exMap = useLive(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])), []);
  const settings = useLive(() => db.settings.get('main'), []);
  const restDone = useRef(false);
  const cdDone = useRef(false);

  // Laden
  useEffect(() => {
    activeWorkout().then((a) => {
      if (!a) { go('/heute'); return; }
      setW(a);
      const idx = nextOpenIndex(a.entries);
      setCur(idx >= 0 ? idx : 0);
    });
  }, []);
  useEffect(() => { keepAwake(settings?.keepAwake !== false); return () => { keepAwake(false); }; }, [settings?.keepAwake]);

  // Uhr für Timer
  useEffect(() => {
    const id = setInterval(() => {
      if (rest.active || countdown.active) setTick((t) => t + 1);
      if (rest.finished && !restDone.current) {
        restDone.current = true;
        if (settings?.sound !== false) beep(3);
        setFlash(true); setTimeout(() => setFlash(false), 1700);
        toast('Pause vorbei, nächster Satz');
        rest.stop();
      }
      if (countdown.finished && !cdDone.current) {
        cdDone.current = true;
        if (settings?.sound !== false) beep(2, 660);
        countdown.stop();
        const sid = countdownSetRef.current;
        if (sid) { toggleSet(sid, true); setCountdownSet(null); }
      }
    }, 250);
    return () => clearInterval(id);
  });
  const countdownSetRef = useRef<string | null>(null);
  countdownSetRef.current = countdownSet;

  const entry = w?.entries[cur];
  const ex = entry?.kind === 'exercise' ? exMap?.get(entry.exerciseId ?? '') : undefined;

  // Letzte Werte und Vorschlag für die aktuelle Übung
  const last = useLive(async () => {
    if (!w || !entry || entry.kind !== 'exercise' || !entry.exerciseId) return null;
    return lastSets(w.gymId, entry.exerciseId);
  }, [w?.gymId, entry?.exerciseId]);
  const machine = useLive(async () => (w && ex ? db.machineSettings.get(`${w.gymId}:${ex.id}`) : undefined), [w?.gymId, ex?.id]);
  const suggestion: Suggestion | null = useMemo(() => (ex && entry && last !== undefined ? suggest(ex, last?.sets ?? [], entry.repMin, entry.repMax) : null), [ex, entry, last]);

  // Aktiven Satz nachführen, wenn Übung wechselt
  useEffect(() => {
    if (!entry) return;
    const flat = flatSets(entry);
    const open = flat.find((s) => !s.set.done) ?? flat[0];
    setActiveSet(open?.set.id ?? null);
    setCountdownSet(null); countdown.stop();
  }, [entry?.id]);

  if (!w || !exMap || !entry) return <div class="screen" />;
  if (summary) return <Summary workout={summary} exMap={exMap} onDone={() => go('/heute')} />;

  const update = (next: WorkoutT) => { setW(next); saveWorkout(next); };
  const patchEntry = (id: string, fn: (e: WorkoutEntry) => WorkoutEntry) => {
    const walk = (e: WorkoutEntry): WorkoutEntry => (e.id === id ? fn(e) : e.kind === 'superset' ? { ...e, children: (e.children ?? []).map(walk) } : e);
    update({ ...w, entries: w.entries.map(walk) });
  };
  const flat = flatSets(entry);
  const active = flat.find((f) => f.set.id === activeSet) ?? flat.find((f) => !f.set.done) ?? flat[0];

  const patchSet = (setId: string, fn: (s: WorkoutSet) => WorkoutSet) => {
    const owner = flat.find((f) => f.set.id === setId)?.entry; if (!owner) return;
    const ownerEx = exMap.get(owner.exerciseId ?? '');
    patchEntry(owner.id, (e) => {
      // Geänderte Werte auf die folgenden, noch offenen Sätze übernehmen, die denselben alten Wert hatten
      const idx = e.sets.findIndex((s) => s.id === setId);
      const before = e.sets[idx];
      const after = fn(before);
      const sets = e.sets.map((s, i) => {
        if (i === idx) return after;
        if (i < idx || s.done || s.warmup !== before.warmup) return s;
        let n = s;
        for (const k of ['weight', 'reps', 'trxPos', 'trxHelp', 'timeSec'] as const) {
          if (before[k] !== after[k] && s[k] === before[k]) n = { ...n, [k]: after[k] };
        }
        return n;
      });
      let next = { ...e, sets };
      if (ownerEx) next = refreshWarmup(next, ownerEx);
      return next;
    });
  };

  function toggleSet(setId: string, forceDone?: boolean) {
    const f = flat.find((x) => x.set.id === setId); if (!f) return;
    const willDone = forceDone ?? !f.set.done;
    const ownerEx = exMap!.get(f.entry.exerciseId ?? '');
    patchSet(setId, (s) => ({ ...s, done: willDone, doneAt: willDone ? Date.now() : undefined }));
    if (willDone) {
      setPop(setId); setTimeout(() => setPop(null), 400);
      const sec = f.set.warmup ? 60 : (ownerEx?.restSec ?? (entry!.kind === 'warmup' ? 45 : 90));
      // Im Supersatz keine Pause zwischen den beiden Übungen, erst nach der zweiten
      const inSuperset = entry!.kind === 'superset';
      const nextInSs = inSuperset ? nextSupersetSet(applyDone(entry!.children ?? [], setId)) : null;
      const pauseNow = !inSuperset || !nextInSs || nextInSs[0] === 0;
      if (pauseNow) { restDone.current = false; rest.start(sec); }
      // nächsten offenen Satz wählen
      const after = flat.filter((x) => x.set.id !== setId && !x.set.done);
      if (after.length > 0) {
        const next = inSuperset && nextInSs ? (entry!.children ?? [])[nextInSs[0]].sets[nextInSs[1]] : after[0].set;
        setActiveSet(next.id);
      } else {
        // Übung fertig: automatisch weiter
        const updatedEntries = w!.entries.map((e) => (e.id === entry!.id ? markDone(e, setId) : e));
        const nxt = nextOpenIndex(updatedEntries, cur + 1);
        toast(nxt >= 0 ? `${entryName(entry!, exMap!)} fertig` : 'Alle Übungen erledigt');
        if (nxt >= 0) setTimeout(() => setCur(nxt), 350);
      }
    } else {
      rest.stop(); setActiveSet(setId);
    }
  }

  const applySuggestion = () => {
    if (!suggestion || suggestion.action === 'none' || !ex) return;
    patchEntry(entry.id, (e) => refreshWarmup({ ...e, sets: e.sets.map((s) => (!s.warmup && !s.done ? { ...s, weight: suggestion.weight } : s)) }, ex));
    toast(`${fmtNum(suggestion.weight)} kg eingetragen`);
  };
  const addSet = () => patchEntry(active?.entry.id ?? entry.id, (e) => {
    const lastWork = [...e.sets].reverse().find((s) => !s.warmup) ?? e.sets[e.sets.length - 1];
    const base: WorkoutSet = { ...(lastWork ?? { reps: e.repMin }), id: crypto.randomUUID(), warmup: false, done: false, doneAt: undefined };
    return { ...e, sets: [...e.sets, base] };
  });
  const removeSet = () => patchEntry(active?.entry.id ?? entry.id, (e) => {
    const idx = e.sets.map((s) => !s.warmup && !s.done).lastIndexOf(true);
    return idx < 0 ? e : { ...e, sets: e.sets.filter((_, i) => i !== idx) };
  });

  const swapTo = async (newEx: Exercise, permanent: boolean) => {
    const oldId = entry.exerciseId;
    const lookup = await lastLookup(w.gymId);
    const working = entry.sets.filter((s) => !s.warmup).length || 3;
    const fresh = buildSingleEntry(newEx, working, entry.repMin, entry.repMax, lookup(newEx.id), newEx.warmup, entry.timeSec);
    const replaced: WorkoutEntry = { ...fresh, swappedFromId: oldId };
    update({ ...w, entries: w.entries.map((e) => (e.id === entry.id ? replaced : e)) });
    if (permanent && oldId) {
      const plan = await db.plans.get(w.planId);
      if (plan) {
        const day = plan.days.find((d) => d.id === w.dayId);
        const swap = (es: PlanEntry[]): PlanEntry[] => es.map((p) => p.kind === 'superset' ? { ...p, children: swap(p.children ?? []) } : p.exerciseId === oldId ? { ...p, exerciseId: newEx.id } : p);
        if (day) day.entries = swap(day.entries);
        await db.plans.put(plan);
      }
    }
    toast(permanent ? `${newEx.name} dauerhaft im Plan` : `Heute: ${newEx.name}`);
  };

  const endWorkout = async () => {
    const done = await finishWorkout(w);
    rest.stop();
    setSummary(done);
  };

  const progress = `${w.entries.filter(isEntryDone).length} / ${w.entries.length}`;
  const inputKind = entryInputKind(entry, active?.entry, exMap);
  const restRunning = rest.active && !rest.finished;

  return (
    <div class="screen">
      <div class="wk-top">
        <div style="display:flex;align-items:center;gap:2px">
          <button class="ib plain" aria-label="Vorherige Übung" onClick={() => setCur(Math.max(0, cur - 1))} disabled={cur === 0}><Icons.back /></button>
          <div class="crumb"><b>{w.dayName}</b> · {cur + 1} von {w.entries.length}</div>
          <button class="ib plain" aria-label="Nächste Übung" onClick={() => setCur(Math.min(w.entries.length - 1, cur + 1))} disabled={cur >= w.entries.length - 1}><Icons.chev /></button>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class={`timerpill num ${restRunning ? 'on' : ''}`} onClick={() => restRunning ? rest.add(30) : undefined} aria-label="Pausentimer">{restRunning ? fmtTime(rest.remaining) : 'Pause'}</button>
          <button class="ib" aria-label="Übungen umsortieren" onClick={() => setSheet('reorder')}><Icons.list /></button>
          <button class="ib" aria-label="Training beenden" onClick={() => setSheet('end')}><Icons.close /></button>
        </div>
      </div>

      <div class="wk-body">
        <div class="card ex-card">
          {entry.kind === 'superset' ? (
            <>
              <span class="tag accent">Supersatz · ohne Pause dazwischen</span>
              <h2 class="name" style="margin-top:8px">{(entry.children ?? []).map((c) => exMap.get(c.exerciseId ?? '')?.name).join(' + ')}</h2>
              <div class="meta">{(entry.children ?? []).map((c) => <span>{c.sets.filter((s) => !s.warmup).length} × {repRange(c)}</span>)}</div>
            </>
          ) : entry.kind === 'warmup' ? (
            <>
              <span class="tag">Aufwärmen</span>
              <h2 class="name" style="margin-top:8px">{entry.label}</h2>
              <div class="meta"><span>{entry.sets.length} Sätze · {entry.repMin} Drehungen pro Bein</span></div>
            </>
          ) : (
            <>
              <h2 class="name">{ex?.name ?? 'Übung'}</h2>
              <div class="meta">
                {ex && <span class="tag">{ex.muscle}</span>}
                <span>{ex?.input === 'time' && ex.unilateral ? Math.ceil(entry.sets.length / 2) : entry.sets.filter((s) => !s.warmup).length} Sätze · {repRange(entry)}{ex?.unilateral ? ' · pro Seite' : ''} · Pause {fmtTime(ex?.restSec ?? 90)}</span>
              </div>
              {ex && <div class="last">{last ? <>Letztes Mal <b>{lastText(ex, last.sets)}</b> <span>· {new Date(last.workout.startedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span></> : 'Noch keine Werte an diesem Gym'}</div>}
              {suggestion && suggestion.action !== 'none' && (
                <div class="chips"><button class={`chip ${suggestion.action === 'increase' ? 'accent' : ''}`} onClick={applySuggestion}>{suggestion.action === 'increase' ? '↑ ' : ''}{suggestion.text}</button></div>
              )}
              {suggestion && suggestion.action === 'none' && <div class="chips"><span class="chip">{suggestion.text}</span></div>}
              {entry.swappedFromId && <div class="chips"><span class="chip">Getauscht für {exMap.get(entry.swappedFromId)?.name}</span></div>}
              <div class="chips">
                <button class="mini" onClick={() => setSheet('machine')}><Icons.settings size={16} /> {machine && machine.fields.length ? machine.fields.map((f) => `${f.label} ${f.value}`).join(' · ') : 'Einstellungen'}</button>
                <button class="mini" onClick={() => setSheet('swap')}><Icons.swap size={16} /> Tauschen</button>
                {ex?.videoUrl && <a class="mini" href={ex.videoUrl} target="_blank" rel="noopener"><Icons.link size={16} /> Video</a>}
              </div>
              {ex?.notes && <p class="notes">{ex.notes}</p>}
            </>
          )}
        </div>

        <div class="list">
          <div class={`setrow head ${inputKind === 'trx' ? 'three' : ''}`}><span /><span>{colLabel(inputKind, 0)}</span>{inputKind === 'trx' && <span>Hilfe</span>}<span>{colLabel(inputKind, 1)}</span><span /></div>
          {flat.map((f, i) => {
            const s = f.set;
            const kind = entryInputKind(entry, f.entry, exMap);
            const nth = flat.slice(0, i + 1).filter((x) => !x.set.warmup && x.entry.id === f.entry.id).length;
            const label = s.warmup ? `W${flat.slice(0, i).filter((x) => x.set.warmup && x.entry.id === f.entry.id).length + 1}` : kind === 'time' && s.side ? String(Math.ceil(nth / 2)) : String(nth);
            return (
              <button type="button" class={`setrow ${kind === 'trx' ? 'three' : ''} ${s.warmup ? 'warm' : ''} ${active?.set.id === s.id ? 'active' : ''} ${s.done ? 'done' : ''} ${pop === s.id ? 'pop' : ''}`} onClick={() => setActiveSet(s.id)}>
                <span class="n">{label}</span>
                {setCells(kind, s, f.entry, entry.kind === 'superset' ? exMap.get(f.entry.exerciseId ?? '')?.name : undefined)}
                <span class="chk" onClick={(e) => { e.stopPropagation(); toggleSet(s.id); }} role="checkbox" aria-checked={s.done} aria-label={`Satz ${label} abhaken`}><Icons.check /></span>
              </button>
            );
          })}
          {entry.kind !== 'warmup' && (
            <div class="row" style="justify-content:flex-end;gap:8px;min-height:48px">
              <button class="mini" onClick={removeSet}><Icons.minus size={14} /> Satz</button>
              <button class="mini" onClick={addSet}><Icons.plus size={14} /> Satz</button>
            </div>
          )}
        </div>
        {w.entries[cur + 1] && <div class="row" style="padding:0 6px;min-height:0;color:var(--muted);font-size:13px"><span class="grow">Als Nächstes</span><b style="color:var(--fg)">{entryName(w.entries[cur + 1], exMap)}</b></div>}
      </div>

      <div class="wk-bottom">
        {rest.active && (
          <div class="rest">
            <div class="t num">{fmtTime(rest.remaining)}</div>
            <div class="bar"><i style={`width:${(1 - rest.progress) * 100}%`} /></div>
            <button type="button" onClick={() => rest.add(30)}>+30 s</button>
            <button type="button" onClick={() => rest.stop()}>Weiter</button>
          </div>
        )}
        {active && inputKind === 'time' ? (
          countdownSet === active.set.id && countdown.active ? (
            <div class="countdown">
              <div><div class="side">{active.set.side === 'L' ? 'Links' : active.set.side === 'R' ? 'Rechts' : 'Halten'}</div><div class="big num">{countdown.remaining} s</div></div>
              <button class="btn small" onClick={() => { countdown.stop(); setCountdownSet(null); }}>Abbrechen</button>
            </div>
          ) : (
            <div class="steppers">
              <Stepper label={active.set.side === 'L' ? 'Links · Sekunden' : active.set.side === 'R' ? 'Rechts · Sekunden' : 'Sekunden'} value={active.set.timeSec ?? 30} step={5} min={5} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, timeSec: v }))} />
              <button class="btn primary" onClick={() => { unlockAudio(); cdDone.current = false; countdown.start(active.set.timeSec ?? 30); setCountdownSet(active.set.id); }}><Icons.play /> Start</button>
            </div>
          )
        ) : active && inputKind === 'trx' ? (
          <div class="steppers three">
            <Stepper compact label="Füße" value={active.set.trxPos ?? 3} step={1} min={1} max={5} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, trxPos: v }))} />
            <Stepper compact label="Hilfe" value={active.set.trxHelp ?? 3} step={1} min={1} max={5} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, trxHelp: v }))} />
            <Stepper compact label="Wdh" value={active.set.reps ?? 0} step={1} min={0} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, reps: v }))} />
          </div>
        ) : active && (inputKind === 'kg' || inputKind === 'bodyweight') ? (
          <div class="steppers">
            <Stepper label={inputKind === 'bodyweight' ? 'Zusatz' : 'Gewicht'} unit="kg" value={active.set.weight ?? 0} step={2.5} min={inputKind === 'bodyweight' ? -100 : 0} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, weight: v }))} />
            <Stepper label="Wdh" value={active.set.reps ?? 0} step={1} min={0} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, reps: v }))} />
          </div>
        ) : active ? (
          <div class="steppers one">
            <Stepper label={entry.kind === 'warmup' ? 'Drehungen pro Bein' : 'Wdh'} value={active.set.reps ?? 0} step={1} min={0} onChange={(v) => patchSet(active.set.id, (s) => ({ ...s, reps: v }))} />
          </div>
        ) : null}
        {active && inputKind !== 'time' && (
          <button class={`log ${active.set.done ? 'undo' : ''}`} onClick={() => { unlockAudio(); toggleSet(active.set.id); }}>
            {active.set.done ? 'Rückgängig' : active.set.warmup ? 'Aufwärmsatz abhaken' : 'Satz abhaken'} {!active.set.done && <Icons.check />}
          </button>
        )}
        {active && inputKind === 'time' && active.set.done && <button class="log undo" onClick={() => toggleSet(active.set.id)}>Rückgängig</button>}
        {!active && <button class="log" onClick={() => { const n = nextOpenIndex(w.entries, cur + 1); if (n >= 0) setCur(n); else setSheet('end'); }}>Weiter</button>}
      </div>

      <div class={`flash ${flash ? 'go' : ''}`} aria-hidden="true" />

      {sheet === 'reorder' && (
        <Sheet title="Reihenfolge" onClose={() => setSheet(null)}>
          <p style="color:var(--muted);font-size:13px">Am Griff anfassen und ziehen. Supersätze bleiben zusammen.</p>
          <Sortable
            items={w.entries}
            keyOf={(e) => e.id}
            classOf={(e) => (isEntryDone(e) ? 'done' : '')}
            onMove={(from, to) => { const entries = move(w.entries, from, to); update({ ...w, entries }); setCur(entries.findIndex((e) => e.id === entry.id)); }}
            render={(e, i) => (
              <>
                <button class="grow" style="text-align:left" onClick={() => { setCur(i); setSheet(null); }}>
                  <div class="title">{entryName(e, exMap)}</div>
                  <div class="sub">{e.skipped ? 'Übersprungen' : isEntryDone(e) ? 'Fertig' : i === cur ? 'Aktuell' : 'Offen'}</div>
                </button>
                {!isEntryDone(e) && <button class="mini" onClick={() => { const entries = pushToEnd(w.entries, i); update({ ...w, entries }); const n = nextOpenIndex(entries, Math.min(i, entries.length - 1)); setCur(n >= 0 ? n : i); toast(`${entryName(e, exMap)} nach hinten geschoben`); }}>Besetzt</button>}
                <button class="mini" onClick={() => update({ ...w, entries: setSkipped(w.entries, i, !e.skipped) })}>{e.skipped ? 'Doch' : 'Skip'}</button>
              </>
            )}
          />
        </Sheet>
      )}
      {sheet === 'swap' && ex && (
        <ExercisePicker title={`${ex.name} tauschen`} alternativesOf={ex} onClose={() => setSheet(null)} onPick={(e) => { setPendingSwap(e); setSheet('swapScope'); }} />
      )}
      {sheet === 'swapScope' && pendingSwap && (
        <Sheet title={`Mit ${pendingSwap.name} tauschen`} onClose={() => setSheet(null)}>
          <button class="btn primary" onClick={() => { swapTo(pendingSwap, false); setSheet(null); }}>Nur heute</button>
          <button class="btn" onClick={() => { swapTo(pendingSwap, true); setSheet(null); }}>Dauerhaft im Plan</button>
        </Sheet>
      )}
      {sheet === 'machine' && ex && <MachineSheet gymId={w.gymId} exercise={ex} existing={machine ?? undefined} onClose={() => setSheet(null)} />}
      {sheet === 'end' && (
        <Sheet title="Training beenden?" onClose={() => setSheet(null)}>
          {hasAnyDoneSet(w) ? (
            <>
              <p style="color:var(--muted);font-size:15px">{w.entries.filter(isEntryDone).length} von {w.entries.length} Übungen erledigt. Offene Übungen werden nicht gewertet.</p>
              <button class="btn good" onClick={endWorkout}><Icons.check /> Beenden und speichern</button>
            </>
          ) : <p style="color:var(--muted);font-size:15px">Noch kein Satz abgehakt.</p>}
          <button class="btn danger" onClick={async () => { await discardWorkout(w); rest.stop(); go('/heute'); }}>Training verwerfen</button>
          <button class="btn" onClick={() => setSheet(null)}>Weitertrainieren</button>
        </Sheet>
      )}
    </div>
  );
}

/* Hilfsfunktionen */
function flatSets(entry: WorkoutEntry): { entry: WorkoutEntry; set: WorkoutSet }[] {
  if (entry.kind !== 'superset') return entry.sets.map((set) => ({ entry, set }));
  const kids = entry.children ?? [];
  const out: { entry: WorkoutEntry; set: WorkoutSet }[] = [];
  const max = Math.max(0, ...kids.map((k) => k.sets.length));
  for (let i = 0; i < max; i++) for (const k of kids) if (k.sets[i]) out.push({ entry: k, set: k.sets[i] });
  return out;
}
function applyDone(children: WorkoutEntry[], setId: string): WorkoutEntry[] {
  return children.map((c) => ({ ...c, sets: c.sets.map((s) => (s.id === setId ? { ...s, done: true } : s)) }));
}
function markDone(e: WorkoutEntry, setId: string): WorkoutEntry {
  if (e.kind === 'superset') return { ...e, children: applyDone(e.children ?? [], setId) };
  return { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, done: true } : s)) };
}
function repRange(e: WorkoutEntry): string {
  if (e.timeSec) return `${e.timeSec} s`;
  if (!e.repMax) return e.repMin ? `${e.repMin}+ Wdh` : 'bis kurz vor Versagen';
  return e.repMin === e.repMax ? `${e.repMin} Wdh` : `${e.repMin} bis ${e.repMax} Wdh`;
}
type Kind = 'kg' | 'bodyweight' | 'trx' | 'time' | 'reps';
function entryInputKind(entry: WorkoutEntry, owner: WorkoutEntry | undefined, exMap: Map<string, Exercise>): Kind {
  const e = owner ?? entry;
  if (e.kind === 'warmup') return 'reps';
  return exMap.get(e.exerciseId ?? '')?.input ?? 'kg';
}
function colLabel(kind: Kind, i: number): string {
  const cols: Record<Kind, [string, string]> = { kg: ['Gewicht', 'Wdh'], bodyweight: ['Zusatz', 'Wdh'], trx: ['Füße', 'Wdh'], time: ['Seite', 'Zeit'], reps: ['', 'Wdh'] };
  return cols[kind][i];
}
function setCells(kind: Kind, s: WorkoutSet, owner: WorkoutEntry, exName?: string) {
  const name = exName ? <span class="exn">{exName}</span> : null;
  switch (kind) {
    case 'kg': return <><span class="v num">{name}{fmtNum(s.weight ?? 0)}<small>kg</small></span><span class="v num">{s.reps ?? 0}</span></>;
    case 'bodyweight': return <><span class="v num">{name}{s.weight ? `${s.weight > 0 ? '+' : ''}${fmtNum(s.weight)}` : 'KG'}{s.weight ? <small>kg</small> : null}</span><span class="v num">{s.reps ?? 0}</span></>;
    case 'trx': return <><span class="v num">{name}{s.trxPos ?? 3}<small>/5</small></span><span class="v num">{s.trxHelp ?? 3}<small>/5</small></span><span class="v num">{s.reps ?? 0}</span></>;
    case 'time': return <><span class="v">{name}{s.side === 'L' ? 'Links' : s.side === 'R' ? 'Rechts' : '–'}</span><span class="v num">{s.timeSec ?? 0}<small>s</small></span></>;
    default: return <><span class="v" style="color:var(--muted)">{name}{owner.kind === 'warmup' ? 'pro Bein' : '–'}</span><span class="v num">{s.reps ?? 0}</span></>;
  }
}
export function lastText(ex: Exercise, sets: WorkoutSet[]): string {
  if (!sets.length) return '';
  const reps = sets.map((s) => s.reps ?? 0).join(' · ');
  switch (ex.input) {
    case 'kg': return `${fmtNum(Math.max(...sets.map((s) => s.weight ?? 0)))} kg × ${reps}`;
    case 'bodyweight': { const w = Math.max(...sets.map((s) => s.weight ?? 0)); return `${w ? `+${fmtNum(w)} kg` : 'Körpergewicht'} × ${reps}`; }
    case 'trx': return `Füße ${sets[0].trxPos ?? '-'} · Hilfe ${sets[0].trxHelp ?? '-'} × ${reps}`;
    case 'time': return `${sets.map((s) => `${s.timeSec ?? 0} s`).join(' · ')}`;
    default: return `${reps} Wdh`;
  }
}

function MachineSheet(props: { gymId: string; exercise: Exercise; existing?: MachineSetting; onClose: () => void }) {
  const [fields, setFields] = useState<{ label: string; value: string }[]>(props.existing?.fields?.length ? props.existing.fields : [{ label: 'Sitzhöhe', value: '' }]);
  const save = async () => {
    const clean = fields.filter((f) => f.label.trim() || f.value.trim());
    await db.machineSettings.put({ id: `${props.gymId}:${props.exercise.id}`, gymId: props.gymId, exerciseId: props.exercise.id, fields: clean, updatedAt: Date.now() });
    toast('Einstellungen gespeichert');
    props.onClose();
  };
  const set = (i: number, k: 'label' | 'value', v: string) => setFields(fields.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  return (
    <Sheet title="Maschineneinstellungen" onClose={props.onClose}>
      <p style="color:var(--muted);font-size:13px">Gilt für dieses Gym. Zum Beispiel Sitzhöhe 4, Lehne 30°, Griff eng.</p>
      <div class="form">
        {fields.map((f, i) => (
          <div class="inline">
            <input class="input" placeholder="Was" value={f.label} onInput={(e) => set(i, 'label', (e.target as HTMLInputElement).value)} />
            <input class="input" placeholder="Wert" value={f.value} onInput={(e) => set(i, 'value', (e.target as HTMLInputElement).value)} />
          </div>
        ))}
        <button class="btn small" onClick={() => setFields([...fields, { label: '', value: '' }])}><Icons.plus size={16} /> Feld</button>
        <button class="btn primary" onClick={save}>Speichern</button>
      </div>
    </Sheet>
  );
}

export function useConfirm() {
  const [c, setC] = useState<{ title: string; text?: string; ok: string; danger?: boolean; onOk: () => void } | null>(null);
  const el = c ? <Confirm title={c.title} text={c.text} okLabel={c.ok} danger={c.danger} onOk={c.onOk} onClose={() => setC(null)} /> : null;
  return { confirm: setC, el };
}

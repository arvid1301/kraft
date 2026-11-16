import { db } from '../db/db';
import { entryName, exerciseMap } from '../db/queries';
import { fmtDuration } from '../logic/timer';
import { allEntries } from '../logic/records';
import { back, go, useLive } from '../state';
import { Icons, TopBar, fmtNum } from './components';
import { lastText } from './Workout';
import { recordText } from './Summary';

export function History() {
  const data = useLive(async () => {
    const [workouts, gyms] = await Promise.all([db.workouts.where('status').equals('done').toArray(), db.gyms.toArray()]);
    return { workouts: workouts.sort((a, b) => b.startedAt - a.startedAt), gyms: new Map(gyms.map((g) => [g.id, g.name])) };
  }, []);
  if (!data) return <div class="screen" />;
  return (
    <div class="screen">
      <div class="page-title"><div><h1>Verlauf</h1><p class="sub">{data.workouts.length} {data.workouts.length === 1 ? 'Training' : 'Trainings'}</p></div></div>
      <div class="screen-body">
        {data.workouts.length === 0 && <p class="empty">Noch kein Training gespeichert. Dein erstes wartet unter „Heute“.</p>}
        {data.workouts.length > 0 && (
          <div class="list">
            {data.workouts.map((w) => (
              <button class="row" onClick={() => go(`/verlauf/${w.id}`)}>
                <div class="grow">
                  <div class="title">{w.dayName} · {new Date(w.startedAt).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div class="sub">{w.summary ? `${fmtDuration(w.summary.durationSec)} · ${w.summary.workingSets} Sätze · ${fmtNum(w.summary.volumeKg)} kg` : ''}{w.summary?.records.length ? ` · ${w.summary.records.length} Rekord${w.summary.records.length > 1 ? 'e' : ''}` : ''} · {data.gyms.get(w.gymId) ?? 'Gym'}</div>
                </div>
                <Icons.chev />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkoutDetail(props: { id: string }) {
  const data = useLive(async () => ({ w: await db.workouts.get(props.id), exMap: await exerciseMap() }), [props.id]);
  if (!data) return <div class="screen" />;
  const { w, exMap } = data;
  if (!w) return <div class="screen"><TopBar title="Training" onBack={back} /><p class="empty">Nicht gefunden.</p></div>;
  const del = async () => {
    if (!confirmDelete()) return;
    await db.workouts.delete(w.id); back();
  };
  return (
    <div class="screen">
      <TopBar title={`${w.dayName} · ${new Date(w.startedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`} onBack={back} right={<button class="ib plain" aria-label="Löschen" onClick={del}><Icons.trash /></button>} />
      <div class="screen-body">
        {w.summary && (
          <div class="stats">
            <div class="stat"><b class="num">{fmtDuration(w.summary.durationSec)}</b><span>Dauer</span></div>
            <div class="stat"><b class="num">{w.summary.workingSets}</b><span>Arbeitssätze</span></div>
            <div class="stat" style="grid-column:1/-1"><b class="num">{fmtNum(w.summary.volumeKg)} kg</b><span>Bewegtes Gesamtgewicht</span></div>
          </div>
        )}
        {w.summary?.records.length ? (
          <div class="list">{w.summary.records.map((r) => <div class="record"><span class="medal"><Icons.trophy /></span><div class="grow"><div style="font-weight:600">{r.exerciseName}</div><div style="color:var(--muted);font-size:13px">{recordText(r)}</div></div></div>)}</div>
        ) : null}
        <div class="list">
          {allEntries(w).map((e) => {
            const ex = exMap.get(e.exerciseId ?? '');
            const done = e.sets.filter((s) => s.done && !s.warmup);
            return (
              <div class="row" style={e.skipped || done.length === 0 ? 'opacity:.5' : ''}>
                <div class="grow">
                  <div class="title">{entryName(e, exMap)}</div>
                  <div class="sub">{e.skipped ? 'Übersprungen' : done.length === 0 ? 'Nicht gemacht' : ex ? lastText(ex, done) : `${done.length} Sätze`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function confirmDelete(): boolean {
  // Der Browser-Dialog ist hier bewusst in Ordnung: Löschen ist selten.
  return window.confirm('Dieses Training endgültig löschen?');
}

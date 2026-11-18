import { useEffect, useState } from 'preact/hooks';
import { db, uid } from '../db/db';
import { buildBackup, importBackup, markBackedUp, patchSettings, wipeAll } from '../db/queries';
import { alarm, pickFile, shareFile, storagePersisted, unlockAudio } from '../device';
import { toast, useLive } from '../state';
import { Confirm, Field, Icons, Sheet, Stepper, Switch, TextInput, fmtNum } from './components';

export function SettingsScreen() {
  const data = useLive(async () => ({ settings: (await db.settings.get('main'))!, gyms: await db.gyms.toArray() }), []);
  // Backup vorab bereitlegen: iOS erlaubt das Teilen-Menü nur direkt nach dem Tipp
  const backupText = useLive(() => buildBackup(), []);
  const [persisted, setPersisted] = useState<boolean | undefined>(undefined);
  useEffect(() => { storagePersisted().then(setPersisted); }, []);
  const [sheet, setSheet] = useState<null | 'gym' | 'newGym' | 'goals' | 'reset' | 'import'>(null);
  const [gymName, setGymName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  if (!data) return <div class="screen" />;
  const { settings, gyms } = data;
  const gym = gyms.find((g) => g.id === settings.currentGymId);
  const backupAge = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86400000) : null;

  const doExport = () => {
    if (!backupText) { toast('Backup wird vorbereitet, gleich nochmal tippen'); return; }
    const name = `kraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
    shareFile(name, backupText).then(async (r) => {
      if (r === 'cancelled') return;
      await markBackedUp();
      toast(r === 'shared' ? 'Backup gesichert' : 'Backup heruntergeladen');
    });
  };
  const doImport = async () => {
    const f = await pickFile('application/json,.json');
    if (!f) return;
    try {
      const r = await importBackup(await f.text());
      toast(`${r.workouts} Trainings und ${r.exercises} Übungen wiederhergestellt`);
      setTimeout(() => location.reload(), 800);
    } catch (e) { toast(String((e as Error).message ?? e)); }
  };
  const addGym = async () => {
    if (!gymName.trim()) return;
    const id = uid();
    await db.gyms.add({ id, name: gymName.trim(), createdAt: Date.now() });
    await patchSettings({ currentGymId: id });
    setGymName(''); setSheet(null); toast('Gym angelegt und ausgewählt');
  };

  return (
    <div class="screen">
      <div class="page-title"><div><h1>Einstellungen</h1></div></div>
      <div class="screen-body">
        <div class="section-label">Gym</div>
        <div class="list">
          <button class="row" onClick={() => setSheet('gym')}><div class="grow"><div class="title">{gym?.name ?? 'Kein Gym'}</div><div class="sub">Gewichte werden pro Gym gespeichert</div></div><Icons.chev /></button>
        </div>

        <div class="section-label">Ziele</div>
        <div class="list">
          <button class="row" onClick={() => setSheet('goals')}><div class="grow"><div class="title">{settings.weeklyGoal} Einheiten pro Woche</div><div class="sub">Ziel {fmtNum(settings.targetKg)} kg · +{fmtNum(settings.ratePerWeek)} kg pro Woche</div></div><Icons.chev /></button>
        </div>

        <div class="section-label">Training</div>
        <div class="list">
          <div class="row"><div class="grow"><div class="title">Ton am Ende der Pause</div><div class="sub">Countdown 3, 2, 1 und Schlusston, mischt sich mit Musik</div></div><Switch on={settings.sound} onChange={(v) => patchSettings({ sound: v })} label="Ton" /></div>
          <button class="row" onClick={() => { unlockAudio(); setTimeout(() => alarm(), 60); toast('Nichts gehört? Lautlos-Schalter am iPhone ausschalten und Lautstärke erhöhen.'); }}>
            <div class="grow"><div class="title">Ton testen</div><div class="sub">Spielt den Schlusston der Pause</div></div><Icons.play />
          </button>
          <div class="row"><div class="grow"><div class="title">Bildschirm anlassen</div><div class="sub">Während des Trainings</div></div><Switch on={settings.keepAwake} onChange={(v) => patchSettings({ keepAwake: v })} label="Bildschirm anlassen" /></div>
        </div>

        <div class="section-label">Backup</div>
        <div class="list">
          <button class="row" onClick={doExport}><div class="grow"><div class="title">Backup sichern</div><div class="sub">{backupAge === null ? 'Noch nie gesichert' : backupAge === 0 ? 'Heute gesichert' : `Vor ${backupAge} Tagen gesichert`}</div></div><Icons.chev /></button>
          <button class="row" onClick={() => setSheet('import')}><div class="grow"><div class="title">Backup wiederherstellen</div><div class="sub">Ersetzt alle Daten in der App</div></div><Icons.chev /></button>
          <div class="row"><div class="grow"><div class="title">Speicher geschützt</div><div class="sub">{persisted === true ? 'iOS behält die Daten dauerhaft' : persisted === false ? 'iOS entscheidet selbst, deshalb Backups machen' : 'Unbekannt, deshalb Backups machen'}</div></div><span style={`font-weight:700;color:${persisted ? 'var(--good)' : 'var(--muted)'}`}>{persisted === true ? 'Ja' : persisted === false ? 'Nein' : '–'}</span></div>
        </div>
        <p style="color:var(--muted);font-size:13px;line-height:1.45;padding:0 6px">Alle Daten liegen nur auf diesem Handy. Beim Sichern öffnet sich das Teilen-Menü: Tipp auf „In Dateien sichern“ und wähle iCloud Drive. Dann ist das Backup auch sicher, wenn das Handy verloren geht.</p>

        <div class="section-label">Gefahrenzone</div>
        <div class="list"><button class="row" onClick={() => setSheet('reset')}><div class="grow"><div class="title" style="color:var(--bad)">Alle Daten löschen</div></div></button></div>
        <p style="color:var(--muted);font-size:12px;text-align:center;padding:12px">Kraft · Version 1</p>
      </div>

      {sheet === 'gym' && (
        <Sheet title="Gym wählen" onClose={() => setSheet(null)}>
          <div class="list">
            {gyms.map((g) => (
              <div class="row">
                {renaming === g.id ? (
                  <TextInput value={g.name} autofocus onBlur={async (e) => { const n = (e.target as HTMLInputElement).value.trim(); if (n) await db.gyms.update(g.id, { name: n }); setRenaming(null); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                ) : (
                  <button class="grow" style="text-align:left" onClick={async () => { await patchSettings({ currentGymId: g.id }); setSheet(null); toast(`${g.name} ausgewählt`); }}>
                    <div class="title" style={g.id === settings.currentGymId ? 'color:var(--accent)' : ''}>{g.name}</div>
                  </button>
                )}
                <button class="mini" onClick={() => setRenaming(g.id)}>Umbenennen</button>
              </div>
            ))}
          </div>
          <button class="btn" onClick={() => setSheet('newGym')}><Icons.plus /> Neues Gym</button>
        </Sheet>
      )}
      {sheet === 'newGym' && (
        <Sheet title="Neues Gym" onClose={() => setSheet(null)}>
          <Field label="Name"><TextInput value={gymName} autofocus onInput={(e) => setGymName((e.target as HTMLInputElement).value)} placeholder="z. B. FitX Mitte" /></Field>
          <button class="btn primary" disabled={!gymName.trim()} onClick={addGym}>Anlegen und auswählen</button>
        </Sheet>
      )}
      {sheet === 'goals' && (
        <Sheet title="Ziele" onClose={() => setSheet(null)}>
          <Stepper compact label="Einheiten pro Woche" value={settings.weeklyGoal} step={1} min={1} max={7} onChange={(v) => patchSettings({ weeklyGoal: v })} />
          <Stepper compact label="Zielgewicht" unit="kg" value={settings.targetKg} step={0.5} min={40} max={150} onChange={(v) => patchSettings({ targetKg: v })} />
          <Stepper compact label="Zunahme pro Woche" unit="kg" value={settings.ratePerWeek} step={0.05} min={0} max={1} format={(v) => v.toLocaleString('de-DE', { minimumFractionDigits: 2 })} onChange={(v) => patchSettings({ ratePerWeek: v })} />
          <button class="btn primary" onClick={() => setSheet(null)}>Fertig</button>
        </Sheet>
      )}
      {sheet === 'import' && <Confirm title="Backup wiederherstellen?" text="Alle aktuellen Daten in der App werden durch die Datei ersetzt." okLabel="Datei wählen" onOk={doImport} onClose={() => setSheet(null)} />}
      {sheet === 'reset' && <Confirm title="Wirklich alles löschen?" text="Plan, Übungen, Trainings und Körpergewicht sind danach weg. Mach vorher ein Backup." okLabel="Alles löschen" danger onOk={wipeAll} onClose={() => setSheet(null)} />}
    </div>
  );
}

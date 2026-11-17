// Deload: Hinweis bei Stillstand und Schalter für eine leichte Woche.
import { useState } from 'preact/hooks';
import type { Settings } from '../db/types';
import type { DeloadCheck } from '../logic/deload';
import { patchSettings } from '../db/queries';
import { toast } from '../state';
import { Icons } from './components';

const DAY = 86400000;

export function deloadActive(s: Settings | undefined): boolean {
  return !!s?.deloadUntil && s.deloadUntil > Date.now();
}

export function DeloadCard(props: { check: DeloadCheck; settings: Settings; showInfo?: boolean }) {
  const { check, settings } = props;
  if (deloadActive(settings)) {
    return (
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div class="meta" style="margin:0"><span class="tag accent">Leichte Woche</span><span>bis {new Date(settings.deloadUntil!).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
        <p style="font-size:14px;line-height:1.45">Gleiche Übungen, etwa 60 % der Sätze und 10 % weniger Gewicht. Diese Trainings zählen nicht für die Stillstand-Erkennung.</p>
        <button class="btn small" onClick={async () => { await patchSettings({ deloadUntil: undefined }); toast('Leichte Woche beendet'); }}>Leichte Woche beenden</button>
      </div>
    );
  }
  const dismissed = (settings.deloadDismissedAt ?? 0) > Date.now() - 14 * DAY;
  if (check.suggest && !dismissed) {
    return (
      <div class="card" style="display:flex;flex-direction:column;gap:10px;border:1px solid rgba(255,181,71,.35)">
        <div style="display:flex;gap:10px;align-items:center"><span style="color:var(--warn)"><Icons.info /></span><h2 style="font-size:18px">Zeit für eine leichte Woche?</h2></div>
        <p style="font-size:14px;line-height:1.45;color:var(--muted)">Bei {check.flagged.length} Übungen geht es seit zwei Wochen nicht voran. Eine Woche mit weniger Sätzen und etwas weniger Gewicht lässt den Körper aufholen, danach geht es meist wieder aufwärts.</p>
        <StalledList check={check} limit={4} />
        <button class="btn primary" onClick={async () => { await patchSettings({ deloadUntil: Date.now() + 7 * DAY }); toast('Leichte Woche gestartet'); }}>Leichte Woche starten</button>
        <button class="btn small" onClick={() => patchSettings({ deloadDismissedAt: Date.now() })}>Nicht jetzt</button>
      </div>
    );
  }
  if (props.showInfo && check.flagged.length > 0) {
    return (
      <div class="card" style="display:flex;flex-direction:column;gap:8px">
        <h2 style="font-size:17px">Stillstand</h2>
        <p style="font-size:13px;color:var(--muted);line-height:1.4">Diese Übungen sind seit zwei Wochen nicht besser geworden. Ab drei Übungen schlägt die App eine leichte Woche vor.</p>
        <StalledList check={check} limit={4} />
        {check.suggest && <button class="btn small" onClick={async () => { await patchSettings({ deloadUntil: Date.now() + 7 * DAY }); toast('Leichte Woche gestartet'); }}>Leichte Woche starten</button>}
      </div>
    );
  }
  return null;
}

function StalledList(props: { check: DeloadCheck; limit?: number }) {
  const [all, setAll] = useState(false);
  // Schwächer werdende Übungen zuerst
  const sorted = [...props.check.flagged].sort((a, b) => Number(b.status === 'falling') - Number(a.status === 'falling'));
  const shown = props.limit && !all ? sorted.slice(0, props.limit) : sorted;
  const rest = sorted.length - shown.length;
  return (
    <div class="list" style="background:var(--card2)">
      {shown.map((f) => (
        <div class="row" style="min-height:44px">
          <div class="grow title" style="font-size:14px">{f.name}</div>
          <span class="chip" style={`padding:4px 8px;font-size:12px;${f.status === 'falling' ? 'color:var(--warn)' : 'color:var(--muted)'}`}>{f.status === 'falling' ? 'Schwächer' : 'Stillstand'}</span>
        </div>
      ))}
      {rest > 0 && <button class="row" style="min-height:44px;color:var(--accent);font-weight:600;font-size:14px" onClick={() => setAll(true)}>Und {rest} weitere anzeigen</button>}
    </div>
  );
}

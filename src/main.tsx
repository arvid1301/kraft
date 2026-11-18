import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { ensureSeeded } from './db/seed';
import './styles.css';
import { installAudioUnlock } from './device';

registerSW({ immediate: true });

installAudioUnlock();

// iOS bitten, die Daten nicht beim Aufräumen zu löschen. Schlägt still fehl, wenn es nicht geht.
try { navigator.storage?.persist?.().catch(() => {}); } catch { /* ältere Browser */ }

ensureSeeded().then(() => {
  render(<App />, document.getElementById('app')!);
}).catch((e) => {
  document.getElementById('app')!.innerHTML = `<div class="empty">Die App konnte die Datenbank nicht öffnen.<br>${String(e)}</div>`;
});

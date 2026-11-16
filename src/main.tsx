import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { ensureSeeded } from './db/seed';
import './styles.css';

registerSW({ immediate: true });

ensureSeeded().then(() => {
  render(<App />, document.getElementById('app')!);
}).catch((e) => {
  document.getElementById('app')!.innerHTML = `<div class="empty">Die App konnte die Datenbank nicht öffnen.<br>${String(e)}</div>`;
});

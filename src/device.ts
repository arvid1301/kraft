// Ton, Bildschirm-an, Dateien. Alles mit Fallback, falls iOS etwas nicht kann.

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;

function getCtx(): AudioContext | null {
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    // "ambient": der Ton mischt sich mit laufender Musik statt sie zu stoppen.
    // Nachteil: Bei eingeschaltetem Lautlos-Schalter bleibt er stumm (iOS-Verhalten).
    const nav = navigator as unknown as { audioSession?: { type: string } };
    if (nav.audioSession && nav.audioSession.type !== 'ambient') nav.audioSession.type = 'ambient';
    if (!ctx) {
      ctx = new C();
      // Kompressor macht kurze Töne lauter, ohne zu übersteuern
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 6; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.1;
      const master = ctx.createGain();
      master.gain.value = 1.6;
      comp.connect(master); master.connect(ctx.destination);
      out = comp;
    }
    return ctx;
  } catch { return null; }
}

/**
 * iOS gibt Ton nur frei, wenn er aus einer Berührung heraus gestartet wurde,
 * und pausiert ihn nach Sperre oder Anruf wieder. Deshalb bei jeder Berührung erneut freischalten.
 */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  // Ein stiller Mini-Ton schaltet die Ausgabe auf älteren iOS-Versionen endgültig frei
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch { /* egal */ }
}

export function installAudioUnlock() {
  const h = () => unlockAudio();
  for (const ev of ['touchend', 'click', 'keydown']) document.addEventListener(ev, h, { passive: true, capture: true });
}

function tone(c: AudioContext, at: number, freq: number, dur: number, vol: number) {
  // Rechteck + Dreieck: klingt klar und setzt sich gegen Musik durch
  for (const [type, v] of [['square', vol * 0.35], ['triangle', vol]] as const) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(out ?? c.destination);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.01);
    g.gain.setValueAtTime(v, at + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.start(at); o.stop(at + dur + 0.02);
  }
}

/** Ende der Pause: zweimal drei aufsteigende Töne. */
export function alarm() {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  const t0 = c.currentTime + 0.05;
  for (const block of [0, 0.75]) {
    [1047, 1319, 1568].forEach((f, i) => tone(c, t0 + block + i * 0.16, f, 0.14, 0.9));
  }
}

/** Kurzer Countdown-Ton in den letzten Sekunden. */
export function tick(last = false) {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  tone(c, c.currentTime + 0.02, last ? 1319 : 880, 0.09, 0.7);
}

let lock: { release: () => Promise<void> } | null = null;
export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (!nav.wakeLock) return;
    if (on && !lock) lock = await nav.wakeLock.request('screen');
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lock) { lock = null; keepAwake(true); }
});

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Datei über das iOS-Teilen-Menü weitergeben ("In Dateien sichern" → iCloud Drive).
 * Muss direkt aus einem Tipp heraus aufgerufen werden, ohne vorheriges await.
 * Fällt auf einen normalen Download zurück, wenn Teilen nicht geht.
 */
export async function shareFile(filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  try {
    const file = new File([text], filename, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'Kraft Backup' });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelled';
  }
  downloadText(filename, text);
  return 'downloaded';
}

/** Ob iOS zugesagt hat, die Daten dauerhaft zu behalten. undefined = unbekannt. */
export async function storagePersisted(): Promise<boolean | undefined> {
  try {
    if (!navigator.storage?.persisted) return undefined;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return undefined; }
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => resolve(i.files?.[0] ?? null);
    i.click();
  });
}

export function haptic() {
  try { (navigator as { vibrate?: (n: number) => void }).vibrate?.(10); } catch { /* iOS kann das nicht */ }
}

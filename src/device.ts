// Ton, Bildschirm-an, Dateien. Alles mit Fallback, falls iOS etwas nicht kann.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    if (!ctx) ctx = new C();
    // iOS 17+: Ton mischt sich mit laufender Musik statt sie zu stoppen
    const nav = navigator as unknown as { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'ambient';
    return ctx;
  } catch { return null; }
}

/** Muss einmal aus einer Berührung heraus aufgerufen werden, sonst bleibt iOS stumm. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function beep(times = 3, freq = 880) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  for (let i = 0; i < times; i++) {
    const t = c.currentTime + i * 0.28;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.start(t); o.stop(t + 0.25);
  }
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

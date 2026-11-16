// Kleine Helfer: Live-Daten aus der Datenbank, Navigation per URL-Hash, Toasts.
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

export function useLive<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: (x) => setV(x as T), error: (e) => console.error(e) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}

export function useHash(): string {
  const [h, setH] = useState(location.hash.slice(1) || '/heute');
  useEffect(() => {
    const on = () => setH(location.hash.slice(1) || '/heute');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

export function go(path: string) {
  location.hash = path;
}
export function back() {
  if (history.length > 1) history.back(); else go('/heute');
}

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();
export function toast(msg: string) { listeners.forEach((l) => l(msg)); }
export function onToast(l: Listener) { listeners.add(l); return () => listeners.delete(l); }

export const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

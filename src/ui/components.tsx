import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { onToast } from '../state';

/* Icons: schlichte Linien-Icons als SVG */
const I = (d: string | string[]) => (props: { size?: number }) => (
  <svg width={props.size ?? 22} height={props.size ?? 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {(Array.isArray(d) ? d : [d]).map((p) => <path d={p} />)}
  </svg>
);
export const Icons = {
  today: I(['M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 2v4', 'M16 2v4']),
  history: I(['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5', 'M12 7v5l3 3']),
  progress: I(['M3 17l6-6 4 4 8-8', 'M14 7h7v7']),
  plan: I(['M4 6h16', 'M4 12h16', 'M4 18h10']),
  settings: I(['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z']),
  check: I('M5 12l5 5L20 7'),
  close: I(['M18 6L6 18', 'M6 6l12 12']),
  back: I('M15 18l-6-6 6-6'),
  chev: I('M9 18l6-6-6-6'),
  plus: I(['M12 5v14', 'M5 12h14']),
  minus: I('M5 12h14'),
  list: I(['M4 7h16', 'M4 12h16', 'M4 17h16']),
  grip: I(['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01']),
  swap: I(['M7 16V4', 'M3 8l4-4 4 4', 'M17 8v12', 'M13 16l4 4 4-4']),
  play: I('M6 4l14 8-14 8z'),
  trophy: I(['M8 21h8', 'M12 17v4', 'M7 4h10v4a5 5 0 0 1-10 0z', 'M17 5h3a2 2 0 0 1-2 4', 'M7 5H4a2 2 0 0 0 2 4']),
  flame: I('M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 11 0 4 3 8 7 8z'),
  info: I(['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01']),
  more: I(['M12 12h.01', 'M19 12h.01', 'M5 12h.01']),
  search: I(['M21 21l-4.3-4.3', 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z']),
  trash: I(['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6']),
  link: I(['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1']),
};

export function Sheet(props: { title?: string; onClose: () => void; children: ComponentChildren; action?: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div class="sheet-back" onClick={props.onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={props.title}>
        <div class="grab" />
        {(props.title || props.action) && (
          <div class="sheet-head">
            <h2>{props.title}</h2>
            {props.action ?? <button class="ib plain" aria-label="Schließen" onClick={props.onClose}><Icons.close /></button>}
          </div>
        )}
        <div class="sheet-body">{props.children}</div>
      </div>
    </>
  );
}

export function Confirm(props: { title: string; text?: string; okLabel: string; danger?: boolean; onOk: () => void; onClose: () => void }) {
  return (
    <Sheet title={props.title} onClose={props.onClose}>
      {props.text && <p style="color:var(--muted);font-size:15px;line-height:1.45">{props.text}</p>}
      <button class={`btn ${props.danger ? '' : 'primary'}`} style={props.danger ? 'background:var(--bad);color:#fff' : ''} onClick={() => { props.onOk(); props.onClose(); }}>{props.okLabel}</button>
      <button class="btn" onClick={props.onClose}>Abbrechen</button>
    </Sheet>
  );
}

export function Stepper(props: { label: string; value: number; unit?: string; step: number; min?: number; max?: number; onChange: (v: number) => void; format?: (v: number) => string; compact?: boolean }) {
  const [typing, setTyping] = useState(false);
  const set = (v: number) => {
    let r = Math.round(v * 100) / 100;
    if (Number.isNaN(r)) return;
    if (props.min !== undefined && r < props.min) r = props.min;
    if (props.max !== undefined && r > props.max) r = props.max;
    props.onChange(r);
  };
  const commit = (el: HTMLInputElement) => { const v = parseFloat(el.value.replace(',', '.')); if (!Number.isNaN(v)) set(v); setTyping(false); };
  return (
    <div class={`stepper ${props.compact ? 'compact' : ''}`}>
      <div class="lbl">{props.label}</div>
      <button type="button" aria-label={`${props.label} minus`} onClick={() => set(props.value - props.step)}><Icons.minus /></button>
      {typing ? (
        <input class="val num" type="text" inputMode="decimal" style="background:var(--card);border:0;border-radius:10px;width:100%;min-width:0;color:inherit;font:inherit;padding:2px 0;text-align:center" defaultValue={String(props.value).replace('.', ',')} autofocus
          onFocus={(e) => (e.target as HTMLInputElement).select()}
          onBlur={(e) => commit(e.target as HTMLInputElement)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      ) : (
        <button type="button" class="val num" aria-label={`${props.label} eintippen`} onClick={() => setTyping(true)}>{props.format ? props.format(props.value) : fmtNum(props.value)}{props.unit && <small> {props.unit}</small>}</button>
      )}
      <button type="button" aria-label={`${props.label} plus`} onClick={() => set(props.value + props.step)}><Icons.plus /></button>
    </div>
  );
}

export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export function Ring(props: { value: number; max: number; label: string }) {
  const r = 50, c = 2 * Math.PI * r;
  const p = props.max ? Math.min(1, props.value / props.max) : 0;
  return (
    <div class="ring" role="img" aria-label={`${props.value} von ${props.max} ${props.label}`}>
      <svg viewBox="0 0 120 120"><circle class="tr" cx="60" cy="60" r={r} /><circle class="pr" cx="60" cy="60" r={r} stroke-dasharray={c} stroke-dashoffset={c * (1 - p)} /></svg>
      <div class="num"><div><b class="num">{props.value}<span style="color:var(--muted);font-size:16px"> / {props.max}</span></b><small style="display:block">{props.label}</small></div></div>
    </div>
  );
}

export function Toasts() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t = 0;
    const off = onToast((m) => { setMsg(m); clearTimeout(t); t = window.setTimeout(() => setMsg(null), 2200); });
    return () => { off(); clearTimeout(t); };
  }, []);
  return msg ? <div class="toast" role="status">{msg}</div> : null;
}

export function Switch(props: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={props.on} aria-label={props.label} class={`switch ${props.on ? 'on' : ''}`} onClick={() => props.onChange(!props.on)} />;
}

export function Segment<T extends string>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="segment" role="radiogroup">
      {props.options.map((o) => <button type="button" role="radio" aria-checked={o.value === props.value} class={o.value === props.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function TopBar(props: { title: string; onBack?: () => void; right?: ComponentChildren }) {
  return (
    <div class="topbar">
      {props.onBack ? <button class="ib plain" aria-label="Zurück" onClick={props.onBack}><Icons.back /></button> : <span class="ib" style="background:none" />}
      <h1>{props.title}</h1>
      {props.right ?? <span class="ib" style="background:none" />}
    </div>
  );
}

export function Field(props: { label: string; children: ComponentChildren }) {
  return <div class="field"><label>{props.label}</label>{props.children}</div>;
}

export function TextInput(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  return <input class="input" {...props} />;
}

export function Confetti() {
  const colors = ['#ff6b1a', '#3ad17a', '#ffb547', '#ffffff', '#ff9c5a'];
  return (
    <div class="confetti" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => (
        <i style={`left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 10) * 0.08}s;animation-duration:${1.4 + (i % 5) * 0.2}s`} />
      ))}
    </div>
  );
}

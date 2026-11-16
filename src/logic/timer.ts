// Pausentimer auf Basis der Uhrzeit, damit er auch stimmt, wenn Safari im Hintergrund pausiert.
export class RestTimer {
  private endAt = 0;
  private total = 0;
  constructor(private now: () => number = () => Date.now()) {}

  start(seconds: number) {
    this.total = seconds;
    this.endAt = this.now() + seconds * 1000;
  }
  add(seconds: number) {
    if (!this.running) return;
    this.endAt += seconds * 1000;
    this.total += seconds;
  }
  stop() { this.endAt = 0; this.total = 0; }
  get active(): boolean { return this.endAt > 0; }
  get running(): boolean { return this.endAt > 0 && this.now() < this.endAt; }
  get finished(): boolean { return this.endAt > 0 && this.now() >= this.endAt; }
  get remaining(): number { return this.endAt ? Math.max(0, Math.ceil((this.endAt - this.now()) / 1000)) : 0; }
  get totalSeconds(): number { return this.total; }
  get progress(): number { return this.total ? Math.min(1, Math.max(0, 1 - this.remaining / this.total)) : 0; }
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

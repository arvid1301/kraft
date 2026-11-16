import { describe, expect, it } from 'vitest';
import { RestTimer, fmtTime } from './timer';

describe('Pausentimer', () => {
  it('zählt anhand der Uhrzeit herunter und meldet das Ende', () => {
    let now = 1_000_000;
    const t = new RestTimer(() => now);
    t.start(90);
    expect(t.running).toBe(true);
    expect(t.remaining).toBe(90);
    now += 30_000;
    expect(t.remaining).toBe(60);
    expect(t.progress).toBeCloseTo(1 / 3, 2);
    now += 60_000;
    expect(t.remaining).toBe(0);
    expect(t.running).toBe(false);
    expect(t.finished).toBe(true);
  });
  it('kann um 30 Sekunden verlängert werden', () => {
    let now = 0;
    const t = new RestTimer(() => now);
    t.start(90);
    now = 80_000;
    t.add(30);
    expect(t.remaining).toBe(40);
    expect(t.totalSeconds).toBe(120);
  });
  it('stoppt sauber', () => {
    const t = new RestTimer(() => 0);
    t.start(90); t.stop();
    expect(t.active).toBe(false);
    expect(t.remaining).toBe(0);
  });
  it('stimmt auch nach einer Pause im Hintergrund', () => {
    let now = 0;
    const t = new RestTimer(() => now);
    t.start(150);
    now = 400_000; // Handy war 6 Minuten weg
    expect(t.finished).toBe(true);
  });
  it('formatiert Zeiten', () => {
    expect(fmtTime(90)).toBe('1:30');
    expect(fmtTime(5)).toBe('0:05');
  });
});

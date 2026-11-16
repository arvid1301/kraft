// Sortierbare Liste per Finger: am Griff anfassen und ziehen. Funktioniert mit Touch und Maus (Pointer Events).
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Icons } from './components';
import { haptic } from '../device';

interface Props<T> {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T, index: number, dragging: boolean) => ComponentChildren;
  onMove: (from: number, to: number) => void;
  classOf?: (item: T) => string;
}

export function Sortable<T>(props: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null);
  const state = useRef<{ from: number; startY: number; heights: number[]; tops: number[]; pointerId: number } | null>(null);

  const measure = () => {
    const el = listRef.current!;
    const kids = Array.from(el.children) as HTMLElement[];
    return { heights: kids.map((k) => k.offsetHeight), tops: kids.map((k) => k.offsetTop) };
  };

  const onDown = (index: number) => (e: PointerEvent) => {
    if (!listRef.current) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const m = measure();
    state.current = { from: index, startY: e.clientY, pointerId: e.pointerId, ...m };
    setDrag({ from: index, to: index, dy: 0 });
    haptic();
  };
  const onMove = (e: PointerEvent) => {
    const s = state.current; if (!s) return;
    const dy = e.clientY - s.startY;
    const centerY = s.tops[s.from] + s.heights[s.from] / 2 + dy;
    let to = s.from;
    for (let i = 0; i < s.tops.length; i++) {
      const mid = s.tops[i] + s.heights[i] / 2;
      if (i < s.from && centerY < mid) { to = Math.min(to, i); }
      if (i > s.from && centerY > mid) { to = Math.max(to, i); }
    }
    setDrag({ from: s.from, to, dy });
  };
  const onUp = () => {
    const s = state.current; if (!s) return;
    const d = drag;
    state.current = null;
    setDrag(null);
    if (d && d.to !== d.from) props.onMove(d.from, d.to);
  };

  return (
    <div class="sort-list sortable" ref={listRef}>
      {props.items.map((item, i) => {
        let style = '';
        if (drag) {
          const s = state.current!;
          if (i === drag.from) style = `transform: translateY(${drag.dy}px)`;
          else if (drag.from < drag.to && i > drag.from && i <= drag.to) style = `transform: translateY(-${s.heights[drag.from] + 8}px)`;
          else if (drag.from > drag.to && i >= drag.to && i < drag.from) style = `transform: translateY(${s.heights[drag.from] + 8}px)`;
        }
        return (
          <div key={props.keyOf(item)} class={`sort-item ${drag?.from === i ? 'dragging' : ''} ${props.classOf?.(item) ?? ''}`} style={style}>
            <button type="button" class="handle" aria-label="Verschieben" onPointerDown={onDown(i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <Icons.grip />
            </button>
            {props.render(item, i, drag?.from === i)}
          </div>
        );
      })}
    </div>
  );
}

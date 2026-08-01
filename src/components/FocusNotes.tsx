import { useRef, useState } from 'react';
import { NOTE_MAX, NOTE_MIN_W, NOTE_MIN_H } from '../types';
import type { Note, NoteId } from '../types';

interface Props {
  notes: Note[];
  onChange: (id: NoteId, text: string) => void;
  onMove: (id: NoteId, x: number, y: number) => void;
  /** Resizing from a top or left edge moves that corner too, so it carries a position. */
  onResize: (id: NoteId, x: number, y: number, w: number, h: number) => void;
  onRemove: (id: NoteId) => void;
}

export function FocusNotes({ notes, onChange, onMove, onResize, onRemove }: Props) {
  return (
    <>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onChange={onChange}
          onMove={onMove}
          onResize={onResize}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}

const between = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/**
 * Which sides a handle drags, as the compass letters it contains: 'e' widens from the right,
 * 'w' from the left, 'se' does both axes at once.
 */
type Dir = 'n' | 's' | 'e' | 'w' | 'se';

/** Where each handle sits on the note. The edges are invisible strips straddling the border. */
const HANDLES: { dir: Dir; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'n', cursor: 'ns-resize', style: { top: -3, left: 0, right: 0, height: 7 } },
  { dir: 's', cursor: 'ns-resize', style: { bottom: -3, left: 0, right: 0, height: 7 } },
  { dir: 'w', cursor: 'ew-resize', style: { left: -3, top: 0, bottom: 0, width: 7 } },
  { dir: 'e', cursor: 'ew-resize', style: { right: -3, top: 0, bottom: 0, width: 7 } },
];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function NoteCard({
  note,
  onChange,
  onMove,
  onResize,
  onRemove,
}: { note: Note } & Omit<Props, 'notes'>) {
  // The typed text leads the stored copy — writes are debounced — so the textarea reads this,
  // not the note. Seeded once: the card is keyed by id, so a different note is a new card.
  const [text, setText] = useState(note.text);

  // Each is non-null only while that gesture is in flight, and each commits once on release —
  // so a drag across the window, or a resize to twice the size, is a single write.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });
  const dir = useRef<Dir>('se');

  const x = drag?.x ?? box?.x ?? note.x;
  const y = drag?.y ?? box?.y ?? note.y;
  const w = box?.w ?? note.w;
  const h = box?.h ?? note.h;
  const busy = drag !== null || box !== null;

  /** Shared opening for both gestures: capture the pointer and record where it started. */
  const beginGesture = (e: React.PointerEvent) => {
    // Without this the gesture would also be selecting the text under the pointer.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: note.x, y: note.y, w: note.w, h: note.h };
  };

  const onDragDown = (e: React.PointerEvent) => {
    beginGesture(e);
    setDrag({ x: note.x, y: note.y });
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const s = start.current;
    // Positions are fractions of the window, which is exactly the focus overlay's box.
    setDrag({
      x: between(s.x + (e.clientX - s.px) / window.innerWidth, 0, 1 - w / window.innerWidth),
      y: between(s.y + (e.clientY - s.py) / window.innerHeight, 0, 1 - h / window.innerHeight),
    });
  };

  const onDragUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDrag(null);
    if (drag.x !== note.x || drag.y !== note.y) onMove(note.id, drag.x, drag.y);
  };

  const onSizeDown = (which: Dir) => (e: React.PointerEvent) => {
    beginGesture(e);
    dir.current = which;
    setBox({ x: note.x, y: note.y, w: note.w, h: note.h });
  };

  const onSizeMove = (e: React.PointerEvent) => {
    if (!box) return;
    const s = start.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    // Worked in pixels: an edge follows the pointer, and the opposite edge holds still.
    let left = s.x * vw;
    let top = s.y * vh;
    let width = s.w;
    let height = s.h;

    if (dir.current.includes('e')) width = between(s.w + dx, NOTE_MIN_W, vw - left);
    if (dir.current.includes('s')) height = between(s.h + dy, NOTE_MIN_H, vh - top);
    // Pulling a left or top edge shrinks the note from that side, so the note's own corner
    // moves with the pointer — down to the minimum size, where the edge stops.
    if (dir.current.includes('w')) {
      const edge = between(left + dx, 0, left + s.w - NOTE_MIN_W);
      width = left + s.w - edge;
      left = edge;
    }
    if (dir.current.includes('n')) {
      const edge = between(top + dy, 0, top + s.h - NOTE_MIN_H);
      height = top + s.h - edge;
      top = edge;
    }
    setBox({ x: left / vw, y: top / vh, w: width, h: height });
  };

  const onSizeUp = (e: React.PointerEvent) => {
    if (!box) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setBox(null);
    const same = box.x === note.x && box.y === note.y && box.w === note.w && box.h === note.h;
    if (!same) onResize(note.id, box.x, box.y, box.w, box.h);
  };

  const handleProps = (which: Dir) => ({
    onPointerDown: onSizeDown(which),
    onPointerMove: onSizeMove,
    onPointerUp: onSizeUp,
    onPointerCancel: onSizeUp,
  });

  return (
    <div
      data-note
      style={{
        position: 'absolute',
        // The stored fraction can put a note off the right or bottom edge of a window
        // narrower than the one it was placed in, so every position is capped here too.
        left: `min(${x * 100}%, calc(100% - ${w}px))`,
        top: `min(${y * 100}%, calc(100% - ${h}px))`,
        width: w,
        height: h,
        zIndex: busy ? 4 : 3,
        background: 'var(--card)',
        border: '1px solid var(--hairline-alt)',
        boxShadow: busy ? 'var(--surface-shadow)' : '0 6px 18px -12px rgba(36, 33, 28, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        padding: '6px 10px 9px',
        animation: 'wonIn 220ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 15 }}>
        <span
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          title="Drag to move"
          style={{
            flex: 1,
            cursor: drag ? 'grabbing' : 'grab',
            color: 'var(--faint)',
            fontSize: 11,
            letterSpacing: '0.2em',
            lineHeight: 1,
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          ···
        </span>
        <button
          data-notedel
          onClick={() => onRemove(note.id)}
          aria-label="Delete note"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1,
            color: 'var(--muted)',
            opacity: 0.4,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <textarea
        // A note is created empty, so the one that just arrived is the one to type into.
        autoFocus={note.text === ''}
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => {
          setText(e.target.value);
          onChange(note.id, e.target.value);
        }}
        placeholder="Note"
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
          // Matches the capture bar: this is the same act of writing something down.
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1.6,
          color: 'var(--ink)',
          padding: 0,
        }}
      />

      {/* One strip per edge, sitting over the border rather than over the writing area. */}
      {HANDLES.map(({ dir: which, cursor, style }) => (
        <span
          key={which}
          {...handleProps(which)}
          style={{ position: 'absolute', cursor, touchAction: 'none', ...style }}
        />
      ))}
      {/* The corner is the only handle that shows itself, and the only one taking both axes. */}
      <span
        {...handleProps('se')}
        title="Drag to resize"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 3,
          cursor: 'nwse-resize',
          touchAction: 'none',
        }}
      >
        <span
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderBottom: '6px solid var(--faint)',
            pointerEvents: 'none',
          }}
        />
      </span>
    </div>
  );
}

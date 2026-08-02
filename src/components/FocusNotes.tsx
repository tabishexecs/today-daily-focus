import { useLayoutEffect, useRef, useState } from 'react';
import { NOTE_MAX, NOTE_MIN_W, NOTE_MIN_H } from '../types';
import type { Note, NoteId } from '../types';
import { APP_FONT } from '../styles';
import { GlassCloseButton } from './GlassCloseButton';

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

const between = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), Math.max(min, max));

/** Which sides a handle drags, as the compass letters it contains. */
type Dir = 'n' | 's' | 'e' | 'w' | 'se';

/** Invisible strips straddling each border. */
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

/** The header bar — as tall as the disc in it — and the padding around everything. */
const HEAD_H = 24;
const PAD_TOP = 8;
const PAD_BOTTOM = 10;
const PAD_X = 12;

const RADIUS = 16;

/** What the header keeps inside its own bottom edge, then the gap to the first line. */
const HEAD_PAD_B = 6;
const HEAD_GAP = 5;

/**
 * Two thicknesses of glass. The writing area is the clearer, a step back from `--glass-blur`,
 * so what is behind still reads as something. The header is frostier for free: a backdrop is
 * everything painted beneath, so its filter compounds with the card's — which is also why its
 * saturation is barely raised.
 */
const BODY_BLUR = 'blur(24px) saturate(1.8)';
const HEAD_BLUR = 'blur(26px) saturate(1.1)';

/** Everything that is not the writing area, added to the height the text needs. */
const CHROME =
  PAD_TOP + HEAD_H + HEAD_PAD_B + 1 + HEAD_GAP + PAD_BOTTOM + 2; // the bar's seam, then the two 1px borders

function NoteCard({
  note,
  onChange,
  onMove,
  onResize,
  onRemove,
}: { note: Note } & Omit<Props, 'notes'>) {
  // The typed text leads the stored copy — writes are debounced — so the textarea reads this.
  // Seeded once: the card is keyed by id, so a different note is a new card.
  const [text, setText] = useState(note.text);

  // Each is non-null only while that gesture is in flight, and commits once on release.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });
  const dir = useRef<Dir>('se');

  // Measured rather than stored: the height follows from the text, so it comes out the same
  // on any device.
  const area = useRef<HTMLTextAreaElement | null>(null);
  const [textH, setTextH] = useState(NOTE_MIN_H - CHROME);

  const x = drag?.x ?? box?.x ?? note.x;
  const y = drag?.y ?? box?.y ?? note.y;
  const w = box?.w ?? note.w;

  // `scrollHeight` only reports the text's height when the box is not already taller than it,
  // so the box is collapsed for the reading and put back before either one is painted.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const held = el.style.height;
    el.style.height = 'auto';
    const measured = el.scrollHeight;
    el.style.height = held;
    setTextH(measured);
  }, [text, w]);

  /** The shortest the card can be: text that has run out of room grows the note instead. */
  const minH = Math.max(NOTE_MIN_H, textH + CHROME);
  // The stored height is a floor, not a ceiling: typing past it grows the card, deleting the
  // text drops it back to what was dragged to.
  const h = Math.max(box?.h ?? note.h, minH);
  const busy = drag !== null || box !== null;

  const beginGesture = (e: React.PointerEvent) => {
    // Without this the gesture would also select the text under the pointer.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // The geometry on screen, not the stored geometry: a note grown by its text is taller than
    // the height it stores, and an edge has to move from where it was grabbed.
    start.current = { px: e.clientX, py: e.clientY, x, y, w, h };
  };

  const onDragDown = (e: React.PointerEvent) => {
    beginGesture(e);
    setDrag({ x, y });
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const s = start.current;
    // Fractions of the window, which is exactly the focus overlay's box.
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
    setBox({ x, y, w, h });
  };

  const onSizeMove = (e: React.PointerEvent) => {
    if (!box) return;
    const s = start.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    // In pixels: an edge follows the pointer, the opposite edge holds still.
    let left = s.x * vw;
    let top = s.y * vh;
    let width = s.w;
    let height = s.h;

    if (dir.current.includes('e')) width = between(s.w + dx, NOTE_MIN_W, vw - left);
    // Against `minH`, not `NOTE_MIN_H`: an edge dragged in past the text stops at the text.
    if (dir.current.includes('s')) height = between(s.h + dy, minH, vh - top);
    // A left or top edge shrinks the note from that side, so its own corner moves with the
    // pointer — down to the minimum size, where the edge stops.
    if (dir.current.includes('w')) {
      const edge = between(left + dx, 0, left + s.w - NOTE_MIN_W);
      width = left + s.w - edge;
      left = edge;
    }
    if (dir.current.includes('n')) {
      const edge = between(top + dy, 0, top + s.h - minH);
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
        // A stored fraction can put a note off the edge of a narrower window, so positions are
        // capped here too — in CSS, so they keep up with a resize.
        left: `min(${x * 100}%, calc(100% - ${w}px))`,
        top: `max(0px, min(${y * 100}%, calc(100% - ${h}px)))`,
        width: w,
        height: `min(${h}px, 100%)`,
        zIndex: busy ? 4 : 3,
        // The pomodoro's material, cut thinner — see `BODY_BLUR`.
        background: 'var(--glass)',
        backdropFilter: BODY_BLUR,
        WebkitBackdropFilter: BODY_BLUR,
        border: '1px solid var(--glass-edge)',
        borderRadius: RADIUS,
        // Parked, then picked up — the panel's lift, so both sit at the same height in hand.
        boxShadow: busy ? 'var(--glass-lift)' : 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        animation: 'glassIn 260ms cubic-bezier(0.22, 1.15, 0.36, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          // Out to the card's inner edges: the negative margins undo the card's padding, and
          // the bar puts the same padding back on its own account.
          margin: `${-PAD_TOP}px ${-PAD_X}px ${HEAD_GAP}px`,
          padding: `${PAD_TOP}px ${PAD_X}px ${HEAD_PAD_B}px`,
          // No height: the row is as tall as the disc in it, and with `box-sizing: border-box`
          // a fixed height would be eaten by the padding above.
          //
          // A point inside the card's radius, which is what a corner nested behind a 1px border
          // has to be to stay concentric with it.
          borderTopLeftRadius: RADIUS - 1,
          borderTopRightRadius: RADIUS - 1,
          backdropFilter: HEAD_BLUR,
          WebkitBackdropFilter: HEAD_BLUR,
          // A little more white than the card, so the denser blur has something to read
          // against — frosting alone is nearly invisible over a backdrop this even.
          background: 'rgba(255, 255, 255, 0.18)',
          // The join between the two thicknesses, lit rather than ruled.
          borderBottom: '1px solid rgba(255, 255, 255, 0.42)',
        }}
      >
        <span
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          title="Drag to move"
          style={{
            flex: 1,
            cursor: drag ? 'grabbing' : 'grab',
            // An rgba ink: `--faint` is mixed for an opaque card and vanishes over glass.
            color: 'rgba(31, 31, 29, 0.32)',
            fontSize: 11,
            letterSpacing: '0.2em',
            lineHeight: 1,
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          ···
        </span>
        <GlassCloseButton size={HEAD_H} label="Delete note" onClick={() => onRemove(note.id)} />
      </div>
      <textarea
        ref={area}
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
          // Sized outright rather than by `flex: 1`, which would ignore the measurement above.
          // It still gives way when the window holds the card short.
          flex: '0 1 auto',
          height: h - CHROME,
          minHeight: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          resize: 'none',
          // The player's face, weight, size and tracking, so a task and the notes against it
          // are the same writing. The leading is the one thing held back: the player is a
          // single clipped line, and 1.3 would set wrapped text tight.
          fontFamily: APP_FONT,
          fontSize: 14,
          letterSpacing: '0.02em',
          lineHeight: 1.5,
          color: 'var(--ink)',
          padding: 0,
        }}
      />

      {HANDLES.map(({ dir: which, cursor, style }) => (
        <span
          key={which}
          {...handleProps(which)}
          style={{ position: 'absolute', cursor, touchAction: 'none', ...style }}
        />
      ))}
      {/* The corner, taking both axes at once. Invisible like the edges — the `nwse-resize`
          cursor is the affordance. */}
      <span
        {...handleProps('se')}
        title="Drag to resize"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          touchAction: 'none',
        }}
      />
    </div>
  );
}

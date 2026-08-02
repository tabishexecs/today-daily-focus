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

/**
 * The bar carrying the drag dots and the delete button, and the padding around everything.
 * The bar is as tall as the disc in it, the way the pomodoro's header is; the padding is wider
 * than a flat card wanted because glass needs air inside its corners to read as a pane rather
 * than as a filled box.
 */
const HEAD_H = 24;
const PAD_TOP = 8;
const PAD_BOTTOM = 10;
const PAD_X = 12;

/**
 * Smaller than the pomodoro's 26: the same continuous corner, but a note is a fraction of the
 * panel's size and that radius on this box would curve away most of its short edge.
 */
const RADIUS = 16;

/**
 * Under the header bar: what the bar keeps inside its own bottom edge, then the clear gap to
 * the first line of writing. The dots and the dismiss are the card's furniture and the text is
 * what the card is for, so they are separated rather than stacked.
 */
const HEAD_PAD_B = 6;
const HEAD_GAP = 5;

/**
 * A note is the one pane in the app made of two thicknesses of glass.
 *
 * The writing area is the clearer: a step back from the app's `--glass-blur`, so what is behind
 * the note still comes through as something rather than as fog, and the surface under the words
 * reads as thin. The header is the frostier, and gets there for free — its filter is applied to
 * what the card has already blurred, because a backdrop is everything painted beneath the
 * element, so the two compound and the bar carrying the furniture sits on denser glass than the
 * part being written on. That is also why its saturation is barely raised: the body's is already
 * in the picture, and asking twice pushes the colour past what the glass is pulling through.
 */
const BODY_BLUR = 'blur(24px) saturate(1.8)';
const HEAD_BLUR = 'blur(26px) saturate(1.1)';

/**
 * Everything in the card that is not the writing area. Added to the height the text needs to
 * get the height the card needs.
 */
const CHROME =
  PAD_TOP + HEAD_H + HEAD_PAD_B + 1 + HEAD_GAP + PAD_BOTTOM + 2; // the bar's seam, then the two 1px borders

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

  // How tall the text is right now, at the note's current width. Measured rather than stored:
  // it follows from the text, which is stored, so it comes out the same on any device.
  const area = useRef<HTMLTextAreaElement | null>(null);
  const [textH, setTextH] = useState(NOTE_MIN_H - CHROME);

  const x = drag?.x ?? box?.x ?? note.x;
  const y = drag?.y ?? box?.y ?? note.y;
  const w = box?.w ?? note.w;

  // Re-measured on both of the things that move the wrapping. `scrollHeight` only reports the
  // height of the text when the box is not already taller than it, so the box is collapsed for
  // the reading and put back before the browser gets to paint either one.
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
  // The stored height is the one the user dragged to — a floor, not a ceiling. Typing past it
  // grows the card; deleting the text again drops it back to what they chose.
  const h = Math.max(box?.h ?? note.h, minH);
  const busy = drag !== null || box !== null;

  /** Shared opening for both gestures: capture the pointer and record where it started. */
  const beginGesture = (e: React.PointerEvent) => {
    // Without this the gesture would also be selecting the text under the pointer.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // The geometry on screen rather than the stored geometry: a note grown by its text is
    // taller than the height it stores, and an edge has to move with the pointer from where
    // it was grabbed.
    start.current = { px: e.clientX, py: e.clientY, x, y, w, h };
  };

  const onDragDown = (e: React.PointerEvent) => {
    beginGesture(e);
    setDrag({ x, y });
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
    setBox({ x, y, w, h });
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
    // Against `minH`, not `NOTE_MIN_H`: an edge dragged in past the text stops at the text.
    if (dir.current.includes('s')) height = between(s.h + dy, minH, vh - top);
    // Pulling a left or top edge shrinks the note from that side, so the note's own corner
    // moves with the pointer — down to the minimum size, where the edge stops.
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
        // The stored fraction can put a note off the right or bottom edge of a window
        // narrower than the one it was placed in, so every position is capped here too.
        left: `min(${x * 100}%, calc(100% - ${w}px))`,
        // A note grown taller than the window is held to the window and scrolls after all —
        // in CSS rather than in the numbers above, so it keeps up with a window being resized.
        top: `max(0px, min(${y * 100}%, calc(100% - ${h}px)))`,
        width: w,
        height: `min(${h}px, 100%)`,
        zIndex: busy ? 4 : 3,
        // The pomodoro's material — same fill, same lit edge, same shadows — but cut thinner.
        // The panel is a control being read at a glance and can afford to fog what is under
        // it; a note is written into and read closely, so its glass clears a little. See
        // `BODY_BLUR`.
        background: 'var(--glass)',
        backdropFilter: BODY_BLUR,
        WebkitBackdropFilter: BODY_BLUR,
        border: '1px solid var(--glass-edge)',
        borderRadius: RADIUS,
        // Parked, then picked up. The lift is the panel's, so a note being carried and a panel
        // being carried sit at the same height off the screen.
        boxShadow: busy ? 'var(--glass-lift)' : 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        // Arrives the way the pomodoro does, which is most of what makes a new note read as
        // having been set down rather than switched on.
        animation: 'glassIn 260ms cubic-bezier(0.22, 1.15, 0.36, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          // Out to the card's inner edges rather than sitting inside its padding: a bar held
          // off the sides would read as a patch of fog floating on the note instead of as the
          // top of the pane. The negative margins undo the card's padding, and the bar puts
          // the same padding back on its own account.
          margin: `${-PAD_TOP}px ${-PAD_X}px ${HEAD_GAP}px`,
          padding: `${PAD_TOP}px ${PAD_X}px ${HEAD_PAD_B}px`,
          // No height: the row is as tall as the disc in it, and with `box-sizing: border-box`
          // a fixed height here would be eaten by the padding above.
          //
          // A point inside the card's own corner, which is what a radius nested behind a 1px
          // border has to be to stay concentric with it.
          borderTopLeftRadius: RADIUS - 1,
          borderTopRightRadius: RADIUS - 1,
          backdropFilter: HEAD_BLUR,
          WebkitBackdropFilter: HEAD_BLUR,
          // A little more white than the card under it, so the denser blur has something to
          // read against — frosting alone is nearly invisible over a backdrop this even.
          background: 'rgba(255, 255, 255, 0.18)',
          // Where the two thicknesses meet. Lit rather than ruled: glass shows a join as a
          // highlight catching the edge, not as a line drawn across it.
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
            // An rgba ink rather than `--faint`, which is a solid mixed for the old card grey
            // and goes nearly invisible over glass this light.
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
        {/* The pomodoro's dismiss at the note's scale — the same disc, the same states. */}
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
          // Sized outright rather than by `flex: 1`, which would ignore the height the
          // measurement above sets. It still gives way when the window holds the card short.
          flex: '0 1 auto',
          height: h - CHROME,
          minHeight: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          resize: 'none',
          // Named rather than inherited: the focus screen sets itself in DM Mono, and a note is
          // the user's own words rather than part of that screen's furniture. Set in the app's
          // face, at reading size, and in the case it was typed in — a note is a sentence
          // someone wrote, not a label, and tracked-out mono caps read as the latter.
          //
          // Face, weight, size and tracking are the player's, so the task being worked on and
          // the notes taken against it are the same writing rather than two kinds of it. The
          // leading is the one thing held back: the player is a single clipped line where it
          // never shows, and 1.3 on text that wraps would set a note tight.
          fontFamily: APP_FONT,
          fontSize: 14,
          letterSpacing: '0.02em',
          lineHeight: 1.5,
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
      {/* The corner, which takes both axes at once. Invisible like the edges: the card is a
          pane of glass, and a mark printed in its corner was the one thing on it that read as
          drawn onto the surface rather than as part of it. What is left is the `nwse-resize`
          cursor, which is the affordance the edges already rely on. */}
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

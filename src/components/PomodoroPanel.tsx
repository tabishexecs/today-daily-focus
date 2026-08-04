import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { totalFor } from '../types';
import type { PanelPos, PomoPhase } from '../types';
import { APP_FONT, secondaryDangerBtn } from '../styles';
import { fmt } from '../util';
import { PauseIcon, PlayFilledIcon } from './icons';

interface Props {
  phase: PomoPhase;
  /** Seconds still to go in the phase. */
  left: number;
  running: boolean;
  /** Where the panel was left, in window fractions, or null while it sits in its corner. */
  pos: PanelPos | null;
  sidePad: string;
  onToggle: () => void;
  onReset: () => void;
  /** Called once on release, not per pointer move. */
  onMove: (x: number, y: number) => void;
}

/** Named, because a break that runs three times as long has to say so. */
const PHASE_NAME: Record<PomoPhase, string> = {
  focus: 'Focus',
  break: 'Break',
  longBreak: 'Long break',
};

const PHASE_LABEL: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  lineHeight: 1,
};

/** Shared with the progress indicator, which is drawn at a fixed pixel width. */
const PANEL_W = 244;
const PANEL_PAD_X = 18;
const BAR_W = PANEL_W - PANEL_PAD_X * 2;

/** How near the window's edge a dragged panel may be dropped. */
const EDGE = 8;

const between = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), Math.max(min, max));

/**
 * Material 3 Expressive's linear progress indicator, in its own numbers (dp read as px): the
 * elapsed part is a wave, the rest a straight track, held apart by a gap.
 *
 * The wave is drawn but never travels. M3 slides the pattern along, but beside a clock that is
 * itself the thing being watched, a second motion is something to look away from.
 */
const WAVELENGTH = 40;
const AMPLITUDE = 3;
const STROKE = 4;
const GAP = 4;
/** Tall enough for the wave's peaks plus the half-stroke above them. */
const BAR_H = AMPLITUDE * 2 + STROKE;
const MID = BAR_H / 2;
/** Round caps stand half a stroke past each end, so the drawing insets by that much. */
const SPAN = BAR_W - STROKE;

/**
 * One sine wave, `width` long. Anchored at x=0, so the pattern holds still while the wave
 * lengthens from its leading end — that growth is the progress. Sampled rather than fitted:
 * at a 3px amplitude the error over a 2px step is a fraction of a pixel. The final point is
 * placed exactly at `width` so the wave ends where the progress does.
 */
function wavePath(width: number): string {
  const at = (x: number) => {
    const y = MID - AMPLITUDE * Math.sin((x / WAVELENGTH) * 2 * Math.PI);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const points: string[] = [];
  for (let x = 0; x < width; x += 2) points.push(at(x));
  points.push(at(width));
  return `M${points.join('L')}`;
}

/**
 * The app's one pomodoro. It sits over every screen and is never dismissed — the session it
 * counts outlasts any single task, so there is no moment at which taking it away would be
 * right.
 *
 * Nothing behind it is dimmed or blocked: work goes on underneath, which is why it takes a
 * corner by default and why it can be picked up and put somewhere less in the way.
 *
 * Its clock is its own. The focus screen's player counts time on a task and shares nothing
 * with this but the second it runs on.
 */
export function PomodoroPanel({
  phase,
  left,
  running,
  pos,
  sidePad,
  onToggle,
  onReset,
  onMove,
}: Props) {
  const total = totalFor(phase);
  // Guarded: a phase change and this render are a tick apart at worst, and a wave longer than
  // its span would run out past the end of the box.
  const done = Math.min(1, Math.max(0, (total - left) / total));
  // Both breaks are rest, so both recede to the same grey — the label is what tells them apart.
  const accent = phase === 'focus' ? 'var(--primary)' : 'var(--muted)';

  const activeW = done * SPAN;
  // Where the track is squeezed to nothing its round cap draws the dot M3 leaves as a stop
  // indicator — the same shape from the same path.
  const trackStart = done > 0 ? Math.min(activeW + GAP, SPAN) : 0;

  // The drag in flight, in window fractions. Non-null only while the pointer is down.
  const [drag, setDrag] = useState<PanelPos | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  // Where pointer and panel both were when the gesture opened. `fx`/`fy` are `x`/`y` in the
  // fractions the drag works in, so the release can tell a carried panel from a pressed one.
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, fx: 0, fy: 0, w: PANEL_W, h: 0 });

  // The panel's height follows from the type inside it, and the bottom of the window is a
  // limit. `offsetHeight` rather than a rect: the panel arrives under a transform.
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = panel.current;
    if (el) setHeight(el.offsetHeight);
  }, []);

  // The gesture leads the stored position, or the panel would sit still until release.
  const at = drag ?? pos;
  const dragging = drag !== null;

  const onGrabDown = (e: React.PointerEvent) => {
    // The controls keep their own gestures: without this, a hand that moves a pixel between
    // press and release would close or start the pomodoro while trying to move it.
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panel.current;
    if (!el) return;
    // Read off the screen rather than from `pos`: the panel may be in its corner or held off
    // an edge by the caps below, and this rect is where it actually is.
    const rect = el.getBoundingClientRect();
    // Otherwise the drag also selects the clock it started on.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const from = { x: rect.left / window.innerWidth, y: rect.top / window.innerHeight };
    start.current = {
      px: e.clientX,
      py: e.clientY,
      x: rect.left,
      y: rect.top,
      fx: from.x,
      fy: from.y,
      w: rect.width,
      h: rect.height,
    };
    setDrag(from);
  };

  const onGrabMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const s = start.current;
    // Held inside the window here as well as in the style below, so a pointer that runs off
    // the edge and comes back picks the panel up where it was left.
    const x = between(s.x + (e.clientX - s.px), EDGE, window.innerWidth - s.w - EDGE);
    const y = between(s.y + (e.clientY - s.py), EDGE, window.innerHeight - s.h - EDGE);
    setDrag({ x: x / window.innerWidth, y: y / window.innerHeight });
  };

  const onGrabUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDrag(null);
    // A press that never moved is not a move: writing anyway would swap the corner's offsets
    // for pixels that only match today's window.
    const s = start.current;
    if (drag.x !== s.fx || drag.y !== s.fy) onMove(drag.x, drag.y);
  };

  // Until it has been moved the corner offsets place it, which keeps it on the app's margin
  // and following that corner through a resize. After, the fractions do. One pair, so the two
  // cannot both apply.
  const placement: CSSProperties = at
    ? {
        // Capped again here, in CSS, so a narrower window can't leave the panel off an edge
        // and the cap keeps up with a resize without a listener.
        left: `clamp(${EDGE}px, ${at.x * 100}%, calc(100% - ${PANEL_W + EDGE}px))`,
        top: `clamp(${EDGE}px, ${at.y * 100}%, calc(100% - ${height + EDGE}px))`,
      }
    : { right: sidePad, bottom: sidePad };

  return (
    <div
      ref={panel}
      role="region"
      aria-label="Pomodoro"
      onPointerDown={onGrabDown}
      onPointerMove={onGrabMove}
      onPointerUp={onGrabUp}
      onPointerCancel={onGrabUp}
      style={{
        position: 'fixed',
        ...placement,
        // Over the focus screen, which is a fixed layer at 80 — the panel has to clear the
        // whole of it, not merely the notes inside it, or focusing a task would bury it.
        zIndex: 90,
        width: PANEL_W,
        // The whole pane is the handle — on something this small a grip would be most of the
        // top edge anyway.
        cursor: dragging ? 'grabbing' : 'grab',
        // Without this a drag reads as a scroll on a touch screen.
        touchAction: 'none',
        userSelect: 'none',
        background: 'var(--glass)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-edge)',
        borderRadius: 26,
        boxShadow: dragging ? 'var(--glass-lift)' : 'var(--glass-shadow)',
        // The 15px the close button used to sit in read as less, being a 32px target in it.
        // With the label alone up there the top squares up with the sides.
        padding: `18px ${PANEL_PAD_X}px 16px`,
        animation: 'glassIn 260ms cubic-bezier(0.22, 1.15, 0.36, 1)',
      }}
    >
      {/* In the colour its own progress is drawn in, so tag and wave name the phase together. */}
      <span style={{ ...PHASE_LABEL, color: accent, display: 'block' }}>{PHASE_NAME[phase]}</span>

      <div
        style={{
          fontFamily: APP_FONT,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          // Inter Tight is proportional, so the digits have to be asked for fixed widths or
          // the clock twitches every second.
          fontVariantNumeric: 'tabular-nums',
          // The label is set on a 1.0 leading, so it gives the clock nothing. This is the gap.
          marginTop: 10,
        }}
      >
        {fmt(left)}
      </div>

      <svg
        width={BAR_W}
        height={BAR_H}
        viewBox={`0 0 ${BAR_W} ${BAR_H}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(done * 100)}
        style={{ display: 'block', marginTop: 12 }}
      >
        {/* The group holds the cap inset, rather than every coordinate. */}
        <g transform={`translate(${STROKE / 2}, 0)`} strokeWidth={STROKE} strokeLinecap="round">
          {trackStart <= SPAN && (
            <path
              d={`M${trackStart} ${MID}L${SPAN} ${MID}`}
              stroke="rgba(31, 31, 29, 0.12)"
              fill="none"
            />
          )}
          {done > 0 && <path d={wavePath(activeW)} stroke={accent} fill="none" />}
        </g>
      </svg>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <button data-secondarydangerbtn="" onClick={onReset} style={secondaryDangerBtn}>
          Reset
        </button>
        <button
          onClick={onToggle}
          aria-label={running ? 'Pause pomodoro' : 'Start pomodoro'}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--primary)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px -4px rgba(2, 73, 180, 0.55)',
          }}
        >
          {running ? <PauseIcon size={15} /> : <PlayFilledIcon size={15} />}
        </button>
      </div>
    </div>
  );
}

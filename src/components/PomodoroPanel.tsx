import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { totalFor } from '../types';
import type { FocusPhase, PanelPos } from '../types';
import { APP_FONT, secondaryDangerBtn } from '../styles';
import { fmt } from '../util';
import { PauseIcon, PlayFilledIcon } from './icons';
import { GlassCloseButton } from './GlassCloseButton';

interface Props {
  /** Which half of the cycle is running — the panel is the only place this is named. */
  phase: FocusPhase;
  /** Seconds still to go in that phase. The panel counts down where the player counts up. */
  left: number;
  running: boolean;
  /**
   * Where the panel was left, in window fractions, or null while it has never been moved —
   * which is what leaves it in its corner. The drag itself is the panel's own; this is only
   * where the last one finished.
   */
  pos: PanelPos | null;
  /** The window's own side padding, so the panel sits on the same margin as everything else. */
  sidePad: string;
  onToggle: () => void;
  onReset: () => void;
  /** Called once on release, not per pointer move — the same bargain a note's drag makes. */
  onMove: (x: number, y: number) => void;
  onClose: () => void;
}

/**
 * The label above the clock. Set in the app's face rather than the focus screen's mono, and
 * tracked out far enough to read as a tag rather than a word.
 */
const PHASE_LABEL: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  lineHeight: 1,
};

/**
 * The panel's own box. Shared with the progress indicator below, which is drawn at a fixed
 * pixel width and would otherwise have to be kept in step with these by hand.
 */
const PANEL_W = 244;
const PANEL_PAD_X = 18;
const BAR_W = PANEL_W - PANEL_PAD_X * 2;

/** How near the window's edge a dragged panel may be dropped. Glass wants a little air. */
const EDGE = 8;

const between = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), Math.max(min, max));

/**
 * Material 3 Expressive's linear progress indicator, in its own numbers: the part that has
 * elapsed is a wave, the part still to come is a straight track, and the two are held apart by
 * a gap rather than meeting. Every value below is the spec's, in dp read as px.
 *
 * The wave is drawn but never travels. M3 slides the pattern along to make the indicator feel
 * alive, and next to a clock that is itself the thing being watched, that second motion is
 * something to look away from rather than a reading. Held still, the shape does the work the
 * spec wants of it — it tells the elapsed part from the track at a glance — and the panel keeps
 * one moving thing on it, the digits.
 */
const WAVELENGTH = 40;
const AMPLITUDE = 3;
const STROKE = 4;
const GAP = 4;
/** Tall enough for the wave's peaks plus the half-stroke that sits above them. */
const BAR_H = AMPLITUDE * 2 + STROKE;
const MID = BAR_H / 2;
/** Round caps stand half a stroke past each end, so the drawing insets by that much. */
const SPAN = BAR_W - STROKE;

/**
 * One sine wave, `width` long, as a path. Anchored at x=0, so the pattern holds still while the
 * width grows and the wave lengthens from its leading end — that growth is the progress.
 *
 * Sampled rather than fitted with curves: at a 3px amplitude the error over a 2px step is a
 * fraction of a pixel, and it keeps the whole shape to one line of trigonometry. The final
 * point is placed exactly at `width` so the wave ends where the progress does, whatever the
 * sampling left over.
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
 * The pomodoro, floating over the focus screen as a pane of glass.
 *
 * No overlay behind it: the screen it covers is still live — notes can be dragged, the task can
 * be marked done — so nothing here dims or blocks it. That is also why it takes a corner rather
 * than the centre, why closing it is a single × instead of a click anywhere outside, and why it
 * can be picked up and moved: whatever it lands on top of is something the user may still want.
 *
 * The clock is the one the focus screen already runs; this panel only shows it from the other
 * end. Pausing here pauses the round button on the player, and the reverse.
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
  onClose,
}: Props) {
  const total = totalFor(phase);
  // Guarded rather than trusted: a phase change and this render are a tick apart at worst, and
  // a wave longer than its span would run out past the end of the box it is drawn in.
  const done = Math.min(1, Math.max(0, (total - left) / total));
  const accent = phase === 'break' ? 'var(--muted)' : 'var(--primary)';

  const activeW = done * SPAN;
  // The gap is the indicator's, so it only exists once there is an indicator. Where the track
  // has been squeezed down to nothing, its round cap draws the dot M3 leaves at the end as a
  // stop indicator — the same shape the spec asks for, from the same path.
  const trackStart = done > 0 ? Math.min(activeW + GAP, SPAN) : 0;

  // The drag in flight, in window fractions. Non-null only while the pointer is down: the
  // panel follows this, then commits once on release and follows the stored position again.
  const [drag, setDrag] = useState<PanelPos | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  // Where the pointer and the panel both were when the gesture opened. `fx`/`fy` are the same
  // corner as `x`/`y`, in the fractions the drag works in, so the release can tell a panel that
  // was carried somewhere from one that was only pressed.
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, fx: 0, fy: 0, w: PANEL_W, h: 0 });

  // The panel's own height, which nothing here sets — it follows from the type inside it. Held
  // so the bottom of the window can be a limit, both during a drag and in the style below.
  // `offsetHeight` rather than a rect: the panel arrives under a transform, and this ignores it.
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = panel.current;
    if (el) setHeight(el.offsetHeight);
  }, []);

  // The gesture leads the stored position, the way a note's card does — otherwise the panel
  // would sit still until the pointer was let go.
  const at = drag ?? pos;
  const dragging = drag !== null;

  const onGrabDown = (e: React.PointerEvent) => {
    // The controls keep their own gestures. Without this a press on × or the play button would
    // arm a drag as well, and a hand that moves a pixel between press and release would close
    // or start the pomodoro while trying to move it.
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panel.current;
    if (!el) return;
    // Read off the screen rather than from `pos`: the panel may be in the corner its offsets
    // put it in, or held off an edge by the caps below, and this rect is where it actually is.
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
    // Held inside the window here rather than only in the style below, so where the panel is
    // and where it thinks it is stay the same — a pointer that runs off the edge and comes
    // back picks the panel up where it was left, not where the pointer went.
    const x = between(s.x + (e.clientX - s.px), EDGE, window.innerWidth - s.w - EDGE);
    const y = between(s.y + (e.clientY - s.py), EDGE, window.innerHeight - s.h - EDGE);
    setDrag({ x: x / window.innerWidth, y: y / window.innerHeight });
  };

  const onGrabUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDrag(null);
    // A press that never moved is not a move. Left to write anyway it would store the corner
    // the panel was already sitting in, which is a different thing from having been put there
    // — and it would swap the corner's own offsets for pixels that only match today's window.
    const s = start.current;
    if (drag.x !== s.fx || drag.y !== s.fy) onMove(drag.x, drag.y);
  };

  // Until it has been moved the corner offsets place it, which keeps it on the same margin as
  // everything else and following that corner as the window resizes. After, the fractions do.
  // Written as one pair so the two cannot both apply.
  const placement: CSSProperties = at
    ? {
        // A window narrower or shorter than the one the panel was placed in would leave it off
        // an edge, so the fractions are capped again here — in CSS, where they keep up with a
        // resize without a listener, and where `clamp` yields the low end if the window is too
        // small for both caps to hold.
        left: `clamp(${EDGE}px, ${at.x * 100}%, calc(100% - ${PANEL_W + EDGE}px))`,
        top: `clamp(${EDGE}px, ${at.y * 100}%, calc(100% - ${height + EDGE}px))`,
      }
    : { right: sidePad, bottom: sidePad };

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Pomodoro"
      onPointerDown={onGrabDown}
      onPointerMove={onGrabMove}
      onPointerUp={onGrabUp}
      onPointerCancel={onGrabUp}
      style={{
        position: 'fixed',
        ...placement,
        // Above the notes, which top out at 4 while one is being dragged.
        zIndex: 6,
        width: PANEL_W,
        // The whole pane is the handle — there is no grip on it, because on something this
        // small a grip would be most of the top edge anyway.
        cursor: dragging ? 'grabbing' : 'grab',
        // A drag reads as a scroll on a touch screen without this, and the panel stays put
        // while the page moves under it.
        touchAction: 'none',
        userSelect: 'none',
        // The app's glass, from the tokens the notes are cut from too — see `--glass-blur`.
        background: 'var(--glass)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-edge)',
        // The continuous corner iOS uses on its own floating panes — large enough that the
        // radius reads as the shape of the thing rather than as a softened square.
        borderRadius: 26,
        // Held higher off the screen while it is being carried — the same lift a note takes
        // when it is picked up, since they are the same pane of glass in the same hand.
        boxShadow: dragging ? 'var(--glass-lift)' : 'var(--glass-shadow)',
        padding: `15px ${PANEL_PAD_X}px 16px`,
        // Lands with the small overshoot a sheet has when it is thrown rather than placed.
        animation: 'glassIn 260ms cubic-bezier(0.22, 1.15, 0.36, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            ...PHASE_LABEL,
            // The break is the quieter of the two, and says so — in the same colour its own
            // progress is drawn in, so the tag and the wave name the phase together.
            color: accent,
          }}
        >
          {phase === 'break' ? 'Break' : 'Focus'}
        </span>
        <GlassCloseButton size={32} label="Close pomodoro" onClick={onClose} />
      </div>

      <div
        style={{
          fontFamily: APP_FONT,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          // Inter Tight is proportional, so the digits have to be asked for the fixed widths
          // that keep the clock from twitching every second.
          fontVariantNumeric: 'tabular-nums',
          // No gap of its own: the header row is as tall as the close button, which leaves the
          // 10px label floating in 32px of row. That leftover already reads as the space the
          // clock needs, and adding to it would push the two apart.
          marginTop: 0,
        }}
      >
        {fmt(left)}
      </div>

      {/* How far through the phase, as the one thing here that is not a number. */}
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
        {/* Everything inside is drawn against the span, then set in by the half-stroke its
            caps need — so the group holds the inset rather than every coordinate. */}
        <g transform={`translate(${STROKE / 2}, 0)`} strokeWidth={STROKE} strokeLinecap="round">
          {trackStart <= SPAN && (
            <path
              d={`M${trackStart} ${MID}L${SPAN} ${MID}`}
              stroke="rgba(31, 31, 29, 0.12)"
              fill="none"
            />
          )}
          {/* Redrawn once a second with the clock, and only as far as the clock has got. */}
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
        {/* The only Reset now — the focus screen's row no longer carries one, so the clock is
            put back from the panel that shows it. */}
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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Task, TaskId } from '../types';
import { TASK_SIZE, primaryIconBtn, taskText } from '../styles';
import { PlayIcon } from './icons';

interface Props {
  tasks: Task[];
  /** The first load hasn't landed yet, so an empty `tasks` means "unknown", not "none". */
  loading: boolean;
  compact: boolean;
  /** Task to centre the band on at mount — the position from the last session. */
  initialAnchorId: string | null;
  onComplete: (id: TaskId) => void;
  onFocus: (id: TaskId) => void;
  onRemove: (id: TaskId) => void;
  onAnchor: (id: string | null) => void;
}

/** Rows legible at rest. The whole point of the app. */
const BAND = 3;
/**
 * Rows the scroller shows, band plus the ghosts framing it. Must be odd and > BAND — so 5 is
 * the floor, one ghost each side. Rows are tall enough now (see below) that seven of them
 * would stand the stream taller than a laptop window and push the band off-centre.
 */
const VIS = 5;
const VIS_COMPACT = 5;

/**
 * A title is set in `taskText` from `styles.ts`, shared with the focus screen's clock. One size
 * at every width: 28px still fits a useful line on a phone, which is what let the compact
 * variant go.
 *
 * A 2px rule is a hairline against display text, so the strike is kept in step with the title.
 */
const STRIKE_H = Math.round(TASK_SIZE / 14);

/**
 * Row height is the padding: content is centred, so with no rule between rows this is the only
 * thing separating one task from the next. The gap it leaves has to beat the leading *inside*
 * a title, or a two-line title and its neighbour read as one block — the worst case is two
 * clamped lines, `TASK_SIZE * TASK_LEADING * 2` or 70px, leaving 42px against a 35px leading.
 * Single-line titles, which is most of them, get the whole 77px.
 */
const ROW_H = 112;
const ROW_H_COMPACT = 108;

/**
 * Vertical slack around a title, so completing a task doesn't ask for a hit on the glyphs
 * themselves. Only vertical: the horizontal edges are exactly where the target has to stop,
 * since the gap on the left is the run-up to the play button.
 */
const HIT_PAD = 14;

/** Idle time that counts as "stopped scrolling". */
const SETTLE_MS = 200;

/** Softens where the ghost rows meet the edges of the window. */
const FADE = 'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)';

/** Snapped offset that centres row `i`. Row 1 is centred at the top of the range. */
const offsetFor = (i: number, rowH: number) => Math.max(0, (i - 1) * rowH);
/** The task the band is centred on at a given offset — the inverse of `offsetFor`. */
const centredIndex = (top: number, rowH: number, count: number) =>
  Math.min(count - 1, Math.max(0, Math.round(top / rowH) + 1));

export function TaskStream({
  tasks,
  loading,
  compact,
  initialAnchorId,
  onComplete,
  onFocus,
  onRemove,
  onAnchor,
}: Props) {
  const rowH = compact ? ROW_H_COMPACT : ROW_H;
  const vis = compact ? VIS_COMPACT : VIS;
  const viewH = vis * rowH;
  // Leading/trailing space so the first and last tasks can sit inside the band.
  // At scrollTop 0 this puts rows 0,1,2 exactly in the band, and that is also a snap position.
  const pad = ((vis - BAND) / 2) * rowH;

  const scroller = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrolling, setScrolling] = useState(false);

  const prevLen = useRef(tasks.length);
  const restored = useRef(false);
  /** Set once the list has actually been rendered, so the first delivery isn't "growth". */
  const seenList = useRef(false);

  // Restore last session's position before the first paint, so there's no jump from the top.
  // Runs once: re-running on later task changes would yank the view back to the old anchor.
  useLayoutEffect(() => {
    if (restored.current || !scroller.current) return;
    restored.current = true;
    const i = initialAnchorId ? tasks.findIndex((t) => t.id === initialAnchorId) : -1;
    if (i < 0) return;
    scroller.current.scrollTop = offsetFor(i, rowH);
    // Browsers clamp an out-of-range assignment, so read back what we actually got.
    setScrollTop(scroller.current.scrollTop);
  }, [initialAnchorId, tasks, rowH]);

  useEffect(() => {
    // Nothing to measure or reposition until the query lands and the scroller mounts. This
    // also keeps the loading render from writing a null anchor over the stored one.
    const el = scroller.current;
    if (!el) return;

    // A newly captured task lands at the top, so bring the top into the band. Only on
    // growth — deleting the first task shouldn't yank you back up from wherever you were,
    // and the list arriving for the first time isn't growth: the restore above owns that.
    if (seenList.current && tasks.length > prevLen.current) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
    seenList.current = true;
    prevLen.current = tasks.length;
    const top = el.scrollTop;
    setScrollTop(top);
    // The list shifted, so the stored anchor may now name a different task — or a gone one.
    onAnchor(tasks[centredIndex(top, rowH, tasks.length)]?.id ?? null);
  }, [tasks, rowH, onAnchor]);

  // Row height changed under us, so the band maths needs the current offset.
  useEffect(() => {
    setScrollTop(scroller.current?.scrollTop ?? 0);
  }, [compact]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const onScroll = () => {
    // Everything brightens while moving, so no need to track position until we stop.
    setScrolling(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setScrolling(false);
      const top = scroller.current?.scrollTop ?? 0;
      setScrollTop(top);
      onAnchor(tasks[centredIndex(top, rowH, tasks.length)]?.id ?? null);
    }, SETTLE_MS);
  };

  /** Distance from the band's centre line, in rows: 0 and 1 are in-band, 2+ is outside. */
  const rowDistance = (i: number) => {
    const rowCenter = pad + i * rowH + rowH / 2;
    const viewCenter = scrollTop + viewH / 2;
    return Math.abs(rowCenter - viewCenter) / rowH;
  };

  // Hold the stream's height while the first query is in flight, but say nothing: flashing
  // "Nothing yet" at someone who has fifty tasks is worse than a beat of empty space.
  if (loading) return <div style={{ height: viewH }} />;

  if (tasks.length === 0) {
    return (
      <div
        style={{
          height: viewH,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: '0.08em', color: 'var(--ink)', fontWeight: 500 }}>
          Nothing yet
        </div>
        <div style={{ fontSize: 14, letterSpacing: '0.08em', color: 'var(--muted)' }}>
          Add work to begin
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        data-stream=""
        ref={scroller}
        onScroll={onScroll}
        style={{
          height: viewH,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollSnapType: 'y mandatory',
          paddingTop: pad,
          paddingBottom: pad,
          // The scrollbar itself is hidden in `index.css`, which can reach the WebKit
          // pseudo-element an inline style can't.
          maskImage: FADE,
          WebkitMaskImage: FADE,
        }}
      >
        {tasks.map((t, i) => {
          const d = rowDistance(i);
          const inBand = d <= 1.02;
          const opacity = scrolling ? 1 : inBand ? 1 : d <= 2.05 ? 0.12 : 0.06;

          return (
            <div
              key={t.id}
              data-taskrow=""
              style={{
                height: rowH,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '0 4px',
                opacity,
                // Unreadable rows are also untouchable.
                pointerEvents: inBand ? 'auto' : 'none',
                transition: 'opacity 240ms ease',
              }}
            >
              <button
                data-primarybtn=""
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(t.id);
                }}
                aria-label="Focus on this task"
                style={{
                  ...primaryIconBtn,
                  // A finished task has nothing left to focus on, but the button keeps its
                  // space so every title still starts on one left edge — the job the numeral
                  // gutter used to do. `hidden` also takes it out of the tab order.
                  visibility: t.done ? 'hidden' : 'visible',
                }}
              >
                <PlayIcon size={14} />
              </button>

              {/* The title is the target, not the row: a row-wide hit area turns the run-up to
                  the play button into "done", and the two mean opposite things. */}
              <span
                onClick={t.done ? undefined : () => onComplete(t.id)}
                style={{
                  ...taskText,
                  padding: `${HIT_PAD}px 0`,
                  cursor: t.done ? 'default' : 'pointer',
                  // Greys out as it is struck. Keyed on the same condition as the line below
                  // and given the same duration, so the colour drains at the pace the strike
                  // travels rather than snapping the moment the write lands.
                  color: t.striking || t.done ? 'var(--muted)' : 'var(--ink)',
                  transition: 'color 480ms cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {t.text}
                {/* A second, invisible copy of the title laid exactly over the first, carrying
                    nothing but its line-through. `text-decoration` is the one way to get a rule
                    the browser paints *over* the glyphs — a background sits under them and a
                    bar of our own would sit under the text too — and it strikes every line of a
                    wrapped title at the right height without us measuring anything.

                    It has to be a copy because the sweep is a reveal: the line can't be wiped
                    on without also wiping on the words it belongs to. Clipping this layer from
                    the right uncovers the rule alone, which is the 480ms travel the struck-out
                    bar used to do. Same text, same box, so it wraps identically. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    // Inset by the hit padding, so the copy sits on the content box the real
                    // text occupies rather than the padded one it would otherwise start at.
                    inset: `${HIT_PAD}px 0`,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    color: 'transparent',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    textDecorationLine: 'line-through',
                    textDecorationColor: 'var(--strike)',
                    textDecorationThickness: STRIKE_H,
                    clipPath: `inset(0 ${t.striking || t.done ? 0 : 100}% 0 0)`,
                    transition: 'clip-path 480ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {t.text}
                </span>
              </span>

              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  data-taskdel=""
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(t.id);
                  }}
                  aria-label="Remove"
                  style={{
                    opacity: 0,
                    transition: 'opacity 180ms ease',
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    letterSpacing: '0.2em',
                    color: 'var(--muted)',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

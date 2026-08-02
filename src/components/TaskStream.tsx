import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Task, TaskId } from '../types';
import { TASK_SIZE, primaryIconBtn, taskText } from '../styles';
import { PlayIcon } from './icons';

interface Props {
  tasks: Task[];
  /** The first load hasn't landed, so an empty `tasks` means "unknown", not "none". */
  loading: boolean;
  compact: boolean;
  /** Task to centre the band on at mount — the position from the last session. */
  initialAnchorId: string | null;
  onComplete: (id: TaskId) => void;
  onFocus: (id: TaskId) => void;
  onRemove: (id: TaskId) => void;
  onAnchor: (id: string | null) => void;
}

/** Rows legible at rest. */
const BAND = 3;
/** Rows the scroller shows: the band plus one ghost each side. Must be odd and > BAND. */
const VIS = 5;

/** A 2px rule is a hairline against display text, so the strike scales with the title. */
const STRIKE_H = Math.round(TASK_SIZE / 14);

/**
 * Row height is the padding — content is centred and nothing rules between rows. These sit on
 * the floor, which two separate rules put in the same place, both set by the worst case of a
 * title clamped to two lines (50px):
 *
 * - the gap has to beat the leading *inside* a title, or two rows read as one block. That is
 *   50 + 25, so 75px.
 * - `HIT_PAD` hangs off each end of a title and isn't clipped to the row. That is 50 + 28, so
 *   78px, below which one title's hit area reaches into the row above.
 *
 * Going tighter means moving one of those, not this number.
 */
const ROW_H = 80;
const ROW_H_COMPACT = 78;

/**
 * Vertical slack around a title, so completing a task doesn't need a hit on the glyphs. Only
 * vertical: the gap on the left is the run-up to the play button.
 */
const HIT_PAD = 14;

/** Idle time that counts as "stopped scrolling". */
const SETTLE_MS = 200;

const FADE = 'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)';

/** Snapped offset that centres row `i`. Row 1 is centred at the top of the range. */
const offsetFor = (i: number, rowH: number) => Math.max(0, (i - 1) * rowH);
/** The inverse: which task the band is centred on at a given offset. */
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
  const viewH = VIS * rowH;
  // Leading/trailing space so the first and last tasks can sit inside the band. At scrollTop 0
  // this puts rows 0,1,2 exactly in the band, which is also a snap position.
  const pad = ((VIS - BAND) / 2) * rowH;

  const scroller = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrolling, setScrolling] = useState(false);

  const prevLen = useRef(tasks.length);
  const restored = useRef(false);
  /** Set once the list has rendered, so the first delivery isn't read as growth. */
  const seenList = useRef(false);

  // Restore last session's position before the first paint. Runs once: re-running on later
  // task changes would yank the view back to the old anchor.
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
    // Nothing to measure until the query lands. This also keeps the loading render from
    // writing a null anchor over the stored one.
    const el = scroller.current;
    if (!el) return;

    // A newly captured task lands at the top. Only on growth — deleting the first task
    // shouldn't yank you up, and the first delivery belongs to the restore above.
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
    // Everything brightens while moving, so position only matters once we stop.
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

  // Hold the height while the first query is in flight, but say nothing: flashing "Nothing
  // yet" at someone who has fifty tasks is worse than a beat of empty space.
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
                  // A done task keeps the button's space so every title starts on one left
                  // edge. `hidden` also takes it out of the tab order.
                  visibility: t.done ? 'hidden' : 'visible',
                }}
              >
                <PlayIcon size={14} />
              </button>

              {/* The title is the target, not the row: a row-wide hit area would turn the
                  run-up to the play button into "done", and the two mean opposite things. */}
              <span
                onClick={t.done ? undefined : () => onComplete(t.id)}
                style={{
                  ...taskText,
                  padding: `${HIT_PAD}px 0`,
                  cursor: t.done ? 'default' : 'pointer',
                  // Same condition and duration as the strike below, so the colour drains at
                  // the pace the line travels.
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
                {/* An invisible copy of the title carrying nothing but its line-through.
                    `text-decoration` is the one way to get a rule painted *over* the glyphs,
                    and it strikes every line of a wrapped title without us measuring. It has
                    to be a copy because the sweep is a reveal: clipping this layer uncovers
                    the rule alone, which the words themselves must not follow. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    // Inset by the hit padding, so the copy sits on the same content box.
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Task, TaskId } from '../types';
import { roman } from '../util';
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
/** Rows the scroller shows, band plus the ghosts framing it. Must be odd and > BAND. */
const VIS = 7;
const VIS_COMPACT = 5;
/** Row height is the padding: content is centred, so this sets the gap to each divider. */
const ROW_H = 64;
const ROW_H_COMPACT = 56;

/** Idle time that counts as "stopped scrolling". */
const SETTLE_MS = 200;

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

  // Roman numerals grow with the list (XVIII is five glyphs), and every row needs the same
  // gutter or the titles stop lining up — so size it to the widest numeral actually shown.
  // 8px is a DM Mono glyph at 11px plus its tracking.
  const numColW = useMemo(() => {
    let glyphs = 1;
    for (let k = 1; k <= tasks.length; k++) glyphs = Math.max(glyphs, roman(k).length);
    return Math.max(compact ? 28 : 34, glyphs * 8 + 4);
  }, [tasks.length, compact]);

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
  // "NOTHING YET" at someone who has fifty tasks is worse than a beat of empty space.
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
        <div style={{ fontSize: 11, letterSpacing: '0.28em', color: 'var(--ink)', fontWeight: 500 }}>
          NOTHING YET
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.28em', color: 'var(--muted)' }}>
          ADD WORK TO BEGIN
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
          scrollbarWidth: 'none',
          paddingTop: pad,
          paddingBottom: pad,
          // Soften where the ghost rows meet the edges of the window.
          maskImage: 'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)',
        }}
      >
        {tasks.map((t, i) => {
          const d = rowDistance(i);
          const inBand = d <= 1.02;
          const opacity = scrolling ? 1 : inBand ? 1 : d <= 2.05 ? 0.12 : 0.06;
          const canFocus = !t.done;

          return (
            <div
              key={t.id}
              data-taskrow=""
              onClick={t.done ? undefined : () => onComplete(t.id)}
              style={{
                height: rowH,
                scrollSnapAlign: 'center',
                display: 'grid',
                gridTemplateColumns: `${numColW}px 1fr`,
                columnGap: 26,
                alignItems: 'center',
                borderTop: i === 0 ? 'none' : '1px solid var(--divider-task)',
                padding: '0 4px',
                cursor: t.done ? 'default' : 'pointer',
                opacity,
                // Unreadable rows are also untouchable.
                pointerEvents: inBand ? 'auto' : 'none',
                transition: 'opacity 240ms ease',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  // Tighter than the old two-digit gutter: XVIII is five glyphs wide.
                  letterSpacing: '0.12em',
                  color: 'var(--muted)',
                }}
              >
                {roman(i + 1)}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1.3,
                    // Done tasks keep full ink — the strike line carries the state on its own.
                    color: 'var(--ink)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    position: 'relative',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {t.text}
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '0.62em',
                      height: 2,
                      background: 'var(--strike)',
                      width: t.striking || t.done ? '100%' : '0%',
                      transition: 'width 480ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </span>

                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {canFocus && (
                    <button
                      data-taskplay=""
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocus(t.id);
                      }}
                      aria-label="Focus on this task"
                      style={{
                        opacity: 0,
                        transition: 'opacity 180ms ease, color 180ms ease',
                        flexShrink: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '2px 4px',
                        fontFamily: 'inherit',
                        fontSize: 11,
                        letterSpacing: '0.24em',
                      }}
                    >
                      <PlayIcon />
                      FOCUS
                    </button>
                  )}
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
                      fontSize: 11,
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

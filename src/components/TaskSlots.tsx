import type { Task } from '../types';
import { EMPTY_LABELS } from '../util';
import { PlayIcon } from './icons';

interface Props {
  slots: (Task | null)[];
  overSlot: number | null;
  dayLocked: boolean;
  numCol: string;
  onComplete: (i: number) => void;
  onFocus: (i: number) => void;
}

export function TaskSlots({ slots, overSlot, dayLocked, numCol, onComplete, onFocus }: Props) {
  return (
    <>
      {slots.map((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        const filled = !!s;
        const empty = !s;
        const over = overSlot === i;
        const label = dayLocked ? '' : EMPTY_LABELS[i] ?? 'SOMETHING THAT MATTERS';
        const canFocus = !!s && !s.done;

        return (
          <div
            key={i}
            data-slot={i}
            data-taskrow=""
            onClick={filled && s && !s.done ? () => onComplete(i) : undefined}
            style={{
              display: 'grid',
              gridTemplateColumns: `${numCol} 1fr`,
              columnGap: 26,
              alignItems: 'baseline',
              borderTop: '1px solid var(--divider-task)',
              padding: '28px 4px',
              position: 'relative',
              cursor: filled && s && !s.done ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
                paddingTop: 6,
              }}
            >
              {num}
            </div>

            {filled && s && (
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  ...(s.justPlaced
                    ? { animation: 'settle 520ms cubic-bezier(0.22,0.61,0.36,1)' }
                    : {}),
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono','Helvetica Neue',monospace",
                    fontSize: 11,
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: 'var(--ink)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    transition: 'color 420ms ease',
                    position: 'relative',
                    display: 'inline-block',
                  }}
                >
                  {s.text}
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '0.62em',
                      height: 2,
                      background: 'var(--strike)',
                      width: s.striking || s.done ? '100%' : '0%',
                      transition: 'width 480ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </span>
                {canFocus && (
                  <button
                    data-taskplay=""
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocus(i);
                    }}
                    aria-label="Focus on this task"
                    style={{
                      opacity: 0,
                      transition: 'opacity 180ms ease, color 180ms ease',
                      marginLeft: 'auto',
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
              </div>
            )}

            {empty && (
              <div style={{ fontSize: 11, letterSpacing: '0.28em', color: 'var(--faint)', padding: '2px 0' }}>
                {label}
              </div>
            )}

            {over && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 2,
                  background: 'var(--ink)',
                }}
              />
            )}
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid var(--divider-task)' }} />
    </>
  );
}

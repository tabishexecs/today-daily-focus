import type { FocusPhase } from '../types';
import { fmt } from '../util';
import { PauseIcon, PlayFilledIcon } from './icons';

interface Props {
  task: string;
  phase: FocusPhase;
  running: boolean;
  left: number;
  elapsed: number;
  sidePad: string;
  onToggle: () => void;
  onReset: () => void;
  onComplete: () => void;
  onExit: () => void;
}

const textBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  padding: '6px 2px',
};

export function FocusMode({
  task,
  phase,
  running,
  left,
  elapsed,
  sidePad,
  onToggle,
  onReset,
  onComplete,
  onExit,
}: Props) {
  const isBreak = phase === 'break';
  const stateLabel = running ? (isBreak ? 'ON BREAK' : 'IN FOCUS') : 'PAUSED';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        animation: 'focusIn 420ms ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: `20px ${sidePad}`,
          borderBottom: '1px solid var(--divider-task)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: 'var(--card)',
            border: '1px solid var(--hairline-alt)',
            borderRadius: 16,
            padding: '13px 15px 13px 13px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}
            >
              {task}
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.26em',
                color: 'var(--muted)',
                marginTop: 7,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(elapsed)}
            </div>
          </div>
          <button
            onClick={onToggle}
            aria-label="Play or pause"
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {running ? <PauseIcon /> : <PlayFilledIcon />}
          </button>
        </div>
        <button
          onClick={onExit}
          style={{
            position: 'absolute',
            top: '50%',
            right: 'clamp(46px,7vw,120px)',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            padding: '8px 4px',
          }}
        >
          Exit
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.4em',
              fontWeight: 500,
              color: 'var(--ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmt(left)}
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.36em',
              color: 'var(--muted)',
              ...(running ? { animation: 'pulse 2600ms ease-in-out infinite' } : {}),
            }}
          >
            {stateLabel}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={onToggle} style={{ ...textBtn, color: 'var(--ink)' }}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>·</span>
          <button onClick={onReset} style={{ ...textBtn, color: 'var(--muted)' }}>
            Reset
          </button>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>·</span>
          <button onClick={onComplete} style={{ ...textBtn, color: 'var(--primary)' }}>
            Mark done
          </button>
        </div>
      </div>
    </div>
  );
}

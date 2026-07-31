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
        background:
          'radial-gradient(120% 90% at 50% 42%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 62%), var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        animation: 'focusIn 420ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: `20px ${sidePad}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onExit}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--strike)',
            padding: '8px 4px',
          }}
        >
          Exit
        </button>
      </div>

      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
          padding: `0 ${sidePad}`,
          boxSizing: 'border-box',
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

        <div
          data-float
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: 'var(--glass)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid var(--glass-edge)',
            borderRadius: 14,
            boxShadow: 'var(--glass-shadow)',
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

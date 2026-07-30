import { dateStr } from '../util';

interface Props {
  showQueueToggle: boolean;
  queueCount: number;
  onLogout: () => void;
  onToggleQueue: () => void;
  onOpenCapture: () => void;
}

const btn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  padding: '8px 4px',
};

const dot: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' };

export function TopBar({ showQueueToggle, queueCount, onLogout, onToggleQueue, onOpenCapture }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.24em', color: 'var(--ink)' }}>{dateStr()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={onLogout} style={{ ...btn, color: 'var(--muted)' }}>
          Log out
        </button>
        <span style={dot}>·</span>
        {showQueueToggle && (
          <>
            <button onClick={onToggleQueue} style={{ ...btn, color: 'var(--ink)' }}>
              Queue ({queueCount})
            </button>
            <span style={dot}>·</span>
          </>
        )}
        <button onClick={onOpenCapture} style={{ ...btn, color: 'var(--primary)' }}>
          Add work
        </button>
      </div>
    </div>
  );
}

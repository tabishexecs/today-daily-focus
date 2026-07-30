import { dateStr } from '../util';

interface Props {
  onLogout: () => void;
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

export function TopBar({ onLogout, onOpenCapture }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.24em', color: 'var(--ink)' }}>{dateStr()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={onLogout} style={{ ...btn, color: 'var(--muted)' }}>
          Log out
        </button>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>
        <button onClick={onOpenCapture} style={{ ...btn, color: 'var(--primary)' }}>
          Add work
        </button>
      </div>
    </div>
  );
}

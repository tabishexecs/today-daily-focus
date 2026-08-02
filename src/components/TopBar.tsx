import { cornerBtn } from '../styles';
import { dateStr } from '../util';

interface Props {
  onLogout: () => void;
  onOpenCapture: () => void;
}

export function TopBar({ onLogout, onOpenCapture }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.24em', color: 'var(--ink)' }}>{dateStr()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={onLogout} style={{ ...cornerBtn, color: 'var(--muted)' }}>
          Log out
        </button>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>
        <button
          onClick={onOpenCapture}
          style={{ ...cornerBtn, color: 'var(--primary)', fontWeight: 500 }}
        >
          Add work
        </button>
      </div>
    </div>
  );
}

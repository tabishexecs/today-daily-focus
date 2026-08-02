import { cornerBtn, primaryIconLabelBtn } from '../styles';
import { dateStr } from '../util';
import { PlusIcon } from './icons';

interface Props {
  onLogout: () => void;
  onOpenCapture: () => void;
}

export function TopBar({ onLogout, onOpenCapture }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 14, letterSpacing: '0.08em', color: 'var(--ink)' }}>{dateStr()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={onLogout} style={{ ...cornerBtn, color: 'var(--muted)' }}>
          Log out
        </button>
        {/* No separator dot here any more: it was dividing two pieces of text, and a filled
            button is already its own object. */}
        <button data-primarybtn="" onClick={onOpenCapture} style={primaryIconLabelBtn}>
          <PlusIcon />
          Add work
        </button>
      </div>
    </div>
  );
}

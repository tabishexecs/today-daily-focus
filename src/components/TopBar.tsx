import { cornerBtn, primaryIconLabelBtn } from '../styles';
import { PlusIcon } from './icons';

interface Props {
  onLogout: () => void;
  onOpenCapture: () => void;
}

/**
 * Sized to the primary button opposite it, so the bar is weighted evenly end to end. Served
 * from the same file the tab loads: the mark in the corner and the mark in the tab strip can't
 * drift apart if there is only one of them.
 */
const LOGO = 30;

export function TopBar({ onLogout, onOpenCapture }: Props) {
  return (
    // Centred rather than top-aligned: the mark is a block with no baseline to hang the
    // buttons' text off.
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <img src="/favicon.svg" alt="MMT" width={LOGO} height={LOGO} style={{ display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={onLogout} style={{ ...cornerBtn, color: 'var(--muted)' }}>
          Log out
        </button>
        <button data-primarybtn="" onClick={onOpenCapture} style={primaryIconLabelBtn}>
          <PlusIcon />
          Add work
        </button>
      </div>
    </div>
  );
}

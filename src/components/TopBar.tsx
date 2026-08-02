import { UserButton } from '@clerk/react';
import { primaryIconLabelBtn } from '../styles';
import { PlusIcon } from './icons';

interface Props {
  onOpenCapture: () => void;
}

/**
 * The account menu is Clerk's own popover: the avatar, the email it was signed in with, and
 * sign out. `manageAccount` is hidden rather than routed anywhere — this app has no profile
 * screen to send it to, and the version here has no `userProfileMode: 'none'` to ask for that.
 * Hiding it leaves sign out as the only action, which is the whole of what the menu is for.
 */
const ACCOUNT_MENU = {
  elements: {
    userButtonPopoverActionButton__manageAccount: { display: 'none' },
    // Squared up with the mark across the bar; Clerk's default trigger is 28px.
    userButtonAvatarBox: { width: '30px', height: '30px' },
  },
} as const;

/**
 * Sized to the primary button opposite it, so the bar is weighted evenly end to end. Served
 * from the same file the tab loads: the mark in the corner and the mark in the tab strip can't
 * drift apart if there is only one of them.
 */
const LOGO = 30;

export function TopBar({ onOpenCapture }: Props) {
  return (
    // Centred rather than top-aligned: the mark is a block with no baseline to hang the
    // buttons' text off.
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <img src="/favicon.svg" alt="MMT" width={LOGO} height={LOGO} style={{ display: 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button data-primarybtn="" onClick={onOpenCapture} style={primaryIconLabelBtn}>
          <PlusIcon />
          Add work
        </button>
        <UserButton appearance={ACCOUNT_MENU} />
      </div>
    </div>
  );
}

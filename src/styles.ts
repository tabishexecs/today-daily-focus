import type { CSSProperties } from 'react';

/**
 * Every control in the app is text rather than a chrome button, set in the same small caps.
 * Shared here because the top bar and the focus screen were carrying identical copies.
 */
export const textBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  padding: '6px 2px',
};

/** The same button with a wider hit area, for the ones sitting in a corner of the window. */
export const cornerBtn: CSSProperties = { ...textBtn, padding: '8px 4px' };

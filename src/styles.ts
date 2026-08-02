import type { CSSProperties } from 'react';

/**
 * Named rather than inherited: the focus screen sets itself in DM Mono, so anything that has
 * to match its twin on the main screen has to pin the family.
 */
export const APP_FONT = "'Inter Tight','Helvetica Neue',Arial,sans-serif";

/** `TASK_SIZE` is exported because the stream scales its strike rule off it. */
export const TASK_SIZE = 20;
const TASK_WEIGHT = 500;
const TASK_LEADING = 1.25;

/** How a task's own words are set. The focus screen's clock matches it. */
export const taskText: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: TASK_SIZE,
  fontWeight: TASK_WEIGHT,
  lineHeight: TASK_LEADING,
  letterSpacing: 'normal',
};

/** Every control in the app is text rather than chrome, set in this small label. */
const textBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  letterSpacing: '0.08em',
  padding: '6px 2px',
};

/** The same button with a wider hit area, for the ones sitting in a corner of the window. */
export const cornerBtn: CSSProperties = { ...textBtn, padding: '8px 4px' };

/**
 * The one filled control, shaped to match the primary action on Clerk's sign-in card. Clerk's
 * styles ship from their CDN, so these values are matched by eye rather than inherited. Hover
 * lives in `index.css`; an inline style has no `:hover`.
 */
export const primaryBtn: CSSProperties = {
  background: '#2f3037',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: APP_FONT,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '0.01em',
  lineHeight: 1.2,
  padding: '8px 14px',
  boxShadow:
    'inset 0 1px 1px rgba(255, 255, 255, 0.07), 0 2px 3px rgba(34, 42, 53, 0.2), 0 1px 1px rgba(0, 0, 0, 0.24)',
  transition: 'background 140ms ease',
};

export const dangerBtn: CSSProperties = {
  ...primaryBtn,
  background: 'var(--strike)',
};

export const secondaryBtn: CSSProperties = {
  ...primaryBtn,
  background: 'var(--surface)',
  color: 'var(--ink)',
  border: '1px solid var(--surface-edge)',
  // A pixel of border each side, so the padding gives one back — otherwise this stands 2px
  // taller than the filled button beside it.
  padding: '7px 13px',
  boxShadow: '0 1px 2px rgba(31, 31, 29, 0.06)',
};

/**
 * The border is `--strike` at 28%, written out rather than mixed: a `color-mix` a browser did
 * not understand would drop the shorthand, and with it the 1px keeping this button's height.
 */
export const secondaryDangerBtn: CSSProperties = {
  ...secondaryBtn,
  color: 'var(--strike)',
  border: '1px solid rgba(139, 0, 0, 0.28)',
};

/** The left padding gives back the 2px of air the glyph carries inside its own box. */
export const primaryIconLabelBtn: CSSProperties = {
  ...primaryBtn,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  paddingLeft: 12,
};

/** Square rather than padded: a lone glyph has no line of text to set the height from. */
export const primaryIconBtn: CSSProperties = {
  ...primaryBtn,
  padding: 0,
  width: 28,
  height: 28,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

import type { CSSProperties } from 'react';

/**
 * The app's own face. Mirrors the `body` rule in `index.css`, and exists so the filled buttons
 * can name it outright: the focus screen sets itself in DM Mono, and a button that inherited
 * that would stop matching the identical button on the main screen.
 */
export const APP_FONT = "'Inter Tight','Helvetica Neue',Arial,sans-serif";

/**
 * How a task's own words are set — the one thing in the app pitched above UI scale. The
 * numbers are exported alongside the style because the task list sizes its rows and its strike
 * rule off them, and those need arithmetic rather than a style object.
 */
export const TASK_SIZE = 28;
export const TASK_WEIGHT = 500;
/** Tighter than the 1.6 the app's UI text is set on — this is display scale. */
export const TASK_LEADING = 1.25;

/**
 * Shared as one object because the focus screen's clock is set to match the task it is
 * counting for. The family is part of that and has to be named rather than inherited: the
 * focus screen is in DM Mono, so a clock that inherited would not follow the task at all.
 */
export const taskText: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: TASK_SIZE,
  fontWeight: TASK_WEIGHT,
  lineHeight: TASK_LEADING,
  // Inter Tight is drawn with the display spacing already pulled in, so nothing to add here.
  letterSpacing: 'normal',
};

/**
 * Every control in the app is text rather than a chrome button, set in the same small label.
 * Shared here because the top bar and the focus screen were carrying identical copies.
 */
export const textBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  // Loose enough to still read as a label, but not the caps-width tracking it carried when
  // these were set in all uppercase — lowercase falls apart at that spacing.
  letterSpacing: '0.08em',
  padding: '6px 2px',
};

/** The same button with a wider hit area, for the ones sitting in a corner of the window. */
export const cornerBtn: CSSProperties = { ...textBtn, padding: '8px 4px' };

/**
 * The one filled control in the app, shaped like the primary action on Clerk's card so that
 * pressing "Add work" reads as the same kind of object the sign-in screen asked you to press.
 *
 * Clerk's own styles ship inside clerk-js, which loads from their CDN rather than from
 * node_modules, so there is no stylesheet here to inherit from — these values are matched to
 * the stock card by eye: dark neutral fill, small radius, medium label, and the layered
 * shadow that gives the button its lit top edge. The size follows the app's 14px UI text
 * rather than Clerk's 13px, so it sits level with "Log out" beside it.
 *
 * Hover lives in `index.css`; an inline style has no `:hover`.
 */
export const primaryBtn: CSSProperties = {
  background: '#2f3037',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  // Named rather than inherited, so the button looks the same on every screen it appears on.
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

/**
 * The destructive twin of the above: same shape, same shadow, wearing the strike red the app
 * already spends on anything that ends or removes something. Its hover lives in `index.css`
 * under `data-dangerbtn`, which is also what tells it apart from the primary one.
 */
export const dangerBtn: CSSProperties = {
  ...primaryBtn,
  background: 'var(--strike)',
};

/**
 * The quiet one: same shape again, but drawn as an outline on the app's white surface rather
 * than a fill, so it reads as available without competing with the primary action beside it.
 */
export const secondaryBtn: CSSProperties = {
  ...primaryBtn,
  background: 'var(--surface)',
  color: 'var(--ink)',
  border: '1px solid var(--surface-edge)',
  // A pixel of border on each side, so the padding gives one back. Without this the button
  // stands 2px taller than the filled one it sits in a row with.
  padding: '7px 13px',
  // Far lighter than the filled button's: an outline sitting flat, not a raised object.
  boxShadow: '0 1px 2px rgba(31, 31, 29, 0.06)',
};

/**
 * The outline button in the destructive register — for something that throws work away without
 * being the screen's main move. Ink and edge go to the strike red, the edge held back to a tint
 * so it warns rather than shouts.
 *
 * The border is `--strike` at 28%, written out rather than mixed from the token: a `color-mix`
 * a browser did not understand would drop the whole shorthand, and with it the 1px that keeps
 * this button the same height as the filled ones beside it.
 */
export const secondaryDangerBtn: CSSProperties = {
  ...secondaryBtn,
  color: 'var(--strike)',
  border: '1px solid rgba(139, 0, 0, 0.28)',
};

/**
 * The filled button carrying a glyph in front of its label — what "Add work" and "Add note"
 * wear, so the two ways of adding something to the day look like one action in two places.
 *
 * The left padding gives back the 2px of air the glyph brings with it, which is drawn inside
 * its own box rather than up to the edge. Without that the label sits further in than it does
 * on a button with no icon, and the two read as different widths of the same shape.
 */
export const primaryIconLabelBtn: CSSProperties = {
  ...primaryBtn,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  paddingLeft: 12,
};

/**
 * The same button carrying an icon instead of a label, so it can sit in a task row without a
 * word of its own. Square rather than padded, since a lone glyph has no line of text to set
 * the height from. Wears `data-primarybtn` too, so it picks up the hover and focus ring.
 */
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

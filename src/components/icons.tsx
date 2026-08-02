/**
 * The triangle spans x=5 to 16.1 in a 24 box, so its centre is 10.55 rather than 12. Centring
 * a button's contents aligns the box, not the shape in it, so the viewBox origin shifts by the
 * difference. `display: block` keeps the svg off the text baseline.
 */
export function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1.45 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M5 17.334V6.667c0-.88 0-1.32.185-1.562a1 1 0 0 1 .68-.375c.308-.012.68.242 1.423.753l7.766 5.333c.63.433.945.649 1.055.92a1 1 0 0 1 0 .738c-.11.271-.425.487-1.055.92l-7.766 5.333c-.743.51-1.115.765-1.423.753a1 1 0 0 1-.68-.375C5 18.653 5 18.213 5 17.334Z" />
    </svg>
  );
}

export function PauseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="5" width="3.5" height="14" rx="1" />
      <rect x="14.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

/**
 * Untitled UI's `x-close`. Stroke is 2.5 rather than the set's 2: these are called for at
 * 9–16px, where a 2 thins to under a pixel and reads grey. `PlusIcon` follows for the same
 * reason.
 */
export function CloseIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The return key's engraved arrow, for the capture bar's confirming button. */
export function EnterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M20 5v6a4 4 0 0 1-4 4H4" />
      <path d="M9 10l-5 5 5 5" />
    </svg>
  );
}

/**
 * `PlayIcon` filled, and centred optically rather than on the box: the triangle's bounding box
 * centres at 10.55 but its area sits back at 8.7, so the viewBox lands the midpoint of the two
 * on 12. Most visible on the toggle, where it swaps with a symmetric pause. In the viewBox
 * rather than a margin so the correction scales with `size`.
 */
export function PlayFilledIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-2.37 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <path d="M5 17.334V6.667c0-.88 0-1.32.185-1.562a1 1 0 0 1 .68-.375c.308-.012.68.242 1.423.753l7.766 5.333c.63.433.945.649 1.055.92a1 1 0 0 1 0 .738c-.11.271-.425.487-1.055.92l-7.766 5.333c-.743.51-1.115.765-1.423.753a1 1 0 0 1-.68-.375C5 18.653 5 18.213 5 17.334Z" />
    </svg>
  );
}

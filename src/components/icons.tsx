/**
 * The whole content of the row's focus button, so callers size it to that button.
 *
 * The triangle runs from x=5 to x=16.1 inside a 24-wide box, which puts its centre at 10.55
 * rather than at the box's own 12. Centring the button's contents aligns the box, not the
 * shape drawn in it, so the triangle would sit left of true centre however the button is laid
 * out. Shifting the viewBox origin by that 1.45 makes the two centres agree. The shape is
 * already centred on the y axis, so only x moves.
 *
 * `display: block` keeps the svg off the text baseline, which would otherwise leave a
 * descender's worth of space under it.
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
 * The dismiss glyph, drawn rather than typed. The `×` character carries its font's own weight
 * and sits on a baseline, which leaves it light and a hair high inside a round button; two
 * strokes with round caps land it on the centre and let the button choose how heavy it reads.
 *
 * Untitled UI's `x-close`: inset to 6–18 of the 24 box, so the cross fills half the box rather
 * than the 40% it was drawn at here before.
 *
 * The stroke is the one deviation. Untitled UI sets 2 across its set, drawn for icons rendered
 * at 20–24px; ours are called for at 9–16, where a 2 thins to well under a pixel and the mark
 * goes grey rather than reading as a stroke. 2.5 holds it at roughly the weight the app's other
 * icons carry at these sizes.
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

/**
 * Untitled UI's `plus`: two strokes crossing at the centre of the 24 box, spanning 5–19 so the
 * arms fill a little more of it than the dismiss cross does — which is the set's own drawing,
 * not a change made here.
 *
 * The stroke carries the same deviation `CloseIcon` explains: 2.5 rather than the set's 2,
 * because this is asked for at 14px beside a label and a 2 thins to grey at that size.
 */
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

/**
 * The return key, drawn as the arrow that turns down and back — what the key itself is engraved
 * with, and what a command palette prints beside its confirming action.
 *
 * Drawn rather than typed for the same reason the dismiss is: the `↵` character sits on a
 * baseline and carries the text weight around it, so it reads light and high inside a filled
 * button. Strokes with round caps put it on the centre at whatever weight the button wants.
 *
 * The shape is inset to 4–20 of the 24 box, leaving it a touch smaller than the cap height of
 * the label it would stand next to.
 */
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
 * The same triangle as `PlayIcon`, filled, for the round buttons that start the clock.
 *
 * Centred by the viewBox rather than by a margin, and centred optically rather than on the
 * box. A right-pointing triangle carries its area against the left base — the shape runs
 * x=5 to 16.1, so its bounding box centres at 10.55 but its centroid sits back at 8.7 — and
 * squaring the bounding box on the button leaves the weight looking left of the circle it is
 * in. Most visible on the toggle, where it swaps with a pause that really is symmetric.
 * Landing the midpoint of those two centres, 9.63, on the box's own 12 is the shift below:
 * enough to answer the lean, short of the overshoot full centroid centring would give.
 *
 * A margin did this before, but in fixed pixels, so the correction stayed put while `size`
 * moved. In the viewBox it is a share of the glyph and scales with it.
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

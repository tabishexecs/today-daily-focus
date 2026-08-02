import { CloseIcon } from './icons';

interface Props {
  /** The disc's diameter. The glyph is drawn as a fraction of it — see `GLYPH`. */
  size: number;
  label: string;
  onClick: () => void;
}

/**
 * How much of the disc the cross takes. Held constant so the button reads as one control at
 * whatever size it is asked for: a fixed glyph inside a smaller disc crowds its edges, and
 * inside a larger one floats in the middle of an empty circle.
 */
const GLYPH = 0.375;

/**
 * The dismiss on anything made of glass — the pomodoro's, and the one on a note.
 *
 * A disc rather than a bare mark, because the surfaces these sit on are already busy with
 * whatever is behind them, and a cross drawn straight onto that has nothing holding it. The
 * fill is lighter than the pane under it and blurs again on its own account, so the button
 * reads as a second, smaller piece of glass laid on the first: lit along its top edge, with a
 * short shadow under it.
 *
 * The ink starts under full strength and comes up to it on hover. The states themselves live
 * in `index.css` under `[data-glassclose]`, where they can carry the `!important` they need to
 * play against the resting look set inline here.
 */
export function GlassCloseButton({ size, label, onClick }: Props) {
  return (
    <button
      data-glassclose
      onClick={onClick}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // The header rows this sits in are flex, and a disc that can be squeezed out of round
        // by a long label beside it stops being a disc.
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer',
        background: 'rgba(255, 255, 255, 0.5)',
        // Without this the fill runs under the border and dulls the lit edge, which is the one
        // thing making the disc sit above the pane rather than in it.
        backgroundClip: 'padding-box',
        // A shorter blur than the pane's: the button is small, and glass this size fogs what is
        // behind it into a flat patch at the full radius.
        backdropFilter: 'var(--glass-blur-sm)',
        WebkitBackdropFilter: 'var(--glass-blur-sm)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        // The light caught along the top edge, then the contact shadow under it.
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 6px -2px rgba(31, 31, 29, 0.16)',
        color: 'rgba(31, 31, 29, 0.55)',
      }}
    >
      <CloseIcon size={Math.round(size * GLYPH)} />
    </button>
  );
}

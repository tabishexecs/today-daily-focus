import { CloseIcon } from './icons';

interface Props {
  size: number;
  label: string;
  onClick: () => void;
}

/** The glyph as a share of the disc, so the button reads the same at any size. */
const GLYPH = 0.375;

/**
 * The dismiss on anything made of glass — the pomodoro's, and the one on a note. Hover, press
 * and focus live in `index.css` under `[data-glassclose]`, where they can carry the
 * `!important` they need to beat the resting look set inline here.
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
        // The header rows this sits in are flex, and a squeezed disc stops being a disc.
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer',
        background: 'rgba(255, 255, 255, 0.5)',
        // Without this the fill runs under the border and dulls the lit edge.
        backgroundClip: 'padding-box',
        backdropFilter: 'var(--glass-blur-sm)',
        WebkitBackdropFilter: 'var(--glass-blur-sm)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 6px -2px rgba(31, 31, 29, 0.16)',
        color: 'rgba(31, 31, 29, 0.55)',
      }}
    >
      <CloseIcon size={Math.round(size * GLYPH)} />
    </button>
  );
}

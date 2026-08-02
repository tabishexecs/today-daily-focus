import type { RefObject } from 'react';
import { primaryBtn } from '../styles';
import { EnterIcon } from './icons';

interface Props {
  open: boolean;
  text: string;
  sidePad: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

/** A keycap, the way a command palette prints its shortcuts. */
function Key({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <kbd
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 30,
        height: 30,
        padding: '0 9px',
        border: '1px solid var(--surface-edge)',
        borderRadius: 8,
        fontFamily: 'inherit',
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: '0.04em',
        color: 'var(--faint)',
      }}
    >
      {children}
    </kbd>
  );
}

export function CaptureBar({
  open,
  text,
  sidePad,
  inputRef,
  onChange,
  onKeyDown,
  onSubmit,
}: Props) {
  return (
    <div
      data-capture="1"
      style={{
        position: 'fixed',
        left: sidePad,
        right: sidePad,
        bottom: 28,
        zIndex: 45,
        maxWidth: 640,
        margin: '0 auto',
        background: 'var(--surface)',
        border: '1px solid var(--surface-edge)',
        borderRadius: 16,
        boxShadow: 'var(--surface-shadow)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transform: `translateY(${open ? '0' : '18px'}) scale(${open ? 1 : 0.985})`,
        transition:
          'transform 420ms cubic-bezier(0.22,0.61,0.36,1), opacity 260ms cubic-bezier(0.22,0.61,0.36,1)',
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <span
        style={{
          color: 'var(--primary)',
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✱
      </span>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add work to your ever-growing list"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 16,
          fontWeight: 400,
          letterSpacing: '0.06em',
          color: 'var(--ink)',
          padding: '4px 0',
        }}
      />
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          data-primarybtn="1"
          aria-label="Enter"
          title="Enter"
          // The bar sits over the input; a press would take the focus off it on the way down.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSubmit}
          // Flexed so the icon sits on the button's centre rather than on its text baseline.
          style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center' }}
        >
          <EnterIcon />
        </button>
        <Key label="Escape">esc</Key>
      </span>
    </div>
  );
}

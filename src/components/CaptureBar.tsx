import type { RefObject } from 'react';

interface Props {
  open: boolean;
  text: string;
  sidePad: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function CaptureBar({ open, text, sidePad, inputRef, onChange, onKeyDown }: Props) {
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
          fontSize: 11,
          letterSpacing: '0.28em',
          color: 'var(--muted)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <span style={{ color: 'var(--primary)', fontSize: 13, lineHeight: 1 }}>✱</span>
        CAPTURE
      </span>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="A work for later"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 11,
          letterSpacing: '0.06em',
          color: 'var(--ink)',
          padding: '4px 0',
          textTransform: 'uppercase',
        }}
      />
      <span style={{ fontSize: 11, letterSpacing: '0.24em', color: 'var(--faint)', flexShrink: 0 }}>
        <span style={{ color: 'var(--primary)' }}>ENTER</span> · ESC
      </span>
    </div>
  );
}

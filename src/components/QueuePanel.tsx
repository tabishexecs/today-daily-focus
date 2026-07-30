import type { QueueItem } from '../types';
import { CollapseIcon } from './icons';

interface Props {
  items: QueueItem[];
  open: boolean;
  dim: boolean;
  compact: boolean;
  onClose: () => void;
  onStartDrag: (e: React.PointerEvent, item: QueueItem) => void;
  onRemove: (id: string) => void;
}

export function QueuePanel({ items, open, dim, compact, onClose, onStartDrag, onRemove }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: compact ? '100%' : 404,
        background: 'var(--bg)',
        borderLeft: '1px solid var(--divider-task)',
        transform: `translateX(${open ? '0%' : '101%'})`,
        transition: 'transform 480ms cubic-bezier(0.22,0.61,0.36,1), opacity 240ms ease',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        padding: '54px 40px 34px',
        opacity: dim ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '0 -40px',
          padding: '0 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.3em', fontWeight: 400 }}>QUEUE</span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              color: 'var(--muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(items.length).padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse queue"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <CollapseIcon />
        </button>
      </div>

      <div style={{ marginBottom: 16 }} />

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', margin: '0 -40px' }}>
        {items.map((qi) => (
          <div
            key={qi.id}
            data-qrow=""
            onPointerDown={(e) => onStartDrag(e, qi)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderTop: '1px solid var(--divider-queue)',
              padding: '17px 22px',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              lineHeight: 1.3,
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>{qi.text}</span>
            <button
              data-qdel=""
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(qi.id);
              }}
              aria-label="Remove"
              style={{
                opacity: 0,
                transition: 'opacity 180ms ease',
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--muted)',
                padding: '2px 4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--divider-queue)' }} />
      </div>
    </div>
  );
}

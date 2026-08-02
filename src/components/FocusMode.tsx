import type { CSSProperties } from 'react';
import type { Note, NoteId } from '../types';
import { APP_FONT, dangerBtn, primaryBtn, secondaryIconLabelBtn } from '../styles';
import { fmt } from '../util';
import { FocusNotes } from './FocusNotes';
import { PauseIcon, PlayFilledIcon, PlusIcon } from './icons';

interface Props {
  task: string;
  running: boolean;
  /** Time spent on this task, the clock the player shows. Counts up, against no total. */
  elapsed: number;
  sidePad: string;
  notes: Note[];
  onToggle: () => void;
  onComplete: () => void;
  onExit: () => void;
  onAddNote: () => void;
  onNoteChange: (id: NoteId, text: string) => void;
  onNoteMove: (id: NoteId, x: number, y: number) => void;
  onNoteResize: (id: NoteId, x: number, y: number, w: number, h: number) => void;
  onNoteRemove: (id: NoteId) => void;
}

/** Fades the tail of long task text as it approaches the play/pause button. */
const TAIL_FADE = 'linear-gradient(to right, #000 calc(100% - 48px), transparent 100%)';

/** Shared by the player's two lines. The family is named because this screen is DM Mono. */
const PLAYER_LINE: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: 13,
  letterSpacing: '0.02em',
};

export function FocusMode({
  task,
  running,
  elapsed,
  sidePad,
  notes,
  onToggle,
  onComplete,
  onExit,
  onAddNote,
  onNoteChange,
  onNoteMove,
  onNoteResize,
  onNoteRemove,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        // Flat colour, so two controls in the same filled black read as one black wherever
        // they sit. The grid matches the page behind: both tile from the window's corner, so
        // the ruling stays put as this screen comes over.
        backgroundColor: 'var(--bg)',
        backgroundImage: 'var(--grid)',
        backgroundSize: 'var(--grid-cell) var(--grid-cell)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Everything inside inherits this except the action row, whose buttons pin their own
        // family so they stay identical to "Add work" on the main screen.
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        animation: 'focusIn 420ms ease',
      }}
    >
      {/* Positioned against this overlay, which fills the window — so are the notes' own
          coordinates. Rendered before the player so a note dragged over it lands on top. */}
      <FocusNotes
        notes={notes}
        onChange={onNoteChange}
        onMove={onNoteMove}
        onResize={onNoteResize}
        onRemove={onNoteRemove}
      />

      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
          padding: `0 ${sidePad}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          data-float
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            // Opaque, not the app's glass: the task being worked on is the one thing here that
            // should read as a card. No blur — nothing carries through an opaque fill.
            background: 'var(--surface)',
            border: '1px solid var(--surface-edge)',
            borderRadius: 14,
            boxShadow: 'var(--surface-shadow)',
            padding: '13px 21px 13px 19px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              data-focustask=""
              style={{
                ...PLAYER_LINE,
                // The one line set above the base size — a point is enough at this scale.
                fontSize: 14,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                lineHeight: 1.3,
                maskImage: TAIL_FADE,
                WebkitMaskImage: TAIL_FADE,
              }}
            >
              {task}
            </div>
            <div
              style={{
                ...PLAYER_LINE,
                color: 'var(--faint)',
                marginTop: 8,
                // Inter Tight is proportional, so the digits have to be asked for the fixed
                // widths DM Mono gave for free — otherwise the clock twitches every second.
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(elapsed)}
            </div>
          </div>
          <button
            onClick={onToggle}
            aria-label="Play or pause"
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {running ? <PauseIcon /> : <PlayFilledIcon />}
          </button>
        </div>

        {/* Read left to right as the work goes: something to add while here, the finish, the
            way out. "Mark done" is filled and in the middle because it is the move this screen
            exists for; the other two are quieter on either side of it. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button data-secondarybtn="" onClick={onAddNote} style={secondaryIconLabelBtn}>
            <PlusIcon />
            Add note
          </button>
          <button data-primarybtn="" onClick={onComplete} style={primaryBtn}>
            Mark done
          </button>
          <button data-dangerbtn="" onClick={onExit} style={dangerBtn}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

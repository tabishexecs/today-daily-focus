import type { CSSProperties } from 'react';
import type { FocusPhase, Note, NoteId, PanelPos } from '../types';
import { APP_FONT, dangerBtn, primaryBtn, primaryIconLabelBtn, secondaryBtn } from '../styles';
import { fmt } from '../util';
import { FocusNotes } from './FocusNotes';
import { PomodoroPanel } from './PomodoroPanel';
import { PauseIcon, PlayFilledIcon, PlusIcon } from './icons';

interface Props {
  task: string;
  running: boolean;
  /** Time spent on this task, the clock the player shows. */
  elapsed: number;
  /** The same pomodoro from the other end: which phase, and how much is left. */
  phase: FocusPhase;
  left: number;
  pomodoroOpen: boolean;
  pomodoroPos: PanelPos | null;
  sidePad: string;
  /** Space above the controls, so they land on the same line as the top bar they cover. */
  topPad: string;
  notes: Note[];
  onToggle: () => void;
  onReset: () => void;
  onTogglePomodoro: () => void;
  /** Called once when the panel is dropped, in window fractions. */
  onPomodoroMove: (x: number, y: number) => void;
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
  phase,
  left,
  pomodoroOpen,
  pomodoroPos,
  sidePad,
  topPad,
  notes,
  onToggle,
  onReset,
  onTogglePomodoro,
  onPomodoroMove,
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
        // Everything inside inherits this except the buttons along the top, which pin their
        // own family so they stay identical to "Add work" on the main screen.
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        animation: 'focusIn 420ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          // The top bar's own offset, so these sit on the line the buttons they replace sat on.
          padding: `${topPad} ${sidePad} 0`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <button data-primarybtn="" onClick={onAddNote} style={primaryIconLabelBtn}>
          <PlusIcon />
          Add note
        </button>
        <button data-dangerbtn="" onClick={onExit} style={dangerBtn}>
          Exit
        </button>
      </div>

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Quiet rather than filled: "Mark done" is the move this row is here for. */}
          <button data-secondarybtn="" onClick={onTogglePomodoro} style={secondaryBtn}>
            {pomodoroOpen ? 'Hide Pomodoro' : 'Start Pomodoro'}
          </button>
          <button data-primarybtn="" onClick={onComplete} style={primaryBtn}>
            Mark done
          </button>
        </div>
      </div>

      {pomodoroOpen && (
        <PomodoroPanel
          phase={phase}
          left={left}
          running={running}
          pos={pomodoroPos}
          sidePad={sidePad}
          onToggle={onToggle}
          onReset={onReset}
          onMove={onPomodoroMove}
          onClose={onTogglePomodoro}
        />
      )}
    </div>
  );
}

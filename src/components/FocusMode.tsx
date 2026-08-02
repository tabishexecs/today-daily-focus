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
  /** The same pomodoro from the other end, for the panel: which phase, and how much is left. */
  phase: FocusPhase;
  left: number;
  pomodoroOpen: boolean;
  /** Where the panel was last dropped, or null while it still sits in its corner. */
  pomodoroPos: PanelPos | null;
  sidePad: string;
  /** Space above the controls, so they land on the same line as the top bar they cover. */
  topPad: string;
  /** Every note on the focused task, each carrying its own position. */
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

/**
 * What the two lines inside the player share: the face, named outright because the focus screen
 * around them is DM Mono and they would otherwise inherit it, and the tracking. The size is not
 * shared — the task takes a step up from this, which is the base the clock keeps.
 */
const PLAYER_LINE: CSSProperties = {
  fontFamily: APP_FONT,
  fontSize: 13,
  // Sentence case needs far less tracking than the all-caps this used to be, but Inter Tight
  // is drawn close by default, so a touch goes back.
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
        // The page's own colour, flat. White pooled behind the player here before, which lit the
        // middle of the screen and left the edges on the page's grey — two controls in the same
        // filled black read as two different blacks depending where they sat in that falloff.
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // The focus screen keeps the mono the app was originally set in. Everything inside it
        // inherits this — timer, state, task, notes — except the two buttons along the top,
        // which pin their own family so they stay identical to "Add work" on the main screen.
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
        {/* No separator dot between these two: they were text, and a pair of filled buttons
            already reads as two objects. */}
        <button data-primarybtn="" onClick={onAddNote} style={primaryIconLabelBtn}>
          <PlusIcon />
          Add note
        </button>
        <button data-dangerbtn="" onClick={onExit} style={dangerBtn}>
          Exit
        </button>
      </div>

      {/* Positioned against this overlay, which fills the window — so are the notes' own
          coordinates. Rendered before the timer so a note dragged over it still lands on top,
          which its z-index handles. */}
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
            // Solid white, not the app's glass: the task being worked on is the one thing on
            // this screen that should read as a card rather than as a pane the page shows
            // through. The blur goes with it — nothing carries through an opaque fill — and the
            // edge and shadow come from the surface tokens the capture bar is built on, so the
            // two opaque whites in the app are cut the same way.
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
                // The one thing the player is about, so it is the one thing in it set above the
                // base size. A point over the clock is enough at this scale — the player is a
                // small object, and any more would have the task crowding its own box.
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
                // Ranked under the task by size now as well as by colour, but it keeps the
                // colour: a point of difference is not much to carry the hierarchy alone, and
                // the clock is the line meant to be read second.
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
          {/* Quiet rather than filled: the pomodoro is something the screen offers, not what it
              is asking for — "Mark done" is still the move this row is here for. */}
          <button data-secondarybtn="" onClick={onTogglePomodoro} style={secondaryBtn}>
            {pomodoroOpen ? 'Hide Pomodoro' : 'Start Pomodoro'}
          </button>
          {/* The dots that used to divide this row are gone with the text buttons that needed
              them — two buttons are already two objects. Pausing lives on the round button
              above, so the row no longer repeats it. */}
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

import { Show, useClerk, useUser } from '@clerk/react';
import { totalFor } from './types';
import { useToday } from './useToday';
import { APP_FONT } from './styles';
import { sidePadFor, topPadFor } from './util';
import { TopBar } from './components/TopBar';
import { TaskStream } from './components/TaskStream';
import { CaptureBar } from './components/CaptureBar';
import { FocusMode } from './components/FocusMode';
import { SignInScreen } from './components/SignInScreen';

export default function App() {
  return (
    <>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
      <Show when="signed-in">
        <SignedIn />
      </Show>
    </>
  );
}

function SignedIn() {
  const { user } = useUser();
  // Keyed on the user id so switching accounts remounts Today with fresh UI state and this
  // account's scroll anchor.
  return user ? <Today key={user.id} userId={user.id} /> : null;
}

function Today({ userId }: { userId: string }) {
  const { state, tasks, notes, loading, actions, initialAnchorId } = useToday(userId);
  const { signOut } = useClerk();
  const c = state.compact;
  const sidePad = sidePadFor(c);
  const topPad = topPadFor(c);

  const focusTask = state.focusId != null ? tasks.find((t) => t.id === state.focusId) : null;
  const focusElapsed = totalFor(state.focusPhase) - state.focusLeft;

  return (
    <div
      style={{
        minHeight: '100vh',
        // One cell, two children stacked in it: the bar pins to the top while the list centres
        // on the full height. Vertical padding stays symmetric or the list shifts by half of it.
        display: 'grid',
        gridTemplate: '1fr / 1fr',
        padding: `${topPad} ${sidePad}`,
        // Colour and image apart: the `background` shorthand would drop the grid. `border-box`
        // because tiling starts at the padding edge otherwise, and the focus overlay — which
        // has no padding — would rule from a different origin.
        backgroundColor: 'var(--bg)',
        backgroundImage: 'var(--grid)',
        backgroundSize: 'var(--grid-cell) var(--grid-cell)',
        backgroundOrigin: 'border-box',
        color: 'var(--ink)',
        fontFamily: APP_FONT,
        fontWeight: 400,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Raised over the stream, which shares this cell and is painted after it. The stream is
          a fixed 560px centred on the cell, so on a window under ~734px tall it grows up into
          the bar's row and — being later in the DOM — takes the clicks meant for these
          buttons. */}
      <div style={{ gridArea: '1 / 1', alignSelf: 'start', position: 'relative', zIndex: 1 }}>
        <TopBar onLogout={() => signOut()} onOpenCapture={actions.openCapture} />
      </div>

      <div
        style={{
          gridArea: '1 / 1',
          alignSelf: 'center',
          justifySelf: 'center',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 640 }}>
          <TaskStream
            tasks={tasks}
            loading={loading}
            compact={c}
            initialAnchorId={initialAnchorId}
            onComplete={actions.complete}
            onFocus={actions.enterFocus}
            onRemove={actions.removeTask}
            onAnchor={actions.saveAnchor}
          />
        </div>
      </div>

      <CaptureBar
        open={state.captureOpen}
        text={state.captureText}
        sidePad={sidePad}
        inputRef={actions.inputRef}
        onChange={actions.setCaptureText}
        onKeyDown={actions.onCapKey}
        onSubmit={actions.submitCapture}
      />

      {focusTask && (
        <FocusMode
          task={focusTask.text}
          running={state.focusRunning}
          elapsed={focusElapsed}
          phase={state.focusPhase}
          left={state.focusLeft}
          pomodoroOpen={state.pomodoroOpen}
          pomodoroPos={state.pomodoroPos}
          sidePad={sidePad}
          topPad={topPad}
          notes={notes}
          onToggle={actions.focusToggle}
          onReset={actions.focusReset}
          onTogglePomodoro={actions.togglePomodoro}
          onPomodoroMove={actions.movePomodoro}
          onComplete={actions.focusComplete}
          onExit={actions.exitFocus}
          onAddNote={actions.addNote}
          onNoteChange={actions.setNoteText}
          onNoteMove={actions.moveNote}
          onNoteResize={actions.resizeNote}
          onNoteRemove={actions.removeNote}
        />
      )}
    </div>
  );
}

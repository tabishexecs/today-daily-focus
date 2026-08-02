import { Show, useClerk, useUser } from '@clerk/react';
import { totalFor } from './types';
import { useToday } from './useToday';
import { sidePadFor } from './util';
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
  // account's scroll anchor, rather than inheriting the previous user's.
  return user ? <Today key={user.id} userId={user.id} /> : null;
}

function Today({ userId }: { userId: string }) {
  const { state, tasks, notes, loading, actions, initialAnchorId } = useToday(userId);
  const { signOut } = useClerk();
  const c = state.compact;
  const sidePad = sidePadFor(c);

  const focusTask = state.focusId != null ? tasks.find((t) => t.id === state.focusId) : null;
  const focusElapsed = totalFor(state.focusPhase) - state.focusLeft;

  return (
    <div
      style={{
        minHeight: '100vh',
        // One cell, two children stacked in it: the bar pins to the top while the list
        // centres on the full height. Vertical padding is symmetric so that centre is
        // the window's centre — anything asymmetric here shifts the list by half of it.
        display: 'grid',
        gridTemplate: '1fr / 1fr',
        // The same side padding the capture bar and the focus screen use, so all three line up.
        padding: `${c ? '26px' : '54px'} ${sidePad}`,
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        fontWeight: 400,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ gridArea: '1 / 1', alignSelf: 'start' }}>
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
      />

      {focusTask && (
        <FocusMode
          task={focusTask.text}
          phase={state.focusPhase}
          running={state.focusRunning}
          left={state.focusLeft}
          elapsed={focusElapsed}
          sidePad={sidePad}
          notes={notes}
          onToggle={actions.focusToggle}
          onReset={actions.focusReset}
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

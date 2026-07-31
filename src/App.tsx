import { BREAK_TOTAL, FOCUS_TOTAL } from './types';
import { useToday } from './useToday';
import { sidePad as sidePadFn } from './util';
import { TopBar } from './components/TopBar';
import { TaskStream } from './components/TaskStream';
import { CaptureBar } from './components/CaptureBar';
import { FocusMode } from './components/FocusMode';

export default function App() {
  const { state, actions, initialAnchorId } = useToday();
  const c = state.compact;
  const sidePad = sidePadFn(c);

  const focusTask = state.focusId != null ? state.tasks.find((t) => t.id === state.focusId) : null;
  const currentTotal = state.focusPhase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL;
  const focusElapsed = currentTotal - state.focusLeft;

  return (
    <div
      style={{
        minHeight: '100vh',
        // One cell, two children stacked in it: the bar pins to the top while the list
        // centres on the full height. Vertical padding is symmetric so that centre is
        // the window's centre — anything asymmetric here shifts the list by half of it.
        display: 'grid',
        gridTemplate: '1fr / 1fr',
        padding: c ? '26px 22px' : '54px clamp(46px,7vw,120px)',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        fontWeight: 400,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ gridArea: '1 / 1', alignSelf: 'start' }}>
        <TopBar onLogout={actions.logout} onOpenCapture={actions.openCapture} />
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
            tasks={state.tasks}
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
          onToggle={actions.focusToggle}
          onReset={actions.focusReset}
          onComplete={actions.focusComplete}
          onExit={actions.exitFocus}
        />
      )}
    </div>
  );
}

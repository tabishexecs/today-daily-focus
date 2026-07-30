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
        display: 'flex',
        flexDirection: 'column',
        padding: c ? '26px 22px 22px' : '54px clamp(46px,7vw,120px) 40px',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        fontWeight: 400,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <TopBar onLogout={actions.logout} onOpenCapture={actions.openCapture} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
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

import { BREAK_TOTAL, FOCUS_TOTAL } from './types';
import { useToday } from './useToday';
import { sidePad as sidePadFn } from './util';
import { TopBar } from './components/TopBar';
import { TaskSlots } from './components/TaskSlots';
import { QueuePanel } from './components/QueuePanel';
import { CaptureBar } from './components/CaptureBar';
import { FocusMode } from './components/FocusMode';

export default function App() {
  const { state, actions } = useToday();
  const c = state.compact;
  const numCol = c ? '30px' : '48px';
  const sidePad = sidePadFn(c);

  const rootPad = c ? '26px 22px 22px' : '54px clamp(46px,7vw,120px) 40px';
  const rootPadRight = c
    ? '22px'
    : state.queueOpen
      ? 'calc(clamp(46px,7vw,120px) + 404px)'
      : 'clamp(46px,7vw,120px)';

  const showPrompt = !state.dayLocked;
  const promptShowBtn = c && !state.queueOpen;
  const promptShowHint = !c || state.queueOpen;

  const focusSlot = state.focusIndex != null ? state.slots[state.focusIndex] : null;
  const currentTotal = state.focusPhase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL;
  const focusElapsed = currentTotal - state.focusLeft;

  const flyStyle: React.CSSProperties =
    state.flyGhost?.phase === 'end'
      ? {
          transform: 'translate(-40px,54vh) scale(0.55)',
          opacity: 0,
          transition: 'transform 580ms cubic-bezier(0.4,0,0.2,1), opacity 580ms ease',
        }
      : {
          transform: 'translate(0,0) scale(1)',
          opacity: 1,
          transition: 'transform 580ms cubic-bezier(0.4,0,0.2,1), opacity 580ms ease',
        };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: rootPad,
        paddingRight: rootPadRight,
        transition: 'padding-right 480ms cubic-bezier(0.22,0.61,0.36,1)',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "'DM Mono','Helvetica Neue',monospace",
        fontWeight: 400,
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <TopBar
        showQueueToggle={!state.queueOpen}
        queueCount={state.queue.length}
        onLogout={actions.logout}
        onToggleQueue={actions.toggleQueue}
        onOpenCapture={actions.openCapture}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          {showPrompt && (
            <div style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.28em', color: 'var(--ink)', fontWeight: 500 }}>
                GET STARTED
              </div>
              {promptShowBtn && (
                <button
                  onClick={actions.openQueue}
                  style={{
                    marginTop: 14,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    padding: '6px 2px',
                  }}
                >
                  Open the queue&nbsp;&nbsp;→
                </button>
              )}
              {promptShowHint && (
                <div style={{ marginTop: 14, fontSize: 11, letterSpacing: '0.28em', color: 'var(--muted)' }}>
                  DRAG TASKS FROM THE QUEUE INTO THE SLOTS
                </div>
              )}
            </div>
          )}

          <TaskSlots
            slots={state.slots}
            overSlot={state.overSlot}
            dayLocked={state.dayLocked}
            numCol={numCol}
            onComplete={actions.complete}
            onFocus={actions.enterFocus}
          />

          {state.dayWon && (
            <div style={{ marginTop: 54, display: 'flex', alignItems: 'center', gap: 16, animation: 'wonIn 700ms ease' }}>
              <span style={{ width: 28, height: 1, background: 'var(--primary)', display: 'inline-block' }} />
              <span style={{ fontSize: 11, letterSpacing: '0.44em', color: 'var(--primary)' }}>DAY WON</span>
            </div>
          )}
        </div>
      </div>

      <QueuePanel
        items={state.queue}
        open={state.queueOpen}
        dim={state.queueDim}
        compact={c}
        onClose={actions.closeQueue}
        onStartDrag={actions.startDrag}
        onRemove={actions.removeQueue}
      />

      <CaptureBar
        open={state.captureOpen}
        text={state.captureText}
        sidePad={sidePad}
        inputRef={actions.inputRef}
        onChange={actions.setCaptureText}
        onKeyDown={actions.onCapKey}
      />

      {/* Drag ghost following the cursor */}
      {state.drag && (
        <div
          style={{
            position: 'fixed',
            left: state.drag.x,
            top: state.drag.y,
            transform: 'translate(16px,-50%) scale(1.03)',
            pointerEvents: 'none',
            zIndex: 60,
            background: 'var(--bg)',
            border: '1px solid var(--ink)',
            padding: '11px 17px',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          {state.drag.item.text}
        </div>
      )}

      {/* Capture → queue fly ghost */}
      {state.flyGhost && (
        <div
          style={{
            position: 'fixed',
            left: sidePad,
            top: 78,
            zIndex: 55,
            background: 'var(--bg)',
            border: '1px solid var(--ink)',
            padding: '11px 17px',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            ...flyStyle,
          }}
        >
          {state.flyGhost.text}
        </div>
      )}

      {state.focusIndex != null && focusSlot && (
        <FocusMode
          task={focusSlot.text}
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

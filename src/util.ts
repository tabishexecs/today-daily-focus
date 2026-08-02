export const fmt = (sec: number): string => {
  const s = Math.max(0, sec | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
};

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dateStr = (now = new Date()): string =>
  `${WD[now.getDay()]} · ${MO[now.getMonth()]} ${now.getDate()}`;

/** Horizontal breathing room at the window's edges, shared by every full-width surface. */
export const sidePadFor = (compact: boolean): string =>
  compact ? '22px' : 'clamp(46px,7vw,120px)';

/**
 * Space above the top bar — and above anything that has to line up with it, which is why it
 * lives here rather than inline. The focus screen's own controls sit at this offset so they
 * land on the same line as the ones they cover.
 */
export const topPadFor = (compact: boolean): string => (compact ? '26px' : '54px');

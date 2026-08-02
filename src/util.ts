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

/** Shared by every full-width surface so they line up on one margin. */
export const sidePadFor = (compact: boolean): string =>
  compact ? '22px' : 'clamp(46px,7vw,120px)';

/** The top bar's offset. Focus mode reuses it so its controls land on the same line. */
export const topPadFor = (compact: boolean): string => (compact ? '26px' : '54px');

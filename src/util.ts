export const fmt = (sec: number): string => {
  const s = Math.max(0, sec | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
};

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const dateStr = (now = new Date()): string =>
  `${WD[now.getDay()]} · ${MO[now.getMonth()]} ${now.getDate()}`;

export const sidePad = (compact: boolean): string =>
  compact ? '22px' : 'clamp(46px,7vw,120px)';

export const EMPTY_LABELS = ['THE FIRST THING', 'AND THEN', 'ONE LAST THING'];

// Date-time display for the UI (SPEC 5: DD.MM.YYYY). Local time: these are moments, not calendar dates.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Epoch ms → 'DD.MM.YYYY HH:mm'. */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Backup stamp 'YYYY-MM-DD HH:mm:ss' → 'DD.MM.YYYY HH:mm:ss'. */
export function formatStamp(stamp: string): string {
  const [date = '', time = ''] = stamp.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  return `${d}.${m}.${y} ${time}`;
}

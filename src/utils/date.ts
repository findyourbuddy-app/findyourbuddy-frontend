// Backend serializes naive UTC datetimes (datetime.utcnow(), no offset suffix).
// JS treats an offset-less ISO string as local time, so it must be anchored to UTC explicitly.
function parseApiDate(iso: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

export function isToday(iso: string): boolean {
  const date = parseApiDate(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isYesterday(iso: string): boolean {
  const date = parseApiDate(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatRelativeTimestamp(iso: string): string {
  const date = parseApiDate(iso);
  const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);

  if (diffMinutes < 2) {
    return "Şimdi";
  }
  if (isToday(iso)) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (isYesterday(iso)) {
    return "Dün";
  }
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

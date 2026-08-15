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

  // If in the future, fallback to standard date format instead of returning "Şimdi"
  if (diffMinutes < 0) {
    return formatEventDate(iso);
  }

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

export function isTomorrow(iso: string): boolean {
  const date = parseApiDate(iso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

const TURKISH_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TURKISH_MONTHS_SHORT = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const NEW_MEMBER_WINDOW_DAYS = 7;

export function isNewMember(iso: string): boolean {
  const date = parseApiDate(iso);
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < NEW_MEMBER_WINDOW_DAYS;
}

export function formatMemberSince(iso: string): string {
  const date = parseApiDate(iso);
  return `${TURKISH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}'den beri üye`;
}

export function formatEventDate(iso: string): string {
  const date = parseApiDate(iso);
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  
  if (isToday(iso)) {
    return `Bugün · ${timeStr}`;
  }
  if (isTomorrow(iso)) {
    return `Yarın · ${timeStr}`;
  }
  
  const dayName = TURKISH_DAYS[date.getDay()];
  const monthName = TURKISH_MONTHS_SHORT[date.getMonth()];
  return `${date.getDate()} ${monthName} ${dayName} · ${timeStr}`;
}

import type { LanguageKey } from "../context/ThemeContext";

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

export function formatRelativeTimestamp(iso: string, lang: LanguageKey = "tr"): string {
  const date = parseApiDate(iso);
  const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);

  if (diffMinutes < 0) {
    return formatEventDate(iso, lang);
  }

  if (diffMinutes < 2) {
    return lang === "en" ? "Just now" : "Şimdi";
  }
  if (isToday(iso)) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (isYesterday(iso)) {
    return lang === "en" ? "Yesterday" : "Dün";
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
const ENGLISH_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TURKISH_MONTHS_SHORT = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];
const ENGLISH_MONTHS_SHORT = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const NEW_MEMBER_WINDOW_DAYS = 7;

export function isNewMember(iso: string): boolean {
  const date = parseApiDate(iso);
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < NEW_MEMBER_WINDOW_DAYS;
}

export function formatMemberSince(iso: string, lang: LanguageKey = "tr"): string {
  const date = parseApiDate(iso);
  if (lang === "en") {
    return `Member since ${ENGLISH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  }
  return `${TURKISH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}'den beri üye`;
}

export function formatEventDate(iso: string, lang: LanguageKey = "tr"): string {
  const date = parseApiDate(iso);
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  
  if (isToday(iso)) {
    return lang === "en" ? `Today · ${timeStr}` : `Bugün · ${timeStr}`;
  }
  if (isTomorrow(iso)) {
    return lang === "en" ? `Tomorrow · ${timeStr}` : `Yarın · ${timeStr}`;
  }
  
  const dayName = lang === "en" ? ENGLISH_DAYS[date.getDay()] : TURKISH_DAYS[date.getDay()];
  const monthName = lang === "en" ? ENGLISH_MONTHS_SHORT[date.getMonth()] : TURKISH_MONTHS_SHORT[date.getMonth()];
  return `${date.getDate()} ${monthName} ${dayName} · ${timeStr}`;
}

import type { LanguageKey } from "../context/ThemeContext";
import { pickLabel, type LocalizedLabel } from "./localized";

export interface LanguageOption {
  code: string;
  flag: string;
  labels: LocalizedLabel;
}

export const LANGUAGES_LIST: LanguageOption[] = [
  { code: "tr", flag: "🇹🇷", labels: { tr: "Türkçe", en: "Turkish", de: "Türkisch", es: "Turco", fr: "Turc", it: "Turco", ru: "Турецкий", ar: "التركية" } },
  { code: "en", flag: "🇬🇧", labels: { tr: "İngilizce", en: "English", de: "Englisch", es: "Inglés", fr: "Anglais", it: "Inglese", ru: "Английский", ar: "الإنجليزية" } },
  { code: "de", flag: "🇩🇪", labels: { tr: "Almanca", en: "German", de: "Deutsch", es: "Alemán", fr: "Allemand", it: "Tedesco", ru: "Немецкий", ar: "الألمانية" } },
  { code: "fr", flag: "🇫🇷", labels: { tr: "Fransızca", en: "French", de: "Französisch", es: "Francés", fr: "Français", it: "Francese", ru: "Французский", ar: "الفرنسية" } },
  { code: "es", flag: "🇪🇸", labels: { tr: "İspanyolca", en: "Spanish", de: "Spanisch", es: "Español", fr: "Espagnol", it: "Spagnolo", ru: "Испанский", ar: "الإسبانية" } },
  { code: "it", flag: "🇮🇹", labels: { tr: "İtalyanca", en: "Italian", de: "Italienisch", es: "Italiano", fr: "Italien", it: "Italiano", ru: "Итальянский", ar: "الإيطالية" } },
  { code: "ru", flag: "🇷🇺", labels: { tr: "Rusça", en: "Russian", de: "Russisch", es: "Ruso", fr: "Russe", it: "Russo", ru: "Русский", ar: "الروسية" } },
  { code: "ar", flag: "🇸🇦", labels: { tr: "Arapça", en: "Arabic", de: "Arabisch", es: "Árabe", fr: "Arabe", it: "Arabo", ru: "Арабский", ar: "العربية" } },
  { code: "zh", flag: "🇨🇳", labels: { tr: "Çince", en: "Chinese", de: "Chinesisch", es: "Chino", fr: "Chinois", it: "Cinese", ru: "Китайский", ar: "الصينية" } },
  { code: "ja", flag: "🇯🇵", labels: { tr: "Japonca", en: "Japanese", de: "Japanisch", es: "Japonés", fr: "Japonais", it: "Giapponese", ru: "Японский", ar: "اليابانية" } },
  { code: "ko", flag: "🇰🇷", labels: { tr: "Korece", en: "Korean", de: "Koreanisch", es: "Coreano", fr: "Coréen", it: "Coreano", ru: "Корейский", ar: "الكورية" } },
  { code: "pt", flag: "🇵🇹", labels: { tr: "Portekizce", en: "Portuguese", de: "Portugiesisch", es: "Portugués", fr: "Portugais", it: "Portoghese", ru: "Португальский", ar: "البرتغالية" } },
  { code: "sign", flag: "🤟", labels: { tr: "İşaret Dili", en: "Sign Language", de: "Gebärdensprache", es: "Lengua de signos", fr: "Langue des signes", it: "Lingua dei segni", ru: "Язык жестов", ar: "لغة الإشارة" } },
];

export function getLanguageLabel(code: string, lang: LanguageKey = "tr"): string {
  const item = LANGUAGES_LIST.find((option) => option.code === code);
  if (!item) return code;
  return pickLabel(item.labels, lang);
}

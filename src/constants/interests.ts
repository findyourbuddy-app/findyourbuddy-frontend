import type { LanguageKey } from "../context/ThemeContext";
import { pickLabel, type LocalizedLabel } from "./localized";

export interface InterestMeta {
  slug: string;
  labels: LocalizedLabel;
}

export const INTERESTS: InterestMeta[] = [
  { slug: "running", labels: { tr: "Koşu", en: "Running", de: "Laufen", es: "Correr", fr: "Course à pied", it: "Corsa", ru: "Бег", ar: "الجري" } },
  { slug: "coffee", labels: { tr: "Kahve", en: "Coffee", de: "Kaffee", es: "Café", fr: "Café", it: "Caffè", ru: "Кофе", ar: "القهوة" } },
  { slug: "concert", labels: { tr: "Konser", en: "Concerts", de: "Konzerte", es: "Conciertos", fr: "Concerts", it: "Concerti", ru: "Концерты", ar: "الحفلات" } },
  { slug: "climbing", labels: { tr: "Tırmanış", en: "Climbing", de: "Klettern", es: "Escalada", fr: "Escalade", it: "Arrampicata", ru: "Скалолазание", ar: "التسلق" } },
  { slug: "hiking", labels: { tr: "Doğa Yürüyüşü", en: "Hiking", de: "Wandern", es: "Senderismo", fr: "Randonnée", it: "Escursionismo", ru: "Пеший туризм", ar: "المشي لمسافات طويلة" } },
  { slug: "cycling", labels: { tr: "Bisiklet", en: "Cycling", de: "Radfahren", es: "Ciclismo", fr: "Cyclisme", it: "Ciclismo", ru: "Велоспорт", ar: "ركوب الدراجات" } },
  { slug: "yoga", labels: { tr: "Yoga", en: "Yoga", de: "Yoga", es: "Yoga", fr: "Yoga", it: "Yoga", ru: "Йога", ar: "اليوغا" } },
  { slug: "boardgames", labels: { tr: "Kutu Oyunu", en: "Board Games", de: "Brettspiele", es: "Juegos de mesa", fr: "Jeux de société", it: "Giochi da tavolo", ru: "Настольные игры", ar: "ألعاب الطاولة" } },
  { slug: "football", labels: { tr: "Futbol", en: "Football", de: "Fußball", es: "Fútbol", fr: "Football", it: "Calcio", ru: "Футбол", ar: "كرة القدم" } },
  { slug: "photography", labels: { tr: "Fotoğraf", en: "Photography", de: "Fotografie", es: "Fotografía", fr: "Photographie", it: "Fotografia", ru: "Фотография", ar: "التصوير" } },
  { slug: "live-music", labels: { tr: "Canlı Müzik", en: "Live Music", de: "Live-Musik", es: "Música en vivo", fr: "Musique live", it: "Musica dal vivo", ru: "Живая музыка", ar: "الموسيقى الحية" } },
  { slug: "reading", labels: { tr: "Kitap", en: "Reading", de: "Lesen", es: "Lectura", fr: "Lecture", it: "Lettura", ru: "Чтение", ar: "القراءة" } },
  { slug: "cooking", labels: { tr: "Yemek Yapmak", en: "Cooking", de: "Kochen", es: "Cocina", fr: "Cuisine", it: "Cucina", ru: "Кулинария", ar: "الطبخ" } },
  { slug: "travel", labels: { tr: "Seyahat", en: "Travel", de: "Reisen", es: "Viajar", fr: "Voyage", it: "Viaggi", ru: "Путешествия", ar: "السفر" } },
  { slug: "gaming", labels: { tr: "Oyun", en: "Gaming", de: "Gaming", es: "Videojuegos", fr: "Jeux vidéo", it: "Videogiochi", ru: "Видеоигры", ar: "الألعاب" } },
  { slug: "art", labels: { tr: "Sanat", en: "Art", de: "Kunst", es: "Arte", fr: "Art", it: "Arte", ru: "Искусство", ar: "الفن" } },
];

export function getInterestLabel(slug: string, lang: LanguageKey = "tr"): string {
  const item = INTERESTS.find((interest) => interest.slug === slug);
  if (!item) return slug;
  return pickLabel(item.labels, lang);
}

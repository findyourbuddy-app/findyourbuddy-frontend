import type { LanguageKey } from "../context/ThemeContext";
import { pickLabel, type LocalizedLabel } from "./localized";

export interface HobbyMeta {
  slug: string;
  labels: LocalizedLabel;
  icon?: string;
}

export const HOBBIES: HobbyMeta[] = [
  { slug: "bodybuilding", labels: { tr: "Vücut Geliştirme", en: "Bodybuilding", de: "Bodybuilding", es: "Culturismo", fr: "Musculation", it: "Bodybuilding", ru: "Бодибилдинг", ar: "كمال الأجسام" } },
  { slug: "tennis", labels: { tr: "Tenis", en: "Tennis", de: "Tennis", es: "Tenis", fr: "Tennis", it: "Tennis", ru: "Теннис", ar: "التنس" } },
  { slug: "swimming", labels: { tr: "Yüzme", en: "Swimming", de: "Schwimmen", es: "Natación", fr: "Natation", it: "Nuoto", ru: "Плавание", ar: "السباحة" } },
  { slug: "cycling", labels: { tr: "Bisiklet", en: "Cycling", de: "Radfahren", es: "Ciclismo", fr: "Cyclisme", it: "Ciclismo", ru: "Велоспорт", ar: "ركوب الدراجات" } },
  { slug: "yoga-pilates", labels: { tr: "Yoga & Pilates", en: "Yoga & Pilates", de: "Yoga & Pilates", es: "Yoga y pilates", fr: "Yoga et pilates", it: "Yoga e pilates", ru: "Йога и пилатес", ar: "اليوغا والبيلاتس" } },
  { slug: "reading", labels: { tr: "Kitap Okuma", en: "Reading", de: "Lesen", es: "Lectura", fr: "Lecture", it: "Lettura", ru: "Чтение", ar: "القراءة" } },
  { slug: "photography", labels: { tr: "Fotoğrafçılık", en: "Photography", de: "Fotografie", es: "Fotografía", fr: "Photographie", it: "Fotografia", ru: "Фотография", ar: "التصوير الفوتوغرافي" } },
  { slug: "boardgames", labels: { tr: "Kutu Oyunları", en: "Board Games", de: "Brettspiele", es: "Juegos de mesa", fr: "Jeux de société", it: "Giochi da tavolo", ru: "Настольные игры", ar: "ألعاب الطاولة" } },
  { slug: "chess", labels: { tr: "Satranç", en: "Chess", de: "Schach", es: "Ajedrez", fr: "Échecs", it: "Scacchi", ru: "Шахматы", ar: "الشطرنج" } },
  { slug: "dancing", labels: { tr: "Dans", en: "Dancing", de: "Tanzen", es: "Baile", fr: "Danse", it: "Ballo", ru: "Танцы", ar: "الرقص" } },
  { slug: "cooking", labels: { tr: "Yemek Pişirme", en: "Cooking", de: "Kochen", es: "Cocina", fr: "Cuisine", it: "Cucina", ru: "Кулинария", ar: "الطبخ" } },
  { slug: "music", labels: { tr: "Müzik & Enstrüman", en: "Music & Instruments", de: "Musik & Instrumente", es: "Música e instrumentos", fr: "Musique et instruments", it: "Musica e strumenti", ru: "Музыка и инструменты", ar: "الموسيقى والآلات" } },
  { slug: "hiking", labels: { tr: "Doğa Yürüyüşü", en: "Hiking", de: "Wandern", es: "Senderismo", fr: "Randonnée", it: "Escursionismo", ru: "Пеший туризм", ar: "المشي لمسافات طويلة" } },
  { slug: "gaming", labels: { tr: "Oyun / Gaming", en: "Gaming", de: "Gaming", es: "Videojuegos", fr: "Jeux vidéo", it: "Videogiochi", ru: "Видеоигры", ar: "الألعاب" } },
  { slug: "cinema", labels: { tr: "Sinema & Tiyatro", en: "Cinema & Theatre", de: "Kino & Theater", es: "Cine y teatro", fr: "Cinéma et théâtre", it: "Cinema e teatro", ru: "Кино и театр", ar: "السينما والمسرح" } },
  { slug: "art", labels: { tr: "Sanat & Resim", en: "Art & Painting", de: "Kunst & Malerei", es: "Arte y pintura", fr: "Art et peinture", it: "Arte e pittura", ru: "Искусство и живопись", ar: "الفن والرسم" } },
  { slug: "tech", labels: { tr: "Kodlama & Teknoloji", en: "Tech & Coding", de: "Technik & Coding", es: "Tecnología y programación", fr: "Tech et code", it: "Tecnologia e coding", ru: "Технологии и программирование", ar: "التقنية والبرمجة" } },
  { slug: "boxing", labels: { tr: "Dövüş Sporları", en: "Martial Arts", de: "Kampfsport", es: "Artes marciales", fr: "Arts martiaux", it: "Arti marziali", ru: "Боевые искусства", ar: "الفنون القتالية" } },
];

export const MAX_HOBBIES_SELECTION = 4;

export function getHobbyLabel(slug: string, lang: LanguageKey = "tr"): string {
  const item = HOBBIES.find((hobby) => hobby.slug === slug);
  if (!item) return slug;
  return pickLabel(item.labels, lang);
}

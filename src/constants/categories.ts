import type { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { LanguageKey } from "../context/ThemeContext";
import { pickLabel, type LocalizedLabel } from "./localized";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];

export interface CategoryMeta {
  slug: string;
  labels: LocalizedLabel;
  icon: FeatherIconName;
  gradient: [string, string];
  defaultImage: string;
  stockImages: string[];
}

/** A category with its label already resolved for the active locale. */
export type ResolvedCategory = CategoryMeta & { label: string };

export const CATEGORY_STOCK_GALLERY: Record<string, string[]> = {
  running: [
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&auto=format&fit=crop",
  ],
  coffee: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop",
  ],
  concert: [
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop",
  ],
  festival: [
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
  ],
  climbing: [
    "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&auto=format&fit=crop",
  ],
  hiking: [
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1483728001985-c90555a086b3?w=800&auto=format&fit=crop",
  ],
  cycling: [
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop",
  ],
  yoga: [
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop",
  ],
  boardgames: [
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=800&auto=format&fit=crop",
  ],
  football: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop",
  ],
  party: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop",
  ],
  theatre: [
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&auto=format&fit=crop",
  ],
  art: [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&auto=format&fit=crop",
  ],
  workshop: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop",
  ],
  hobby: [
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop",
  ],
  other: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop",
  ],
};

const OTHER_CATEGORY: CategoryMeta = {
  slug: "other",
  labels: { tr: "Diğer", en: "Other", de: "Sonstiges", es: "Otro", fr: "Autre", it: "Altro", ru: "Другое", ar: "أخرى" },
  icon: "grid",
  gradient: ["#B8AEE8", "#6C4CF1"],
  defaultImage: CATEGORY_STOCK_GALLERY.other[0],
  stockImages: CATEGORY_STOCK_GALLERY.other,
};

export const CATEGORIES: CategoryMeta[] = [
  { slug: "running", labels: { tr: "Koşu", en: "Running", de: "Laufen", es: "Correr", fr: "Course à pied", it: "Corsa", ru: "Бег", ar: "الجري" }, icon: "wind", gradient: ["#FFB199", "#FF6A6A"], defaultImage: CATEGORY_STOCK_GALLERY.running[0], stockImages: CATEGORY_STOCK_GALLERY.running },
  { slug: "coffee", labels: { tr: "Kahve", en: "Coffee & Chat", de: "Kaffee & Plausch", es: "Café y charla", fr: "Café et discussion", it: "Caffè e chiacchiere", ru: "Кофе и общение", ar: "قهوة ودردشة" }, icon: "coffee", gradient: ["#D8B48C", "#8B5E3C"], defaultImage: CATEGORY_STOCK_GALLERY.coffee[0], stockImages: CATEGORY_STOCK_GALLERY.coffee },
  { slug: "concert", labels: { tr: "Konser", en: "Concerts", de: "Konzerte", es: "Conciertos", fr: "Concerts", it: "Concerti", ru: "Концерты", ar: "الحفلات" }, icon: "music", gradient: ["#B892FF", "#6C4CF1"], defaultImage: CATEGORY_STOCK_GALLERY.concert[0], stockImages: CATEGORY_STOCK_GALLERY.concert },
  { slug: "festival", labels: { tr: "Festival", en: "Festivals", de: "Festivals", es: "Festivales", fr: "Festivals", it: "Festival", ru: "Фестивали", ar: "المهرجانات" }, icon: "disc", gradient: ["#FF758C", "#FF7EB3"], defaultImage: CATEGORY_STOCK_GALLERY.festival[0], stockImages: CATEGORY_STOCK_GALLERY.festival },
  { slug: "climbing", labels: { tr: "Tırmanış", en: "Climbing", de: "Klettern", es: "Escalada", fr: "Escalade", it: "Arrampicata", ru: "Скалолазание", ar: "التسلق" }, icon: "trending-up", gradient: ["#7EE8C6", "#2FA88B"], defaultImage: CATEGORY_STOCK_GALLERY.climbing[0], stockImages: CATEGORY_STOCK_GALLERY.climbing },
  { slug: "hiking", labels: { tr: "Doğa Yürüyüşü", en: "Hiking", de: "Wandern", es: "Senderismo", fr: "Randonnée", it: "Escursionismo", ru: "Пеший туризм", ar: "المشي لمسافات طويلة" }, icon: "map", gradient: ["#9CD98A", "#3F8F4A"], defaultImage: CATEGORY_STOCK_GALLERY.hiking[0], stockImages: CATEGORY_STOCK_GALLERY.hiking },
  { slug: "cycling", labels: { tr: "Bisiklet", en: "Cycling", de: "Radfahren", es: "Ciclismo", fr: "Cyclisme", it: "Ciclismo", ru: "Велоспорт", ar: "ركوب الدراجات" }, icon: "navigation", gradient: ["#7FC8F8", "#2E7FC9"], defaultImage: CATEGORY_STOCK_GALLERY.cycling[0], stockImages: CATEGORY_STOCK_GALLERY.cycling },
  { slug: "yoga", labels: { tr: "Yoga", en: "Yoga", de: "Yoga", es: "Yoga", fr: "Yoga", it: "Yoga", ru: "Йога", ar: "اليوغا" }, icon: "sun", gradient: ["#FFD08A", "#FF9F5A"], defaultImage: CATEGORY_STOCK_GALLERY.yoga[0], stockImages: CATEGORY_STOCK_GALLERY.yoga },
  { slug: "boardgames", labels: { tr: "Kutu Oyunu", en: "Board Games", de: "Brettspiele", es: "Juegos de mesa", fr: "Jeux de société", it: "Giochi da tavolo", ru: "Настольные игры", ar: "ألعاب الطاولة" }, icon: "square", gradient: ["#F7A6C4", "#D9427F"], defaultImage: CATEGORY_STOCK_GALLERY.boardgames[0], stockImages: CATEGORY_STOCK_GALLERY.boardgames },
  { slug: "football", labels: { tr: "Futbol", en: "Football", de: "Fußball", es: "Fútbol", fr: "Football", it: "Calcio", ru: "Футбол", ar: "كرة القدم" }, icon: "circle", gradient: ["#8FE28C", "#2F9E4F"], defaultImage: CATEGORY_STOCK_GALLERY.football[0], stockImages: CATEGORY_STOCK_GALLERY.football },
  { slug: "party", labels: { tr: "Parti", en: "Party", de: "Party", es: "Fiesta", fr: "Fête", it: "Festa", ru: "Вечеринка", ar: "حفلة" }, icon: "star", gradient: ["#FFC93C", "#FF8A3C"], defaultImage: CATEGORY_STOCK_GALLERY.party[0], stockImages: CATEGORY_STOCK_GALLERY.party },
  { slug: "theatre", labels: { tr: "Tiyatro & Gösteri", en: "Theatre & Show", de: "Theater & Show", es: "Teatro y espectáculos", fr: "Théâtre et spectacle", it: "Teatro e spettacolo", ru: "Театр и шоу", ar: "المسرح والعروض" }, icon: "video", gradient: ["#C9A0DC", "#7B4397"], defaultImage: CATEGORY_STOCK_GALLERY.theatre[0], stockImages: CATEGORY_STOCK_GALLERY.theatre },
  { slug: "art", labels: { tr: "Sanat & Kültür", en: "Art & Culture", de: "Kunst & Kultur", es: "Arte y cultura", fr: "Art et culture", it: "Arte e cultura", ru: "Искусство и культура", ar: "الفن والثقافة" }, icon: "image", gradient: ["#FFB6C1", "#E0607E"], defaultImage: CATEGORY_STOCK_GALLERY.art[0], stockImages: CATEGORY_STOCK_GALLERY.art },
  { slug: "workshop", labels: { tr: "Atölye", en: "Workshop", de: "Workshop", es: "Taller", fr: "Atelier", it: "Laboratorio", ru: "Мастер-класс", ar: "ورشة عمل" }, icon: "tool", gradient: ["#F6C177", "#D98324"], defaultImage: CATEGORY_STOCK_GALLERY.workshop[0], stockImages: CATEGORY_STOCK_GALLERY.workshop },
  { slug: "hobby", labels: { tr: "Hobi & Yaşam", en: "Hobby & Lifestyle", de: "Hobby & Lifestyle", es: "Afición y estilo de vida", fr: "Loisir et style de vie", it: "Hobby e stile di vita", ru: "Хобби и стиль жизни", ar: "هواية ونمط حياة" }, icon: "smile", gradient: ["#A8DADC", "#457B9D"], defaultImage: CATEGORY_STOCK_GALLERY.hobby[0], stockImages: CATEGORY_STOCK_GALLERY.hobby },
  OTHER_CATEGORY,
];

export function getCategoryMeta(category: string, lang: LanguageKey = "tr"): ResolvedCategory {
  const normalized = category.trim().toLowerCase();
  const match = CATEGORIES.find(
    (item) =>
      item.slug === normalized ||
      Object.values(item.labels).some((label) => label.toLowerCase() === normalized)
  );
  if (match) {
    return { ...match, label: pickLabel(match.labels, lang) };
  }
  // AI-assigned freeform categories (e.g. "kahve buluşması") don't map to a
  // known slug -- fall back to the generic icon/gradient but keep showing
  // the AI's actual label instead of silently replacing it with "Diğer".
  const freeformLabel = category.trim()
    ? category.trim().charAt(0).toUpperCase() + category.trim().slice(1)
    : pickLabel(OTHER_CATEGORY.labels, lang);
  return { ...OTHER_CATEGORY, label: freeformLabel };
}

import type { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { LanguageKey } from "../context/ThemeContext";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];

export interface CategoryMeta {
  slug: string;
  label: string;
  labelEn: string;
  icon: FeatherIconName;
  gradient: [string, string];
  defaultImage: string;
  stockImages: string[];
}

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
  label: "Diğer",
  labelEn: "Other",
  icon: "grid",
  gradient: ["#B8AEE8", "#6C4CF1"],
  defaultImage: CATEGORY_STOCK_GALLERY.other[0],
  stockImages: CATEGORY_STOCK_GALLERY.other,
};

export const CATEGORIES: CategoryMeta[] = [
  { slug: "running", label: "Koşu", labelEn: "Running", icon: "wind", gradient: ["#FFB199", "#FF6A6A"], defaultImage: CATEGORY_STOCK_GALLERY.running[0], stockImages: CATEGORY_STOCK_GALLERY.running },
  { slug: "coffee", label: "Kahve", labelEn: "Coffee & Chat", icon: "coffee", gradient: ["#D8B48C", "#8B5E3C"], defaultImage: CATEGORY_STOCK_GALLERY.coffee[0], stockImages: CATEGORY_STOCK_GALLERY.coffee },
  { slug: "concert", label: "Konser", labelEn: "Concerts", icon: "music", gradient: ["#B892FF", "#6C4CF1"], defaultImage: CATEGORY_STOCK_GALLERY.concert[0], stockImages: CATEGORY_STOCK_GALLERY.concert },
  { slug: "festival", label: "Festival", labelEn: "Festivals", icon: "disc", gradient: ["#FF758C", "#FF7EB3"], defaultImage: CATEGORY_STOCK_GALLERY.festival[0], stockImages: CATEGORY_STOCK_GALLERY.festival },
  { slug: "climbing", label: "Tırmanış", labelEn: "Climbing", icon: "trending-up", gradient: ["#7EE8C6", "#2FA88B"], defaultImage: CATEGORY_STOCK_GALLERY.climbing[0], stockImages: CATEGORY_STOCK_GALLERY.climbing },
  { slug: "hiking", label: "Doğa Yürüyüşü", labelEn: "Hiking", icon: "map", gradient: ["#9CD98A", "#3F8F4A"], defaultImage: CATEGORY_STOCK_GALLERY.hiking[0], stockImages: CATEGORY_STOCK_GALLERY.hiking },
  { slug: "cycling", label: "Bisiklet", labelEn: "Cycling", icon: "navigation", gradient: ["#7FC8F8", "#2E7FC9"], defaultImage: CATEGORY_STOCK_GALLERY.cycling[0], stockImages: CATEGORY_STOCK_GALLERY.cycling },
  { slug: "yoga", label: "Yoga", labelEn: "Yoga", icon: "sun", gradient: ["#FFD08A", "#FF9F5A"], defaultImage: CATEGORY_STOCK_GALLERY.yoga[0], stockImages: CATEGORY_STOCK_GALLERY.yoga },
  { slug: "boardgames", label: "Kutu Oyunu", labelEn: "Board Games", icon: "square", gradient: ["#F7A6C4", "#D9427F"], defaultImage: CATEGORY_STOCK_GALLERY.boardgames[0], stockImages: CATEGORY_STOCK_GALLERY.boardgames },
  { slug: "football", label: "Futbol", labelEn: "Football", icon: "circle", gradient: ["#8FE28C", "#2F9E4F"], defaultImage: CATEGORY_STOCK_GALLERY.football[0], stockImages: CATEGORY_STOCK_GALLERY.football },
  { slug: "party", label: "Parti", labelEn: "Party", icon: "star", gradient: ["#FFC93C", "#FF8A3C"], defaultImage: CATEGORY_STOCK_GALLERY.party[0], stockImages: CATEGORY_STOCK_GALLERY.party },
  { slug: "theatre", label: "Tiyatro & Gösteri", labelEn: "Theatre & Show", icon: "video", gradient: ["#C9A0DC", "#7B4397"], defaultImage: CATEGORY_STOCK_GALLERY.theatre[0], stockImages: CATEGORY_STOCK_GALLERY.theatre },
  { slug: "art", label: "Sanat & Kültür", labelEn: "Art & Culture", icon: "image", gradient: ["#FFB6C1", "#E0607E"], defaultImage: CATEGORY_STOCK_GALLERY.art[0], stockImages: CATEGORY_STOCK_GALLERY.art },
  { slug: "workshop", label: "Atölye", labelEn: "Workshop", icon: "tool", gradient: ["#F6C177", "#D98324"], defaultImage: CATEGORY_STOCK_GALLERY.workshop[0], stockImages: CATEGORY_STOCK_GALLERY.workshop },
  { slug: "hobby", label: "Hobi & Yaşam", labelEn: "Hobby & Lifestyle", icon: "smile", gradient: ["#A8DADC", "#457B9D"], defaultImage: CATEGORY_STOCK_GALLERY.hobby[0], stockImages: CATEGORY_STOCK_GALLERY.hobby },
  OTHER_CATEGORY,
];

export function getCategoryMeta(category: string, lang: LanguageKey = "tr"): CategoryMeta {
  const normalized = category.trim().toLowerCase();
  const match = CATEGORIES.find(
    (item) => item.slug === normalized || item.label.toLowerCase() === normalized
  );
  if (match) {
    return lang === "en" ? { ...match, label: match.labelEn } : match;
  }
  // AI-assigned freeform categories (e.g. "kahve buluşması") don't map to a
  // known slug -- fall back to the generic icon/gradient but keep showing
  // the AI's actual label instead of silently replacing it with "Diğer".
  const freeformLabel = category.trim()
    ? category.trim().charAt(0).toUpperCase() + category.trim().slice(1)
    : OTHER_CATEGORY.label;
  return { ...OTHER_CATEGORY, label: freeformLabel, labelEn: freeformLabel };
}

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
}

const OTHER_CATEGORY: CategoryMeta = {
  slug: "other",
  label: "Diğer",
  labelEn: "Other",
  icon: "grid",
  gradient: ["#B8AEE8", "#6C4CF1"],
  defaultImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
};

export const CATEGORIES: CategoryMeta[] = [
  { slug: "running", label: "Koşu", labelEn: "Running", icon: "wind", gradient: ["#FFB199", "#FF6A6A"], defaultImage: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop" },
  { slug: "coffee", label: "Kahve", labelEn: "Coffee & Chat", icon: "coffee", gradient: ["#D8B48C", "#8B5E3C"], defaultImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop" },
  { slug: "concert", label: "Konser", labelEn: "Concerts", icon: "music", gradient: ["#B892FF", "#6C4CF1"], defaultImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop" },
  { slug: "festival", label: "Festival", labelEn: "Festivals", icon: "disc", gradient: ["#FF758C", "#FF7EB3"], defaultImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop" },
  { slug: "climbing", label: "Tırmanış", labelEn: "Climbing", icon: "trending-up", gradient: ["#7EE8C6", "#2FA88B"], defaultImage: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop" },
  { slug: "hiking", label: "Doğa Yürüyüşü", labelEn: "Hiking", icon: "map", gradient: ["#9CD98A", "#3F8F4A"], defaultImage: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop" },
  { slug: "cycling", label: "Bisiklet", labelEn: "Cycling", icon: "navigation", gradient: ["#7FC8F8", "#2E7FC9"], defaultImage: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop" },
  { slug: "yoga", label: "Yoga", labelEn: "Yoga", icon: "sun", gradient: ["#FFD08A", "#FF9F5A"], defaultImage: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop" },
  { slug: "boardgames", label: "Kutu Oyunu", labelEn: "Board Games", icon: "square", gradient: ["#F7A6C4", "#D9427F"], defaultImage: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop" },
  { slug: "football", label: "Futbol", labelEn: "Football", icon: "circle", gradient: ["#8FE28C", "#2F9E4F"], defaultImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop" },
  { slug: "party", label: "Parti", labelEn: "Party", icon: "star", gradient: ["#FFC93C", "#FF8A3C"], defaultImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop" },
  { slug: "theatre", label: "Tiyatro & Gösteri", labelEn: "Theatre & Show", icon: "video", gradient: ["#C9A0DC", "#7B4397"], defaultImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop" },
  { slug: "art", label: "Sanat & Kültür", labelEn: "Art & Culture", icon: "image", gradient: ["#FFB6C1", "#E0607E"], defaultImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop" },
  { slug: "workshop", label: "Atölye", labelEn: "Workshop", icon: "tool", gradient: ["#F6C177", "#D98324"], defaultImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop" },
  { slug: "hobby", label: "Hobi & Yaşam", labelEn: "Hobby & Lifestyle", icon: "smile", gradient: ["#A8DADC", "#457B9D"], defaultImage: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop" },
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

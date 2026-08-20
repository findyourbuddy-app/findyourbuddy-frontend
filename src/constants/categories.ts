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
}

const OTHER_CATEGORY: CategoryMeta = {
  slug: "other",
  label: "Diğer",
  labelEn: "Other",
  icon: "grid",
  gradient: ["#B8AEE8", "#6C4CF1"],
};

export const CATEGORIES: CategoryMeta[] = [
  { slug: "running", label: "Koşu", labelEn: "Running", icon: "wind", gradient: ["#FFB199", "#FF6A6A"] },
  { slug: "coffee", label: "Kahve", labelEn: "Coffee & Chat", icon: "coffee", gradient: ["#D8B48C", "#8B5E3C"] },
  { slug: "concert", label: "Konser", labelEn: "Concerts", icon: "music", gradient: ["#B892FF", "#6C4CF1"] },
  { slug: "festival", label: "Festival", labelEn: "Festivals", icon: "disc", gradient: ["#FF758C", "#FF7EB3"] },
  { slug: "climbing", label: "Tırmanış", labelEn: "Climbing", icon: "trending-up", gradient: ["#7EE8C6", "#2FA88B"] },
  { slug: "hiking", label: "Doğa Yürüyüşü", labelEn: "Hiking", icon: "map", gradient: ["#9CD98A", "#3F8F4A"] },
  { slug: "cycling", label: "Bisiklet", labelEn: "Cycling", icon: "navigation", gradient: ["#7FC8F8", "#2E7FC9"] },
  { slug: "yoga", label: "Yoga", labelEn: "Yoga", icon: "sun", gradient: ["#FFD08A", "#FF9F5A"] },
  { slug: "boardgames", label: "Kutu Oyunu", labelEn: "Board Games", icon: "square", gradient: ["#F7A6C4", "#D9427F"] },
  { slug: "football", label: "Futbol", labelEn: "Football", icon: "circle", gradient: ["#8FE28C", "#2F9E4F"] },
  { slug: "party", label: "Parti", labelEn: "Party", icon: "star", gradient: ["#FFC93C", "#FF8A3C"] },
  { slug: "theatre", label: "Tiyatro & Gösteri", labelEn: "Theatre & Show", icon: "video", gradient: ["#C9A0DC", "#7B4397"] },
  { slug: "art", label: "Sanat & Kültür", labelEn: "Art & Culture", icon: "image", gradient: ["#FFB6C1", "#E0607E"] },
  { slug: "workshop", label: "Atölye", labelEn: "Workshop", icon: "tool", gradient: ["#F6C177", "#D98324"] },
  { slug: "hobby", label: "Hobi & Yaşam", labelEn: "Hobby & Lifestyle", icon: "smile", gradient: ["#A8DADC", "#457B9D"] },
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

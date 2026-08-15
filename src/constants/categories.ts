import type { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];

export interface CategoryMeta {
  slug: string;
  label: string;
  icon: FeatherIconName;
  gradient: [string, string];
}

const OTHER_CATEGORY: CategoryMeta = {
  slug: "other",
  label: "Diğer",
  icon: "grid",
  gradient: ["#B8AEE8", "#6C4CF1"],
};

export const CATEGORIES: CategoryMeta[] = [
  { slug: "running", label: "Koşu", icon: "wind", gradient: ["#FFB199", "#FF6A6A"] },
  { slug: "coffee", label: "Kahve", icon: "coffee", gradient: ["#D8B48C", "#8B5E3C"] },
  { slug: "concert", label: "Konser", icon: "music", gradient: ["#B892FF", "#6C4CF1"] },
  { slug: "climbing", label: "Tırmanış", icon: "trending-up", gradient: ["#7EE8C6", "#2FA88B"] },
  { slug: "hiking", label: "Doğa Yürüyüşü", icon: "map", gradient: ["#9CD98A", "#3F8F4A"] },
  { slug: "cycling", label: "Bisiklet", icon: "navigation", gradient: ["#7FC8F8", "#2E7FC9"] },
  { slug: "yoga", label: "Yoga", icon: "sun", gradient: ["#FFD08A", "#FF9F5A"] },
  { slug: "boardgames", label: "Kutu Oyunu", icon: "square", gradient: ["#F7A6C4", "#D9427F"] },
  { slug: "football", label: "Futbol", icon: "circle", gradient: ["#8FE28C", "#2F9E4F"] },
  { slug: "party", label: "Parti", icon: "star", gradient: ["#FFC93C", "#FF8A3C"] },
  { slug: "theatre", label: "Tiyatro & Gösteri", icon: "video", gradient: ["#C9A0DC", "#7B4397"] },
  { slug: "art", label: "Sanat & Kültür", icon: "image", gradient: ["#FFB6C1", "#E0607E"] },
  { slug: "workshop", label: "Atölye", icon: "tool", gradient: ["#F6C177", "#D98324"] },
  { slug: "hobby", label: "Hobi & Yaşam Tarzı", icon: "smile", gradient: ["#A8DADC", "#457B9D"] },
  OTHER_CATEGORY,
];

export function getCategoryMeta(category: string): CategoryMeta {
  const normalized = category.trim().toLowerCase();
  const match = CATEGORIES.find(
    (item) => item.slug === normalized || item.label.toLowerCase() === normalized
  );
  return match ?? OTHER_CATEGORY;
}

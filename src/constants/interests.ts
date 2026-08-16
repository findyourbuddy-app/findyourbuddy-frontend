import type { LanguageKey } from "../context/ThemeContext";

export interface InterestMeta {
  slug: string;
  label: string;
  labelEn: string;
}

export const INTERESTS: InterestMeta[] = [
  { slug: "running", label: "Koşu", labelEn: "Running" },
  { slug: "coffee", label: "Kahve", labelEn: "Coffee" },
  { slug: "concert", label: "Konser", labelEn: "Concerts" },
  { slug: "climbing", label: "Tırmanış", labelEn: "Climbing" },
  { slug: "hiking", label: "Doğa Yürüyüşü", labelEn: "Hiking" },
  { slug: "cycling", label: "Bisiklet", labelEn: "Cycling" },
  { slug: "yoga", label: "Yoga", labelEn: "Yoga" },
  { slug: "boardgames", label: "Kutu Oyunu", labelEn: "Board Games" },
  { slug: "football", label: "Futbol", labelEn: "Football" },
  { slug: "photography", label: "Fotoğraf", labelEn: "Photography" },
  { slug: "live-music", label: "Canlı Müzik", labelEn: "Live Music" },
  { slug: "reading", label: "Kitap", labelEn: "Reading" },
  { slug: "cooking", label: "Yemek Yapmak", labelEn: "Cooking" },
  { slug: "travel", label: "Seyahat", labelEn: "Travel" },
  { slug: "gaming", label: "Oyun", labelEn: "Gaming" },
  { slug: "art", label: "Sanat", labelEn: "Art" },
];

export function getInterestLabel(slug: string, lang: LanguageKey = "tr"): string {
  const item = INTERESTS.find((interest) => interest.slug === slug);
  if (!item) return slug;
  return lang === "en" ? item.labelEn : item.label;
}

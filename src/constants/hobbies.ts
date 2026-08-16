import type { LanguageKey } from "../context/ThemeContext";

export interface HobbyMeta {
  slug: string;
  label: string;
  labelEn: string;
  icon?: string;
}

export const HOBBIES: HobbyMeta[] = [
  { slug: "bodybuilding", label: "Vücut Geliştirme", labelEn: "Bodybuilding" },
  { slug: "tennis", label: "Tenis", labelEn: "Tennis" },
  { slug: "swimming", label: "Yüzme", labelEn: "Swimming" },
  { slug: "cycling", label: "Bisiklet", labelEn: "Cycling" },
  { slug: "yoga-pilates", label: "Yoga & Pilates", labelEn: "Yoga & Pilates" },
  { slug: "reading", label: "Kitap Okuma", labelEn: "Reading" },
  { slug: "photography", label: "Fotoğrafçılık", labelEn: "Photography" },
  { slug: "boardgames", label: "Kutu Oyunları", labelEn: "Board Games" },
  { slug: "chess", label: "Satranç", labelEn: "Chess" },
  { slug: "dancing", label: "Dans", labelEn: "Dancing" },
  { slug: "cooking", label: "Yemek Pişirme", labelEn: "Cooking" },
  { slug: "music", label: "Müzik & Enstrüman", labelEn: "Music & Instruments" },
  { slug: "hiking", label: "Doğa Yürüyüşü", labelEn: "Hiking" },
  { slug: "gaming", label: "Oyun / Gaming", labelEn: "Gaming" },
  { slug: "cinema", label: "Sinema & Tiyatro", labelEn: "Cinema & Theatre" },
  { slug: "art", label: "Sanat & Resim", labelEn: "Art & Painting" },
  { slug: "tech", label: "Kodlama & Teknoloji", labelEn: "Tech & Coding" },
  { slug: "boxing", label: "Dövüş Sporları", labelEn: "Martial Arts" },
];

export const MAX_HOBBIES_SELECTION = 4;

export function getHobbyLabel(slug: string, lang: LanguageKey = "tr"): string {
  const item = HOBBIES.find((hobby) => hobby.slug === slug);
  if (!item) return slug;
  return lang === "en" ? item.labelEn : item.label;
}

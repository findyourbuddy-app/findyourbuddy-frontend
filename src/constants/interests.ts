export interface InterestMeta {
  slug: string;
  label: string;
}

export const INTERESTS: InterestMeta[] = [
  { slug: "running", label: "Koşu" },
  { slug: "coffee", label: "Kahve" },
  { slug: "concert", label: "Konser" },
  { slug: "climbing", label: "Tırmanış" },
  { slug: "hiking", label: "Doğa Yürüyüşü" },
  { slug: "cycling", label: "Bisiklet" },
  { slug: "yoga", label: "Yoga" },
  { slug: "boardgames", label: "Kutu Oyunu" },
  { slug: "football", label: "Futbol" },
  { slug: "photography", label: "Fotoğraf" },
  { slug: "live-music", label: "Canlı Müzik" },
  { slug: "reading", label: "Kitap" },
  { slug: "cooking", label: "Yemek Yapmak" },
  { slug: "travel", label: "Seyahat" },
  { slug: "gaming", label: "Oyun" },
  { slug: "art", label: "Sanat" },
];

export function getInterestLabel(slug: string): string {
  return INTERESTS.find((interest) => interest.slug === slug)?.label ?? slug;
}

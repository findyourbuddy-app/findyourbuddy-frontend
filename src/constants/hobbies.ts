export interface HobbyMeta {
  slug: string;
  label: string;
  icon?: string;
}

export const HOBBIES: HobbyMeta[] = [
  { slug: "bodybuilding", label: "Vücut Geliştirme" },
  { slug: "tennis", label: "Tenis" },
  { slug: "swimming", label: "Yüzme" },
  { slug: "cycling", label: "Bisiklet" },
  { slug: "yoga-pilates", label: "Yoga & Pilates" },
  { slug: "reading", label: "Kitap Okuma" },
  { slug: "photography", label: "Fotoğrafçılık" },
  { slug: "boardgames", label: "Kutu Oyunları" },
  { slug: "chess", label: "Satranç" },
  { slug: "dancing", label: "Dans" },
  { slug: "cooking", label: "Yemek Pişirme" },
  { slug: "music", label: "Müzik & Enstrüman" },
  { slug: "hiking", label: "Doğa Yürüyüşü" },
  { slug: "gaming", label: "Oyun / Gaming" },
  { slug: "cinema", label: "Sinema & Tiyatro" },
  { slug: "art", label: "Sanat & Resim" },
  { slug: "tech", label: "Kodlama & Teknoloji" },
  { slug: "boxing", label: "Dövüş Sporları" },
];

export const MAX_HOBBIES_SELECTION = 4;

export function getHobbyLabel(slug: string): string {
  return HOBBIES.find((hobby) => hobby.slug === slug)?.label ?? slug;
}

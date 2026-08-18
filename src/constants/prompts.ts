export interface PromptSuggestion {
  id: string;
  questionTr: string;
  questionEn: string;
  placeholderTr: string;
  placeholderEn: string;
}

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "perfect_sunday",
    questionTr: "Mükemmel bir Pazar günüm...",
    questionEn: "My perfect Sunday looks like...",
    placeholderTr: "Sabah kahvesi, güzel bir yürüyüş ve akşam sineması.",
    placeholderEn: "Morning coffee, a nice walk and evening movie.",
  },
  {
    id: "ideal_buddy",
    questionTr: "Aradığım en ideal kanka...",
    questionEn: "My ideal buddy is someone who...",
    placeholderTr: "Yeni mekanlar keşfetmeyi seven ve spontane planlara açık olan.",
    placeholderEn: "Loves discovering new spots and open to spontaneous plans.",
  },
  {
    id: "bucket_list",
    questionTr: "Birlikte yapabileceğimiz en harika aktivite...",
    questionEn: "The coolest activity we could do together...",
    placeholderTr: "Hafta sonu doğa kampı yapmak veya canlı konsere gitmek.",
    placeholderEn: "Weekend camping or going to a live concert.",
  },
  {
    id: "secret_talent",
    questionTr: "Bilinmeyen yeteneğim...",
    questionEn: "My secret talent...",
    placeholderTr: "Şehirdeki en iyi kahvecileri ve gizli mekanları bilmek.",
    placeholderEn: "Knowing the best coffee shops and hidden gems in town.",
  },
  {
    id: "smile_trigger",
    questionTr: "Beni en çok mutlu eden küçük şey...",
    questionEn: "The simple thing that makes me happiest...",
    placeholderTr: "Taze demlenmiş filtre kahve kokusu ve gün batımı manzarası.",
    placeholderEn: "Smell of fresh brewed coffee and sunset views.",
  },
];

export const BIO_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "bio_explorer",
    questionTr: "Gezgin & Sosyal",
    questionEn: "Explorer & Social",
    placeholderTr: "Yeni şehirler keşfetmeyi, kahve sohbetlerini ve spontane arkadaş ortamlarını severim.",
    placeholderEn: "I love discovering new cities, coffee talks, and spontaneous social plans.",
  },
  {
    id: "bio_sports",
    questionTr: "Spor & Doğa Tutkunu",
    questionEn: "Sports & Outdoor Enthusiast",
    placeholderTr: "Sabah koşuları, doğa yürüyüşleri ve aktif yaşam tarzı benim tutkum. Spor kankaları arıyorum.",
    placeholderEn: "Morning runs, hiking, and active lifestyle are my passion. Looking for sports buddies.",
  },
  {
    id: "bio_art",
    questionTr: "Sanat & Müzik Sever",
    questionEn: "Art & Music Lover",
    placeholderTr: "Konserlere, sergilere gitmekten ve sanatsal sohbetlerden keyif alırım.",
    placeholderEn: "Enjoy going to concerts, art exhibitions, and having creative discussions.",
  },
  {
    id: "bio_gamer",
    questionTr: "Oyun & Teknoloji",
    questionEn: "Gaming & Tech",
    placeholderTr: "Online ve co-op oyun oynamayı, teknolojik gelişmeleri takip etmeyi severim.",
    placeholderEn: "Love playing online and co-op games, staying up to date with tech trends.",
  },
];

export interface LanguageOption {
  code: string;
  flag: string;
  label: string;
  labelEn: string;
}

export const LANGUAGES_LIST: LanguageOption[] = [
  { code: "tr", flag: "🇹🇷", label: "Türkçe", labelEn: "Turkish" },
  { code: "en", flag: "🇬🇧", label: "İngilizce", labelEn: "English" },
  { code: "de", flag: "🇩🇪", label: "Almanca", labelEn: "German" },
  { code: "fr", flag: "🇫🇷", label: "Fransızca", labelEn: "French" },
  { code: "es", flag: "🇪🇸", label: "İspanyolca", labelEn: "Spanish" },
  { code: "it", flag: "🇮🇹", label: "İtalyanca", labelEn: "Italian" },
  { code: "ru", flag: "🇷🇺", label: "Rusça", labelEn: "Russian" },
  { code: "ar", flag: "🇸🇦", label: "Arapça", labelEn: "Arabic" },
  { code: "zh", flag: "🇨🇳", label: "Çince", labelEn: "Chinese" },
  { code: "ja", flag: "🇯🇵", label: "Japonca", labelEn: "Japanese" },
  { code: "ko", flag: "🇰🇷", label: "Korece", labelEn: "Korean" },
  { code: "pt", flag: "🇵🇹", label: "Portekizce", labelEn: "Portuguese" },
  { code: "sign", flag: "🤟", label: "İşaret Dili", labelEn: "Sign Language" },
];

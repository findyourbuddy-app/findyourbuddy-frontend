import { type LocalizedLabel } from "../constants/localized";
import type { User } from "../types";

export type FieldKey =
  | "photo"
  | "gallery"
  | "name"
  | "bio"
  | "prompt"
  | "hobbies"
  | "interests"
  | "looking_for"
  | "height"
  | "languages"
  | "occupation"
  | "zodiac"
  | "worldview";

const FIELD_LABELS: Record<Exclude<FieldKey, "looking_for">, LocalizedLabel> = {
  photo: { tr: "Profil Fotoğrafı", en: "Profile Photo", de: "Profilfoto", es: "Foto de perfil", fr: "Photo de profil", it: "Foto del profilo", ru: "Фото профиля", ar: "صورة الملف الشخصي" },
  gallery: { tr: "Galeri Fotoğrafları", en: "Gallery Photos", de: "Galeriefotos", es: "Fotos de galería", fr: "Photos de la galerie", it: "Foto della galleria", ru: "Фото галереи", ar: "صور المعرض" },
  name: { tr: "Görünen İsim", en: "Display Name", de: "Anzeigename", es: "Nombre visible", fr: "Nom affiché", it: "Nome visualizzato", ru: "Отображаемое имя", ar: "الاسم المعروض" },
  bio: { tr: "Biyografi", en: "Bio", de: "Bio", es: "Biografía", fr: "Bio", it: "Bio", ru: "Биография", ar: "نبذة" },
  prompt: { tr: "Hakkımda Sorusu", en: "About Me Prompt", de: "Über-mich-Frage", es: "Pregunta \"Sobre mí\"", fr: "Question « À propos de moi »", it: "Domanda \"Su di me\"", ru: "Вопрос «Обо мне»", ar: "سؤال «نبذة عني»" },
  hobbies: { tr: "Hobiler", en: "Hobbies", de: "Hobbys", es: "Aficiones", fr: "Loisirs", it: "Hobby", ru: "Хобби", ar: "الهوايات" },
  interests: { tr: "İlgi Alanları", en: "Interests", de: "Interessen", es: "Intereses", fr: "Centres d'intérêt", it: "Interessi", ru: "Интересы", ar: "الاهتمامات" },
  height: { tr: "Boy Bilgisi", en: "Height", de: "Größe", es: "Altura", fr: "Taille", it: "Altezza", ru: "Рост", ar: "الطول" },
  languages: { tr: "Konuşulan Diller", en: "Languages Spoken", de: "Gesprochene Sprachen", es: "Idiomas que hablas", fr: "Langues parlées", it: "Lingue parlate", ru: "Языки, которыми владеете", ar: "اللغات المحكية" },
  occupation: { tr: "Meslek / Okul", en: "Occupation / School", de: "Beruf / Schule", es: "Ocupación / centro de estudios", fr: "Profession / établissement", it: "Occupazione / scuola", ru: "Профессия / учебное заведение", ar: "المهنة / المدرسة" },
  zodiac: { tr: "Burç Bilgisi", en: "Zodiac Sign", de: "Sternzeichen", es: "Signo del zodiaco", fr: "Signe du zodiaque", it: "Segno zodiacale", ru: "Знак зодиака", ar: "البرج" },
  worldview: { tr: "Dünya Görüşü & İnanç", en: "Worldview & Beliefs", de: "Weltbild & Überzeugungen", es: "Cosmovisión y creencias", fr: "Vision du monde et croyances", it: "Visione del mondo e credenze", ru: "Мировоззрение и убеждения", ar: "النظرة إلى العالم والمعتقدات" },
};

export interface MissingFieldItem {
  key: FieldKey;
  label: LocalizedLabel;
}

export interface CompletionResult {
  percentage: number;
  missingItems: MissingFieldItem[];
  missingFieldsTr: string[];
  missingFieldsEn: string[];
}

export function calculateProfileCompletion(user: User | null): CompletionResult {
  if (!user) {
    return { percentage: 0, missingItems: [], missingFieldsTr: [], missingFieldsEn: [] };
  }

  let score = 0;
  const missingItems: MissingFieldItem[] = [];

  const addMissing = (key: Exclude<FieldKey, "looking_for">) => {
    missingItems.push({ key, label: FIELD_LABELS[key] });
  };

  // 1. Profil Fotoğrafı (%15)
  if (user.photo_url) score += 15;
  else addMissing("photo");

  // 2. Galeri Fotoğrafları (%10)
  if (user.photos && user.photos.length > 0) score += 10;
  else addMissing("gallery");

  // 3. İsim (%10)
  if (user.display_name && user.display_name.trim().length > 0) score += 10;
  else addMissing("name");

  // 4. Biyografi (%10)
  if (user.bio && user.bio.trim().length > 0) score += 10;
  else addMissing("bio");

  // 5. Hakkımda Sorusu / Prompt (%10)
  if (user.about_me_prompt && user.about_me_prompt.trim().length > 0) score += 10;
  else addMissing("prompt");

  // 6. Hobiler (%10)
  if (user.hobbies && user.hobbies.length > 0) score += 10;
  else addMissing("hobbies");

  // 7. İlgi Alanları (%5)
  if (user.interests && user.interests.length > 0) score += 5;
  else addMissing("interests");

  // 8. Boy (%5)
  if (user.height && user.height > 0) score += 5;
  else addMissing("height");

  // 9. Konuşulan Diller (%5)
  if (user.languages_spoken && user.languages_spoken.length > 0) score += 5;
  else addMissing("languages");

  // 10. Meslek, Üniversite veya Sınıf/Mezuniyet (%5)
  if (
    (user.occupation && user.occupation.trim()) ||
    (user.university && user.university.trim()) ||
    (user.class_year && user.class_year.trim())
  ) {
    score += 5;
  } else {
    addMissing("occupation");
  }

  // 11. Burç (%5)
  if (user.zodiac_sign && user.zodiac_sign.trim()) score += 5;
  else addMissing("zodiac");

  // 12. Sesli Tanıtım veya Dünya Görüşü (%10)
  if (user.voice_note_url || user.political_views || user.beliefs) score += 10;
  else addMissing("worldview");

  return {
    percentage: Math.min(100, score),
    missingItems,
    missingFieldsTr: missingItems.map((item) => item.label.tr),
    missingFieldsEn: missingItems.map((item) => item.label.en),
  };
}

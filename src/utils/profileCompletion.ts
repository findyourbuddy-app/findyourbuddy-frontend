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

export interface MissingFieldItem {
  key: FieldKey;
  labelTr: string;
  labelEn: string;
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
  const missingTr: string[] = [];
  const missingEn: string[] = [];

  // 1. Profil Fotoğrafı (%15)
  if (user.photo_url) {
    score += 15;
  } else {
    missingItems.push({ key: "photo", labelTr: "Profil Fotoğrafı", labelEn: "Profile Photo" });
    missingTr.push("Profil Fotoğrafı");
    missingEn.push("Profile Photo");
  }

  // 2. Galeri Fotoğrafları (%10)
  if (user.photos && user.photos.length > 0) {
    score += 10;
  } else {
    missingItems.push({ key: "gallery", labelTr: "Galeri Fotoğrafları", labelEn: "Gallery Photos" });
    missingTr.push("Galeri Fotoğrafları");
    missingEn.push("Gallery Photos");
  }

  // 3. İsim (%10)
  if (user.display_name && user.display_name.trim().length > 0) {
    score += 10;
  } else {
    missingItems.push({ key: "name", labelTr: "Görünen İsim", labelEn: "Display Name" });
    missingTr.push("Görünen İsim");
    missingEn.push("Display Name");
  }

  // 4. Biyografi (%10)
  if (user.bio && user.bio.trim().length > 0) {
    score += 10;
  } else {
    missingItems.push({ key: "bio", labelTr: "Biyografi", labelEn: "Bio" });
    missingTr.push("Biyografi");
    missingEn.push("Bio");
  }

  // 5. Hakkımda Sorusu / Prompt (%10)
  if (user.about_me_prompt && user.about_me_prompt.trim().length > 0) {
    score += 10;
  } else {
    missingItems.push({ key: "prompt", labelTr: "Hakkımda Sorusu", labelEn: "About Me Prompt" });
    missingTr.push("Hakkımda Sorusu");
    missingEn.push("About Me Prompt");
  }

  // 6. Hobiler (%10)
  if (user.hobbies && user.hobbies.length > 0) {
    score += 10;
  } else {
    missingItems.push({ key: "hobbies", labelTr: "Hobiler", labelEn: "Hobbies" });
    missingTr.push("Hobiler");
    missingEn.push("Hobbies");
  }

  // 7. İlgi Alanları (%5)
  if (user.interests && user.interests.length > 0) {
    score += 5;
  } else {
    missingItems.push({ key: "interests", labelTr: "İlgi Alanları", labelEn: "Interests" });
    missingTr.push("İlgi Alanları");
    missingEn.push("Interests");
  }

  // 8. Boy (%5)
  if (user.height && user.height > 0) {
    score += 5;
  } else {
    missingItems.push({ key: "height", labelTr: "Boy Bilgisi", labelEn: "Height" });
    missingTr.push("Boy Bilgisi");
    missingEn.push("Height");
  }

  // 9. Konuşulan Diller (%5)
  if (user.languages_spoken && user.languages_spoken.length > 0) {
    score += 5;
  } else {
    missingItems.push({ key: "languages", labelTr: "Konuşulan Diller", labelEn: "Languages Spoken" });
    missingTr.push("Konuşulan Diller");
    missingEn.push("Languages Spoken");
  }

  // 10. Meslek, Üniversite veya Sınıf/Mezuniyet (%5)
  if (
    (user.occupation && user.occupation.trim()) ||
    (user.university && user.university.trim()) ||
    (user.class_year && user.class_year.trim())
  ) {
    score += 5;
  } else {
    missingItems.push({ key: "occupation", labelTr: "Meslek / Okul", labelEn: "Occupation / School" });
    missingTr.push("Meslek / Okul");
    missingEn.push("Occupation / School");
  }

  // 11. Burç (%5)
  if (user.zodiac_sign && user.zodiac_sign.trim()) {
    score += 5;
  } else {
    missingItems.push({ key: "zodiac", labelTr: "Burç Bilgisi", labelEn: "Zodiac Sign" });
    missingTr.push("Burç Bilgisi");
    missingEn.push("Zodiac Sign");
  }

  // 12. Sesli Tanıtım veya Dünya Görüşü (%10)
  if (user.voice_note_url || user.political_views || user.beliefs) {
    score += 10;
  } else {
    missingItems.push({ key: "worldview", labelTr: "Dünya Görüşü & İnanç", labelEn: "Worldview & Beliefs" });
    missingTr.push("Dünya Görüşü & İnanç");
    missingEn.push("Worldview & Beliefs");
  }

  return {
    percentage: Math.min(100, score),
    missingItems,
    missingFieldsTr: missingTr,
    missingFieldsEn: missingEn,
  };
}

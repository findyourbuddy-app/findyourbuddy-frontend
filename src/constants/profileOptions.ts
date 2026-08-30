import type { LanguageKey } from "../context/ThemeContext";
import { pickLabel, type LocalizedLabel } from "./localized";

/**
 * Profile picker options. `key` is the value persisted to the backend
 * (kept in Turkish for backwards compatibility) and MUST NOT change;
 * `labels` carries the display text for every supported locale.
 *
 * These lists were duplicated inline across EditProfileScreen,
 * OnboardingScreen and QuickFieldEditModal -- centralised here so a
 * language switch translates them everywhere.
 */
export interface ProfileOption {
  key: string;
  labels: LocalizedLabel;
}

/** Resolve a stored option value to its label in `lang`, echoing the raw value if unknown. */
export function optionLabel(
  options: ProfileOption[],
  value: string | null | undefined,
  lang: LanguageKey
): string {
  if (!value) return "";
  const match = options.find((option) => option.key === value);
  return match ? pickLabel(match.labels, lang) : value;
}

const PREFER_NOT_TO_SAY: LocalizedLabel = {
  tr: "Belirtmek İstemiyorum",
  en: "Prefer not to say",
  de: "Keine Angabe",
  es: "Prefiero no decirlo",
  fr: "Je préfère ne pas le dire",
  it: "Preferisco non dirlo",
  ru: "Предпочитаю не указывать",
  ar: "أفضّل عدم الإفصاح",
};

export const ZODIAC_OPTIONS: ProfileOption[] = [
  { key: "Koç", labels: { tr: "Koç", en: "Aries", de: "Widder", es: "Aries", fr: "Bélier", it: "Ariete", ru: "Овен", ar: "الحمل" } },
  { key: "Boğa", labels: { tr: "Boğa", en: "Taurus", de: "Stier", es: "Tauro", fr: "Taureau", it: "Toro", ru: "Телец", ar: "الثور" } },
  { key: "İkizler", labels: { tr: "İkizler", en: "Gemini", de: "Zwillinge", es: "Géminis", fr: "Gémeaux", it: "Gemelli", ru: "Близнецы", ar: "الجوزاء" } },
  { key: "Yengeç", labels: { tr: "Yengeç", en: "Cancer", de: "Krebs", es: "Cáncer", fr: "Cancer", it: "Cancro", ru: "Рак", ar: "السرطان" } },
  { key: "Aslan", labels: { tr: "Aslan", en: "Leo", de: "Löwe", es: "Leo", fr: "Lion", it: "Leone", ru: "Лев", ar: "الأسد" } },
  { key: "Başak", labels: { tr: "Başak", en: "Virgo", de: "Jungfrau", es: "Virgo", fr: "Vierge", it: "Vergine", ru: "Дева", ar: "العذراء" } },
  { key: "Terazi", labels: { tr: "Terazi", en: "Libra", de: "Waage", es: "Libra", fr: "Balance", it: "Bilancia", ru: "Весы", ar: "الميزان" } },
  { key: "Akrep", labels: { tr: "Akrep", en: "Scorpio", de: "Skorpion", es: "Escorpio", fr: "Scorpion", it: "Scorpione", ru: "Скорпион", ar: "العقرب" } },
  { key: "Yay", labels: { tr: "Yay", en: "Sagittarius", de: "Schütze", es: "Sagitario", fr: "Sagittaire", it: "Sagittario", ru: "Стрелец", ar: "القوس" } },
  { key: "Oğlak", labels: { tr: "Oğlak", en: "Capricorn", de: "Steinbock", es: "Capricornio", fr: "Capricorne", it: "Capricorno", ru: "Козерог", ar: "الجدي" } },
  { key: "Kova", labels: { tr: "Kova", en: "Aquarius", de: "Wassermann", es: "Acuario", fr: "Verseau", it: "Acquario", ru: "Водолей", ar: "الدلو" } },
  { key: "Balık", labels: { tr: "Balık", en: "Pisces", de: "Fische", es: "Piscis", fr: "Poissons", it: "Pesci", ru: "Рыбы", ar: "الحوت" } },
];

export const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

/** Localised zodiac label with its glyph, e.g. "Widder ♈". Echoes an unknown key. */
export function zodiacDisplayLabel(key: string | null | undefined, lang: LanguageKey): string {
  if (!key) return "";
  const index = ZODIAC_OPTIONS.findIndex((option) => option.key === key);
  if (index === -1) return key;
  return `${pickLabel(ZODIAC_OPTIONS[index].labels, lang)} ${ZODIAC_GLYPHS[index]}`;
}

export const GENDER_OPTIONS: ProfileOption[] = [
  { key: "Kadın", labels: { tr: "Kadın", en: "Female", de: "Weiblich", es: "Mujer", fr: "Femme", it: "Donna", ru: "Женский", ar: "أنثى" } },
  { key: "Erkek", labels: { tr: "Erkek", en: "Male", de: "Männlich", es: "Hombre", fr: "Homme", it: "Uomo", ru: "Мужской", ar: "ذكر" } },
  { key: "Diğer", labels: { tr: "Diğer", en: "Other", de: "Divers", es: "Otro", fr: "Autre", it: "Altro", ru: "Другое", ar: "آخر" } },
  { key: "Belirtmek İstemiyorum", labels: PREFER_NOT_TO_SAY },
];

export const CLASS_YEAR_OPTIONS: ProfileOption[] = [
  { key: "Hazırlık", labels: { tr: "Hazırlık", en: "Prep Year", de: "Vorbereitungsjahr", es: "Año preparatorio", fr: "Année préparatoire", it: "Anno preparatorio", ru: "Подготовительный год", ar: "السنة التحضيرية" } },
  { key: "1. Sınıf", labels: { tr: "1. Sınıf", en: "1st Year", de: "1. Jahr", es: "1.º año", fr: "1re année", it: "1º anno", ru: "1-й курс", ar: "السنة الأولى" } },
  { key: "2. Sınıf", labels: { tr: "2. Sınıf", en: "2nd Year", de: "2. Jahr", es: "2.º año", fr: "2e année", it: "2º anno", ru: "2-й курс", ar: "السنة الثانية" } },
  { key: "3. Sınıf", labels: { tr: "3. Sınıf", en: "3rd Year", de: "3. Jahr", es: "3.er año", fr: "3e année", it: "3º anno", ru: "3-й курс", ar: "السنة الثالثة" } },
  { key: "4. Sınıf", labels: { tr: "4. Sınıf", en: "4th Year", de: "4. Jahr", es: "4.º año", fr: "4e année", it: "4º anno", ru: "4-й курс", ar: "السنة الرابعة" } },
  { key: "Yüksek Lisans", labels: { tr: "Yüksek Lisans", en: "Master's", de: "Master", es: "Máster", fr: "Master", it: "Magistrale", ru: "Магистратура", ar: "ماجستير" } },
  { key: "Doktora", labels: { tr: "Doktora", en: "PhD", de: "Doktor", es: "Doctorado", fr: "Doctorat", it: "Dottorato", ru: "Аспирантура", ar: "دكتوراه" } },
  { key: "Mezun", labels: { tr: "Mezun", en: "Graduate", de: "Absolvent", es: "Graduado", fr: "Diplômé", it: "Laureato", ru: "Выпускник", ar: "خريج" } },
];

export const POLITICAL_OPTIONS: ProfileOption[] = [
  { key: "Apolitik / Nötr", labels: { tr: "Apolitik / Nötr", en: "Apolitical / Neutral", de: "Unpolitisch / Neutral", es: "Apolítico / Neutral", fr: "Apolitique / Neutre", it: "Apolitico / Neutrale", ru: "Аполитичный / Нейтральный", ar: "غير سياسي / محايد" } },
  { key: "Sosyal Demokrat", labels: { tr: "Sosyal Demokrat", en: "Social Democrat", de: "Sozialdemokratisch", es: "Socialdemócrata", fr: "Social-démocrate", it: "Socialdemocratico", ru: "Социал-демократ", ar: "اشتراكي ديمقراطي" } },
  { key: "Liberal", labels: { tr: "Liberal", en: "Liberal", de: "Liberal", es: "Liberal", fr: "Libéral", it: "Liberale", ru: "Либерал", ar: "ليبرالي" } },
  { key: "Muhafazakar", labels: { tr: "Muhafazakar", en: "Conservative", de: "Konservativ", es: "Conservador", fr: "Conservateur", it: "Conservatore", ru: "Консерватор", ar: "محافظ" } },
  { key: "Milliyetçi", labels: { tr: "Milliyetçi", en: "Nationalist", de: "Nationalistisch", es: "Nacionalista", fr: "Nationaliste", it: "Nazionalista", ru: "Националист", ar: "قومي" } },
  { key: "Sol / İlerici", labels: { tr: "Sol / İlerici", en: "Progressive / Left", de: "Progressiv / Links", es: "Progresista / Izquierda", fr: "Progressiste / Gauche", it: "Progressista / Sinistra", ru: "Прогрессивный / Левый", ar: "تقدمي / يساري" } },
  { key: "Belirtmek İstemiyorum", labels: PREFER_NOT_TO_SAY },
];

export const BELIEF_OPTIONS: ProfileOption[] = [
  { key: "Deist", labels: { tr: "Deist", en: "Deist", de: "Deist", es: "Deísta", fr: "Déiste", it: "Deista", ru: "Деист", ar: "ربوبي" } },
  { key: "Müslüman", labels: { tr: "Müslüman", en: "Muslim", de: "Muslim", es: "Musulmán", fr: "Musulman", it: "Musulmano", ru: "Мусульманин", ar: "مسلم" } },
  { key: "Ateist", labels: { tr: "Ateist", en: "Atheist", de: "Atheist", es: "Ateo", fr: "Athée", it: "Ateo", ru: "Атеист", ar: "ملحد" } },
  { key: "Agnostik", labels: { tr: "Agnostik", en: "Agnostic", de: "Agnostiker", es: "Agnóstico", fr: "Agnostique", it: "Agnostico", ru: "Агностик", ar: "لا أدري" } },
  { key: "Hristiyan", labels: { tr: "Hristiyan", en: "Christian", de: "Christ", es: "Cristiano", fr: "Chrétien", it: "Cristiano", ru: "Христианин", ar: "مسيحي" } },
  { key: "Spirütüel", labels: { tr: "Spirütüel", en: "Spiritual", de: "Spirituell", es: "Espiritual", fr: "Spirituel", it: "Spirituale", ru: "Духовный", ar: "روحاني" } },
  { key: "Belirtmek İstemiyorum", labels: PREFER_NOT_TO_SAY },
];

/** Full "looking for" list used on the profile edit screen (emoji kept across locales). */
export const LOOKING_FOR_OPTIONS: ProfileOption[] = [
  { key: "Kahve & Sohbet", labels: { tr: "Kahve & Sohbet ☕", en: "Coffee & Chat ☕", de: "Kaffee & Plausch ☕", es: "Café y charla ☕", fr: "Café et discussion ☕", it: "Caffè e chiacchiere ☕", ru: "Кофе и разговоры ☕", ar: "قهوة ودردشة ☕" } },
  { key: "Spor Arkadaşı", labels: { tr: "Spor Arkadaşı 🏋️‍♂️", en: "Workout Buddy 🏋️‍♂️", de: "Trainings-Buddy 🏋️‍♂️", es: "Compañero de entrenamiento 🏋️‍♂️", fr: "Partenaire d'entraînement 🏋️‍♂️", it: "Compagno di allenamento 🏋️‍♂️", ru: "Напарник для тренировок 🏋️‍♂️", ar: "رفيق التمارين 🏋️‍♂️" } },
  { key: "Konser & Festival", labels: { tr: "Konser & Festival 🎶", en: "Concert & Festival 🎶", de: "Konzert & Festival 🎶", es: "Concierto y festival 🎶", fr: "Concert et festival 🎶", it: "Concerti e festival 🎶", ru: "Концерты и фестивали 🎶", ar: "حفلات ومهرجانات 🎶" } },
  { key: "Ders & Çalışma", labels: { tr: "Ders & Çalışma Ekürisi 📚", en: "Study Buddy 📚", de: "Lern-Buddy 📚", es: "Compañero de estudio 📚", fr: "Partenaire d'étude 📚", it: "Compagno di studio 📚", ru: "Напарник для учёбы 📚", ar: "رفيق الدراسة 📚" } },
  { key: "Seyahat & Gezi", labels: { tr: "Seyahat & Gezi Ortağı ✈️", en: "Travel & Trip Partner ✈️", de: "Reise- & Ausflugspartner ✈️", es: "Compañero de viajes ✈️", fr: "Partenaire de voyage ✈️", it: "Compagno di viaggio ✈️", ru: "Напарник для путешествий ✈️", ar: "شريك السفر والرحلات ✈️" } },
  { key: "Yazılım & Proje", labels: { tr: "Yazılım & Proje Ortaklığı 💻", en: "Coding & Project Partner 💻", de: "Coding- & Projektpartner 💻", es: "Compañero de código y proyectos 💻", fr: "Partenaire de code et projets 💻", it: "Partner di coding e progetti 💻", ru: "Напарник по коду и проектам 💻", ar: "شريك البرمجة والمشاريع 💻" } },
  { key: "Oyun & E-Spor", labels: { tr: "Oyun & E-Spor Kankası 🎮", en: "Gaming & E-Sports Buddy 🎮", de: "Gaming- & E-Sport-Buddy 🎮", es: "Colega de juegos y e-sports 🎮", fr: "Pote de jeu et e-sport 🎮", it: "Amico di gaming ed e-sport 🎮", ru: "Напарник по играм и киберспорту 🎮", ar: "رفيق الألعاب والرياضات الإلكترونية 🎮" } },
  { key: "Sanat & Müze", labels: { tr: "Sanat & Müze Gezisi 🎨", en: "Art & Museum Visits 🎨", de: "Kunst- & Museumsbesuche 🎨", es: "Visitas a arte y museos 🎨", fr: "Sorties art et musées 🎨", it: "Visite d'arte e musei 🎨", ru: "Походы по искусству и музеям 🎨", ar: "زيارات الفن والمتاحف 🎨" } },
  { key: "Gece Hayatı & Parti", labels: { tr: "Gece Hayatı & Parti 🥳", en: "Nightlife & Party 🥳", de: "Nachtleben & Party 🥳", es: "Vida nocturna y fiesta 🥳", fr: "Vie nocturne et fête 🥳", it: "Vita notturna e feste 🥳", ru: "Ночная жизнь и вечеринки 🥳", ar: "الحياة الليلية والحفلات 🥳" } },
  { key: "Yeni Şehirde Çevre", labels: { tr: "Yeni Şehirde Çevre / Rehber 🗺️", en: "New City Friends & Guide 🗺️", de: "Freunde & Guide in neuer Stadt 🗺️", es: "Amigos y guía en la nueva ciudad 🗺️", fr: "Amis et guide dans la nouvelle ville 🗺️", it: "Amici e guida nella nuova città 🗺️", ru: "Друзья и гид в новом городе 🗺️", ar: "أصدقاء ودليل في المدينة الجديدة 🗺️" } },
  { key: "Doğa Yürüyüşü & Kamp", labels: { tr: "Doğa Yürüyüşü & Kamp 🏕️", en: "Hiking & Camping 🏕️", de: "Wandern & Camping 🏕️", es: "Senderismo y acampada 🏕️", fr: "Randonnée et camping 🏕️", it: "Escursioni e campeggio 🏕️", ru: "Походы и кемпинг 🏕️", ar: "المشي لمسافات طويلة والتخييم 🏕️" } },
  { key: "Yemek & Gurme", labels: { tr: "Yemek & Gurme Keşfi 🍕", en: "Food & Foodie Buddy 🍕", de: "Essen- & Foodie-Buddy 🍕", es: "Colega gastronómico 🍕", fr: "Pote gastronomie 🍕", it: "Amico gourmet 🍕", ru: "Напарник-гурман 🍕", ar: "رفيق الطعام والذواقة 🍕" } },
  { key: "Fotoğraf & Video", labels: { tr: "Fotoğraf & Video Çekimi 📸", en: "Photography & Content 📸", de: "Foto & Video 📸", es: "Fotografía y contenido 📸", fr: "Photo et contenu 📸", it: "Foto e contenuti 📸", ru: "Фото и контент 📸", ar: "التصوير والمحتوى 📸" } },
  { key: "Dil Pratiği", labels: { tr: "Dil Pratiği (Language Exchange) 🗣️", en: "Language Exchange 🗣️", de: "Sprachaustausch 🗣️", es: "Intercambio de idiomas 🗣️", fr: "Échange linguistique 🗣️", it: "Scambio linguistico 🗣️", ru: "Языковой обмен 🗣️", ar: "تبادل لغوي 🗣️" } },
  { key: "Uzun Vadeli Dostluk", labels: { tr: "Uzun Vadeli Dostluk 🤝", en: "Long-term Friendship 🤝", de: "Langfristige Freundschaft 🤝", es: "Amistad a largo plazo 🤝", fr: "Amitié à long terme 🤝", it: "Amicizia a lungo termine 🤝", ru: "Долгосрочная дружба 🤝", ar: "صداقة طويلة الأمد 🤝" } },
  { key: "Sadece Eğlence", labels: { tr: "Sadece Eğlence & Aktivite 🎉", en: "Just Fun & Activities 🎉", de: "Einfach Spaß & Aktivitäten 🎉", es: "Solo diversión y actividades 🎉", fr: "Juste du fun et des activités 🎉", it: "Solo divertimento e attività 🎉", ru: "Просто веселье и активности 🎉", ar: "مجرد متعة وأنشطة 🎉" } },
];

/** Shorter "looking for" list used during onboarding (distinct keys from the full list). */
export const LOOKING_FOR_ONBOARDING_OPTIONS: ProfileOption[] = [
  { key: "Kahve & Sohbet", labels: { tr: "Kahve & Sohbet", en: "Coffee & Chat", de: "Kaffee & Plausch", es: "Café y charla", fr: "Café et discussion", it: "Caffè e chiacchiere", ru: "Кофе и разговоры", ar: "قهوة ودردشة" } },
  { key: "Spor Arkadaşı", labels: { tr: "Spor Arkadaşı", en: "Workout Buddy", de: "Trainings-Buddy", es: "Compañero de entrenamiento", fr: "Partenaire d'entraînement", it: "Compagno di allenamento", ru: "Напарник для тренировок", ar: "رفيق التمارين" } },
  { key: "Konser Kankası", labels: { tr: "Konser Kankası", en: "Concert Buddy", de: "Konzert-Buddy", es: "Colega de conciertos", fr: "Pote de concert", it: "Amico dei concerti", ru: "Напарник по концертам", ar: "رفيق الحفلات" } },
  { key: "Yeni Şehirde Rehber", labels: { tr: "Yeni Şehirde Rehber", en: "City Guide", de: "Stadtführer", es: "Guía de la ciudad", fr: "Guide de la ville", it: "Guida della città", ru: "Гид по городу", ar: "دليل المدينة" } },
  { key: "Sadece Eğlence", labels: { tr: "Sadece Eğlence", en: "Just Having Fun", de: "Einfach Spaß haben", es: "Solo pasarlo bien", fr: "Juste s'amuser", it: "Solo divertirsi", ru: "Просто развлекаться", ar: "مجرد المتعة" } },
  { key: "Uzun Vadeli Dostluk", labels: { tr: "Uzun Vadeli Dostluk", en: "Long-term Friendship", de: "Langfristige Freundschaft", es: "Amistad a largo plazo", fr: "Amitié à long terme", it: "Amicizia a lungo termine", ru: "Долгосрочная дружба", ar: "صداقة طويلة الأمد" } },
];

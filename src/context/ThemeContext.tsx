import React, { createContext, useContext, useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { getToken, setToken } from "../utils/tokenStorage";
import { translate, type TranslationKey } from "../constants/translations";

export type ThemePresetKey =
  | "purple"
  | "blue"
  | "green"
  | "orange"
  | "gold"
  | "pink"
  | "cyan"
  | "lavender"
  | "emerald"
  | "ruby"
  | "nebula"
  | "volcanic";

export type LanguageKey = "tr" | "en" | "ar" | "ru" | "de" | "es" | "fr" | "it";

export interface LanguageOption {
  key: LanguageKey;
  label: string; // endonym, shown in the picker
  flag: string;
  rtl: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { key: "tr", label: "Türkçe", flag: "🇹🇷", rtl: false },
  { key: "en", label: "English", flag: "🇬🇧", rtl: false },
  { key: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
  { key: "ru", label: "Русский", flag: "🇷🇺", rtl: false },
  { key: "de", label: "Deutsch", flag: "🇩🇪", rtl: false },
  { key: "es", label: "Español", flag: "🇪🇸", rtl: false },
  { key: "fr", label: "Français", flag: "🇫🇷", rtl: false },
  { key: "it", label: "Italiano", flag: "🇮🇹", rtl: false },
];

const LANGUAGE_KEYS = LANGUAGES.map((l) => l.key);

export function isRtlLanguage(lang: LanguageKey): boolean {
  return LANGUAGES.find((l) => l.key === lang)?.rtl ?? false;
}

export interface ThemePreset {
  key: ThemePresetKey;
  labels: Record<LanguageKey, string>;
  color: string;
  bgGradient: [string, string];
  isPremium: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "purple", labels: { tr: "Kanka Moru", en: "Buddy Purple", de: "Buddy-Lila", es: "Púrpura Buddy", fr: "Violet Buddy", it: "Viola Buddy", ru: "Фиолетовый бадди", ar: "بنفسجي الرفيق" }, color: "#6C4CF1", bgGradient: ["#F8F6FE", "#EDE7FB"], isPremium: false },
  { key: "blue", labels: { tr: "Okyanus Mavisi", en: "Ocean Blue", de: "Ozeanblau", es: "Azul océano", fr: "Bleu océan", it: "Blu oceano", ru: "Океанский синий", ar: "أزرق المحيط" }, color: "#1DA1F2", bgGradient: ["#F0F8FF", "#E1F3FE"], isPremium: false },
  { key: "green", labels: { tr: "Doğa Yeşili", en: "Nature Green", de: "Naturgrün", es: "Verde naturaleza", fr: "Vert nature", it: "Verde natura", ru: "Природный зелёный", ar: "أخضر الطبيعة" }, color: "#2ECC71", bgGradient: ["#F0FBF5", "#E0F7E9"], isPremium: false },
  { key: "orange", labels: { tr: "Gün Batımı", en: "Sunset Orange", de: "Sonnenuntergangsorange", es: "Naranja atardecer", fr: "Orange coucher de soleil", it: "Arancione tramonto", ru: "Оранжевый закат", ar: "برتقالي الغروب" }, color: "#FF7A00", bgGradient: ["#FFF8F0", "#FFEEDD"], isPremium: false },
  { key: "gold", labels: { tr: "Altın Işıltı", en: "Golden Glow", de: "Goldener Schimmer", es: "Brillo dorado", fr: "Éclat doré", it: "Bagliore dorato", ru: "Золотое сияние", ar: "توهج ذهبي" }, color: "#F1C40F", bgGradient: ["#FEFDF0", "#FCF8D5"], isPremium: true },
  { key: "pink", labels: { tr: "Gece Pembe", en: "Night Pink", de: "Nachtrosa", es: "Rosa noche", fr: "Rose nuit", it: "Rosa notte", ru: "Ночной розовый", ar: "وردي الليل" }, color: "#FF2A7A", bgGradient: ["#FFF0F5", "#FFE0EC"], isPremium: true },
  { key: "cyan", labels: { tr: "Siber Gece", en: "Cyber Cyan", de: "Cyber-Cyan", es: "Cian ciber", fr: "Cyan cyber", it: "Ciano cyber", ru: "Кибер-циан", ar: "سماوي سايبر" }, color: "#00F5D4", bgGradient: ["#E6FCF8", "#CCFBF3"], isPremium: true },
  { key: "lavender", labels: { tr: "Gece Yarısı", en: "Midnight Lavender", de: "Mitternachtslavendel", es: "Lavanda medianoche", fr: "Lavande minuit", it: "Lavanda mezzanotte", ru: "Полуночная лаванда", ar: "لافندر منتصف الليل" }, color: "#A55EEA", bgGradient: ["#F6F0FD", "#ECE0FA"], isPremium: true },
  { key: "emerald", labels: { tr: "Zümrüt Işığı", en: "Neon Emerald", de: "Neon-Smaragd", es: "Esmeralda neón", fr: "Émeraude néon", it: "Smeraldo neon", ru: "Неоновый изумруд", ar: "زمردي نيون" }, color: "#00E676", bgGradient: ["#E8FDF0", "#D0FBE1"], isPremium: true },
  { key: "ruby", labels: { tr: "Kraliyet Yakutu", en: "Royal Ruby", de: "Königsrubin", es: "Rubí real", fr: "Rubis royal", it: "Rubino reale", ru: "Королевский рубин", ar: "ياقوت ملكي" }, color: "#E74C3C", bgGradient: ["#FDF0ED", "#FCDCD8"], isPremium: true },
  { key: "nebula", labels: { tr: "Kozmik Galaksi", en: "Cosmic Nebula", de: "Kosmischer Nebel", es: "Nebulosa cósmica", fr: "Nébuleuse cosmique", it: "Nebulosa cosmica", ru: "Космическая туманность", ar: "سديم كوني" }, color: "#9B51E0", bgGradient: ["#F5EEFD", "#EAD9FC"], isPremium: true },
  { key: "volcanic", labels: { tr: "Volkanik Ateş", en: "Volcanic Flame", de: "Vulkanflamme", es: "Llama volcánica", fr: "Flamme volcanique", it: "Fiamma vulcanica", ru: "Вулканическое пламя", ar: "لهب بركاني" }, color: "#FF3366", bgGradient: ["#FFF0F3", "#FFE0E6"], isPremium: true },
];

type TranslateParams = Record<string, string | number>;

interface ThemeContextValue {
  themeKey: ThemePresetKey;
  accentColor: string;
  bgGradient: [string, string];
  language: LanguageKey;
  isRTL: boolean;
  setThemeKey: (key: ThemePresetKey) => void;
  setLanguage: (lang: LanguageKey) => void;
  /** Whether switching to `lang` needs an app restart (RTL flip). */
  languageNeedsRestart: (lang: LanguageKey) => boolean;
  t: (key: TranslationKey, params?: TranslateParams) => string;
}

const STORAGE_THEME_KEY = "findyourbuddy_theme_key";
const STORAGE_LANG_KEY = "findyourbuddy_lang_key";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeState] = useState<ThemePresetKey>("purple");
  const [language, setLanguageState] = useState<LanguageKey>("tr");

  useEffect(() => {
    getToken(STORAGE_THEME_KEY).then((val: string | null) => {
      if (val && THEME_PRESETS.some((p) => p.key === val)) {
        setThemeState(val as ThemePresetKey);
      }
    });
    getToken(STORAGE_LANG_KEY).then((val: string | null) => {
      if (val && (LANGUAGE_KEYS as string[]).includes(val)) {
        setLanguageState(val as LanguageKey);
      }
    });
  }, []);

  function setThemeKey(key: ThemePresetKey): void {
    setThemeState(key);
    setToken(STORAGE_THEME_KEY, key).catch(() => {});
  }

  function setLanguage(lang: LanguageKey): void {
    setLanguageState(lang);
    setToken(STORAGE_LANG_KEY, lang).catch(() => {});
    // Native layout direction only changes on the next app launch.
    const wantRtl = isRtlLanguage(lang);
    if (I18nManager.isRTL !== wantRtl) {
      I18nManager.allowRTL(wantRtl);
      I18nManager.forceRTL(wantRtl);
    }
  }

  function languageNeedsRestart(lang: LanguageKey): boolean {
    return I18nManager.isRTL !== isRtlLanguage(lang);
  }

  const currentPreset = THEME_PRESETS.find((p) => p.key === themeKey) || THEME_PRESETS[0];

  function t(key: TranslationKey, params?: TranslateParams): string {
    return translate(key, language, params);
  }

  return (
    <ThemeContext.Provider
      value={{
        themeKey,
        accentColor: currentPreset.color,
        bgGradient: currentPreset.bgGradient,
        language,
        isRTL: isRtlLanguage(language),
        setThemeKey,
        setLanguage,
        languageNeedsRestart,
        t,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}

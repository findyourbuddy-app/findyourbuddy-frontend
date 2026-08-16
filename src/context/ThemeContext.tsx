import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../utils/tokenStorage";
import { translations, type TranslationKey } from "../constants/translations";

export type ThemePresetKey = "purple" | "blue" | "green" | "orange" | "gold" | "pink" | "cyan" | "lavender";
export type LanguageKey = "tr" | "en";

export interface ThemePreset {
  key: ThemePresetKey;
  label: string;
  labelEn: string;
  color: string;
  bgGradient: [string, string];
  isPremium: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "purple", label: "Kanka Moru", labelEn: "Buddy Purple", color: "#6C4CF1", bgGradient: ["#F8F6FE", "#EDE7FB"], isPremium: false },
  { key: "blue", label: "Okyanus Mavisi", labelEn: "Ocean Blue", color: "#1DA1F2", bgGradient: ["#F0F8FF", "#E1F3FE"], isPremium: false },
  { key: "green", label: "Doğa Yeşili", labelEn: "Nature Green", color: "#2ECC71", bgGradient: ["#F0FBF5", "#E0F7E9"], isPremium: false },
  { key: "orange", label: "Gün Batımı", labelEn: "Sunset Orange", color: "#FF7A00", bgGradient: ["#FFF8F0", "#FFEEDD"], isPremium: false },
  { key: "gold", label: "Altın Işıltı", labelEn: "Golden Glow", color: "#F1C40F", bgGradient: ["#FEFDF0", "#FCF8D5"], isPremium: true },
  { key: "pink", label: "Gece Pembe", labelEn: "Night Pink", color: "#FF2A7A", bgGradient: ["#FFF0F5", "#FFE0EC"], isPremium: true },
  { key: "cyan", label: "Siber Gece", labelEn: "Cyber Cyan", color: "#00F5D4", bgGradient: ["#E6FCF8", "#CCFBF3"], isPremium: true },
  { key: "lavender", label: "Gece Yarısı", labelEn: "Midnight Lavender", color: "#A55EEA", bgGradient: ["#F6F0FD", "#ECE0FA"], isPremium: true },
];

interface ThemeContextValue {
  themeKey: ThemePresetKey;
  accentColor: string;
  bgGradient: [string, string];
  language: LanguageKey;
  setThemeKey: (key: ThemePresetKey) => void;
  setLanguage: (lang: LanguageKey) => void;
  t: (key: TranslationKey) => string;
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
      if (val === "tr" || val === "en") {
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
  }

  const currentPreset = THEME_PRESETS.find((p) => p.key === themeKey) || THEME_PRESETS[0];

  function t(key: TranslationKey): string {
    const langDict = translations[language] || translations.tr;
    return langDict[key] || translations.tr[key] || key;
  }

  return (
    <ThemeContext.Provider
      value={{
        themeKey,
        accentColor: currentPreset.color,
        bgGradient: currentPreset.bgGradient,
        language,
        setThemeKey,
        setLanguage,
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

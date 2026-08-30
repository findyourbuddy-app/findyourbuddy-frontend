import type { LanguageKey } from "../context/ThemeContext";

/**
 * A label available in every supported locale. `tr` and `en` are always
 * present; the others are filled in for user-facing option lists so a
 * language switch actually changes dropdown values, not just static UI.
 */
export type LocalizedLabel = Record<LanguageKey, string>;

export function pickLabel(label: LocalizedLabel, lang: LanguageKey): string {
  return label[lang] || label.en || label.tr;
}

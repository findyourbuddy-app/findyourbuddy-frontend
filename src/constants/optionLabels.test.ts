import { CATEGORIES } from "./categories";
import { HOBBIES } from "./hobbies";
import { INTERESTS } from "./interests";
import { LANGUAGES_LIST } from "./languages";
import { LANGUAGES } from "../context/ThemeContext";
import { PROMPT_SUGGESTIONS, BIO_SUGGESTIONS } from "./prompts";

const LANGUAGE_KEYS = LANGUAGES.map((option) => option.key);
import {
  BELIEF_OPTIONS,
  CLASS_YEAR_OPTIONS,
  GENDER_OPTIONS,
  LOOKING_FOR_OPTIONS,
  LOOKING_FOR_ONBOARDING_OPTIONS,
  POLITICAL_OPTIONS,
  ZODIAC_OPTIONS,
} from "./profileOptions";

const LABEL_LISTS = {
  ZODIAC_OPTIONS,
  GENDER_OPTIONS,
  CLASS_YEAR_OPTIONS,
  POLITICAL_OPTIONS,
  BELIEF_OPTIONS,
  LOOKING_FOR_OPTIONS,
  LOOKING_FOR_ONBOARDING_OPTIONS,
  HOBBIES,
  INTERESTS,
  CATEGORIES,
};

describe("localised option lists", () => {
  for (const [name, list] of Object.entries(LABEL_LISTS)) {
    it(`${name}: every entry has a non-empty label for every locale`, () => {
      for (const entry of list) {
        for (const locale of LANGUAGE_KEYS) {
          const value = (entry.labels as Record<string, string>)[locale];
          expect(typeof value).toBe("string");
          expect(value.trim().length).toBeGreaterThan(0);
        }
      }
    });
  }

  it("prompt and bio suggestions carry every locale", () => {
    for (const item of [...PROMPT_SUGGESTIONS, ...BIO_SUGGESTIONS]) {
      for (const locale of LANGUAGE_KEYS) {
        expect(item.question[locale].trim().length).toBeGreaterThan(0);
        expect(item.placeholder[locale].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("language picker labels cover every locale", () => {
    for (const item of LANGUAGES_LIST) {
      for (const locale of LANGUAGE_KEYS) {
        expect(item.labels[locale].trim().length).toBeGreaterThan(0);
      }
    }
  });
});

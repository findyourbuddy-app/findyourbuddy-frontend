import { translations } from "./translations";

describe("translations", () => {
  const languages = Object.keys(translations) as (keyof typeof translations)[];
  const trKeys = Object.keys(translations.tr).sort();

  it("covers tr, en and every added locale", () => {
    expect(languages).toEqual(
      expect.arrayContaining(["tr", "en", "ar", "ru", "de", "es", "fr", "it"])
    );
  });

  for (const lang of ["en", "ar", "ru", "de", "es", "fr", "it"] as const) {
    it(`${lang} has exactly the same keys as tr`, () => {
      expect(Object.keys(translations[lang]).sort()).toEqual(trKeys);
    });

    it(`${lang} has no empty values`, () => {
      const empty = Object.entries(translations[lang])
        .filter(([, v]) => v === "" || v == null)
        .map(([k]) => k);
      expect(empty).toEqual([]);
    });
  }
});

import { translations } from "./translations";

describe("translations", () => {
  const trKeys = Object.keys(translations.tr).sort();
  const enKeys = Object.keys(translations.en).sort();

  it("TR and EN have the same keys", () => {
    expect(trKeys).toEqual(enKeys);
  });

  it("no TR translation value is an empty string", () => {
    const emptyKeys = Object.entries(translations.tr)
      .filter(([, v]) => v === "")
      .map(([k]) => k);
    expect(emptyKeys).toEqual([]);
  });

  it("no EN translation value is an empty string", () => {
    const emptyKeys = Object.entries(translations.en)
      .filter(([, v]) => v === "")
      .map(([k]) => k);
    expect(emptyKeys).toEqual([]);
  });
});

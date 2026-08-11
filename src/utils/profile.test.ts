import { isValidAge, MAX_AGE, MIN_AGE } from "./profile";

describe("isValidAge", () => {
  it("accepts ages within the allowed range", () => {
    expect(isValidAge(MIN_AGE)).toBe(true);
    expect(isValidAge(MAX_AGE)).toBe(true);
    expect(isValidAge(30)).toBe(true);
  });

  it("rejects ages below the minimum", () => {
    expect(isValidAge(MIN_AGE - 1)).toBe(false);
  });

  it("rejects ages above the maximum", () => {
    expect(isValidAge(MAX_AGE + 1)).toBe(false);
  });

  it("rejects non-integer ages", () => {
    expect(isValidAge(25.5)).toBe(false);
  });
});

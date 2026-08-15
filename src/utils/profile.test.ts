import { calculateAge, isValidAge, isValidBirthDate, MAX_AGE, MIN_AGE } from "./profile";

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

describe("calculateAge", () => {
  it("counts a full year when the birthday already passed this year", () => {
    expect(calculateAge(new Date(2000, 0, 1), new Date(2025, 5, 15))).toBe(25);
  });

  it("does not count the year yet when the birthday hasn't happened this year", () => {
    expect(calculateAge(new Date(2000, 11, 31), new Date(2025, 5, 15))).toBe(24);
  });

  it("counts the birthday itself as already turned", () => {
    expect(calculateAge(new Date(2000, 5, 15), new Date(2025, 5, 15))).toBe(25);
  });
});

describe("isValidBirthDate", () => {
  it("accepts a real date that yields an age within range", () => {
    const year = new Date().getFullYear() - 25;
    expect(isValidBirthDate(15, 6, year)).toBe(true);
  });

  it("rejects an impossible calendar date", () => {
    expect(isValidBirthDate(31, 2, 2000)).toBe(false);
  });

  it("rejects a birth date that makes the user younger than the minimum age", () => {
    const year = new Date().getFullYear() - 5;
    expect(isValidBirthDate(1, 1, year)).toBe(false);
  });
});

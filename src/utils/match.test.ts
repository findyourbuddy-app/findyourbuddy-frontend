import { formatMatchScore } from "./match";

describe("formatMatchScore", () => {
  it("formats a fractional score as a rounded percentage", () => {
    expect(formatMatchScore(0.91)).toBe("%91");
  });

  it("rounds to the nearest integer", () => {
    expect(formatMatchScore(0.555)).toBe("%56");
  });

  it("formats zero", () => {
    expect(formatMatchScore(0)).toBe("%0");
  });
});

import { searchUniversities } from "./universities";
import { apiClient } from "./client";

jest.mock("./client", () => ({
  apiClient: {
    get: jest.fn().mockRejectedValue(new Error("Network offline in test")),
  },
}));

(globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockRejectedValue(new Error("Fetch offline in test"));

describe("searchUniversities", () => {
  it("returns matching Turkish universities for Turkish query", async () => {
    const results = await searchUniversities("Boğaziçi");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((u) => u.includes("Boğaziçi"))).toBe(true);
  });

  it("handles case-insensitive and Turkish character variations", async () => {
    const results = await searchUniversities("istanbul teknik");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((u) => u.includes("İTÜ") || u.includes("Teknik"))).toBe(true);
  });

  it("returns empty array for queries shorter than 2 characters", async () => {
    const results = await searchUniversities("a");
    expect(results).toEqual([]);
  });
});

import { formatRelativeTimestamp, isToday } from "./date";

const NOW = new Date("2026-08-11T18:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("isToday", () => {
  it("is true for a timestamp earlier today", () => {
    expect(isToday("2026-08-11T09:00:00.000Z")).toBe(true);
  });

  it("is false for a timestamp on a different day", () => {
    expect(isToday("2026-08-10T09:00:00.000Z")).toBe(false);
  });
});

describe("formatRelativeTimestamp", () => {
  it("returns 'Şimdi' for timestamps under two minutes old", () => {
    expect(formatRelativeTimestamp("2026-08-11T17:59:30.000Z")).toBe("Şimdi");
  });

  it("returns a HH:mm time for earlier today", () => {
    expect(formatRelativeTimestamp("2026-08-11T09:05:00.000Z")).toBe("09:05");
  });

  it("returns 'Dün' for yesterday", () => {
    expect(formatRelativeTimestamp("2026-08-10T09:05:00.000Z")).toBe("Dün");
  });

  it("returns a DD.MM.YYYY date for older timestamps", () => {
    expect(formatRelativeTimestamp("2026-08-01T09:05:00.000Z")).toBe("01.08.2026");
  });
});

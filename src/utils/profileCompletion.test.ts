import { calculateProfileCompletion } from "./profileCompletion";
import type { User } from "../types";

const BASE_USER: User = {
  university: "İstanbul Üniversitesi",
  class_year: null,
  verification_status: "verified",
  looking_for: "Kahve & Sohbet",
  political_views: null,
  beliefs: null,
  hidden_fields: [],
  phone_number: "+905555555555",
  age: 26,
  latitude: null,
  longitude: null,
  accepted_terms_at: null,
  phone_verified: true,
  id: 1,
  email: "test@example.com",
  display_name: "Ada",
  photo_url: "https://example.com/photo.jpg",
  photos: [{ id: 1, photo_url: "https://example.com/gallery.jpg", position: 0, created_at: "2026-01-01" }],
  bio: "Merhaba!",
  about_me_prompt: "En sevdiğim film...",
  hobbies: ["running"],
  interests: ["coffee"],
  height: 170,
  languages_spoken: ["tr"],
  occupation: "Developer",
  zodiac_sign: "Kova",
  voice_note_url: "https://example.com/voice.mp3",
  date_of_birth: "1998-04-25",
  gender: "female",
  is_active: true,
  trust_score: 100,
  created_at: "2026-01-01",
};

describe("calculateProfileCompletion", () => {
  it("returns 0% for null user", () => {
    const result = calculateProfileCompletion(null);
    expect(result.percentage).toBe(0);
    expect(result.missingItems).toHaveLength(0);
  });

  it("returns 100% for a fully complete user", () => {
    const result = calculateProfileCompletion(BASE_USER);
    expect(result.percentage).toBe(100);
    expect(result.missingItems).toHaveLength(0);
    expect(result.missingFieldsTr).toHaveLength(0);
    expect(result.missingFieldsEn).toHaveLength(0);
  });

  it("deducts 15% when photo_url is missing", () => {
    const user = { ...BASE_USER, photo_url: null };
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(85);
    expect(result.missingItems.some((i) => i.key === "photo")).toBe(true);
  });

  it("deducts 10% when gallery is empty", () => {
    const user = { ...BASE_USER, photos: [] };
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(90);
    expect(result.missingItems.some((i) => i.key === "gallery")).toBe(true);
  });

  it("deducts 10% when bio is missing", () => {
    const user = { ...BASE_USER, bio: "" };
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(90);
    expect(result.missingItems.some((i) => i.key === "bio")).toBe(true);
  });

  it("deducts 5% when height is 0", () => {
    const user = { ...BASE_USER, height: 0 };
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(95);
  });

  it("accepts occupation as alternative to university", () => {
    const user = { ...BASE_USER, occupation: undefined, university: "ITU" } as unknown as User;
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(100);
    expect(result.missingItems.some((i) => i.key === "occupation")).toBe(false);
  });

  it("deducts 5% when both occupation and university are missing", () => {
    const user = { ...BASE_USER, occupation: undefined, university: undefined } as unknown as User;
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(95);
    expect(result.missingItems.some((i) => i.key === "occupation")).toBe(true);
  });

  it("accepts political_views as worldview alternative to voice_note_url", () => {
    const user = { ...BASE_USER, voice_note_url: null, political_views: "neutral" } as unknown as User;
    const result = calculateProfileCompletion(user);
    expect(result.percentage).toBe(100);
  });

  it("includes TR and EN labels in missingFields arrays", () => {
    const user = { ...BASE_USER, photo_url: null, bio: "" };
    const result = calculateProfileCompletion(user);
    expect(result.missingFieldsTr).toContain("Profil Fotoğrafı");
    expect(result.missingFieldsEn).toContain("Profile Photo");
    expect(result.missingFieldsTr).toContain("Biyografi");
    expect(result.missingFieldsEn).toContain("Bio");
  });

  it("caps percentage at 100 even if all fields set", () => {
    const result = calculateProfileCompletion(BASE_USER);
    expect(result.percentage).toBeLessThanOrEqual(100);
  });
});

import { formatMessagePreview } from "./messagePreview";
import type { Message } from "../types";

function msg(overrides: Partial<Message>): Message {
  return {
    id: 1,
    match_id: 1,
    sender_id: 1,
    content: "",
    is_read: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("formatMessagePreview", () => {
  it("returns empty string for a missing message", () => {
    expect(formatMessagePreview(null, "tr")).toBe("");
    expect(formatMessagePreview(undefined, "en")).toBe("");
  });

  it("passes plain text through", () => {
    expect(formatMessagePreview(msg({ content: "selam" }), "tr")).toBe("selam");
  });

  it("localizes photo messages by type", () => {
    expect(formatMessagePreview(msg({ message_type: "image", media_url: "u" }), "tr")).toBe("📷 Fotoğraf");
    expect(formatMessagePreview(msg({ message_type: "image", media_url: "u" }), "en")).toBe("📷 Photo");
  });

  it("localizes legacy photo/gif sentinels stored as content", () => {
    expect(formatMessagePreview(msg({ content: "[Fotoğraf]" }), "en")).toBe("📷 Photo");
    expect(formatMessagePreview(msg({ content: "[GIF]" }), "tr")).toBe("🎬 GIF");
  });

  it("keeps a caption alongside the photo label", () => {
    expect(
      formatMessagePreview(msg({ message_type: "image", media_url: "u", content: "bak" }), "en")
    ).toBe("📷 Photo · bak");
  });

  it("labels gif messages", () => {
    expect(formatMessagePreview(msg({ message_type: "gif", media_url: "g" }), "en")).toBe("🎬 GIF");
  });
});

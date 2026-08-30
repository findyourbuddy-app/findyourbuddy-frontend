import type { LanguageKey } from "../context/ThemeContext";
import type { Message } from "../types";
import { translate } from "../constants/translations";

// Legacy sentinels: image/gif messages sent without a caption store this as
// their content instead of an empty string.
const PHOTO_SENTINELS = ["[Fotoğraf]", "[Photo]"];
const GIF_SENTINELS = ["[GIF]"];

type PreviewSource = Pick<Message, "content" | "message_type" | "media_url">;

/**
 * Human-readable preview of a message for chat lists. Media messages render a
 * localized label (with the caption when there is one) instead of the raw
 * placeholder text.
 */
export function formatMessagePreview(
  message: PreviewSource | null | undefined,
  language: LanguageKey
): string {
  if (!message) return "";

  const content = (message.content ?? "").trim();
  const isGif = message.message_type === "gif" || GIF_SENTINELS.includes(content);
  const isPhoto =
    message.message_type === "image" ||
    PHOTO_SENTINELS.includes(content) ||
    (!isGif && Boolean(message.media_url) && !content);

  if (isGif) {
    return "🎬 GIF";
  }

  if (isPhoto) {
    const photoLabel = translate("photo", language);
    const caption = PHOTO_SENTINELS.includes(content) ? "" : content;
    return caption ? `${photoLabel} · ${caption}` : photoLabel;
  }

  return content;
}

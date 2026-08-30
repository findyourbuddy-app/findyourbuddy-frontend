import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatMessageTime } from "../../utils/date";
import { resolvePhotoUrl } from "../ui/Avatar";
import type { LanguageKey } from "../../context/ThemeContext";
import type { Message } from "../../types";
import { translate } from "../../constants/translations";

const MEDIA_WIDTH = 240;
const CAPTION_SENTINELS = ["[Fotoğraf]", "[Photo]", "[GIF]"];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  language: LanguageKey;
  showTimestamp: boolean;
  // Local device URI kept by the sender so the delivered image doesn't re-download.
  localUri: string | null;
  // Natural aspect ratio (w/h) learned from a previous onLoad, when the message
  // carries no explicit media dimensions.
  storedAspect: number | undefined;
  onToggleTimestamp: (messageId: Message["id"]) => void;
  onLongPress: (message: Message) => void;
  onPressImage: (uri: string) => void;
  onResolveAspect: (messageId: Message["id"], aspect: number) => void;
}

function reactionsEqual(a: Record<string, string> = {}, b: Record<string, string> = {}): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function arePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  return (
    prev.isOwn === next.isOwn &&
    prev.language === next.language &&
    prev.showTimestamp === next.showTimestamp &&
    prev.localUri === next.localUri &&
    prev.storedAspect === next.storedAspect &&
    prev.onToggleTimestamp === next.onToggleTimestamp &&
    prev.onLongPress === next.onLongPress &&
    prev.onPressImage === next.onPressImage &&
    prev.onResolveAspect === next.onResolveAspect &&
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.is_read === next.message.is_read &&
    prev.message.media_url === next.message.media_url &&
    prev.message.media_width === next.message.media_width &&
    prev.message.media_height === next.message.media_height &&
    reactionsEqual(prev.message.reactions, next.message.reactions)
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  language,
  showTimestamp,
  localUri,
  storedAspect,
  onToggleTimestamp,
  onLongPress,
  onPressImage,
  onResolveAspect,
}: MessageBubbleProps) {
  const content = message.content ?? "";
  const isMedia =
    message.message_type === "image" ||
    message.message_type === "gif" ||
    Boolean(message.media_url && message.media_url.length > 0) ||
    Boolean(content && (content.startsWith("http") || content.includes("/media/")));

  const rawUri =
    message.media_url ||
    (content.startsWith("http") || content.includes("/media/") ? content : null);
  const photoUri = localUri || resolvePhotoUrl(rawUri);

  const explicitAspect =
    message.media_width && message.media_height
      ? message.media_width / message.media_height
      : undefined;
  const knownAspect = explicitAspect ?? storedAspect;
  // expo-image collapses with aspectRatio alone, so size the box in explicit
  // pixels: fixed width, height from the photo's real ratio (clamped so
  // panoramas / very tall shots stay reasonable).
  const mediaHeight = knownAspect
    ? Math.round(MEDIA_WIDTH / Math.min(Math.max(knownAspect, 0.55), 2.2))
    : 180;

  // Only a local image being uploaded gets the "uploading" veil -- a GIF is
  // already a remote URL with nothing to upload, so show it straight away.
  const isPendingUpload =
    typeof message.id === "string" &&
    message.id.startsWith("temp_") &&
    message.message_type !== "gif";
  const hasCaption =
    Boolean(content) && !CAPTION_SENTINELS.includes(content) && !content.startsWith("http");

  const reactionEntries = Object.values(message.reactions ?? {});
  const uniqueReactions = Array.from(new Set(reactionEntries));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <Pressable
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
          onPress={() => onToggleTimestamp(message.id)}
          onLongPress={() => onLongPress(message)}
        >
          {isMedia && photoUri ? (
            <View style={styles.mediaContainer}>
              <Pressable
                onPress={() => onPressImage(photoUri)}
                accessibilityRole="imagebutton"
                accessibilityLabel={translate("enlargeImage", language)}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={[styles.bubbleImage, { width: MEDIA_WIDTH, height: mediaHeight }]}
                  contentFit={knownAspect ? "cover" : "contain"}
                  cachePolicy="memory-disk"
                  autoplay
                  transition={150}
                  onLoad={(e) => {
                    if (explicitAspect) return;
                    const w = e?.source?.width;
                    const h = e?.source?.height;
                    if (w && h) onResolveAspect(message.id, w / h);
                  }}
                />
              </Pressable>
              {isPendingUpload ? (
                <View style={styles.imageUploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : null}
              {hasCaption ? (
                <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn, { marginTop: spacing.xs }]}>
                  {content}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{content}</Text>
          )}

          {showTimestamp ? (
            <View style={styles.bubbleFooter}>
              <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                {formatMessageTime(message.created_at, language)}
              </Text>
              {isOwn ? (
                <Feather
                  name={message.is_read ? "check-circle" : "check"}
                  size={12}
                  color="rgba(255,255,255,0.75)"
                />
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </View>

      {uniqueReactions.length > 0 ? (
        <View style={[styles.reactionPillsRow, isOwn ? styles.reactionsOwn : styles.reactionsOther]}>
          {uniqueReactions.map((emoji) => (
            <View key={emoji} style={styles.reactionPill}>
              <Text style={styles.reactionEmojiText}>
                {emoji} {reactionEntries.filter((e) => e === emoji).length}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}, arePropsEqual);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xs,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bubbleTextOwn: {
    color: colors.surface,
  },
  mediaContainer: {
    position: "relative",
  },
  bubbleImage: {
    borderRadius: 14,
    backgroundColor: "#15102A",
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.75)",
  },
  reactionPillsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  reactionsOwn: {
    alignSelf: "flex-end",
  },
  reactionsOther: {
    alignSelf: "flex-start",
  },
  reactionPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionEmojiText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
});

import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../ui/Avatar";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import type { Match } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

interface ChatListItemProps {
  match: Match;
  currentUserId: number;
  onPress: () => void;
}

export function ChatListItem({ match, currentUserId, onPress }: ChatListItemProps) {
  const { language } = useAppTheme();
  const lastMessage = match.last_message;
  const isUnread = Boolean(lastMessage && !lastMessage.is_read && lastMessage.sender_id !== currentUserId);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Avatar
        name={match.other_user.display_name}
        photoUrl={match.other_user.photo_url}
        isVerified={match.other_user.is_verified}
        size={48}
      />
      <View style={[styles.textColumn, { marginRight: spacing.sm }]}>
        <View style={styles.topRow}>
          <Text style={[styles.name, isUnread && styles.unreadText]} numberOfLines={1}>
            {match.other_user.display_name}
          </Text>
          {lastMessage ? (
            <Text style={[styles.time, isUnread && styles.unreadTime]}>{formatRelativeTimestamp(lastMessage.created_at)}</Text>
          ) : null}
        </View>

        {match.event_title ? (
          <View style={styles.eventPill}>
            <Feather name="calendar" size={10} color={colors.primary} />
            <Text style={styles.eventPillText} numberOfLines={1}>
              {match.event_title}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.preview, isUnread && styles.unreadText]} numberOfLines={1}>
          {lastMessage ? lastMessage.content : (language === "en" ? "No messages yet, send the first one!" : "Henüz mesaj yok, ilk sen yaz!")}
        </Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  time: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  preview: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  unreadText: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.textPrimary,
  },
  unreadTime: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.accentRed,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginVertical: 2,
  },
  eventPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.primary,
  },
});

import { memo } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../ui/Avatar";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import { formatMessagePreview } from "../../utils/messagePreview";
import type { Match } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

interface ChatListItemProps {
  match: Match;
  currentUserId: number;
  onPress: (match: Match) => void;
  onPressAvatar?: (userId: number) => void;
}

function ChatListItemBase({ match, currentUserId, onPress, onPressAvatar }: ChatListItemProps) {
  const { language } = useAppTheme();
  const lastMessage = match.last_message;
  const isUnread = Boolean(lastMessage && !lastMessage.is_read && lastMessage.sender_id !== currentUserId);
  const handlePress = () => onPress(match);

  if (match.event_is_group) {
    return (
      <Pressable style={styles.container} onPress={handlePress}>
        <View style={styles.groupAvatarBox}>
          <Feather name="users" size={22} color="#FFFFFF" />
        </View>
        <View style={[styles.textColumn, { marginRight: spacing.sm }]}>
          <View style={styles.topRow}>
            <Text style={[styles.name, isUnread && styles.unreadText]} numberOfLines={1}>
              {match.event_title || (language === "en" ? "Group Event Chat" : "Grup Etkinlik Sohbeti")}
            </Text>
            {lastMessage ? (
              <Text style={[styles.time, isUnread && styles.unreadTime]}>{formatRelativeTimestamp(lastMessage.created_at)}</Text>
            ) : null}
          </View>
          <View style={styles.eventPill}>
            <Feather name="users" size={10} color={colors.primary} />
            <Text style={styles.eventPillText} numberOfLines={1}>
              {language === "en" ? "Group Chat Channel" : "Grup Etkinlik Sohbet Kanalı"}
            </Text>
          </View>
          <Text style={[styles.preview, isUnread && styles.unreadText]} numberOfLines={1}>
            {lastMessage ? formatMessagePreview(lastMessage, language) : (language === "en" ? "Group chat created! Send a message..." : "Grup sohbeti başladı! İlk mesajı sen yaz 📢")}
          </Text>
        </View>
        {isUnread ? <View style={styles.unreadDot} /> : null}
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Pressable
        onPress={(e) => {
          if (onPressAvatar) {
            e.stopPropagation();
            onPressAvatar(match.other_user.id);
          }
        }}
        hitSlop={4}
      >
        <Avatar
          name={match.other_user.display_name}
          photoUrl={match.other_user.photo_url}
          isVerified={match.other_user.is_verified}
          size={48}
        />
      </Pressable>
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
          {lastMessage ? formatMessagePreview(lastMessage, language) : (language === "en" ? "No messages yet, send the first one!" : "Henüz mesaj yok, ilk sen yaz!")}
        </Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export const ChatListItem = memo(ChatListItemBase, (prev, next) => {
  const a = prev.match;
  const b = next.match;
  return (
    prev.currentUserId === next.currentUserId &&
    prev.onPress === next.onPress &&
    prev.onPressAvatar === next.onPressAvatar &&
    a.id === b.id &&
    a.other_user.display_name === b.other_user.display_name &&
    a.other_user.photo_url === b.other_user.photo_url &&
    a.other_user.is_verified === b.other_user.is_verified &&
    a.event_title === b.event_title &&
    a.event_is_group === b.event_is_group &&
    a.last_message?.id === b.last_message?.id &&
    a.last_message?.is_read === b.last_message?.is_read &&
    a.last_message?.content === b.last_message?.content
  );
});

const styles = StyleSheet.create({
  groupAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
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

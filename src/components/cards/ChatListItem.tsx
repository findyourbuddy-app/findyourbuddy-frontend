import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../ui/Avatar";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import type { Match } from "../../types";

interface ChatListItemProps {
  match: Match;
  currentUserId: number;
  onPress: () => void;
}

export function ChatListItem({ match, currentUserId, onPress }: ChatListItemProps) {
  const lastMessage = match.last_message;
  const isUnread = Boolean(lastMessage && !lastMessage.is_read && lastMessage.sender_id !== currentUserId);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Avatar name={match.other_user.display_name} photoUrl={match.other_user.photo_url} size={48} />
      <View style={styles.textColumn}>
        <View style={styles.topRow}>
          <Text style={[styles.name, isUnread && styles.unreadText]}>{match.other_user.display_name}</Text>
          {lastMessage ? (
            <Text style={styles.time}>{formatRelativeTimestamp(lastMessage.created_at)}</Text>
          ) : null}
        </View>
        <Text style={[styles.preview, isUnread && styles.unreadText]} numberOfLines={1}>
          {lastMessage ? lastMessage.content : "Henüz mesaj yok, ilk sen yaz!"}
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
});

import { useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Avatar } from "../ui/Avatar";
import { blockUser, reportUser } from "../../api/safety";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import type { Match } from "../../types";

interface ChatListItemProps {
  match: Match;
  currentUserId: number;
  onPress: () => void;
  onBlocked?: () => void;
}

const REVEAL_WIDTH = 144;
const OPEN_THRESHOLD = 60;

export function ChatListItem({ match, currentUserId, onPress, onBlocked }: ChatListItemProps) {
  const lastMessage = match.last_message;
  const isUnread = Boolean(lastMessage && !lastMessage.is_read && lastMessage.sender_id !== currentUserId);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  function closeReveal(): void {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
    setIsOpen(false);
  }

  function openReveal(): void {
    Animated.spring(translateX, { toValue: REVEAL_WIDTH, useNativeDriver: false }).start();
    setIsOpen(true);
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_evt, gesture) => {
        const base = isOpen ? REVEAL_WIDTH : 0;
        const next = Math.max(0, Math.min(REVEAL_WIDTH, base + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const base = isOpen ? REVEAL_WIDTH : 0;
        const finalValue = base + gesture.dx;
        if (finalValue > OPEN_THRESHOLD) {
          openReveal();
        } else {
          closeReveal();
        }
      },
    })
  ).current;

  function handleReport(): void {
    closeReveal();
    Alert.alert(otherUserNameSafe(), "Bu kullanıcıyı neden şikayet ediyorsun?", [
      { text: "Taciz / Rahatsız Edici", onPress: () => submitReport("harassment") },
      { text: "Sahte Profil", onPress: () => submitReport("fake_profile") },
      { text: "Uygunsuz İçerik", onPress: () => submitReport("inappropriate_content") },
      { text: "Diğer", onPress: () => submitReport("other") },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  function submitReport(reason: "harassment" | "fake_profile" | "inappropriate_content" | "other"): void {
    reportUser({ reported_user_id: match.other_user.id, reason }).then(
      () => Alert.alert("Teşekkürler", "Şikayetin alındı, incelenecek."),
      () => Alert.alert("Bir sorun oluştu", "Şikayet gönderilemedi. Lütfen tekrar dene.")
    );
  }

  function otherUserNameSafe(): string {
    return match.other_user.display_name;
  }

  function handleBlock(): void {
    closeReveal();
    Alert.alert(
      "Kullanıcıyı Engelle",
      `${otherUserNameSafe()} adlı kullanıcıyı engellemek istediğine emin misin? Bu sohbet listenden kaybolacak.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: () => {
            blockUser(match.other_user.id)
              .then(() => onBlocked?.())
              .catch(() => Alert.alert("Bir sorun oluştu", "Kullanıcı engellenemedi. Lütfen tekrar dene."));
          },
        },
      ]
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.revealActions}>
        <Pressable
          style={[styles.revealButton, styles.reportButton]}
          onPress={handleReport}
          accessibilityRole="button"
          accessibilityLabel="Şikayet et"
        >
          <Feather name="flag" size={16} color={colors.surface} />
          <Text style={styles.revealButtonText}>Şikayet</Text>
        </Pressable>
        <Pressable
          style={[styles.revealButton, styles.blockButton]}
          onPress={handleBlock}
          accessibilityRole="button"
          accessibilityLabel="Engelle"
        >
          <Feather name="slash" size={16} color={colors.surface} />
          <Text style={styles.revealButtonText}>Engelle</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.container, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Pressable style={styles.pressableContent} onPress={isOpen ? closeReveal : onPress}>
          <Avatar
            name={match.other_user.display_name}
            photoUrl={match.other_user.photo_url}
            isVerified={match.other_user.is_verified}
            size={48}
          />
          <View style={styles.textColumn}>
            <View style={styles.topRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, marginRight: 4 }}>
                <Text style={[styles.name, isUnread && styles.unreadText]} numberOfLines={1}>
                  {match.other_user.display_name}
                </Text>
              </View>
              {lastMessage ? (
                <Text style={styles.time}>{formatRelativeTimestamp(lastMessage.created_at)}</Text>
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
              {lastMessage ? lastMessage.content : "Henüz mesaj yok, ilk sen yaz!"}
            </Text>
          </View>
          {isUnread ? <View style={styles.unreadDot} /> : null}
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  revealActions: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    width: REVEAL_WIDTH,
  },
  revealButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  reportButton: {
    backgroundColor: colors.accentYellow,
    borderTopLeftRadius: radius.card,
    borderBottomLeftRadius: radius.card,
  },
  blockButton: {
    backgroundColor: colors.accentRed,
  },
  revealButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: colors.surface,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  pressableContent: {
    flexDirection: "row",
    alignItems: "center",
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

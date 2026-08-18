import { useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Avatar } from "../ui/Avatar";
import { blockUser, reportUser } from "../../api/safety";
import { colors, fontFamily, radius, spacing } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import type { Match } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

interface ChatListItemProps {
  match: Match;
  currentUserId: number;
  onPress: () => void;
  onBlocked?: () => void;
}

const REVEAL_WIDTH = 144;
const OPEN_THRESHOLD = 60;

export function ChatListItem({ match, currentUserId, onPress, onBlocked }: ChatListItemProps) {
  const { language } = useAppTheme();
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

  function otherUserNameSafe(): string {
    return match.other_user.display_name;
  }

  function handleReport(): void {
    closeReveal();
    Alert.alert(
      otherUserNameSafe(),
      language === "en" ? "Why are you reporting this user?" : "Bu kullanıcıyı neden şikayet ediyorsun?",
      [
        { text: language === "en" ? "Harassment / Abusive" : "Taciz / Rahatsız Edici", onPress: () => submitReport("harassment") },
        { text: language === "en" ? "Fake Profile" : "Sahte Profil", onPress: () => submitReport("fake_profile") },
        { text: language === "en" ? "Inappropriate Content" : "Uygunsuz İçerik", onPress: () => submitReport("inappropriate_content") },
        { text: language === "en" ? "Other" : "Diğer", onPress: () => submitReport("other") },
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
      ]
    );
  }

  function submitReport(reason: "harassment" | "fake_profile" | "inappropriate_content" | "other"): void {
    reportUser({ reported_user_id: match.other_user.id, reason }).then(
      () => Alert.alert(language === "en" ? "Thank You" : "Teşekkürler", language === "en" ? "Your report was received and will be reviewed." : "Şikayetin alındı, incelenecek."),
      () => Alert.alert(language === "en" ? "Error" : "Bir sorun oluştu", language === "en" ? "Report could not be sent. Please try again." : "Şikayet gönderilemedi. Lütfen tekrar dene.")
    );
  }

  function handleBlock(): void {
    closeReveal();
    Alert.alert(
      language === "en" ? "Block User" : "Kullanıcıyı Engelle",
      language === "en"
        ? `Are you sure you want to block ${otherUserNameSafe()}? This chat will be removed from your list.`
        : `${otherUserNameSafe()} adlı kullanıcıyı engellemek istediğine emin misin? Bu sohbet listenden kaybolacak.`,
      [
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
        {
          text: language === "en" ? "Block" : "Engelle",
          style: "destructive",
          onPress: () => {
            blockUser(match.other_user.id)
              .then(() => onBlocked?.())
              .catch(() =>
                Alert.alert(
                  language === "en" ? "Error" : "Bir sorun oluştu",
                  language === "en" ? "User could not be blocked. Please try again." : "Kullanıcı engellenemedi. Lütfen tekrar dene."
                )
              );
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
          accessibilityLabel="Report"
        >
          <Feather name="flag" size={16} color={colors.surface} />
          <Text style={styles.revealButtonText}>{language === "en" ? "Report" : "Şikayet"}</Text>
        </Pressable>
        <Pressable
          style={[styles.revealButton, styles.blockButton]}
          onPress={handleBlock}
          accessibilityRole="button"
          accessibilityLabel="Block"
        >
          <Feather name="slash" size={16} color={colors.surface} />
          <Text style={styles.revealButtonText}>{language === "en" ? "Block" : "Engelle"}</Text>
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
          <View style={[styles.textColumn, { marginRight: spacing.sm }]}>
            <View style={styles.topRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, marginRight: 4 }}>
                <Text style={[styles.name, isUnread && styles.unreadText]} numberOfLines={1}>
                  {match.other_user.display_name}
                </Text>
                {isUnread && (
                  <View style={styles.unreadTag}>
                    <Text style={styles.unreadTagText}>{language === "en" ? "NEW" : "YENİ"}</Text>
                  </View>
                )}
              </View>
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
  unreadTime: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  unreadTag: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  unreadTagText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 9,
    color: colors.accentRed,
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

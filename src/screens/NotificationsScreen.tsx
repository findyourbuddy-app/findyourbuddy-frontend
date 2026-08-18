import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listMyNotifications, markMyNotificationsRead } from "../api/notifications";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { colors, fontFamily, radius, spacing } from "../theme";
import type { Notification } from "../types";
import { Alert } from "../utils/alert";
import { formatRelativeTimestamp } from "../utils/date";

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isPremium } = useAuth();
  const { t, language, accentColor, bgGradient } = useAppTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      setNotifications(await listMyNotifications());
      await markMyNotificationsRead();
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Notifications could not be loaded. Please try again." : "Bildirimler yüklenemedi. Lütfen tekrar dene."
      );
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  function getNotificationMeta(title: string, body: string) {
    const lowercaseTitle = title.toLowerCase();
    const lowercaseBody = body.toLowerCase();

    if (
      lowercaseTitle.includes("beğeni") ||
      lowercaseBody.includes("beğendi") ||
      lowercaseBody.includes("like")
    ) {
      return { icon: "heart" as const, color: "#FF2E93", type: "like" };
    }
    if (
      lowercaseTitle.includes("match") ||
      lowercaseTitle.includes("eşleşme") ||
      lowercaseBody.includes("eşleşti")
    ) {
      return { icon: "users" as const, color: "#9B7BFF", type: "match" };
    }
    if (
      lowercaseTitle.includes("mesaj") ||
      lowercaseTitle.includes("message") ||
      lowercaseBody.includes("mesaj")
    ) {
      return { icon: "message-circle" as const, color: "#2ECC71", type: "message" };
    }
    if (
      lowercaseTitle.includes("etkinlik") ||
      lowercaseBody.includes("buluştun mu") ||
      lowercaseBody.includes("nasıldı")
    ) {
      return { icon: "check-square" as const, color: "#F1C40F", type: "feedback" };
    }
    return { icon: "bell" as const, color: colors.primary, type: "general" };
  }

  function formatNotificationContent(title: string, body: string) {
    const lowercaseTitle = title.toLowerCase();
    const lowercaseBody = body.toLowerCase();

    if (language === "en") {
      if (lowercaseTitle.includes("beğeni") || lowercaseBody.includes("beğendi") || lowercaseTitle.includes("like")) {
        return {
          title: "New Like! ❤️",
          body: "Someone liked you as a buddy!",
        };
      }
      if (lowercaseTitle.includes("match") || lowercaseTitle.includes("eşleşme") || lowercaseBody.includes("eşleşti")) {
        return {
          title: "New Match! 🎉",
          body: "You have a new match on FindYourBuddy!",
        };
      }
      if (lowercaseTitle.includes("mesaj") || lowercaseTitle.includes("message")) {
        return {
          title: "New Message 💬",
          body: "You received a new message.",
        };
      }
      if (lowercaseTitle.includes("etkinlik") || lowercaseBody.includes("nasıldı") || lowercaseBody.includes("buluştun")) {
        return {
          title: "How was the event? ⭐",
          body: "Did you meet your buddy? Quickly rate your experience.",
        };
      }
    } else {
      if (lowercaseTitle.includes("like") || lowercaseTitle.includes("beğeni")) {
        return {
          title: "Yeni Beğeni! ❤️",
          body: "Biri seni kanka olarak beğendi.",
        };
      }
      if (lowercaseTitle.includes("match") || lowercaseTitle.includes("eşleşme")) {
        return {
          title: "Yeni Eşleşme! 🎉",
          body: "FindYourBuddy'de yeni bir kanka eşleşmen var!",
        };
      }
      if (lowercaseTitle.includes("message") || lowercaseTitle.includes("mesaj")) {
        return {
          title: "Yeni Mesaj 💬",
          body: "Sana yeni bir mesaj geldi.",
        };
      }
      if (lowercaseTitle.includes("etkinlik") || lowercaseBody.includes("nasıldı") || lowercaseBody.includes("buluştun")) {
        return {
          title: "Etkinlik nasıldı? ⭐",
          body: "Kankanla buluştun mu? Sohbet ekranından hızlıca belirtebilirsin.",
        };
      }
    }

    return { title, body };
  }

  function handlePressNotification(item: Notification) {
    const meta = getNotificationMeta(item.title, item.body);

    if (meta.type === "like") {
      navigation.navigate("LikesReceived");
    } else if (meta.type === "match" || meta.type === "message" || meta.type === "feedback") {
      navigation.navigate("Tabs", { screen: "Messages" });
    } else {
      navigation.navigate("Tabs", { screen: "Discover" });
    }
  }

  if (isLoading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: bgGradient[0] }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgGradient[0] }]}>
      <View style={styles.timelineLine} />
      <FlatList
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.list}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("noNotificationsYet")}</Text>
        }
        renderItem={({ item }) => {
          const meta = getNotificationMeta(item.title, item.body);
          const formatted = formatNotificationContent(item.title, item.body);

          return (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                !item.is_read && styles.rowUnread,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handlePressNotification(item)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${meta.color}15` }]}>
                <Feather name={meta.icon} size={18} color={meta.color} />
              </View>

              <View style={styles.textColumn}>
                <Text style={styles.title}>{formatted.title}</Text>
                <Text style={styles.body}>{formatted.body}</Text>
                <Text style={styles.time}>{formatRelativeTimestamp(item.created_at)}</Text>
              </View>

              <Feather name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  background: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingLeft: spacing.xl + 8,
  },
  timelineLine: {
    position: "absolute",
    left: spacing.xl + 8,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  rowUnread: {
    borderColor: colors.primaryMuted,
    backgroundColor: "rgba(108, 92, 231, 0.05)",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

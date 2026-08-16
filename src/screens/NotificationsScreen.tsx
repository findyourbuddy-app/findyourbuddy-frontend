import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { listMyNotifications, markMyNotificationsRead } from "../api/notifications";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { formatRelativeTimestamp } from "../utils/date";
import type { Notification } from "../types";

import { useAppTheme } from "../context/ThemeContext";

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, accentColor, bgGradient } = useAppTheme();

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      setNotifications(await listMyNotifications());
      await markMyNotificationsRead();
    } catch {
      Alert.alert("Bir sorun oluştu", "Bildirimler yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  function getNotificationMeta(title: string, body: string) {
    const lowercaseTitle = title.toLowerCase();
    const lowercaseBody = body.toLowerCase();
    if (lowercaseTitle.includes("beğeni") || lowercaseBody.includes("beğendi") || lowercaseBody.includes("like")) {
      return { icon: "heart" as const, color: "#FF2E93" };
    }
    if (lowercaseTitle.includes("match") || lowercaseTitle.includes("eşleşme") || lowercaseBody.includes("eşleşti")) {
      return { icon: "users" as const, color: "#9B7BFF" };
    }
    if (lowercaseTitle.includes("mesaj") || lowercaseTitle.includes("message") || lowercaseBody.includes("mesaj")) {
      return { icon: "message-circle" as const, color: "#2ECC71" };
    }
    if (lowercaseTitle.includes("katılım") || lowercaseTitle.includes("grup") || lowercaseBody.includes("grup") || lowercaseTitle.includes("istek")) {
      return { icon: "calendar" as const, color: "#F1C40F" };
    }
    return { icon: "bell" as const, color: colors.primary };
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
          return (
            <View style={[styles.row, !item.is_read && styles.rowUnread]}>
              <View style={[styles.iconContainer, { backgroundColor: `${meta.color}15` }]}>
                <Feather name={meta.icon} size={18} color={meta.color} />
              </View>
              
              <View style={styles.textColumn}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{formatRelativeTimestamp(item.created_at)}</Text>
              </View>

              {!item.is_read && <View style={styles.unreadIndicator} />}
            </View>
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
    paddingLeft: spacing.xl + 20, // Add spacing to respect timeline line
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
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

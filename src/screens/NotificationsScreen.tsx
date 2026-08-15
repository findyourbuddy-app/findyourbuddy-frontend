import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { listMyNotifications, markMyNotificationsRead } from "../api/notifications";
import { colors, fontFamily, radius, spacing } from "../theme";
import { formatRelativeTimestamp } from "../utils/date";
import type { Notification } from "../types";

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.list}
      data={notifications}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        !isLoading ? <Text style={styles.emptyText}>Henüz bir bildirimin yok.</Text> : null
      }
      renderItem={({ item }) => (
        <View style={[styles.row, !item.is_read && styles.rowUnread]}>
          <Feather name="bell" size={18} color={colors.primary} />
          <View style={styles.textColumn}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{formatRelativeTimestamp(item.created_at)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowUnread: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textColumn: {
    flex: 1,
    gap: 2,
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

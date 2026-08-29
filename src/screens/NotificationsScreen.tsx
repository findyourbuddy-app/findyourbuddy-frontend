import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listMyNotifications, markMyNotificationsRead } from "../api/notifications";
import { EventRatingModal } from "../components/overlays/EventRatingModal";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{ eventId: number; title: string; creatorName?: string } | null>(null);

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const loadNotifications = useCallback(async () => {
    if (notificationsRef.current.length === 0) {
      setIsLoading(true);
    }
    try {
      const list = await listMyNotifications();
      setNotifications(list);
    } catch {
      if (notificationsRef.current.length === 0) {
        Alert.alert(
          language === "en" ? "Error" : "Bir sorun oluştu",
          language === "en" ? "Notifications could not be loaded. Please try again." : "Bildirimler yüklenemedi. Lütfen tekrar dene."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const list = await listMyNotifications();
      setNotifications(list);
    } catch {
      // transient failure ignore
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      markMyNotificationsRead()
        .then(() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        })
        .catch(() => {});
      const interval = setInterval(() => {
        loadNotifications();
      }, 15000);
      return () => clearInterval(interval);
    }, [loadNotifications])
  );

  function getNotificationMeta(title?: string | null, body?: string | null) {
    const lowercaseTitle = (title || "").toLowerCase();
    const lowercaseBody = (body || "").toLowerCase();

    if (
      lowercaseTitle.includes("nasıldı") ||
      lowercaseBody.includes("nasıldı") ||
      lowercaseTitle.includes("buluştun mu") ||
      lowercaseBody.includes("buluştun mu") ||
      lowercaseTitle.includes("değerlendir") ||
      lowercaseBody.includes("değerlendir")
    ) {
      return { icon: "star" as const, color: "#F1C40F", type: "feedback" };
    }

    if (lowercaseTitle.includes("double buddy")) {
      return { icon: "users" as const, color: colors.primary, type: "double_buddy" };
    }

    if (
      lowercaseTitle.includes("beğeni") ||
      lowercaseBody.includes("beğendi") ||
      lowercaseBody.includes("like")
    ) {
      return { icon: "heart" as const, color: "#FF2E93", type: "like" };
    }

    if (
      lowercaseTitle.includes("doğrulama") ||
      lowercaseTitle.includes("mavi tik") ||
      lowercaseBody.includes("selfie") ||
      lowercaseBody.includes("doğrulandı")
    ) {
      return { icon: "check-circle" as const, color: "#2ECC71", type: "verification" };
    }

    if (
      lowercaseTitle.includes("etkinlik") ||
      lowercaseTitle.includes("katılım") ||
      lowercaseTitle.includes("grup") ||
      lowercaseBody.includes("etkinlik")
    ) {
      return { icon: "calendar" as const, color: colors.primary, type: "event" };
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

    return { icon: "bell" as const, color: colors.primary, type: "general" };
  }

  function formatNotificationContent(title: string, body: string) {
    return { title, body };
  }

  function parseNotificationData(item: Notification): Record<string, any> {
    let raw: any = item.data;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    return raw && typeof raw === "object" ? raw : {};
  }

  function pickId(...values: unknown[]): number | null {
    for (const value of values) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  function handlePressNotification(item: Notification) {
    const data = parseNotificationData(item);
    const meta = getNotificationMeta(item.title, item.body);
    const type = item.notification_type ?? "";

    const eventId = pickId(item.event_id, data.event_id, data.eventId);
    const matchId = pickId(item.match_id, data.match_id);
    const otherUserId = pickId(data.other_user_id, data.sender_id, data.otherUserId);
    const otherUserName =
      typeof data.other_user_name === "string" && data.other_user_name.trim()
        ? data.other_user_name
        : "Kanka";

    const openEvent = (opts?: { autoOpenRequests?: boolean; autoOpenRating?: boolean }) => {
      if (eventId) {
        navigation.navigate("EventDetail", { eventId, ...opts });
      } else {
        navigation.navigate("Tabs", { screen: "Discover" });
      }
    };
    const openChat = () => {
      if (matchId && otherUserId) {
        navigation.navigate("Chat", { matchId, otherUserId, otherUserName });
      } else {
        navigation.navigate("Tabs", { screen: "Messages" });
      }
    };

    // Route by the explicit type first.
    switch (type) {
      case "like":
        navigation.navigate("LikesReceived");
        return;
      case "match":
      case "message":
        openChat();
        return;
      case "match_feedback":
        openEvent({ autoOpenRating: true });
        return;
      case "event_request":
      case "event_join_request":
        openEvent({ autoOpenRequests: true });
        return;
      case "event":
      case "event_response":
        openEvent();
        return;
      case "verification":
        navigation.navigate("Profile");
        return;
      case "double_buddy_invite":
        navigation.navigate("Profile", { openDoubleBuddy: true });
        return;
      case "double_buddy_accepted":
      case "double_buddy_rejected":
        navigation.navigate("Profile");
        return;
      case "event_rejected":
        // The event no longer exists -- nothing to open.
        return;
    }

    // Legacy records saved before notification_type existed: fall back to the
    // keyword-derived meta.
    if (meta.type === "like") {
      navigation.navigate("LikesReceived");
      return;
    }
    if (meta.type === "verification" || meta.type === "double_buddy") {
      navigation.navigate("Profile");
      return;
    }
    if (meta.type === "feedback") {
      openEvent({ autoOpenRating: true });
      return;
    }
    if (meta.type === "event" || eventId) {
      const isJoinRequest =
        item.title.toLowerCase().includes("katılım isteği") ||
        item.body.toLowerCase().includes("katılmak istiyor");
      openEvent({ autoOpenRequests: isJoinRequest });
      return;
    }
    if (matchId) {
      openChat();
      return;
    }
    navigation.navigate("Tabs", { screen: "Messages" });
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
      {notifications.length > 0 ? <View style={styles.timelineLine} /> : null}
      <FlatList
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.list}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[accentColor]}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${accentColor}15` }]}>
              <Feather name="bell-off" size={32} color={accentColor} />
            </View>
            <Text style={styles.emptyTitle}>
              {language === "en" ? "No Notifications Yet" : "Henüz Bildirimin Yok"}
            </Text>
            <Text style={styles.emptySub}>
              {language === "en"
                ? "When you receive likes, event updates, or new messages, they will show up right here."
                : "Yeni bir beğeni, mesaj veya etkinlik güncellemesi aldığında hepsi burada görünecek."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getNotificationMeta(item.title, item.body);
          const formatted = formatNotificationContent(item.title || "Bildirim", item.body || "");

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
                <Feather name={meta.icon as any} size={18} color={meta.color} />
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

      <EventRatingModal
        visible={ratingModalData !== null}
        eventId={ratingModalData?.eventId || 0}
        eventTitle={ratingModalData?.title || ""}
        creatorName={ratingModalData?.creatorName}
        onClose={() => setRatingModalData(null)}
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
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    maxWidth: 320,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
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
});

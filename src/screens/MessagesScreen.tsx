import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChatListItem } from "../components/cards/ChatListItem";
import { MatchPreviewCard } from "../components/cards/MatchPreviewCard";
import { Chip } from "../components/ui/Chip";
import { listMyMatches } from "../api/matches";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { useAppTheme } from "../context/ThemeContext";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { Match } from "../types";
import { Alert } from "../utils/alert";
import { isToday } from "../utils/date";

type MessagesNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Messages">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function MessagesScreen() {
  const navigation = useNavigation<MessagesNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, bgGradient } = useAppTheme();

  const [matches, setMatches] = useState<Match[]>([]);
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "matches" | "groups">("all");

  const loadMatches = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) {
        setIsRefreshing(true);
      }
      try {
        setMatches(await listMyMatches());
        await refreshUnread();
      } catch {
        Alert.alert(
          language === "en" ? "Error" : "Bir sorun oluştu",
          language === "en"
            ? "Matches could not be loaded. Please try again."
            : "Eşleşmeler yüklenemedi. Lütfen tekrar dene."
        );
      } finally {
        if (showSpinner) {
          setIsRefreshing(false);
        }
      }
    },
    [refreshUnread, language]
  );

  useFocusEffect(
    useCallback(() => {
      loadMatches(false);
    }, [loadMatches])
  );

  function openChat(match: Match): void {
    navigation.navigate("Chat", {
      matchId: match.id,
      otherUserId: match.other_user.id,
      otherUserName: match.other_user.display_name,
      otherUserPhoto: match.other_user.photo_url,
      needsFeedback: match.needs_feedback,
      eventTitle: match.event_title || undefined,
      isGroupEvent: match.event_is_group || false,
    });
  }

  const displayMatches = useMemo(() => {
    let list = matches.filter((match) =>
      match.other_user.display_name.toLowerCase().includes(query.trim().toLowerCase())
    );

    if (activeFilter === "unread") {
      list = list.filter(
        (m) => m.last_message && m.last_message.sender_id !== user?.id && !m.last_message.is_read
      );
    } else if (activeFilter === "matches") {
      list = list.filter((m) => !m.event_is_group);
    } else if (activeFilter === "groups") {
      list = list.filter((m) => m.event_is_group);
    }

    return list;
  }, [matches, query, activeFilter, user]);

  const newMatches = matches.filter((match) => isToday(match.created_at));

  const unreadCount = useMemo(
    () =>
      matches.filter(
        (m) => m.last_message && m.last_message.sender_id !== user?.id && !m.last_message.is_read
      ).length,
    [matches, user]
  );

  const filterTabs: { id: typeof activeFilter; label: string; count: number }[] = [
    { id: "all", label: language === "en" ? "💬 All" : "💬 Tümü", count: matches.length },
    { id: "unread", label: language === "en" ? "🔴 Unread" : "🔴 Okunmamış", count: unreadCount },
    { id: "matches", label: language === "en" ? "🤝 Matches" : "🤝 Eşleşmeler", count: matches.filter((m) => !m.event_is_group).length },
    { id: "groups", label: language === "en" ? "👥 Groups" : "👥 Gruplar", count: matches.filter((m) => m.event_is_group).length },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.list}
        data={displayMatches}
        keyExtractor={(match) => String(match.id)}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadMatches(true)} />}
        ListHeaderComponent={
          <View style={[styles.headerArea, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.topRow}>
              <Text style={typeScale.h1}>{t("messagesHeader")}</Text>
              <Pressable
                style={styles.iconButton}
                onPress={() => navigation.navigate("Settings")}
                accessibilityRole="button"
                accessibilityLabel={t("settings")}
              >
                <Feather name="settings" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                placeholder={t("searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabContainer}>
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                    onPress={() => setActiveFilter(tab.id)}
                  >
                    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 ? (
                      <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                        <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                          {tab.count}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {newMatches.length > 0 && activeFilter === "all" ? (
              <View style={styles.section}>
                <Text style={styles.sectionSubTitle}>{t("newMatchesTitle")}</Text>
                {newMatches.map((match) => (
                  <View key={match.id} style={styles.matchCardWrapper}>
                    <MatchPreviewCard match={match} onPressMessage={() => openChat(match)} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("noMatchesYetFindEvents")}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.chatItemWrapper}>
            <ChatListItem
              match={item}
              currentUserId={user ? user.id : 0}
              onPress={() => openChat(item)}
              onBlocked={() => loadMatches(true)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 75,
  },
  headerArea: {
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  matchCardWrapper: {
    marginBottom: spacing.sm,
  },
  chatItemWrapper: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.xl,
    maxHeight: "80%",
    minHeight: "55%",
    gap: spacing.md,
    ...shadows.card,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalList: {
    marginTop: spacing.xs,
  },
  filterTabContainer: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.surface,
    fontFamily: fontFamily.bodySemiBold,
  },
  filterBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: colors.surface,
  },
  sectionSubTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});

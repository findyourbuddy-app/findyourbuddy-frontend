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
import { Avatar } from "../components/ui/Avatar";
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

  const { matches, loadMatches, isLoading } = useMessagesContext();
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadMatches(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMatches]);

  useFocusEffect(
    useCallback(() => {
      loadMatches(true);
    }, [loadMatches])
  );

  async function openUserProfile(userId: number): Promise<void> {
    try {
      const { getUserById } = require("../api/users");
      const fetchedUser = await getUserById(userId);
      if (fetchedUser) {
        navigation.navigate("CandidateProfile", {
          candidate: fetchedUser,
          onSwipeLeft: () => {},
          onSwipeRight: () => {},
          onSwipeUp: () => {},
        });
      }
    } catch {
      Alert.alert("Hata", "Kullanıcı profili açılırken bir sorun oluştu.");
    }
  }

  function openChat(match: Match): void {
    navigation.navigate("Chat", {
      matchId: match.id,
      otherUserId: match.other_user.id,
      otherUserName: match.other_user.display_name,
      otherUserPhoto: match.other_user.photo_url,
      needsFeedback: match.needs_feedback,
      eventTitle: match.event_title || undefined,
      isGroupEvent: match.event_is_group || false,
      eventCreatorId: match.event_creator_id || undefined,
      eventId: match.event_id || undefined,
    });
  }

  const [chatTypeFilter, setChatTypeFilter] = useState<"all" | "matches" | "direct" | "group">("all");

  const displayMatches = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Group event matches should be consolidated so each group event appears ONCE as a Group Chat!
    const seenGroupEvents = new Set<number>();
    const consolidatedList: Match[] = [];

    for (const match of matches) {
      if (match.event_is_group && match.event_id) {
        if (!seenGroupEvents.has(match.event_id)) {
          seenGroupEvents.add(match.event_id);
          consolidatedList.push(match);
        }
      } else {
        consolidatedList.push(match);
      }
    }

    let list = consolidatedList;
    if (chatTypeFilter === "direct") {
      list = list.filter((m) => !m.event_is_group);
    } else if (chatTypeFilter === "group") {
      list = list.filter((m) => m.event_is_group);
    } else if (chatTypeFilter === "matches") {
      list = list.filter((m) => !m.last_message);
    }

    list.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    if (q) {
      list = list.filter((match) => {
        const nameMatch = match.other_user.display_name.toLowerCase().includes(q);
        const eventMatch = match.event_title ? match.event_title.toLowerCase().includes(q) : false;
        const uniMatch = match.other_user.university ? match.other_user.university.toLowerCase().includes(q) : false;
        const msgMatch = match.last_message?.content ? match.last_message.content.toLowerCase().includes(q) : false;
        return nameMatch || eventMatch || uniMatch || msgMatch;
      });
    }

    if (showUnreadOnly) {
      list = list.filter(
        (m) => m.last_message && m.last_message.sender_id !== user?.id && !m.last_message.is_read
      );
    }

    return list;
  }, [matches, query, showUnreadOnly, user, chatTypeFilter]);

  const dropdownResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return displayMatches.slice(0, 5).map((match) => {
      let matchType: "name" | "event" | "location" = "name";
      let matchLabel = match.other_user.display_name;
      if (match.event_title && match.event_title.toLowerCase().includes(q)) {
        matchType = "event";
        matchLabel = match.event_title;
      } else if (match.other_user.university && match.other_user.university.toLowerCase().includes(q)) {
        matchType = "location";
        matchLabel = match.other_user.university;
      }
      return { match, matchType, matchLabel };
    });
  }, [displayMatches, query]);

  const newMatches = matches.filter((match) => !match.event_is_group && isToday(match.created_at));

  const unreadCount = useMemo(
    () =>
      matches.filter(
        (m) => m.last_message && m.last_message.sender_id !== user?.id && !m.last_message.is_read
      ).length,
    [matches, user]
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.list}
        data={displayMatches}
        keyExtractor={(match) => String(match.id)}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
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

            <View style={styles.searchBarContainer}>
              <View style={styles.searchBar}>
                <Feather name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  placeholder={language === "en" ? "Search name, event, or location..." : "İsim, etkinlik veya mekan ara..."}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8}>
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>

              {dropdownResults.length > 0 ? (
                <View style={styles.searchDropdown}>
                  {dropdownResults.map(({ match, matchType, matchLabel }) => (
                    <Pressable
                      key={match.id}
                      style={styles.dropdownRow}
                      onPress={() => {
                        openChat(match);
                        setQuery("");
                      }}
                    >
                      <Avatar name={match.other_user.display_name} photoUrl={match.other_user.photo_url} size={36} />
                      <View style={styles.dropdownTextCol}>
                        <Text style={styles.dropdownName}>{match.other_user.display_name}</Text>
                        <Text style={styles.dropdownMatchLabel} numberOfLines={1}>
                          {matchType === "event" ? `📅 ${matchLabel}` : matchType === "location" ? `📍 ${matchLabel}` : match.event_title ? `💬 ${match.event_title}` : match.other_user.university || ""}
                        </Text>
                      </View>
                      <View style={styles.dropdownBadge}>
                        <Text style={styles.dropdownBadgeText}>
                          {matchType === "event"
                            ? (language === "en" ? "Event" : "Etkinlik")
                            : matchType === "location"
                            ? (language === "en" ? "Location" : "Mekan")
                            : (language === "en" ? "Name" : "İsim")}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Chat Type Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: spacing.xs, marginVertical: spacing.xs }}>
              <Chip
                label={language === "en" ? "All" : "Hepsi"}
                active={chatTypeFilter === "all"}
                onPress={() => setChatTypeFilter("all")}
              />
              <Chip
                label={language === "en" ? "New Matches" : "Yeni Eşleşmeler"}
                active={chatTypeFilter === "matches"}
                onPress={() => setChatTypeFilter("matches")}
              />
              <Chip
                label={language === "en" ? "Direct DMs" : "Özel Mesajlar"}
                active={chatTypeFilter === "direct"}
                onPress={() => setChatTypeFilter("direct")}
              />
              <Chip
                label={language === "en" ? "Group Channels" : "Grup Sohbetleri"}
                active={chatTypeFilter === "group"}
                onPress={() => setChatTypeFilter("group")}
              />
            </ScrollView>

            {unreadCount > 0 ? (
              <Pressable
                style={styles.unreadBanner}
                onPress={() => setShowUnreadOnly((current) => !current)}
                accessibilityRole="button"
              >
                <Text style={styles.unreadBannerText}>
                  {showUnreadOnly
                    ? (language === "en" ? "Showing unread only" : "Sadece okunmamışlar gösteriliyor")
                    : language === "en"
                    ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                    : `${unreadCount} okunmamış mesaj`}
                </Text>
                <Feather name={showUnreadOnly ? "x" : "chevron-right"} size={16} color={colors.surface} />
              </Pressable>
            ) : null}

            {newMatches.length > 0 && !showUnreadOnly && chatTypeFilter === "matches" ? (
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
              onPressAvatar={() => openUserProfile(item.other_user.id)}
            />
          </View>
        )}
        removeClippedSubviews={true}
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
    marginBottom: spacing.lg,
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
  searchBarContainer: {
    position: "relative",
    zIndex: 100,
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
  searchDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownTextCol: {
    flex: 1,
  },
  dropdownName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dropdownMatchLabel: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dropdownBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  dropdownBadgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.primary,
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
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accentRed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    ...shadows.soft,
  },
  unreadBannerText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.surface,
  },
  sectionSubTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});

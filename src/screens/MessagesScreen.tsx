import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
import { SectionHeader } from "../components/ui/SectionHeader";
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

const INITIAL_CHAT_LIMIT = 5;

export function MessagesScreen() {
  const navigation = useNavigation<MessagesNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, bgGradient } = useAppTheme();

  const [matches, setMatches] = useState<Match[]>([]);
  const [query, setQuery] = useState("");
  const [modalQuery, setModalQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allMatchesModalVisible, setAllMatchesModalVisible] = useState(false);

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
    setAllMatchesModalVisible(false);
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

  const filtered = matches.filter((match) =>
    match.other_user.display_name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const modalFiltered = matches.filter((match) =>
    match.other_user.display_name.toLowerCase().includes(modalQuery.trim().toLowerCase())
  );

  const groupChats = filtered.filter((match) => match.event_is_group);
  const buddyChats = filtered.filter((match) => !match.event_is_group);

  const newMatches = filtered.filter((match) => isToday(match.created_at));
  const mainConversations = buddyChats.slice(0, INITIAL_CHAT_LIMIT);
  const totalCount = buddyChats.length;

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.list}
        data={mainConversations}
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

            {newMatches.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t("newMatchesTitle")} actionLabel={t("today")} />
                {newMatches.map((match) => (
                  <View key={match.id} style={styles.matchCardWrapper}>
                    <MatchPreviewCard match={match} onPressMessage={() => openChat(match)} />
                  </View>
                ))}
              </View>
            ) : null}

            {groupChats.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={language === "en" ? "👥 Group Chats" : "👥 Grup Sohbetleri"} />
                {groupChats.map((match) => (
                  <View key={match.id} style={styles.chatItemWrapper}>
                    <ChatListItem
                      match={match}
                      currentUserId={user.id}
                      onPress={() => openChat(match)}
                      onBlocked={() => loadMatches(true)}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <SectionHeader
              title={language === "en" ? "💬 Birebir Sohbetler" : "💬 Birebir Sohbetler"}
              actionLabel={totalCount > INITIAL_CHAT_LIMIT ? `${t("seeAll")} (${totalCount})` : t("seeAll")}
              onActionPress={() => setAllMatchesModalVisible(true)}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("noMatchesYetFindEvents")}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.chatItemWrapper}>
            <ChatListItem
              match={item}
              currentUserId={user.id}
              onPress={() => openChat(item)}
              onBlocked={() => loadMatches(true)}
            />
          </View>
        )}
      />

      {/* See All Conversations Popup Modal */}
      <Modal
        visible={allMatchesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAllMatchesModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAllMatchesModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={typeScale.h2}>
                {language === "en" ? `All Conversations (${modalFiltered.length})` : `Tüm Sohbetler (${modalFiltered.length})`}
              </Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setAllMatchesModalVisible(false)}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalSearchBar}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                placeholder={t("searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={modalQuery}
                onChangeText={setModalQuery}
                style={styles.searchInput}
              />
            </View>

            <FlatList
              style={styles.modalList}
              data={modalFiltered}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t("noMatchesYetFindEvents")}</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.chatItemWrapper}>
                  <ChatListItem
                    match={item}
                    currentUserId={user.id}
                    onPress={() => openChat(item)}
                    onBlocked={() => loadMatches(true)}
                  />
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
});

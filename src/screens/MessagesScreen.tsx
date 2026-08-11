import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChatListItem } from "../components/cards/ChatListItem";
import { MatchPreviewCard } from "../components/cards/MatchPreviewCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { listMyMatches } from "../api/matches";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { isToday } from "../utils/date";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Match } from "../types";

type MessagesNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Messages">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function MessagesScreen() {
  const navigation = useNavigation<MessagesNavigationProp>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setMatches(await listMyMatches());
      await refreshUnread();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  function openChat(match: Match): void {
    navigation.navigate("Chat", { matchId: match.id, otherUserName: match.other_user.display_name });
  }

  const filtered = matches.filter((match) =>
    match.other_user.display_name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const newMatches = filtered.filter((match) => isToday(match.created_at));
  const allMatches = filtered;

  if (!user) {
    return null;
  }

  return (
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.list}
      data={allMatches}
      keyExtractor={(match) => String(match.id)}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadMatches} />}
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <View style={styles.topRow}>
            <View>
              <Text style={typeScale.eyebrow}>Sohbete Devam Et</Text>
              <Text style={typeScale.h1}>Mesajlar</Text>
            </View>
            <Pressable
              style={styles.composeButton}
              onPress={() => Alert.alert("Yakında", "Yeni sohbet başlatma yakında burada olacak.")}
            >
              <Feather name="edit-2" size={16} color={colors.surface} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <TextInput
              placeholder="Kanka ara"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
          </View>

          {newMatches.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Yeni Eşleşme" actionLabel="Bugün" />
              {newMatches.map((match) => (
                <View key={match.id} style={styles.matchCardWrapper}>
                  <MatchPreviewCard match={match} onPressMessage={() => openChat(match)} />
                </View>
              ))}
            </View>
          ) : null}

          <SectionHeader title="Sohbetlerin" actionLabel="Tümünü gör" />
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>Henüz bir eşleşmen yok. Keşfet'ten yeni etkinlikler bul!</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.chatItemWrapper}>
          <ChatListItem match={item} currentUserId={user.id} onPress={() => openChat(item)} />
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  headerArea: {
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  composeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
});

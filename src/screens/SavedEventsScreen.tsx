import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { EventListItem } from "../components/cards/EventListItem";
import { deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { colors, fontFamily, spacing } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Bookmark } from "../types";

type SavedEventsNavigationProp = NativeStackNavigationProp<MainStackParamList, "SavedEvents">;

export function SavedEventsScreen() {
  const navigation = useNavigation<SavedEventsNavigationProp>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await listMyBookmarks();
      setBookmarks(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [loadBookmarks])
  );

  async function handleRemove(eventId: number): Promise<void> {
    setBookmarks((current) => current.filter((bookmark) => bookmark.event.id !== eventId));
    try {
      await deleteBookmark(eventId);
    } catch {
      loadBookmarks();
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="bookmark" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Henüz kaydettiğin bir etkinlik yok.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.content}
      data={bookmarks}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <EventListItem
          event={item.event}
          bookmarked
          onToggleBookmark={() => handleRemove(item.event.id)}
          onPress={() => navigation.navigate("EventDetail", { eventId: item.event.id })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

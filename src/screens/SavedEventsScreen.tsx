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

import { useAppTheme } from "../context/ThemeContext";

type SavedEventsNavigationProp = NativeStackNavigationProp<MainStackParamList, "SavedEvents">;

export function SavedEventsScreen() {
  const navigation = useNavigation<SavedEventsNavigationProp>();
  const { bgGradient, accentColor, language } = useAppTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    if (bookmarks.length === 0) {
      setIsLoading(true);
    }
    try {
      const data = await listMyBookmarks();
      setBookmarks(data);
    } finally {
      setIsLoading(false);
    }
  }, [bookmarks.length]);

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
      <View style={[styles.center, { backgroundColor: bgGradient[0] }]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: bgGradient[0] }]}>
        <Feather name="bookmark" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          {language === "en" ? "You haven't saved any events yet." : "Henüz kaydettiğin bir etkinlik yok."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
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

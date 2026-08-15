import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EventCard } from "../components/cards/EventCard";
import { EventListItem } from "../components/cards/EventListItem";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { listEvents } from "../api/events";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../constants/categories";
import { colors, fontFamily, spacing, typeScale } from "../theme";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type DiscoverNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Discover">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function DiscoverScreen() {
  const navigation = useNavigation<DiscoverNavigationProp>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(async (category: string | null) => {
    setIsRefreshing(true);
    try {
      setEvents(await listEvents(category ?? undefined));
    } catch {
      Alert.alert("Bir sorun oluştu", "Etkinlikler yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      const bookmarks = await listMyBookmarks();
      setBookmarkedIds(new Set(bookmarks.map((bookmark) => bookmark.event.id)));
    } catch {
      // Bookmarks are a non-critical enhancement; failing to load them shouldn't
      // block the events list itself.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents(selectedCategory);
      loadBookmarks();
      // selectedCategory intentionally omitted: chip taps already trigger their own reload
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadEvents, loadBookmarks])
  );

  function handleSelectCategory(slug: string): void {
    const next = selectedCategory === slug ? null : slug;
    setSelectedCategory(next);
    loadEvents(next);
  }

  async function toggleBookmark(eventId: number): Promise<void> {
    const wasBookmarked = bookmarkedIds.has(eventId);
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (wasBookmarked) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });

    try {
      if (wasBookmarked) {
        await deleteBookmark(eventId);
      } else {
        await createBookmark(eventId);
      }
    } catch {
      setBookmarkedIds((current) => {
        const next = new Set(current);
        if (wasBookmarked) {
          next.add(eventId);
        } else {
          next.delete(eventId);
        }
        return next;
      });
      Alert.alert("Bir sorun oluştu", "Kaydetme işlemi tamamlanamadı. Lütfen tekrar dene.");
    }
  }

  function goToSwipe(event: Event): void {
    navigation.navigate("Swipe", { eventId: event.id, eventTitle: event.title });
  }

  function goToDetail(event: Event): void {
    navigation.navigate("EventDetail", { eventId: event.id });
  }

  const [featured, ...rest] = events;

  return (
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.list}
      data={rest}
      keyExtractor={(event) => String(event.id)}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadEvents(selectedCategory)} />
      }
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <View style={styles.topRow}>
            <View style={styles.locationPill}>
              <Feather name="map-pin" size={14} color={colors.textPrimary} />
              <Text style={styles.locationText}>Kadıköy, İstanbul</Text>
              <Feather name="chevron-down" size={14} color={colors.textSecondary} />
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => navigation.navigate("CreateEvent")}
                accessibilityRole="button"
                accessibilityLabel="Etkinlik oluştur"
              >
                <Feather name="plus" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => navigation.navigate("Notifications")}
                accessibilityRole="button"
                accessibilityLabel="Bildirimler"
              >
                <Feather name="bell" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("Profile")}
                accessibilityRole="button"
                accessibilityLabel="Profilim"
              >
                <Avatar name={user?.display_name ?? "?"} photoUrl={user?.photo_url} size={36} />
              </Pressable>
            </View>
          </View>

          <Text style={[typeScale.display, styles.title]}>
            Bugün ne yapmak istersin, {user?.display_name ?? ""}?
          </Text>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(category) => category.slug}
            renderItem={({ item }) => (
              <Chip
                label={item.label}
                active={selectedCategory === item.slug}
                onPress={() => handleSelectCategory(item.slug)}
              />
            )}
            style={styles.chipList}
          />

          {featured ? (
            <View style={styles.featuredWrapper}>
              <EventCard
                event={featured}
                bookmarked={bookmarkedIds.has(featured.id)}
                onToggleBookmark={() => toggleBookmark(featured.id)}
                onPressJoin={() => goToSwipe(featured)}
                onPress={() => goToDetail(featured)}
              />
            </View>
          ) : null}

          {rest.length > 0 ? (
            <SectionHeader eyebrow="Hafta Sonu Havası" title="Yakınındaki Popüler Aktiviteler" actionLabel="Tümü" />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        events.length === 0 && !isRefreshing ? (
          <Text style={styles.emptyText}>
            Şu an gösterilecek etkinlik yok. Daha sonra tekrar kontrol et!
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.listItemWrapper}>
          <EventListItem
            event={item}
            bookmarked={bookmarkedIds.has(item.id)}
            onToggleBookmark={() => toggleBookmark(item.id)}
            onPress={() => goToDetail(item)}
          />
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
    alignItems: "center",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  locationText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: spacing.sm,
  },
  chipList: {
    marginLeft: -spacing.xs,
  },
  featuredWrapper: {
    marginTop: spacing.sm,
  },
  listItemWrapper: {
    marginBottom: spacing.md,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

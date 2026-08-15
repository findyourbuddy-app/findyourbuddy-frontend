import { useCallback, useState, useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
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

const LIMIT = 15;

export function DiscoverScreen() {
  const navigation = useNavigation<DiscoverNavigationProp>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Sorting and Location States
  const [sortBy, setSortBy] = useState<"date" | "distance" | "popularity">("date");
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const getDistanceInKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }, []);

  const requestDistanceSort = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum İzni Gerekli", "Etkinlikleri mesafeye göre sıralayabilmek için konum izni vermen gerekiyor.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setUserCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setSortBy("distance");
    } catch {
      Alert.alert("Konum Alınamadı", "Konumunuz alınırken bir sorun oluştu.");
    } finally {
      setIsLocating(false);
    }
  }, []);

  function openSortPicker(): void {
    Alert.alert("Nasıl sıralansın?", undefined, [
      { text: "Tarih ve Saat", onPress: () => setSortBy("date") },
      { text: "En Yakın (Konuma Göre)", onPress: () => requestDistanceSort() },
      { text: "Popülerlik (Katılımcı Sayısı)", onPress: () => setSortBy("popularity") },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  const sortedEvents = useMemo(() => {
    if (events.length === 0) return [];
    
    const list = [...events];
    if (sortBy === "distance" && userCoords) {
      return list.sort((a, b) => {
        const distA = getDistanceInKm(a.latitude, a.longitude, userCoords.latitude, userCoords.longitude);
        const distB = getDistanceInKm(b.latitude, b.longitude, userCoords.latitude, userCoords.longitude);
        return distA - distB;
      });
    }
    if (sortBy === "popularity") {
      return list.sort((a, b) => b.attendee_count - a.attendee_count);
    }
    // Default: Sort by date
    return list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events, sortBy, userCoords, getDistanceInKm]);

  const loadEvents = useCallback(async (category: string | null) => {
    setIsRefreshing(true);
    setHasMore(true);
    try {
      const result = await listEvents(category ?? undefined, true, 0, LIMIT);
      setEvents(result);
      setHasMore(result.length === LIMIT);
    } catch {
      Alert.alert("Bir sorun oluştu", "Etkinlikler yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadMoreEvents = useCallback(async () => {
    if (isLoadingMore || !hasMore || isRefreshing) return;
    
    setIsLoadingMore(true);
    try {
      const currentLength = events.length;
      const result = await listEvents(selectedCategory ?? undefined, true, currentLength, LIMIT);
      setEvents((prev) => [...prev, ...result]);
      setHasMore(result.length === LIMIT);
    } catch {
      // Fail silently to avoid breaking infinite scrolling user experience
    } finally {
      setIsLoadingMore(false);
    }
  }, [events.length, selectedCategory, hasMore, isLoadingMore, isRefreshing]);

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

  const [featured, rest] = useMemo(() => {
    const list = sortedEvents;
    return [list[0] || null, list.slice(1)];
  }, [sortedEvents]);

  const getEventDistanceLabel = useCallback((event: Event) => {
    if (sortBy === "distance" && userCoords) {
      const dist = getDistanceInKm(event.latitude, event.longitude, userCoords.latitude, userCoords.longitude);
      if (dist < 1) {
        return `${Math.round(dist * 1000)} m`;
      }
      return `${dist.toFixed(1)} km`;
    }
    return undefined;
  }, [sortBy, userCoords, getDistanceInKm]);

  return (
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.list}
      data={rest}
      keyExtractor={(event) => String(event.id)}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadEvents(selectedCategory)} />
      }
      onEndReached={loadMoreEvents}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <View style={styles.topRow}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              <View style={styles.locationPill}>
                <Feather name="map-pin" size={14} color={colors.textPrimary} />
                <Text style={styles.locationText}>İstanbul</Text>
              </View>
              <Pressable style={styles.sortPill} onPress={openSortPicker} disabled={isLocating}>
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ width: 14, height: 14 }} />
                ) : (
                  <>
                    <Feather
                      name={sortBy === "distance" ? "navigation" : sortBy === "popularity" ? "trending-up" : "clock"}
                      size={12}
                      color={colors.primary}
                    />
                    <Text style={styles.sortText}>
                      {sortBy === "distance" ? "En Yakın" : sortBy === "popularity" ? "Popüler" : "Tarih"}
                    </Text>
                  </>
                )}
              </Pressable>
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
                distanceLabel={getEventDistanceLabel(featured)}
              />
            </View>
          ) : null}

          {rest.length > 0 ? (
            <SectionHeader
              eyebrow="Hafta Sonu Havası"
              title="Yakınındaki Popüler Aktiviteler"
              actionLabel="Sırala"
              onActionPress={openSortPicker}
            />
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
            distanceLabel={getEventDistanceLabel(item)}
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
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sortText: {
    fontSize: 12,
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
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
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
});

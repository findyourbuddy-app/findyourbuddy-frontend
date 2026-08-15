import { useCallback, useState, useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EventCard } from "../components/cards/EventCard";
import { EventListItem } from "../components/cards/EventListItem";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { listEvents } from "../api/events";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../constants/categories";
import { colors, fontFamily, spacing, typeScale, radius, shadows } from "../theme";
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
  const [sortBy, setSortBy] = useState<"date" | "distance" | "popularity" | undefined>(undefined);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [isMapView, setIsMapView] = useState(false);
  const [selectedMapEvent, setSelectedMapEvent] = useState<Event | null>(null);

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
    setSortPickerVisible(true);
  }

  const sortOptions = [
    {
      key: "date",
      label: "Tarih ve Saat",
      icon: "clock" as const,
      onPress: () => setSortBy(sortBy === "date" ? undefined : "date")
    },
    {
      key: "distance",
      label: "En Yakın (Konuma Göre)",
      icon: "navigation" as const,
      onPress: () => {
        if (sortBy === "distance") {
          setSortBy(undefined);
        } else {
          requestDistanceSort();
        }
      }
    },
    {
      key: "popularity",
      label: "Popülerlik (Katılımcı Sayısı)",
      icon: "trending-up" as const,
      onPress: () => setSortBy(sortBy === "popularity" ? undefined : "popularity"),
    },
  ];

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
    <>
    <FlatList
      style={styles.background}
      contentContainerStyle={styles.list}
      data={isMapView ? [] : rest}
      keyExtractor={(event) => String(event.id)}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadEvents(selectedCategory)} />
      }
      onEndReached={isMapView ? undefined : loadMoreEvents}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isMapView ? (
          <View style={styles.mapCanvasContainer}>
            <Text style={styles.mapCanvasTitle}>📍 Etkinlik Haritası</Text>
            <View style={styles.mapCanvas}>
              {/* Radar pulse in center representing user */}
              <View style={styles.userPulseOuter}>
                <View style={styles.userPulseInner} />
              </View>
              {/* Event pins */}
              {events.map((event) => {
                const centerLat = userCoords?.latitude ?? 41.0082;
                const centerLng = userCoords?.longitude ?? 28.9784;
                
                const latDiff = event.latitude - centerLat;
                const lngDiff = event.longitude - centerLng;
                
                const leftOffset = 150 + lngDiff * 1200;
                const topOffset = 140 - latDiff * 1200;
                
                const x = Math.max(10, Math.min(290, leftOffset));
                const y = Math.max(10, Math.min(270, topOffset));

                return (
                  <Pressable
                    key={event.id}
                    style={[
                      styles.mapPin,
                      { left: x, top: y },
                      selectedMapEvent?.id === event.id && styles.mapPinSelected
                    ]}
                    onPress={() => setSelectedMapEvent(event)}
                  >
                    <Feather
                      name="map-pin"
                      size={20}
                      color={selectedMapEvent?.id === event.id ? colors.accentYellow : colors.primary}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Selected Event Card Overlay */}
            {selectedMapEvent && (
              <View style={styles.mapCallout}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.calloutTitle}>{selectedMapEvent.title}</Text>
                  <Text style={styles.calloutText} numberOfLines={1}>{selectedMapEvent.location_name}</Text>
                  <Text style={styles.calloutText}>{getEventDistanceLabel(selectedMapEvent) || "Mesafe hesaplanamadı"}</Text>
                </View>
                <View style={{ gap: spacing.xs }}>
                  <Pressable style={styles.calloutDetailBtn} onPress={() => goToDetail(selectedMapEvent)}>
                    <Text style={styles.calloutDetailBtnText}>Detay</Text>
                  </Pressable>
                  <Pressable style={styles.calloutCloseBtn} onPress={() => setSelectedMapEvent(null)}>
                    <Text style={styles.calloutCloseBtnText}>Kapat</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : isLoadingMore ? (
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
              <Pressable
                style={[styles.sortPill, isMapView && { backgroundColor: colors.primaryMuted }]}
                onPress={() => setIsMapView(!isMapView)}
              >
                <Feather name={isMapView ? "list" : "map"} size={12} color={colors.primary} />
                <Text style={styles.sortText}>{isMapView ? "Liste" : "Harita"}</Text>
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

          <Pressable
            style={styles.aiMatchingBanner}
            onPress={() => navigation.navigate("AIRecommendations")}
          >
            <LinearGradient
              colors={["#2D1B6B", "#6C5CE7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aiMatchingBannerGradient}
            >
              <View style={styles.aiMatchingTextCol}>
                <Text style={styles.aiMatchingTitle}>✨ AI Kanka Eşleştirici</Text>
                <Text style={styles.aiMatchingDesc}>Zodyak element ve ilgi alanı uyumunu hesapla!</Text>
              </View>
              <View style={styles.aiMatchingBadge}>
                <Text style={styles.aiMatchingBadgeText}>Hesapla</Text>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </View>
            </LinearGradient>
          </Pressable>

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
    <OptionPickerModal
      visible={sortPickerVisible}
      title="Nasıl sıralansın?"
      options={sortOptions}
      onDismiss={() => setSortPickerVisible(false)}
      selectedKey={sortBy || undefined}
    />
    </>
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
  mapCanvasContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapCanvasTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  mapCanvas: {
    width: "100%",
    height: 300,
    backgroundColor: "#0F0B26",
    borderRadius: radius.sm,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  userPulseOuter: {
    position: "absolute",
    left: 150,
    top: 140,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(108, 92, 231, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  userPulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  mapPin: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinSelected: {
    transform: [{ scale: 1.2 }],
  },
  mapCallout: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  calloutTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  calloutText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  calloutDetailBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  calloutDetailBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.surface,
  },
  calloutCloseBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignItems: "center",
  },
  calloutCloseBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  aiMatchingBanner: {
    marginTop: spacing.md,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.card,
  },
  aiMatchingBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiMatchingTextCol: {
    flex: 1,
    gap: 2,
  },
  aiMatchingTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
  },
  aiMatchingDesc: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
  },
  aiMatchingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 2,
  },
  aiMatchingBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
});

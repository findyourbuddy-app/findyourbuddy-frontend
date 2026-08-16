import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
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
import { EventsMapView } from "../components/maps/EventsMapView";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { LocationPickerModal } from "../components/overlays/LocationPickerModal";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { reverseGeocode } from "../api/geocoding";
import type { GeocodingResult } from "../api/geocoding";
import { hasValidCoordinates } from "../utils/location";
import { attendEvent, listEvents } from "../api/events";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, spacing, typeScale, radius, shadows } from "../theme";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type DiscoverNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Discover">,
  NativeStackNavigationProp<MainStackParamList>
>;

const LIMIT = 15;

function shortenPlaceLabel(displayName: string): string {
  return displayName.split(",").slice(0, 2).join(",").trim();
}

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
  const [cityLabel, setCityLabel] = useState("Konum Seç");
  const [isCityPickerVisible, setIsCityPickerVisible] = useState(false);
  const [mapEvents, setMapEvents] = useState<Event[]>([]);
  const [isLoadingMapEvents, setIsLoadingMapEvents] = useState(false);
  const [mapDateFilter, setMapDateFilter] = useState<"today" | "week" | "all">("all");

  // The map view isn't limited by list-view pagination -- it loads a much
  // larger batch once, on entry, so "haritada göster" actually means
  // everything in the system with a location, not just the first page.
  useEffect(() => {
    if (!isMapView) return;
    let cancelled = false;
    setIsLoadingMapEvents(true);
    listEvents(selectedCategory ?? undefined, true, 0, 200)
      .then((result) => {
        if (!cancelled) setMapEvents(result);
      })
      .catch(() => {
        // Best-effort; the map just shows whatever loaded before the failure.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMapEvents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMapView, selectedCategory]);

  const filteredMapEvents = useMemo(() => {
    const withValidLocation = mapEvents.filter((event) => hasValidCoordinates(event.latitude, event.longitude));
    if (mapDateFilter === "all") return withValidLocation;
    const now = new Date();
    const cutoff = new Date(now);
    if (mapDateFilter === "today") {
      cutoff.setHours(23, 59, 59, 999);
    } else {
      cutoff.setDate(cutoff.getDate() + 7);
    }
    return withValidLocation.filter((event) => new Date(event.starts_at) <= cutoff);
  }, [mapEvents, mapDateFilter]);

  // Ask for location up front so the app opens showing where the user
  // actually is (old behavior hardcoded "İstanbul" for everyone). Also
  // powers the map view's default center.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setUserCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        const result = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        if (cancelled) return;
        setCityLabel(shortenPlaceLabel(result.display_name));
      } catch {
        // Best-effort; the pill stays tappable and defaults stay in place.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCitySelect(result: GeocodingResult): void {
    setCityLabel(shortenPlaceLabel(result.display_name));
    setUserCoords({ latitude: result.latitude, longitude: result.longitude });
    setSortBy("distance");
    setIsCityPickerVisible(false);
  }

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

  // Rapidly tapping category chips can fire overlapping requests -- without
  // this guard, a slower older request resolving after a newer one would
  // silently overwrite the list with the wrong category's events, which
  // looks exactly like "filtering is broken" from the outside.
  const loadEventsRequestIdRef = useRef(0);

  const loadEvents = useCallback(async (category: string | null) => {
    const requestId = ++loadEventsRequestIdRef.current;
    setIsRefreshing(true);
    setHasMore(true);
    try {
      const result = await listEvents(category ?? undefined, true, 0, LIMIT);
      if (requestId !== loadEventsRequestIdRef.current) return;
      setEvents(result);
      setHasMore(result.length === LIMIT);
    } catch {
      if (requestId !== loadEventsRequestIdRef.current) return;
      Alert.alert("Bir sorun oluştu", "Etkinlikler yüklenemedi. Lütfen tekrar dene.");
    } finally {
      if (requestId === loadEventsRequestIdRef.current) setIsRefreshing(false);
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

  async function handlePressJoin(event: Event): Promise<void> {
    if (event.is_attending) {
      goToSwipe(event);
      return;
    }
    try {
      const updated = await attendEvent(event.id);
      // Stay put so the button visibly flips to "Kankaları Gör" instead of
      // yanking the user straight into Swipe before they've even confirmed
      // they're going -- same fix as EventDetailScreen's attend flow.
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      Alert.alert("Bir sorun oluştu", "Etkinliğe katılamadın. Lütfen tekrar dene.");
    }
  }

  function goToDetail(event: Event): void {
    navigation.navigate("EventDetail", { eventId: event.id });
  }

  const [featured, rest] = useMemo(() => {
    const list = sortedEvents;
    if (list.length === 0) return [null, []] as const;
    // Feature whichever near-term event has the most interest, not just
    // whatever happens to be chronologically soonest -- a popular event in
    // 3 days beats an empty one starting in 20 minutes.
    const now = Date.now();
    const nearTermWindowMs = 7 * 24 * 60 * 60 * 1000;
    const nearTerm = list.filter(
      (event) => new Date(event.starts_at).getTime() - now <= nearTermWindowMs
    );
    const candidates = nearTerm.length > 0 ? nearTerm : list;
    const featuredEvent = candidates.reduce((best, event) =>
      event.attendee_count > best.attendee_count ? event : best
    );
    return [featuredEvent, list.filter((event) => event.id !== featuredEvent.id)] as const;
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
      key={selectedCategory ?? "all"}
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
            <View style={styles.mapHeaderRow}>
              <Text style={styles.mapCanvasTitle}>📍 Etkinlik Haritası</Text>
              {isLoadingMapEvents ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
            <View style={styles.mapDateFilterRow}>
              <Chip label="Tümü" active={mapDateFilter === "all"} onPress={() => setMapDateFilter("all")} />
              <Chip label="Bugün" active={mapDateFilter === "today"} onPress={() => setMapDateFilter("today")} />
              <Chip label="Bu Hafta" active={mapDateFilter === "week"} onPress={() => setMapDateFilter("week")} />
            </View>
            <EventsMapView
              events={filteredMapEvents}
              centerLatitude={userCoords?.latitude ?? 41.0082}
              centerLongitude={userCoords?.longitude ?? 28.9784}
              onSelectEvent={setSelectedMapEvent}
              selectedEventId={selectedMapEvent?.id ?? null}
              height={360}
            />

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
              <Pressable style={styles.locationPill} onPress={() => setIsCityPickerVisible(true)}>
                <Feather name="map-pin" size={14} color={colors.textPrimary} />
                <Text style={styles.locationText}>{cityLabel}</Text>
              </Pressable>
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

          {!isMapView ? (
            <>
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
                    onPressJoin={() => handlePressJoin(featured)}
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
            </>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        events.length === 0 && !isRefreshing ? (
          <Text style={styles.emptyText}>
            {selectedCategory
              ? `${getCategoryMeta(selectedCategory).label} kategorisinde şu an etkinlik yok. Başka bir kategori dener misin?`
              : "Şu an gösterilecek etkinlik yok. Daha sonra tekrar kontrol et!"}
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
    <LocationPickerModal
      visible={isCityPickerVisible}
      onSelect={handleCitySelect}
      onDismiss={() => setIsCityPickerVisible(false)}
      initialLatitude={userCoords?.latitude}
      initialLongitude={userCoords?.longitude}
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
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mapDateFilterRow: {
    flexDirection: "row",
    gap: spacing.sm,
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

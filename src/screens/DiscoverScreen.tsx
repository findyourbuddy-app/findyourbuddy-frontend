import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Alert } from "../utils/alert";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { getFastCurrentLocation, hasValidCoordinates, resolveCityDistrict } from "../utils/location";
import { attendEvent, listEvents, recordBulkEventImpressions } from "../api/events";
import { formatEventDate } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { CATEGORIES, getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, spacing, typeScale, radius, shadows } from "../theme";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type DiscoverNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Discover">,
  NativeStackNavigationProp<MainStackParamList>
>;

const LIMIT = 15;

function shortenPlaceLabel(displayName?: string | null): string {
  if (!displayName) return "Konum Seç";
  return displayName.split(",").slice(0, 2).join(",").trim();
}

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function isSmartMatch(text: string, query: string): boolean {
  if (!query.trim() || !text) return false;
  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  if (!normQuery) return true;
  if (!normText) return false;

  if (normText.includes(normQuery)) return true;

  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  return queryTokens.every((token) => normText.includes(token));
}

export function DiscoverScreen() {
  const navigation = useNavigation<DiscoverNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isPremium, user } = useAuth();
  const { t, accentColor, bgGradient, language } = useAppTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState<"system" | "user" | "my_created" | null>(null);
  const [hasCreatedEvents, setHasCreatedEvents] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);

  // Sorting, Search and Location States
  const [searchQuery, setSearchQuery] = useState("");
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
  // origin is filtered server-side (see loadEvents) for the same reason it
  // is there: with ~2900 system events clustered in the near term, a
  // client-side filter over any fixed-size page would rarely surface user
  // events at all.
  useEffect(() => {
    if (!isMapView) return;
    let cancelled = false;
    setIsLoadingMapEvents(true);
    listEvents(selectedCategory ?? undefined, true, 0, 200, (originFilter === "my_created" ? undefined : originFilter) || undefined)
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
  }, [isMapView, selectedCategory, originFilter]);

  const filteredMapEvents = useMemo(() => {
    // Only events the user has actually joined show up as selectable pins --
    // showing every nearby system event regardless of attendance made the
    // map misleading (looked like the user could act on events they never
    // signed up for).
    const list = mapEvents.filter(
      (event) => event.is_attending && hasValidCoordinates(event.latitude, event.longitude)
    );

    if (mapDateFilter === "all") return list;
    const now = new Date();
    const cutoff = new Date(now);
    if (mapDateFilter === "today") {
      cutoff.setHours(23, 59, 59, 999);
    } else {
      cutoff.setDate(cutoff.getDate() + 7);
    }
    return list.filter((event) => new Date(event.starts_at) <= cutoff);
  }, [mapEvents, mapDateFilter]);


  // Ask for location up front so the app opens showing where the user
  // actually is. Also powers the map view's default center.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const position = await getFastCurrentLocation();
          if (position && !cancelled) {
            setUserCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            const label = await resolveCityDistrict(
              position.coords.latitude,
              position.coords.longitude
            );
            if (label && !cancelled) {
              setCityLabel(label);
            }
          }
        }
      } catch {
        // Best-effort; falls back to default center if location disabled
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePressLocationPill(): void {
    setIsCityPickerVisible(true);
  }

  function handleLocationSelected(result: GeocodingResult): void {
    if (!isPremium) {
      Alert.alert(
        language === "en" ? "Premium Feature" : "Premium Özellik",
        language === "en"
          ? "Teleporting to custom cities and picking manual locations is exclusive to Premium members!"
          : "Farklı şehirlerdeki etkinlikleri keşfetmek ve özel sanal konum seçmek Premium üyelere özeldir!",
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("upgradeToPremium"),
            onPress: async () => {
              try {
                const { createCheckoutSession } = require("../api/subscriptions");
                const { checkout_url } = await createCheckoutSession();
                if (checkout_url) {
                  const { Linking } = require("react-native");
                  Linking.openURL(checkout_url);
                }
              } catch {}
            },
          },
        ]
      );
      return;
    }

    const lat = result.latitude;
    const lon = result.longitude;
    setUserCoords({ latitude: lat, longitude: lon });
    setSortBy("distance");
    setIsCityPickerVisible(false);

    if (result.display_name) {
      setCityLabel(shortenPlaceLabel(result.display_name));
    } else {
      resolveCityDistrict(lat, lon).then((label) => {
        if (label) {
          setCityLabel(label);
        } else {
          setCityLabel(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        }
      });
    }
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
      const position = await getFastCurrentLocation();
      if (!position) {
        Alert.alert("Konum Alınamadı", "Konumunuz alınırken bir sorun oluştu.");
        return;
      }
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
      label: language === "en" ? "Date and Time" : "Tarih ve Saat",
      icon: "clock" as const,
      onPress: () => setSortBy(sortBy === "date" ? undefined : "date")
    },
    {
      key: "distance",
      label: language === "en" ? "Closest (By Distance)" : "En Yakın (Konuma Göre)",
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
      label: language === "en" ? "Popularity (By Attendees)" : "Popülerlik (Katılımcı Sayısı)",
      icon: "trending-up" as const,
      onPress: () => setSortBy(sortBy === "popularity" ? undefined : "popularity"),
    },
  ];

  const sortedEvents = useMemo(() => {
    if (events.length === 0) return [];

    let list = [...events];
    if (searchQuery.trim()) {
      list = list.filter(
        (e) =>
          isSmartMatch(e.title ?? "", searchQuery) ||
          isSmartMatch(e.description ?? "", searchQuery) ||
          isSmartMatch(e.location_name ?? "", searchQuery) ||
          isSmartMatch(e.category ?? "", searchQuery)
      );
    }

    // Priority sort: Applied / Joined / Created events ALWAYS come first at the very top of the list!
    list.sort((a, b) => {
      const isPriorityA = Boolean(a.is_attending || a.is_pending || (user && a.creator_id === user.id));
      const isPriorityB = Boolean(b.is_attending || b.is_pending || (user && b.creator_id === user.id));
      if (isPriorityA !== isPriorityB) {
        return isPriorityA ? -1 : 1;
      }

      if (sortBy === "distance" && userCoords) {
        const distA = getDistanceInKm(a.latitude, a.longitude, userCoords.latitude, userCoords.longitude);
        const distB = getDistanceInKm(b.latitude, b.longitude, userCoords.latitude, userCoords.longitude);
        return distA - distB;
      }
      if (sortBy === "popularity") {
        return b.attendee_count - a.attendee_count;
      }
      // Default: Sort by date
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    return list;
  }, [events, searchQuery, sortBy, userCoords, getDistanceInKm, user]);

  const loadEventsRequestIdRef = useRef(0);

  const loadEvents = useCallback(async (category: string | null, origin: "system" | "user" | "my_created" | null) => {
    const requestId = ++loadEventsRequestIdRef.current;
    setHasMore(true);
    try {
      let result: Event[] = [];
      if (origin === "my_created") {
        const { listMyCreatedEvents } = require("../api/events");
        result = await listMyCreatedEvents(true);
      } else {
        result = await listEvents(category ?? undefined, true, 0, 100, origin ?? undefined);
      }
      if (requestId !== loadEventsRequestIdRef.current) return;
      setEvents(result);
      setHasMore(result.length === 100);
      if (result.length > 0) {
        recordBulkEventImpressions(result.slice(0, 20).map((e) => e.id));
      }
    } catch {
      if (requestId !== loadEventsRequestIdRef.current) return;
      Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Events could not be loaded. Please try again." : "Etkinlikler yüklenemedi. Lütfen tekrar dene."
      );
    } finally {
      if (requestId === loadEventsRequestIdRef.current) setIsRefreshing(false);
    }
  }, [language]);

  const loadMoreEvents = useCallback(async () => {
    // FlatList can fire onEndReached more than once before the isLoadingMore
    // state update commits (state is async) -- a ref-based guard closes that
    // race, which otherwise fetches the same page twice and appends
    // duplicate events (React "same key" warnings, wrong item updates).
    if (isLoadingMoreRef.current || !hasMore || isRefreshing) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const currentLength = events.length;
      const result = originFilter === "my_created"
        ? []
        : await listEvents(selectedCategory ?? undefined, true, currentLength, LIMIT, originFilter || undefined);
      setEvents((prev) => {
        const existingIds = new Set(prev.map((event) => event.id));
        const deduped = result.filter((event) => !existingIds.has(event.id));
        return [...prev, ...deduped];
      });
      setHasMore(result.length === LIMIT);
    } catch {
      // Fail silently to avoid breaking infinite scrolling user experience
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [events.length, selectedCategory, originFilter, hasMore, isRefreshing]);

  const loadBookmarks = useCallback(async () => {
    try {
      const bookmarks = await listMyBookmarks();
      setBookmarkedIds(new Set(bookmarks.map((bookmark) => bookmark.event.id)));
    } catch {
      // Bookmarks are a non-critical enhancement
    }
  }, []);

  const checkCreatedEvents = useCallback(async () => {
    try {
      const { listMyCreatedEvents } = require("../api/events");
      const created = await listMyCreatedEvents(true);
      setHasCreatedEvents(Boolean(created && created.length > 0));
    } catch {
      setHasCreatedEvents(false);
    }
  }, []);

  const hasInitialLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasInitialLoadedRef.current) {
        hasInitialLoadedRef.current = true;
        loadEvents(selectedCategory, originFilter);
      }
      loadBookmarks();
      checkCreatedEvents();
    }, [loadEvents, loadBookmarks, checkCreatedEvents, selectedCategory, originFilter])
  );

  function handleSelectCategory(slug: string): void {
    const next = selectedCategory === slug ? null : slug;
    setSelectedCategory(next);
    loadEvents(next, originFilter);
  }

  function handleSelectOrigin(next: "system" | "user" | "my_created" | null): void {
    const target = originFilter === next ? null : next;
    setOriginFilter(target);
    loadEvents(selectedCategory, target);
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
      Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Bookmark action failed. Please try again." : "Kaydetme işlemi tamamlanamadı. Lütfen tekrar dene."
      );
    }
  }

  function goToSwipe(event: Event): void {
    // Both 1-on-1 and group events land on the Swipe screen; isGroup tells
    // SwipeScreen to open the group candidate deck (only that event's
    // attendees, with an "exit" bar) instead of the 1-on-1 flow.
    navigation.navigate("Swipe", {
      eventId: event.id,
      eventTitle: event.title,
      isGroup: Boolean(event.is_group_event),
    });
  }

  async function handlePressJoin(event: Event): Promise<void> {
    if (event.is_attending) {
      goToSwipe(event);
      return;
    }
    if (event.is_pending) return;
    try {
      const updated = await attendEvent(event.id);
      // Stay put so the button visibly flips to "Kankaları Gör" instead of
      // yanking the user straight into Swipe before they've even confirmed
      // they're going -- same fix as EventDetailScreen's attend flow.
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (updated.is_pending) {
        Alert.alert(
          language === "en" ? "Request Sent" : "İstek Gönderildi",
          language === "en"
            ? "Your request was sent to the organizer. You'll be notified once it's approved."
            : "İsteğin organizatöre gönderildi. Onaylanınca bilgilendirileceksin."
        );
      }
    } catch {
      Alert.alert("Bir sorun oluştu", "Etkinliğe katılamadın. Lütfen tekrar dene.");
    }
  }

  function goToDetail(event: Event): void {
    navigation.navigate("EventDetail", { eventId: event.id, initialEvent: event as any });
  }

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return sortedEvents;
    const q = searchQuery.trim();
    return sortedEvents.filter((event) => {
      const categoryLabel = getCategoryMeta(event.category)?.label || "";
      return (
        isSmartMatch(event.title, q) ||
        isSmartMatch(event.location_name, q) ||
        isSmartMatch(event.description || "", q) ||
        isSmartMatch(categoryLabel, q)
      );
    });
  }, [sortedEvents, searchQuery]);

  const [featured, rest] = useMemo(() => {
    const list = filteredEvents;
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
  }, [filteredEvents]);

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
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
      contentContainerStyle={styles.list}
      data={isMapView ? [] : rest}
      keyExtractor={(event) => String(event.id)}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadEvents(selectedCategory, originFilter)} />
      }
      onEndReached={isMapView ? undefined : loadMoreEvents}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isLoadingMore && !isMapView ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View style={[styles.headerArea, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              accessibilityRole="button"
              accessibilityLabel="Profilim"
            >
              <Avatar name={user?.display_name ?? "?"} photoUrl={user?.photo_url} isVerified={user?.is_verified} size={40} />
            </Pressable>

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
            </View>
          </View>

          <Text style={[typeScale.display, styles.title]}>
            {t("greeting")}, {user?.display_name ?? ""}?
          </Text>

              {/* Event Search Bar */}
              <View style={{ zIndex: 999 }}>
                <View style={styles.searchBar}>
                  <Feather name="search" size={16} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t("searchPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.trim() ? (
                    <Pressable onPress={() => setSearchQuery("")}>
                      <Feather name="x-circle" size={16} color={colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Instant Search Suggestions Dropdown Overlay */}
                {searchQuery.trim() ? (
                  <View style={styles.searchDropdownCard}>
                    {filteredEvents.length === 0 ? (
                      <View style={styles.dropdownEmptyBox}>
                        <Feather name="alert-circle" size={18} color={colors.textSecondary} />
                        <Text style={styles.dropdownEmptyText}>
                          “{searchQuery}” {t("noMatchFound")}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.dropdownList}>
                        <Text style={styles.dropdownHeaderTitle}>
                          {t("searchResultTitle")} ({filteredEvents.length})
                        </Text>
                        {filteredEvents.slice(0, 5).map((event) => {
                          const categoryMeta = getCategoryMeta(event.category, language);
                          return (
                            <Pressable
                              key={event.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSearchQuery("");
                                goToDetail(event);
                              }}
                            >
                              <View style={styles.dropdownItemIcon}>
                                <Feather name="calendar" size={16} color={accentColor} />
                              </View>
                              <View style={{ flex: 1, gap: 2 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={[styles.dropdownItemTitle, { flex: 1 }]} numberOfLines={1}>
                                    {event.title}
                                  </Text>
                                  <View style={styles.categoryBadgePill}>
                                    <Text style={styles.categoryBadgeText}>{categoryMeta.label}</Text>
                                  </View>
                                </View>
                                <Text style={styles.dropdownItemSub} numberOfLines={1}>
                                  {event.location_name} · {formatEventDate(event.starts_at, language)}
                                </Text>
                              </View>
                              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>

              <View style={styles.filterCluster}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                directionalLockEnabled={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexDirection: "row", paddingVertical: 2, paddingHorizontal: 2 }}
              >
                <Chip
                  label={t("systemEvents")}
                  active={originFilter === "system"}
                  onPress={() => handleSelectOrigin("system")}
                />
                <Chip
                  label={t("userEvents")}
                  active={originFilter === "user"}
                  onPress={() => handleSelectOrigin("user")}
                />
                <Chip
                  label={language === "en" ? "My Hosted Events" : "Başlattıklarım"}
                  active={originFilter === "my_created"}
                  onPress={() => handleSelectOrigin("my_created")}
                />
              </ScrollView>

              {/* Category Chips Scroller */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                directionalLockEnabled={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexDirection: "row", paddingVertical: 2, paddingHorizontal: 2 }}
              >
                {CATEGORIES.map((item) => (
                  <Chip
                    key={item.slug}
                    label={language === "en" ? item.labelEn : item.label}
                    active={selectedCategory === item.slug}
                    onPress={() => handleSelectCategory(item.slug)}
                  />
                ))}
              </ScrollView>

              <Pressable
                style={styles.aiMatchingBanner}
                onPress={() => navigation.navigate("AIRecommendations")}
              >
                <LinearGradient
                  colors={["#2D1B6B", accentColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aiMatchingBannerGradient}
                >
                  <View style={styles.aiMatchingTextCol}>
                    <Text style={styles.aiMatchingTitle}>{t("aiMatchTitle")}</Text>
                    <Text style={styles.aiMatchingDesc}>{t("aiMatchDesc")}</Text>
                  </View>
                  <View style={styles.aiMatchingBadge}>
                    <Text style={[styles.aiMatchingBadgeText, { color: accentColor }]}>{t("calculate")}</Text>
                    <Feather name="chevron-right" size={14} color={accentColor} />
                  </View>
                </LinearGradient>
              </Pressable>
              </View>

              {/* Sub-Header Location & Map View Controls Row */}
              <View style={styles.subHeaderControlsRow}>
                <Pressable style={styles.locationPill} onPress={handlePressLocationPill}>
                  <Feather name="map-pin" size={14} color={colors.textPrimary} />
                  <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                    {cityLabel}
                  </Text>
                </Pressable>
                
                <Pressable
                  style={[styles.sortPill, isMapView && { backgroundColor: `${accentColor}20` }]}
                  onPress={() => setIsMapView(!isMapView)}
                >
                  <Feather name={isMapView ? "list" : "map"} size={12} color={accentColor} />
                  <Text style={[styles.sortText, { color: accentColor }]}>{isMapView ? t("list") : t("map")}</Text>
                </Pressable>
              </View>

              {isMapView ? (
                <View style={styles.mapCanvasContainer}>
                  <View style={styles.mapHeaderRow}>
                    <Text style={styles.mapCanvasTitle}>{t("map")} ({filteredMapEvents.length})</Text>
                    {isLoadingMapEvents ? <ActivityIndicator size="small" color={accentColor} /> : null}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapDateFilterRow}>
                    <Chip label={t("all")} active={mapDateFilter === "all"} onPress={() => setMapDateFilter("all")} />
                    <Chip label={t("today")} active={mapDateFilter === "today"} onPress={() => setMapDateFilter("today")} />
                    <Chip label={t("thisWeek")} active={mapDateFilter === "week"} onPress={() => setMapDateFilter("week")} />
                  </ScrollView>
                  <EventsMapView
                    events={filteredMapEvents}
                    centerLatitude={userCoords?.latitude ?? 41.0082}
                    centerLongitude={userCoords?.longitude ?? 28.9784}
                    onSelectEvent={setSelectedMapEvent}
                    onDeselectEvent={() => setSelectedMapEvent(null)}
                    selectedEventId={selectedMapEvent?.id ?? null}
                    height={380}
                  />

                  {!isLoadingMapEvents && filteredMapEvents.length === 0 && (
                    <View style={styles.mapEmptyState}>
                      <Text style={styles.mapEmptyStateText}>
                        {language === "en"
                          ? "You haven't joined any events yet."
                          : "Henüz katıldığınız bir etkinlik yok."}
                      </Text>
                    </View>
                  )}

                  {/* Selected Event Callout Overlay - Tapping card opens details directly */}
                  {selectedMapEvent && (
                    <Pressable style={styles.mapCalloutCard} onPress={() => goToDetail(selectedMapEvent)}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={styles.categoryBadgePill}>
                            <Text style={styles.categoryBadgeText}>
                              {getCategoryMeta(selectedMapEvent.category, language).label}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.calloutCloseIconBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedMapEvent(null);
                            }}
                            hitSlop={8}
                          >
                            <Feather name="x" size={16} color={colors.textSecondary} />
                          </Pressable>
                        </View>
                        <Text style={styles.calloutTitle} numberOfLines={1}>{selectedMapEvent.title}</Text>
                        <Text style={styles.calloutText} numberOfLines={1}>
                          {selectedMapEvent.location_name} {getEventDistanceLabel(selectedMapEvent) ? `· ${getEventDistanceLabel(selectedMapEvent)}` : ""}
                        </Text>
                        <Text style={styles.calloutSubText}>
                          {formatEventDate(selectedMapEvent.starts_at, language)} · {selectedMapEvent.attendee_count} {language === "en" ? "Attendees" : "Katılımcı"}
                        </Text>
                        <View style={[styles.calloutDetailBtnRow, { backgroundColor: accentColor }]}>
                          <Text style={styles.calloutDetailBtnText}>
                            {language === "en" ? "View Event Details ➔" : "Etkinlik Detayına Git ➔"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>
              ) : (
                <>
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
                      eyebrow={t("weekendVibe")}
                      title={t("popularNearYou")}
                      actionLabel={t("sort")}
                      onActionPress={openSortPicker}
                    />
                  ) : null}
                </>
              )}
        </View>
      }
      ListEmptyComponent={
        !isMapView && filteredEvents.length === 0 && !isRefreshing ? (
          <Text style={styles.emptyText}>
            {selectedCategory
              ? `${getCategoryMeta(selectedCategory).label} kategorisinde şu an etkinlik yok. Başka bir kategori dener misin?`
              : originFilter === "user"
                ? "Şu an kullanıcıların oluşturduğu bir etkinlik yok."
                : "Şu an sistem etkinliği yok."}
          </Text>
        ) : null
      }
      renderItem={({ item }) => {
        if (isMapView) return null;
        return (
          <View style={styles.listItemWrapper}>
            <EventListItem
              event={item}
              bookmarked={bookmarkedIds.has(item.id)}
              onToggleBookmark={() => toggleBookmark(item.id)}
              onPress={() => goToDetail(item)}
              distanceLabel={getEventDistanceLabel(item)}
            />
          </View>
        );
      }}
      removeClippedSubviews={true}
      maxToRenderPerBatch={8}
      initialNumToRender={6}
      windowSize={5}
    />
    <OptionPickerModal
      visible={sortPickerVisible}
      title={language === "en" ? "Sort By" : "Nasıl sıralansın?"}
      options={sortOptions}
      onDismiss={() => setSortPickerVisible(false)}
      selectedKey={sortBy || undefined}
    />
    <LocationPickerModal
      visible={isCityPickerVisible}
      onSelect={handleLocationSelected}
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
    gap: spacing.md,
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
    flexShrink: 1,
  },
  locationText: {
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
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
  mapEmptyState: {
    padding: spacing.md,
    alignItems: "center",
  },
  mapEmptyStateText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  mapCalloutCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.card,
  },
  calloutCloseIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  calloutText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  calloutSubText: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  calloutDetailBtnRow: {
    marginTop: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutDetailBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.surface,
  },
  filterCluster: {
    gap: spacing.xs,
  },
  aiMatchingBanner: {
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
  searchSortRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  searchDropdownCard: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  dropdownEmptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dropdownEmptyText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  dropdownList: {
    gap: spacing.xs,
  },
  dropdownHeaderTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItemTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dropdownItemSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryBadgePill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  categoryBadgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.primary,
  },
  brandTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  subHeaderControlsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radius.pill,
    padding: 3,
    marginVertical: spacing.xs,
  },
  segmentTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.surface,
  },
});

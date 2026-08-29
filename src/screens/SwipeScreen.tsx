import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, Modal, ActivityIndicator } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { SwipeCandidateCard } from "../components/cards/SwipeCandidateCard";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { MatchCelebrationModal } from "../components/overlays/MatchCelebrationModal";
import { SwipeFiltersModal } from "../components/overlays/SwipeFiltersModal";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { attendEvent, listEvents, listMyAttendingEvents } from "../api/events";
import { createSwipe, getSwipeCandidates, getSwipeQuota } from "../api/swipes";
import { activateBoost, createPurchaseCheckoutSession } from "../api/users";
import type { SwipeCandidateFilters, SwipeQuota } from "../api/swipes";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { Event, User, UserPublic } from "../types";
import { formatEventDate } from "../utils/date";
import { getCategoryMeta } from "../constants/categories";

interface ActiveEvent {
  id: number;
  title: string;
  location_name?: string | null;
}

// `listEvents` returns a fixed, date-sorted page -- an event the user is already
// attending (especially an older group event) can fall outside that window and
// never appear on the "Kullanıcı Etkinlikleri" tab. Merging in `listMyAttendingEvents`
// guarantees attended events always show up regardless of pagination.
function mergeEvents(base: Event[], attending: Event[]): Event[] {
  const merged = new Map(base.map((event) => [event.id, event]));
  for (const event of attending) {
    if (!merged.has(event.id)) merged.set(event.id, event);
  }
  return Array.from(merged.values());
}

type SwipeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Swipe">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function SwipeScreen() {
  const navigation = useNavigation<SwipeNavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MainTabParamList, "Swipe">>();
  const { isPremium, user, updateUser } = useAuth();
  const { t, language, accentColor, bgGradient } = useAppTheme();
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [match, setMatch] = useState<{ id: number; user: UserPublic } | null>(null);
  const [filters, setFilters] = useState<SwipeCandidateFilters>({});
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [quota, setQuota] = useState<SwipeQuota | null>(null);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [storeVisible, setStoreVisible] = useState(false);
  const [boostConfirmVisible, setBoostConfirmVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"system" | "user">("system");
  const [userSubTab, setUserSubTab] = useState<"birebir" | "group">("birebir");
  const [userGroupEvents, setUserGroupEvents] = useState<Event[]>([]);
  // Set when the user opened a specific group event to swipe ("Kankaları Gör").
  // While set, the "group" sub-tab shows the candidate deck instead of the
  // browse list; cleared by the exit button or switching tabs.
  const [groupSwipeEvent, setGroupSwipeEvent] = useState<ActiveEvent | null>(null);

  useEffect(() => {
    if (candidates.length > currentIndex + 1) {
      const nextCandidate = candidates[currentIndex + 1];
      if (nextCandidate) {
        const primaryUrl = resolvePhotoUrl(nextCandidate.photo_url);
        if (primaryUrl) Image.prefetch(primaryUrl);
        nextCandidate.photos?.forEach((p) => {
          const galleryUrl = resolvePhotoUrl(p.photo_url);
          if (galleryUrl) Image.prefetch(galleryUrl);
        });
      }
    }
  }, [candidates, currentIndex]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  // Only events the user has actually joined belong in the swipe-deck picker --
  // picking used to double as an implicit "join", letting people swipe on any
  // nearby system event whether or not they said they were going.
  const systemEvents = useMemo(() => {
    const nowMs = Date.now();
    return availableEvents.filter((event) => {
      if (event.creator_id) return false;
      if (!event.is_attending) return false;
      if (event.starts_at) {
        const eventMs = new Date(event.starts_at).getTime();
        // Remove expired events (older than 4 hours after start time)
        if (eventMs + 4 * 60 * 60 * 1000 < nowMs) return false;
      }
      return true;
    });
  }, [availableEvents]);
  const user1on1Events = useMemo(() => {
    const nowMs = Date.now();
    return availableEvents.filter((event) => {
      if (!event.creator_id || event.is_group_event) return false;
      if (!event.is_attending) return false;
      if (event.starts_at) {
        const eventMs = new Date(event.starts_at).getTime();
        if (eventMs + 4 * 60 * 60 * 1000 < nowMs) return false;
      }
      return true;
    });
  }, [availableEvents]);
  const userEvents = useMemo(
    () => availableEvents.filter((event) => Boolean(event.creator_id) && !event.is_group_event),
    [availableEvents]
  );
  const tabEvents = activeTab === "system" ? systemEvents : userEvents;

  const userGroupEventsRef = useRef(userGroupEvents);
  userGroupEventsRef.current = userGroupEvents;

  // useFocusEffect (not useEffect) so returning to this tab -- e.g. from
  // EventDetail after applying, or after the organizer approves a request --
  // always shows the current attendance status instead of a stale one from
  // whenever the tab was first opened. Runs silently in background if events exist.
  useFocusEffect(
    useCallback(() => {
      if (!(activeTab === "user" && userSubTab === "group")) return;
      let cancelled = false;
      if (userGroupEventsRef.current.length === 0) {
        setIsLoadingGroups(true);
      }
      // origin="user" is required here -- without it, this shares its 50-item
      // budget with thousands of system events, which crowd out user/group
      // events almost entirely (the same pagination bug fixed earlier on Discover).
      Promise.all([listEvents(undefined, true, 0, 50, "user", true), listMyAttendingEvents(true).catch(() => [])])
        .then(([all, attending]) => {
          if (cancelled) return;
          const merged = mergeEvents(all, attending);
          setUserGroupEvents(merged.filter((e) => Boolean(e.creator_id) && Boolean(e.is_group_event)));
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoadingGroups(false);
        });
      return () => {
        cancelled = true;
      };
    }, [activeTab, userSubTab])
  );

  const refreshQuota = useCallback(() => {
    getSwipeQuota()
      .then(setQuota)
      .catch(() => {
        // Non-critical; the quota display just stays hidden if this fails.
      });
  }, []);

  // Silent auto-check for new attendees joining the active event
  useEffect(() => {
    if (!activeEvent) return;
    const interval = setInterval(() => {
      const eventIdToQuery = activeEvent.id;
      getSwipeCandidates(eventIdToQuery, filters)
        .then((list) => {
          const fresh = list.filter((c) => !swipedCandidateIdsRef.current.has(c.id));
          if (fresh.length > 0) {
            setCandidates(fresh);
            if (currentIndex >= candidatesRef.current.length) {
              setCurrentIndex(0);
            }
          }
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeEvent, filters, currentIndex]);

  // Tracks which route.params.eventId has already been acted on. Without
  // this, route.params keeps referring to whatever event the screen was
  // originally opened with, and since this effect also reruns whenever
  // `activeTab` changes (needed for its own fallback logic below), simply
  // tapping the "Kullanıcı Etkinlikleri" tab button re-triggered the effect,
  // saw the same stale route.params, and snapped the tab straight back to
  // wherever that original event lived -- e.g. always back to "system".
  const consumedEventIdRef = useRef<number | null>(null);
  const consumedStoreParamsRef = useRef<typeof route.params>(undefined);
  const hasInitialLoadedRef = useRef<boolean>(false);
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;
  const swipedCandidateIdsRef = useRef<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (
        route.params &&
        "openStore" in route.params &&
        route.params.openStore &&
        route.params !== consumedStoreParamsRef.current
      ) {
        consumedStoreParamsRef.current = route.params;
        setStoreVisible(true);
      }
    }, [route.params])
  );

  const availableEventsRef = useRef(availableEvents);
  availableEventsRef.current = availableEvents;
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;
  const groupSwipeEventRef = useRef(groupSwipeEvent);
  groupSwipeEventRef.current = groupSwipeEvent;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const hasParamChange = route.params && "eventId" in route.params && route.params.eventId !== consumedEventIdRef.current;

      hasInitialLoadedRef.current = true;

      async function resolveActiveEvent(
        upcoming: Event[]
      ): Promise<{ event: ActiveEvent | null; tab: "system" | "user"; subTab?: "birebir" | "group" }> {
        if (route.params && "eventId" in route.params && route.params.eventId !== consumedEventIdRef.current) {
          const { eventId, eventTitle } = route.params;
          const isGroupParam = "isGroup" in route.params && route.params.isGroup;
          consumedEventIdRef.current = eventId;
          const matched = upcoming.find((event) => event.id === eventId);
          // Trust the caller's isGroup flag first -- the event may be past the
          // paginated list and so missing from `upcoming`.
          if (isGroupParam || matched?.is_group_event) {
            return {
              event: { id: eventId, title: eventTitle },
              tab: "user",
              subTab: "group",
            };
          }
          return {
            event: { id: eventId, title: eventTitle },
            tab: matched?.creator_id ? "user" : "system",
            subTab: "birebir",
          };
        }
        // Keep an in-progress group swipe alive when this effect re-runs for
        // an unrelated reason (screen re-focus, filters) rather than snapping
        // activeEvent to some other event.
        if (groupSwipeEventRef.current) {
          return { event: groupSwipeEventRef.current, tab: "user", subTab: "group" };
        }
        // Group events have their own card list (userSubTab === "group") and are
        // never swiped via activeEvent -- excluding them here keeps this fallback
        // in sync with `user1on1Events`/`tabEvents`, so the "Birebir" tab can never
        // silently auto-select a group event that isn't even in the event picker.
        const nowMs = Date.now();
        const validEvents = upcoming.filter((event) => {
          if (activeTab === "system") {
            if (event.creator_id || !event.is_attending) return false;
            if (event.starts_at) {
              const eventMs = new Date(event.starts_at).getTime();
              if (eventMs + 4 * 60 * 60 * 1000 < nowMs) return false;
            }
            return true;
          }
          return Boolean(event.creator_id) && !event.is_group_event;
        });

        let chosen = activeEventRef.current
          ? validEvents.find((e) => e.id === activeEventRef.current?.id)
          : null;

        if (!chosen && validEvents.length > 0) {
          chosen = validEvents[0];
        }

        return {
          event: chosen ? { id: chosen.id, title: chosen.title, location_name: chosen.location_name } : null,
          tab: activeTab,
        };
      }

      if (candidates.length === 0) {
        setIsLoading(true);
      }
      const targetOrigin = activeTab === "system" ? "system" : "user";
      Promise.all([
        listEvents(undefined, true, 0, 25, targetOrigin),
        listMyAttendingEvents(true).catch(() => []),
      ])
        .then(async ([tabEvts, attending]) => {
          if (cancelled) return;
          const allEvents = mergeEvents(tabEvts, attending);
          setAvailableEvents((prev) => mergeEvents(prev, allEvents));
          const { event, tab, subTab } = await resolveActiveEvent(allEvents);
          if (cancelled) return;
          setActiveTab(tab);
          if (subTab) {
            setUserSubTab(subTab);
          }
          if (subTab === "group" && event) {
            setGroupSwipeEvent(event);
          } else if (subTab === "birebir") {
            setGroupSwipeEvent(null);
          }
          const isSameEvent = activeEventRef.current && event && activeEventRef.current.id === event.id;
          setActiveEvent(event);
          if (!isSameEvent || hasParamChange) {
            setCurrentIndex(0);
          }
          const list = await getSwipeCandidates(event ? event.id : undefined, filters);
          if (!cancelled) {
            const freshCandidates = list.filter((c) => !swipedCandidateIdsRef.current.has(c.id));
            setCandidates(freshCandidates);
            if (freshCandidates.length > 0 && (!isSameEvent || hasParamChange || currentIndex >= candidatesRef.current.length)) {
              setCurrentIndex(0);
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            Alert.alert(
              language === "en" ? "Error" : "Bir sorun oluştu",
              language === "en" ? "Events and candidates could not be loaded. Please try again." : "Etkinlik ve adaylar yüklenemedi. Lütfen tekrar dene."
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [route.params, filters, refreshQuota, activeTab, language])
  );

  function switchEvent(event: Event): void {
    const nextActive = { id: event.id, title: event.title, location_name: event.location_name };
    consumedEventIdRef.current = event.id;
    activeEventRef.current = nextActive;
    setActiveEvent(nextActive);
    setCurrentIndex(0);
    setCandidates([]);
    setIsLoading(true);
    attendEvent(event.id).catch(() => {
      // Non-critical; worst case the attendee count doesn't reflect this visit yet.
    });
    getSwipeCandidates(event.id, filters)
      .then(setCandidates)
      .catch(() =>
        Alert.alert(
          language === "en" ? "Error" : "Bir sorun oluştu",
          language === "en" ? "Candidates could not be loaded. Please try again." : "Adaylar yüklenemedi. Lütfen tekrar dene."
        )
      )
      .finally(() => setIsLoading(false));
  }

  async function handleSelectTab(nextTab: "system" | "user"): Promise<void> {
    if (activeTab === nextTab) return;
    setActiveTab(nextTab);
    setCandidates([]);
    setCurrentIndex(0);
    setGroupSwipeEvent(null);
    setIsLoading(true);

    if (nextTab === "user") {
      // Default 1-on-1 mode to General User Browsing (activeEvent = null)
      setActiveEvent(null);
      try {
        const list = await getSwipeCandidates(0, filters);
        setCandidates(list.filter((c) => !swipedCandidateIdsRef.current.has(c.id)));
      } catch {
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const targetEvent = systemEvents[0] || null;
    if (targetEvent) {
      setActiveEvent({ id: targetEvent.id, title: targetEvent.title, location_name: targetEvent.location_name });
      try {
        const list = await getSwipeCandidates(targetEvent.id, filters);
        setCandidates(list.filter((c) => !swipedCandidateIdsRef.current.has(c.id)));
      } catch {
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const evts = await listEvents(undefined, true, 0, 20, "system");
        setAvailableEvents((prev) => mergeEvents(prev, evts));
        const firstEvt = evts[0];
        if (firstEvt) {
          setActiveEvent({ id: firstEvt.id, title: firstEvt.title, location_name: firstEvt.location_name });
          const list = await getSwipeCandidates(firstEvt.id, filters);
          setCandidates(list.filter((c) => !swipedCandidateIdsRef.current.has(c.id)));
        } else {
          setActiveEvent(null);
          setCandidates([]);
        }
      } catch {
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    }
  }

  function selectGeneralSwipe(): void {
    setActiveEvent(null);
    setCurrentIndex(0);
    setCandidates([]);
    setIsLoading(true);
    getSwipeCandidates(0, filters)
      .then((list) => {
        setCandidates(list.filter((c) => !swipedCandidateIdsRef.current.has(c.id)));
      })
      .catch(() => {
        setCandidates([]);
      })
      .finally(() => setIsLoading(false));
  }

  function openEventPicker(): void {
    setEventPickerVisible(true);
  }

  const eventPickerOptions = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      icon: "map-pin" | "globe";
      onPress: () => void;
    }> = [];

    if (activeTab === "user") {
      list.push({
        key: "general_users",
        label: language === "en" ? "Browse General Users" : "Genel Kullanıcılarda Gezin",
        icon: "globe",
        onPress: () => selectGeneralSwipe(),
      });

      user1on1Events.forEach((event) => {
        list.push({
          key: String(event.id),
          label: event.location_name ? `${event.location_name} · ${event.title}` : event.title,
          icon: "map-pin",
          onPress: () => switchEvent(event),
        });
      });

      list.push({
        key: "discover_new_user_event",
        label: language === "en" ? "Explore & Join New Events" : "Keşfet'ten Yeni Bire Bir Etkinlik Seç",
        icon: "map-pin",
        onPress: () => navigation.navigate("Discover"),
      });
    } else {
      systemEvents.forEach((event) => {
        list.push({
          key: String(event.id),
          label: event.location_name ? `${event.location_name} · ${event.title}` : event.title,
          icon: "map-pin",
          onPress: () => switchEvent(event),
        });
      });

      list.push({
        key: "discover_new_system_event",
        label: language === "en" ? "Explore & Join New Events" : "Keşfet'ten Yeni Resmi Etkinlik Seç",
        icon: "map-pin",
        onPress: () => navigation.navigate("Discover"),
      });
    }

    return list;
  }, [activeTab, user1on1Events, systemEvents, language, navigation]);

  function handleApplyFilters(nextFilters: SwipeCandidateFilters): void {
    setFilters(nextFilters);
    setFiltersVisible(false);
  }

  async function handleSwipe(direction: "like" | "pass" | "super_like"): Promise<User | null> {
    const target = candidates[currentIndex];
    if (!target) {
      return null;
    }
    const targetId = target.id;
    const eventId = activeEvent?.id;
    swipedCandidateIdsRef.current.add(targetId);

    // OPTIMISTIC UPDATE: Increment candidate index IMMEDIATELY for 0ms instant UI transition!
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    createSwipe({ target_id: targetId, event_id: eventId, direction })
      .then((result) => {
        if (result.match_id !== null && result.matched_user !== null) {
          setMatch({ id: result.match_id, user: result.matched_user });
        }
        refreshQuota();
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const detail = error.response?.data?.detail as string | undefined;

          if (status === 409 || status === 403 || detail?.includes("Already swiped")) {
            return;
          }

          if (status === 429) {
            if (detail === "Daily super like limit reached") {
              Alert.alert(
                "Süper beğeni hakkın bitti",
                "Bugünlük süper beğeni hakkın doldu, yarın tekrar dene ya da Premium'a geç."
              );
            } else {
              Alert.alert("Günlük limit doldu", "Bugünlük beğeni hakkın bitti, yarın tekrar dene. Geçmeye devam edebilirsin.");
            }
          }
        }
      });

    return candidates[nextIndex] || null;
  }

  function goToMatchChat(): void {
    if (!match) return;
    const matchId = match.id;
    const otherUserId = match.user.id;
    const otherUserName = match.user.display_name;
    setMatch(null);
    navigation.navigate("Chat", { matchId, otherUserId, otherUserName });
  }

  function handleBoostClick(): void {
    if (!user) return;
    const isBoosted = user.boosted_until ? new Date(user.boosted_until).getTime() > Date.now() : false;
    if (isBoosted) {
      const remainingSecs = Math.max(0, Math.floor((new Date(user.boosted_until!).getTime() - Date.now()) / 1000));
      const mins = Math.floor(remainingSecs / 60);
      Alert.alert("Spotlight Aktif!", `Profilin şu an öne çıkarılmış durumda. Kalan süre: ${mins} dakika.`);
      return;
    }

    if (user.boosts_balance && user.boosts_balance > 0) {
      setBoostConfirmVisible(true);
    } else {
      setStoreVisible(true);
    }
  }

  async function handleActivateBoost(): Promise<void> {
    setBoostConfirmVisible(false);
    setIsLoading(true);
    try {
      const updatedUser = await activateBoost();
      updateUser(updatedUser);
      Alert.alert(
        language === "en" ? "Spotlight Started!" : "Spotlight Başlatıldı!",
        language === "en"
          ? "Your profile has been moved to the top for 60 minutes in your area!"
          : "Profilin 60 dakika boyunca bulunduğun bölgede en üste taşındı!"
      );
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Hata",
        language === "en" ? "Could not start Spotlight. Please try again." : "Spotlight başlatılamadı. Lütfen tekrar dene."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePurchase(itemType: "boost" | "super_likes" | "swipes"): Promise<void> {
    try {
      setIsLoading(true);
      const { checkout_url } = await createPurchaseCheckoutSession(itemType, 1);
      setStoreVisible(false);
      if (checkout_url) {
        Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ödeme Hatası", "Ödeme linki alınamadı.");
      }
    } catch {
      Alert.alert("Ödeme Hatası", "Ödeme sayfası başlatılamadı. Lütfen sunucunun açık olduğundan emin ol.");
    } finally {
      setIsLoading(false);
    }
  }

  function startGroupEventCandidatesSwipe(event: Event): void {
    setGroupSwipeEvent(event);
    setActiveEvent({ id: event.id, title: event.title, location_name: event.location_name });
    setCurrentIndex(0);
    setCandidates([]);
    setIsLoading(true);
    getSwipeCandidates(event.id, filters)
      .then(setCandidates)
      .catch(() =>
        Alert.alert(
          language === "en" ? "Error" : "Bir sorun oluştu",
          language === "en" ? "Candidates could not be loaded. Please try again." : "Adaylar yüklenemedi. Lütfen tekrar dene."
        )
      )
      .finally(() => setIsLoading(false));
  }

  async function handleGroupJoin(event: Event): Promise<void> {
    if (event.is_attending) {
      startGroupEventCandidatesSwipe(event);
      return;
    }
    if (event.is_pending) return;

    const isApproval = Boolean(event.creator_id && event.is_group_event);

    setUserGroupEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? {
              ...item,
              is_attending: !isApproval,
              is_pending: isApproval,
              attendee_count: item.attendee_count + 1,
            }
          : item
      )
    );

    try {
      const updated = await attendEvent(event.id);
      setUserGroupEvents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      if (updated.is_pending) {
        Alert.alert(
          language === "en" ? "Request Sent" : "İstek Gönderildi",
          language === "en"
            ? "Your request was sent to the organizer. You'll be notified once it's approved."
            : "İsteğin organizatöre gönderildi. Onaylanınca bilgilendirileceksin."
        );
      }
    } catch {
      setUserGroupEvents((prev) =>
        prev.map((item) => (item.id === event.id ? event : item))
      );
      Alert.alert("Bir sorun oluştu", "Etkinliğe katılamadın. Lütfen tekrar dene.");
    }
  }

  return (
    <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      <View style={[styles.headerRow, { marginTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1, marginRight: spacing.md, gap: 2 }}>
          <Text style={typeScale.eyebrow}>{t("buddiesNearYou")}</Text>
          <Text style={typeScale.h1}>{t("whoIsNextBuddy")}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.iconButton,
              styles.boostHeaderButton,
              user?.boosted_until && new Date(user.boosted_until).getTime() > Date.now() && styles.boostHeaderButtonActive
            ]}
            onPress={handleBoostClick}
            accessibilityRole="button"
            accessibilityLabel="Spotlight Öne Çıkar"
          >
            <Feather
              name="zap"
              size={16}
              color={
                user?.boosted_until && new Date(user.boosted_until).getTime() > Date.now()
                  ? colors.surface
                  : colors.accentYellow
              }
            />
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.likesReceivedButton]}
            onPress={() => navigation.navigate("LikesReceived")}
            accessibilityRole="button"
            accessibilityLabel="Seni beğenenler"
          >
            <Feather name="user-check" size={16} color={colors.surface} />
            <View style={styles.badgeIndicator} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => setFiltersVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtreler"
          >
            <Feather name="sliders" size={16} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === "system" && styles.tabButtonActive]}
          onPress={() => handleSelectTab("system")}
          accessibilityRole="button"
          accessibilityLabel={t("systemEvents")}
        >
          <Text style={[styles.tabButtonText, activeTab === "system" && styles.tabButtonTextActive]}>
            {t("systemEvents")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "user" && styles.tabButtonActive]}
          onPress={() => handleSelectTab("user")}
          accessibilityRole="button"
          accessibilityLabel={t("userEvents")}
        >
          <Text style={[styles.tabButtonText, activeTab === "user" && styles.tabButtonTextActive]}>
            {t("userEvents")}
          </Text>
        </Pressable>
      </View>
      <View style={styles.subTabRow}>
        {activeTab === "user" ? (
          <>
            <Pressable
              style={[styles.subTabButton, userSubTab === "birebir" && styles.subTabButtonActive]}
              onPress={() => {
                setUserSubTab("birebir");
                setGroupSwipeEvent(null);
              }}
            >
              <Feather name="user" size={13} color={userSubTab === "birebir" ? colors.primary : colors.textSecondary} />
              <Text style={[styles.subTabButtonText, userSubTab === "birebir" && styles.subTabButtonTextActive]}>
                {language === "en" ? "1-on-1 Buddy" : "Birebir Eşleşme"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subTabButton, userSubTab === "group" && styles.subTabButtonActive]}
              onPress={() => {
                setUserSubTab("group");
                setGroupSwipeEvent(null);
              }}
            >
              <Feather name="users" size={13} color={userSubTab === "group" ? colors.primary : colors.textSecondary} />
              <Text style={[styles.subTabButtonText, userSubTab === "group" && styles.subTabButtonTextActive]}>
                {language === "en" ? "Group Events" : "Grup Etkinlikleri"}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.systemSubTabPill}>
            <Feather name="shield" size={13} color={colors.primary} />
            <Text style={styles.systemSubTabPillText}>
              {language === "en" ? "Official System Events" : "Resmi Sistem Etkinlikleri"}
            </Text>
          </View>
        )}
      </View>



      {groupSwipeEvent ? (
        <View style={styles.groupSwipeBar}>
          <Feather name="users" size={14} color={colors.primary} />
          <Text style={styles.groupSwipeBarText} numberOfLines={1}>
            {groupSwipeEvent.title}
          </Text>
          <Pressable
            style={styles.groupSwipeExitBtn}
            onPress={() => setGroupSwipeEvent(null)}
            accessibilityRole="button"
            accessibilityLabel={language === "en" ? "Exit group matching" : "Grup eşleşmesinden çık"}
          >
            <Feather name="log-out" size={12} color="#FFFFFF" />
            <Text style={styles.groupSwipeExitBtnText}>
              {language === "en" ? "Exit" : "Çık"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!(activeTab === "user" && userSubTab === "group" && !groupSwipeEvent) ? (
        <View style={styles.metaRow}>
          {activeEvent ? (
            <Pressable
              style={styles.eventPill}
              onPress={openEventPicker}
              accessibilityRole="button"
              accessibilityLabel="Etkinlik değiştir"
            >
              <Feather name="target" size={14} color={colors.primary} />
              <Text style={styles.eventPillText} numberOfLines={1}>
                {activeEvent.location_name ? `${activeEvent.location_name} · ${activeEvent.title}` : activeEvent.title}
              </Text>
              <Feather name="chevron-down" size={12} color={colors.textSecondary} />
            </Pressable>
          ) : activeTab === "system" ? (
            <Pressable
              style={styles.eventPill}
              onPress={openEventPicker}
              accessibilityRole="button"
              accessibilityLabel="Keşfet'ten Etkinlik Seç"
            >
              <Feather name="compass" size={14} color={colors.primary} />
              <Text style={styles.eventPillText} numberOfLines={1}>
                {language === "en" ? "Select Event" : "Etkinlik Seç"}
              </Text>
              <Feather name="chevron-down" size={12} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.eventPill}
              onPress={openEventPicker}
              accessibilityRole="button"
              accessibilityLabel="Genel Kullanıcılarda Geziniyorsun"
            >
              <Feather name="globe" size={14} color={colors.primary} />
              <Text style={styles.eventPillText} numberOfLines={1}>
                {language === "en" ? "Browsing General Users" : "Genel Kullanıcılarda Geziniyorsun"}
              </Text>
              <Feather name="chevron-down" size={12} color={colors.textSecondary} />
            </Pressable>
          )}

          {quota ? (
            <Text style={[styles.quotaText, !activeEvent && { marginLeft: "auto" }]}>
              {quota.is_premium
                ? (language === "en" ? "Unlimited likes" : "Sınırsız beğeni")
                : `${quota.swipes_used_today}/${quota.swipe_limit} ${language === "en" ? "likes" : "beğeni"}`}
              {" · "}
              {quota.super_likes_used_today}/{quota.super_like_limit} {language === "en" ? "super" : "süper"}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.cardArea, (activeTab === "user" && userSubTab === "group" && !groupSwipeEvent) && { paddingBottom: 10 }]}>
        {activeTab === "user" && userSubTab === "group" && !groupSwipeEvent ? (
          isLoadingGroups ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : userGroupEvents.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {language === "en"
                  ? "No group events have been created by users yet."
                  : "Henüz kullanıcılar tarafından grup etkinliği oluşturulmadı."}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton
                  label={language === "en" ? "Create Group Event" : "Grup Etkinliği Oluştur"}
                  onPress={() => navigation.navigate("CreateEvent")}
                />
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
              {userGroupEvents.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.groupCardItem}
                  onPress={() => navigation.navigate("EventDetail", { eventId: event.id, initialEvent: event as any })}
                >
                  <View style={styles.groupCardHeader}>
                    <Text style={styles.groupCategoryPill}>{getCategoryMeta(event.category, language).label}</Text>
                    <View style={styles.attendeesBadge}>
                      <Feather name="users" size={12} color={colors.primary} />
                      <Text style={styles.attendeesBadgeText}>
                        {language === "en"
                          ? `Max ${event.max_attendees ?? "∞"} Attendees (${event.attendee_count} Joined)`
                          : `Max ${event.max_attendees ?? "∞"} Katılımcı (${event.attendee_count} Katıldı)`}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.groupCardTitle}>{event.title}</Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 2 }}>
                    <Feather name="clock" size={13} color={colors.primary} />
                    <Text style={[styles.groupCardLocation, { color: colors.textPrimary, fontFamily: fontFamily.bodySemiBold }]}>
                      {formatEventDate(event.starts_at, language)}
                    </Text>
                  </View>

                  <Text style={styles.groupCardLocation}>{event.location_name}</Text>

                  <View style={styles.groupCardFooter}>
                    <View style={styles.creatorInfo}>
                      <Avatar
                        name={event.creator?.display_name ?? (language === "en" ? "User" : "Kullanıcı")}
                        photoUrl={isPremium || !event.creator ? (event.creator?.photo_url ?? null) : null}
                        size={36}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.creatorNameText}>
                          {isPremium
                            ? (event.creator?.display_name ?? (language === "en" ? "User" : "Kullanıcı"))
                            : (language === "en" ? "Hidden Organizer (Premium)" : "Gizli Oluşturan (Premium)")}
                        </Text>
                        <Text style={styles.creatorSubText}>
                          {language === "en" ? "Event Organizer" : "Etkinlik Oluşturanı"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {event.is_attending ? (
                        <>
                          <Pressable
                            style={styles.groupCardActionBtn}
                            onPress={() => startGroupEventCandidatesSwipe(event)}
                          >
                            <Text style={styles.groupCardActionText}>
                              {language === "en" ? "View Buddies" : "Kankaları Gör"}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.groupCardActionBtn, { backgroundColor: colors.primaryMuted }]}
                            onPress={() => navigation.navigate("EventDetail", { eventId: event.id, initialEvent: event as any })}
                          >
                            <Text style={[styles.groupCardActionText, { color: colors.textPrimary }]}>
                              {language === "en" ? "Chat" : "Sohbet"}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          style={[styles.groupCardActionBtn, event.is_pending && styles.groupCardActionBtnPending]}
                          onPress={() => handleGroupJoin(event)}
                        >
                          <Text style={styles.groupCardActionText}>
                            {event.is_pending
                              ? (language === "en" ? "Awaiting Approval" : "Onay Bekleniyor")
                              : (language === "en" ? "Join" : "Katıl")}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : candidates[currentIndex] ? (
          <SwipeCandidateCard
            key={candidates[currentIndex].id}
            candidate={candidates[currentIndex]}
            activeEventTitle={activeEvent?.title ?? (language === "en" ? "General Users" : "Genel Kullanıcılar")}
            onSwipeLeft={() => handleSwipe("pass")}
            onSwipeRight={() => handleSwipe("like")}
            onSwipeUp={() => handleSwipe("super_like")}
            onPressProfile={() => {
              const activeCandidate = candidates[currentIndex];
              if (!activeCandidate) return;
              navigation.navigate("CandidateProfile", {
                candidate: activeCandidate,
                eventTitle: groupSwipeEvent?.title ?? activeEvent?.title,
                onExitGroupSwipe: groupSwipeEvent
                  ? () => {
                      setGroupSwipeEvent(null);
                      navigation.goBack();
                    }
                  : undefined,
                onSwipeLeft: () => handleSwipe("pass"),
                onSwipeRight: () => handleSwipe("like"),
                onSwipeUp: () => handleSwipe("super_like"),
              });
            }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {activeEvent
                ? language === "en"
                  ? "You've seen all candidates for this event!"
                  : "Bu etkinlik için tüm ilgilenen adayları gördün!"
                : language === "en"
                ? "No active platform users available right now."
                : "Şu anda görülecek başka platform kullanıcısı kalmadı."}
            </Text>
            <View style={{ marginTop: spacing.md, width: "100%", gap: spacing.sm }}>
              <PrimaryButton
                label={language === "en" ? "Find Another Event" : "Başka Etkinlik Bul"}
                onPress={() => navigation.navigate("Tabs", { screen: "Discover" })}
              />
              {activeEvent && activeTab === "user" ? (
                <PrimaryButton
                  label={language === "en" ? "Browse General Users" : "Genel Kullanıcılarda Gezin"}
                  onPress={() => selectGeneralSwipe()}
                />
              ) : null}
            </View>
          </View>
        )}
      </View>

      {candidates[currentIndex] && (activeTab !== "user" || userSubTab !== "group" || groupSwipeEvent) ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.passButton]}
            onPress={() => handleSwipe("pass")}
            disabled={isSwiping}
            accessibilityRole="button"
            accessibilityLabel="Geç"
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={() => handleSwipe("super_like")}
            disabled={isSwiping}
            accessibilityRole="button"
            accessibilityLabel="Süper beğen"
          >
            <Feather name="star" size={20} color={colors.surface} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleSwipe("like")}
            disabled={isSwiping}
            accessibilityRole="button"
            accessibilityLabel="Beğen"
          >
            <Feather name="heart" size={24} color={colors.surface} />
          </Pressable>
        </View>
      ) : null}

      <MatchCelebrationModal
        matchedUser={match?.user ?? null}
        onSendMessage={goToMatchChat}
        onDismiss={() => setMatch(null)}
      />

      <SwipeFiltersModal
        visible={filtersVisible}
        initialFilters={filters}
        isPremium={isPremium}
        onApply={handleApplyFilters}
        onDismiss={() => setFiltersVisible(false)}
      />

      <OptionPickerModal
        visible={eventPickerVisible}
        title={language === "en" ? "Change Event" : "Etkinlik Değiştir"}
        options={eventPickerOptions}
        onDismiss={() => setEventPickerVisible(false)}
      />

      {/* Store Modal */}
      <Modal
        visible={storeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStoreVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStoreVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Feather name="shopping-bag" size={22} color={colors.primary} />
              <Text style={typeScale.h1}>{t("buddyStore")}</Text>
            </View>
            <Text style={styles.storeSubtitle}>{t("buddyStoreSub")}</Text>

            <View style={styles.storeList}>
              <View style={styles.storeItem}>
                <View style={styles.storeItemLeft}>
                  <View style={[styles.storeIconWrapper, { backgroundColor: "rgba(241, 196, 15, 0.15)" }]}>
                    <Feather name="zap" size={18} color="#F1C40F" />
                  </View>
                  <View style={styles.storeItemTextColumn}>
                    <Text style={styles.storeItemTitle}>{t("oneSpotlight")}</Text>
                    <Text style={styles.storeItemDesc}>{t("spotlightBoostDesc")}</Text>
                  </View>
                </View>
                <Pressable style={styles.purchaseBtn} onPress={() => handlePurchase("boost")}>
                  <Text style={styles.purchaseBtnText}>{language === "en" ? "$3.99" : "39 ₺"}</Text>
                </Pressable>
              </View>

              <View style={styles.storeItem}>
                <View style={styles.storeItemLeft}>
                  <View style={[styles.storeIconWrapper, { backgroundColor: "rgba(46, 127, 201, 0.15)" }]}>
                    <Feather name="star" size={18} color="#2E7FC9" />
                  </View>
                  <View style={styles.storeItemTextColumn}>
                    <Text style={styles.storeItemTitle}>{t("fiveSuperLikes")}</Text>
                    <Text style={styles.storeItemDesc}>{t("superLikesDesc")}</Text>
                  </View>
                </View>
                <Pressable style={styles.purchaseBtn} onPress={() => handlePurchase("super_likes")}>
                  <Text style={styles.purchaseBtnText}>{language === "en" ? "$1.99" : "19 ₺"}</Text>
                </Pressable>
              </View>

              <View style={styles.storeItem}>
                <View style={styles.storeItemLeft}>
                  <View style={[styles.storeIconWrapper, { backgroundColor: "rgba(108, 92, 231, 0.15)" }]}>
                    <Feather name="heart" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.storeItemTextColumn}>
                    <Text style={styles.storeItemTitle}>{t("fiftyExtraSwipes")}</Text>
                    <Text style={styles.storeItemDesc}>{t("extraSwipesDesc")}</Text>
                  </View>
                </View>
                <Pressable style={styles.purchaseBtn} onPress={() => handlePurchase("swipes")}>
                  <Text style={styles.purchaseBtnText}>{language === "en" ? "$2.99" : "29 ₺"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.closeBtn} onPress={() => setStoreVisible(false)}>
              <Text style={styles.closeBtnText}>{t("close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Boost Confirm Modal */}
      <Modal
        visible={boostConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBoostConfirmVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBoostConfirmVisible(false)}>
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <Feather name="zap" size={36} color="#F1C40F" style={{ alignSelf: "center", marginBottom: spacing.sm }} />
            <Text style={[typeScale.h1, { textAlign: "center" }]}>
              {language === "en" ? "Start Spotlight?" : "Spotlight Başlatılsın mı?"}
            </Text>
            <Text style={styles.confirmSubtitle}>
              {language === "en"
                ? "When you activate Spotlight, your profile will be shown at the very top to all buddy candidates in the area for 60 minutes."
                : "Spotlight'ı aktifleştirdiğinde profilin 60 dakika boyunca bölgedeki tüm kanka adaylarına en ön sırada gösterilecektir."}
            </Text>
            <Text style={styles.confirmBalanceText}>
              {language === "en"
                ? `Your Spotlight Credits: ${user?.boosts_balance ?? 0}`
                : `Mevcut Spotlight Hakkın: ${user?.boosts_balance ?? 0} adet`}
            </Text>

            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmBtn} onPress={handleActivateBoost}>
                <Text style={styles.confirmBtnText}>
                  {language === "en" ? "Start (Use 1 Credit)" : "Başlat (1 Hak Kullan)"}
                </Text>
              </Pressable>
              <Pressable style={styles.cancelConfirmBtn} onPress={() => setBoostConfirmVisible(false)}>
                <Text style={styles.cancelConfirmBtnText}>
                  {language === "en" ? "Cancel" : "Vazgeç"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.surface,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
    gap: spacing.sm,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexShrink: 1,
    maxWidth: "62%",
  },
  eventPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  quotaText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardArea: {
    flex: 1,
    marginVertical: 2,
    paddingBottom: 95,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actionRow: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 82,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.sm + 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: radius.pill,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  passButton: {
    backgroundColor: colors.surface,
  },
  superLikeButton: {
    backgroundColor: "#2E7FC9",
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
  likesReceivedButton: {
    backgroundColor: "#FF2E93",
    shadowColor: "#FF2E93",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentYellow,
    borderWidth: 1.5,
    borderColor: "#FF2E93",
  },
  boostHeaderButton: {
    backgroundColor: "#F1C40F15",
    borderWidth: 1,
    borderColor: "#F1C40F50",
  },
  boostHeaderButtonActive: {
    backgroundColor: "#F1C40F",
    borderColor: "#F1C40F",
    shadowColor: "#F1C40F",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: "100%",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  storeSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  storeList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  storeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  storeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  storeItemTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  storeItemDesc: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  storeItemTextColumn: {
    flex: 1,
  },
  purchaseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minWidth: 70,
    alignItems: "center",
  },
  purchaseBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.surface,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    alignItems: "center",
  },
  closeBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    width: "100%",
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  confirmSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  confirmBalanceText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
  },
  confirmActions: {
    gap: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: "#F1C40F",
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    alignItems: "center",
    shadowColor: "#F1C40F",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  confirmBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.surface,
  },
  cancelConfirmBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    alignItems: "center",
  },
  cancelConfirmBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  subTabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  groupSwipeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  groupSwipeBarText: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  groupSwipeExitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentRed,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  groupSwipeExitBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
  subTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subTabButtonActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  subTabButtonText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  subTabButtonTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  systemSubTabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  systemSubTabPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  groupCardItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupCategoryPill: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  attendeesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  attendeesBadgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  groupCardTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
  },
  groupCardLocation: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  groupCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  creatorNameText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  creatorSubText: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
  groupCardActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  groupCardActionBtnPending: {
    backgroundColor: colors.textSecondary,
  },
  groupCardActionText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.surface,
  },
});

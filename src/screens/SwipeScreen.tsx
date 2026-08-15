import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator } from "react-native";
import { SwipeCandidateCard } from "../components/cards/SwipeCandidateCard";
import { MatchCelebrationModal } from "../components/overlays/MatchCelebrationModal";
import { SwipeFiltersModal } from "../components/overlays/SwipeFiltersModal";
import { listEvents } from "../api/events";
import { createSwipe, getSwipeCandidates } from "../api/swipes";
import type { SwipeCandidateFilters } from "../api/swipes";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList, MainTabParamList } from "../navigation/RootNavigator";
import type { User, UserPublic } from "../types";

interface ActiveEvent {
  id: number;
  title: string;
}

type SwipeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Swipe">,
  NativeStackNavigationProp<MainStackParamList>
>;

export function SwipeScreen() {
  const navigation = useNavigation<SwipeNavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, "Swipe">>();
  const { isPremium } = useAuth();
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [match, setMatch] = useState<{ id: number; user: UserPublic } | null>(null);
  const [filters, setFilters] = useState<SwipeCandidateFilters>({});
  const [filtersVisible, setFiltersVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function resolveActiveEvent(): Promise<ActiveEvent | null> {
        if (route.params) {
          return { id: route.params.eventId, title: route.params.eventTitle };
        }
        const upcoming = await listEvents();
        return upcoming[0] ? { id: upcoming[0].id, title: upcoming[0].title } : null;
      }

      setIsLoading(true);
      resolveActiveEvent()
        .then(async (event) => {
          if (cancelled) return;
          setActiveEvent(event);
          setCurrentIndex(0);
          if (event) {
            const list = await getSwipeCandidates(event.id, filters);
            if (!cancelled) setCandidates(list);
          } else {
            setCandidates([]);
          }
        })
        .catch(() => {
          if (!cancelled) {
            Alert.alert("Bir sorun oluştu", "Etkinlik ve adaylar yüklenemedi. Lütfen tekrar dene.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [route.params, filters])
  );

  function handleApplyFilters(nextFilters: SwipeCandidateFilters): void {
    setFilters(nextFilters);
    setFiltersVisible(false);
  }

  async function handleSwipe(direction: "like" | "pass" | "super_like"): Promise<void> {
    const target = candidates[currentIndex];
    if (!activeEvent || !target) {
      return;
    }
    try {
      const result = await createSwipe({ target_id: target.id, event_id: activeEvent.id, direction });
      if (result.match_id !== null && result.matched_user !== null) {
        setMatch({ id: result.match_id, user: result.matched_user });
      }
      setCurrentIndex((index) => index + 1);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const detail = error.response.data?.detail as string | undefined;
        if (detail === "Daily super like limit reached") {
          Alert.alert(
            "Süper beğeni hakkın bitti",
            "Bugünlük süper beğeni hakkın doldu, yarın tekrar dene ya da Premium'a geç."
          );
        } else {
          Alert.alert("Günlük limit doldu", "Bugünlük swipe hakkın bitti, yarın tekrar dene.");
        }
      } else {
        Alert.alert("Bir sorun oluştu", "Swipe kaydedilemedi. Lütfen tekrar dene.");
      }
    }
  }

  function goToMatchChat(): void {
    if (!match) return;
    const matchId = match.id;
    const otherUserId = match.user.id;
    const otherUserName = match.user.display_name;
    setMatch(null);
    navigation.navigate("Chat", { matchId, otherUserId, otherUserName });
  }

  return (
    <View style={styles.background}>
      <View style={styles.headerRow}>
        <View>
          <Text style={typeScale.eyebrow}>Yakınındaki Kankalar</Text>
          <Text style={typeScale.h1}>Bir sonraki kankan kim?</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => navigation.navigate("LikesReceived")}
            accessibilityRole="button"
            accessibilityLabel="Seni beğenenler"
          >
            <Feather name="heart" size={16} color={colors.primary} />
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

      {activeEvent ? (
        <View style={styles.eventPill}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={styles.eventPillText}>{activeEvent.title}</Text>
        </View>
      ) : null}

      <View style={styles.cardArea}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !activeEvent ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Yaklaşan etkinlik yok. Önce Keşfet sekmesinden bir etkinlik seç.
            </Text>
          </View>
        ) : candidates[currentIndex] ? (
          <SwipeCandidateCard
            candidate={candidates[currentIndex]}
            onSwipeLeft={() => handleSwipe("pass")}
            onSwipeRight={() => handleSwipe("like")}
            onSwipeUp={() => handleSwipe("super_like")}
            onPressProfile={() =>
              navigation.navigate("CandidateProfile", {
                candidate: candidates[currentIndex],
                onSwipeLeft: () => handleSwipe("pass"),
                onSwipeRight: () => handleSwipe("like"),
                onSwipeUp: () => handleSwipe("super_like"),
              })
            }
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Bu etkinlik için başka aday kalmadı.</Text>
          </View>
        )}
      </View>

      {activeEvent && candidates[currentIndex] ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.passButton]}
            onPress={() => handleSwipe("pass")}
            accessibilityRole="button"
            accessibilityLabel="Geç"
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={() => handleSwipe("super_like")}
            accessibilityRole="button"
            accessibilityLabel="Süper beğen"
          >
            <Feather name="star" size={20} color={colors.surface} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleSwipe("like")}
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
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.xl,
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
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  eventPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  cardArea: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  passButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  superLikeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2E7FC9",
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
  },
});

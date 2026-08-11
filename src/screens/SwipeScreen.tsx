import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { ActivityIndicator } from "react-native";
import { SwipeCandidateCard } from "../components/cards/SwipeCandidateCard";
import { listEvents } from "../api/events";
import { createSwipe, getSwipeCandidates } from "../api/swipes";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainTabParamList } from "../navigation/RootNavigator";
import type { User } from "../types";

interface ActiveEvent {
  id: number;
  title: string;
}

export function SwipeScreen() {
  const route = useRoute<RouteProp<MainTabParamList, "Swipe">>();
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
      resolveActiveEvent().then(async (event) => {
        if (cancelled) return;
        setActiveEvent(event);
        setCurrentIndex(0);
        if (event) {
          const list = await getSwipeCandidates(event.id);
          if (!cancelled) setCandidates(list);
        } else {
          setCandidates([]);
        }
        if (!cancelled) setIsLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }, [route.params])
  );

  async function handleSwipe(direction: "like" | "pass"): Promise<void> {
    const target = candidates[currentIndex];
    if (!activeEvent || !target) {
      return;
    }
    await createSwipe({ target_id: target.id, event_id: activeEvent.id, direction });
    setCurrentIndex((index) => index + 1);
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
            onPress={() => handleSwipe("pass")}
            disabled={!activeEvent || isLoading}
          >
            <Feather name="x" size={16} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => Alert.alert("Yakında", "Filtreler yakında burada olacak.")}
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
          <SwipeCandidateCard candidate={candidates[currentIndex]} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Bu etkinlik için başka aday kalmadı.</Text>
          </View>
        )}
      </View>

      {activeEvent && candidates[currentIndex] ? (
        <LinearGradient colors={[colors.accentYellow, "#FFB23C"]} style={styles.ctaWrapper}>
          <Pressable onPress={() => handleSwipe("like")} style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              📍 {activeEvent.title} için {candidates[currentIndex].display_name} ile buluşmak istiyor
            </Text>
          </Pressable>
        </LinearGradient>
      ) : null}
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
  ctaWrapper: {
    borderRadius: radius.card,
  },
  ctaButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ctaText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: "center",
  },
});

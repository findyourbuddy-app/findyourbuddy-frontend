import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { getEvent } from "../api/events";
import { getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { formatRelativeTimestamp } from "../utils/date";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "EventDetail">;

export function EventDetailScreen({ route }: Props) {
  const { eventId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      Promise.all([getEvent(eventId), listMyBookmarks()])
        .then(([loadedEvent, bookmarks]) => {
          if (cancelled) return;
          setEvent(loadedEvent);
          setIsBookmarked(bookmarks.some((b) => b.event.id === eventId));
        })
        .catch(() => {
          if (!cancelled) {
            Alert.alert("Bir sorun oluştu", "Etkinlik yüklenemedi. Lütfen tekrar dene.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [eventId])
  );

  async function toggleBookmark(): Promise<void> {
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    try {
      if (wasBookmarked) {
        await deleteBookmark(eventId);
      } else {
        await createBookmark(eventId);
      }
    } catch {
      setIsBookmarked(wasBookmarked);
      Alert.alert("Bir sorun oluştu", "Kaydetme işlemi tamamlanamadı. Lütfen tekrar dene.");
    }
  }

  function goToSwipe(): void {
    if (!event) return;
    navigation.navigate("Tabs", {
      screen: "Swipe",
      params: { eventId: event.id, eventTitle: event.title },
    });
  }

  if (isLoading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const category = getCategoryMeta(event.category);

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={category.gradient} style={StyleSheet.absoluteFill}>
            <View style={styles.bannerIcon}>
              <Feather name={category.icon} size={48} color={colors.surface} />
            </View>
          </LinearGradient>
        )}
        <Pressable style={styles.bookmark} onPress={toggleBookmark}>
          <Feather
            name="bookmark"
            size={20}
            color={isBookmarked ? colors.accentYellow : colors.surface}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={typeScale.display}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatRelativeTimestamp(event.starts_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{event.location_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name={category.icon} size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{category.label}</Text>
        </View>

        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        <PrimaryButton label="Kankaları Gör" onPress={goToSwipe} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  banner: {
    height: 220,
  },
  bannerIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});

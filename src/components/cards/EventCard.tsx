import { memo, useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "../ui/Badge";
import { PrimaryButton } from "../ui/PrimaryButton";
import { getCategoryMeta } from "../../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import { formatEventDate, isToday } from "../../utils/date";
import type { Event } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

import { resolvePhotoUrl } from "../ui/Avatar";

interface EventCardProps {
  event: Event;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onPressJoin: () => void;
  onPress?: () => void;
  distanceLabel?: string;
}

export function EventCard({ event, bookmarked, onToggleBookmark, onPressJoin, onPress, distanceLabel }: EventCardProps) {
  const { language, t } = useAppTheme();
  const category = getCategoryMeta(event.category, language);
  const startLabel = formatEventDate(event.starts_at, language);

  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const isFirstBookmarkRender = useRef(true);
  useEffect(() => {
    if (isFirstBookmarkRender.current) {
      isFirstBookmarkRender.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(bookmarkScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(bookmarkScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [bookmarked, bookmarkScale]);

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.banner}>
        {event.creator_id && event.creator?.photo_url ? (
          <Image source={{ uri: resolvePhotoUrl(event.creator.photo_url) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={{ duration: 150 }} />
        ) : event.image_url ? (
          <Image source={{ uri: resolvePhotoUrl(event.image_url) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={{ duration: 150 }} />
        ) : (
          <LinearGradient colors={category.gradient} style={StyleSheet.absoluteFill}>
            <View style={styles.bannerIcon}>
              <Feather name={category.icon} size={40} color={colors.surface} />
            </View>
          </LinearGradient>
        )}
        <View style={styles.badgeSlot}>
          {isToday(event.starts_at) ? <Badge label={language === "en" ? "Tonight" : "Bu akşam"} variant="yellow" icon="⚡" /> : null}
          {event.creator_id ? (
            <Badge label={language === "en" ? "User Event" : "Kullanıcı Etkinliği"} variant="primary" />
          ) : (
            <Badge label={language === "en" ? "Official Event" : "Resmi Etkinlik"} variant="blue" icon="✓" />
          )}
        </View>
        <Pressable style={styles.bookmark} onPress={onToggleBookmark}>
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Feather
              name="bookmark"
              size={18}
              color={bookmarked ? colors.accentYellow : colors.surface}
            />
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={typeScale.h1}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{startLabel}</Text>
          {distanceLabel ? (
            <>
              <Feather name="navigation" size={14} color={colors.primary} style={styles.metaIconSpacer} />
              <Text style={[styles.metaText, { color: colors.primary, fontFamily: fontFamily.bodySemiBold }]}>{distanceLabel}</Text>
            </>
          ) : (
            <>
              <Feather name="map-pin" size={14} color={colors.textSecondary} style={styles.metaIconSpacer} />
              <Text style={styles.metaText}>{event.location_name}</Text>
            </>
          )}
        </View>
        {event.attendee_count > 0 ? (
          <View style={styles.metaRow}>
            <Feather name="users" size={14} color={colors.primary} />
            <Text style={styles.attendeeText}>
              {event.attendee_count} {t("personInterested")}
            </Text>
          </View>
        ) : null}
        <PrimaryButton
          label={
            event.is_attending
              ? t("seeBuddiesBtn")
              : event.is_pending
              ? (language === "en" ? "Awaiting Approval" : "Onay Bekleniyor")
              : t("imGoingToThisEvent")
          }
          onPress={onPressJoin}
          disabled={event.is_pending}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  banner: {
    height: 160,
  },
  bannerIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSlot: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
  },
  bookmark: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaIconSpacer: {
    marginLeft: spacing.md,
  },
  metaText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  attendeeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
});

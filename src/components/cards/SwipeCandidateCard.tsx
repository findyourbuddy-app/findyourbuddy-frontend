import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { getInterestLabel } from "../../constants/interests";
import { hasValidCoordinates, resolveCityDistrict } from "../../utils/location";
import { colors, fontFamily, radius, spacing } from "../../theme";
import type { User } from "../../types";
import { PhotoLightboxModal } from "../overlays/PhotoLightboxModal";

interface SwipeCandidateCardProps {
  candidate: User;
  activeEventTitle?: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onPressProfile: () => void;
}

const FALLBACK_GRADIENT: [string, string] = ["#B8AEE8", "#6C4CF1"];
const DRAG_THRESHOLD_X = 100;
const DRAG_THRESHOLD_Y = 120;
const TAP_MOVE_THRESHOLD = 6;

import { resolvePhotoUrl } from "../ui/Avatar";

function candidatePhotoUrls(candidate: User): string[] {
  const rawUrls = [
    candidate.photo_url,
    ...candidate.photos.map((photo) => photo.photo_url),
  ].filter((url): url is string => Boolean(url));
  const resolved = rawUrls
    .map((u) => resolvePhotoUrl(u))
    .filter((u): u is string => Boolean(u));
  return Array.from(new Set(resolved));
}

import { useAppTheme } from "../../context/ThemeContext";

export function SwipeCandidateCard({
  candidate,
  activeEventTitle,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onPressProfile,
}: SwipeCandidateCardProps) {
  const { language } = useAppTheme();
  const photoUrls = candidatePhotoUrls(candidate);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [locationName, setLocationName] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    if (hasValidCoordinates(candidate.latitude, candidate.longitude)) {
      resolveCityDistrict(candidate.latitude, candidate.longitude).then(setLocationName);
    }
  }, [candidate.latitude, candidate.longitude]);

  const rawEventTitle = activeEventTitle || candidate.event_title;
  const isGeneralUsersTitle = Boolean(
    rawEventTitle &&
    (rawEventTitle.toLowerCase().includes("genel kullanıcılard") ||
     rawEventTitle.toLowerCase().includes("general user") ||
     rawEventTitle.toLowerCase().includes("genel kullanıcı"))
  );
  const showEventBadge = Boolean(rawEventTitle && !isGeneralUsersTitle && rawEventTitle.trim().length > 0);

  function handleLayout(event: LayoutChangeEvent): void {
    setCardWidth(event.nativeEvent.layout.width);
  }

  function resetPosition(): void {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  }

  function flingOut(direction: "left" | "right" | "up", onComplete: () => void): void {
    const target =
      direction === "up"
        ? { x: 0, y: -800 }
        : { x: direction === "right" ? 600 : -600, y: -60 };
    Animated.timing(position, { toValue: target, duration: 220, useNativeDriver: false }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onComplete();
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (evt, gesture) => {
        const movedEnough =
          Math.abs(gesture.dx) > TAP_MOVE_THRESHOLD || Math.abs(gesture.dy) > TAP_MOVE_THRESHOLD;
        if (!movedEnough) {
          const tapX = evt.nativeEvent.locationX;
          // Left/right edges browse photos (when there's more than one); tapping
          // the photo itself zooms it. Opening the full profile now goes through
          // the dedicated info badge instead of eating most of the card's tap area.
          if (photoUrls.length > 1 && cardWidth > 0 && tapX < cardWidth * 0.25) {
            goToPhoto(-1);
          } else if (photoUrls.length > 1 && cardWidth > 0 && tapX > cardWidth * 0.75) {
            goToPhoto(1);
          } else {
            onPressProfile();
          }
          return;
        }
        if (gesture.dy < -DRAG_THRESHOLD_Y && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          flingOut("up", onSwipeUp);
        } else if (gesture.dx > DRAG_THRESHOLD_X) {
          flingOut("right", onSwipeRight);
        } else if (gesture.dx < -DRAG_THRESHOLD_X) {
          flingOut("left", onSwipeLeft);
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  function goToPhoto(delta: number): void {
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0 || next >= photoUrls.length) return current;
      return next;
    });
  }

  const rotate = position.x.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: ["-12deg", "0deg", "12deg"],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [20, DRAG_THRESHOLD_X],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-DRAG_THRESHOLD_X, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const superOpacity = position.y.interpolate({
    inputRange: [-DRAG_THRESHOLD_Y, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
        },
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {photoUrls.length > 0 ? (
        <Image
          source={{ uri: photoUrls[activeIndex] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={{ duration: 150 }}
          pointerEvents="none"
        />
      ) : (
        <LinearGradient colors={FALLBACK_GRADIENT} style={StyleSheet.absoluteFill}>
          <View style={styles.placeholderIcon}>
            <Feather name="user" size={72} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      )}

      {photoUrls.length > 1 ? (
        <View style={styles.dotsRow} pointerEvents="none">
          {photoUrls.map((url, index) => (
            <View
              key={url}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}


      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "LIKE" : "BEĞEN"}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "PASS" : "GEÇ"}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "SUPER" : "SÜPER"}</Text>
      </Animated.View>

      <LinearGradient
        colors={["transparent", "rgba(15,10,40,0.9)"]}
        style={styles.overlay}
        pointerEvents="box-none"
      >

        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {candidate.display_name}
            {candidate.age ? `, ${candidate.age}` : ""}
          </Text>
          {candidate.is_verified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={10} color="#FFF" />
            </View>
          )}
          {candidate.trust_score > 0 && (
            <View style={styles.trustBadge}>
              <Feather name="shield" size={10} color="#FFF" />
              <Text style={styles.trustBadgeText}>Güvenilir Buddy</Text>
            </View>
          )}
          <Pressable
            style={styles.infoBadgeBtn}
            onPress={onPressProfile}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={language === "en" ? "View profile" : "Profili görüntüle"}
          >
            <Feather name="info" size={14} color="#FFF" />
          </Pressable>
        </View>


        {locationName ? (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        ) : null}

        {showEventBadge ? (
          <View style={styles.eventContextRow}>
            <Feather name="calendar" size={12} color="#FFD700" />
            <Text style={styles.eventContextText} numberOfLines={1}>
              {language === "en" ? "Selected Event: " : "Seçili Etkinlik: "}
              {rawEventTitle}
            </Text>
          </View>
        ) : null}

        <View style={styles.lookingForRow}>
          <Feather name="message-circle" size={12} color="#4DEEEA" />
          <Text style={styles.lookingForText} numberOfLines={1}>
            {language === "en" ? "Looking for: " : "Aradığı İletişim: "}
            {candidate.looking_for || (language === "en" ? "Event Buddy & Chat" : "Etkinlik Arkadaşı & Sohbet")}
          </Text>
        </View>

        {candidate.bio || candidate.about_me_prompt ? (
          <View style={styles.bioBox}>
            <Text style={styles.bioText} numberOfLines={2}>
              "{candidate.bio || candidate.about_me_prompt}"
            </Text>
          </View>
        ) : null}

        {candidate.interests.length > 0 ? (
          <View style={styles.chipRow}>
            {candidate.interests.slice(0, 3).map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest, language)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>

      <PhotoLightboxModal
        visible={lightboxVisible}
        photos={photoUrls}
        initialIndex={activeIndex}
        onClose={() => setLightboxVisible(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.primaryMuted,
  },
  photo: {},
  placeholderIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    top: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: colors.surface,
  },
  stamp: {
    position: "absolute",
    top: spacing.xxl,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stampLike: {
    left: spacing.lg,
    borderColor: colors.accentGreen,
    transform: [{ rotate: "-12deg" }],
  },
  stampPass: {
    right: spacing.lg,
    borderColor: colors.accentRed,
    transform: [{ rotate: "12deg" }],
  },
  stampSuper: {
    alignSelf: "center",
    left: "50%",
    marginLeft: -60,
    borderColor: "#2E7FC9",
  },
  stampText: {
    fontFamily: fontFamily.displayBold,
    fontSize: 24,
    color: colors.surface,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: colors.surface,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    gap: 3,
    marginLeft: 6,
  },
  trustBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    color: "#FFF",
  },
  infoBadgeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  eventLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 201, 60, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 201, 60, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: -2,
    marginBottom: 4,
  },
  eventLocationPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#FFC93C",
    flexShrink: 1,
  },
  locationRow: {

    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -2,
    marginBottom: 2,
  },
  locationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.95)",
  },
  eventContextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  eventContextText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#FFD700",
    flexShrink: 1,
  },
  lookingForRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  lookingForText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.95)",
    flexShrink: 1,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  eventPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.surface,
    flexShrink: 1,
  },
  bioBox: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  bioText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.surface,
  },
});

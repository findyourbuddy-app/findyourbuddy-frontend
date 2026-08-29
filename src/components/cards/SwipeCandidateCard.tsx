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

interface SwipeCandidateCardProps {
  candidate: User;
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
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onPressProfile,
}: SwipeCandidateCardProps) {
  const { language } = useAppTheme();
  const photoUrls = candidatePhotoUrls(candidate);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [locationName, setLocationName] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    if (hasValidCoordinates(candidate.latitude, candidate.longitude)) {
      resolveCityDistrict(candidate.latitude, candidate.longitude).then(setLocationName);
    }
  }, [candidate.latitude, candidate.longitude]);

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
          // Left/right edges browse photos (when there's more than one); a tap
          // anywhere else opens the full profile.
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
    inputRange: [12, 70],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-70, -12],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const superOpacity = position.y.interpolate({
    inputRange: [-80, -12],
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

      <LinearGradient
        colors={["transparent", "rgba(10,5,30,0.85)"]}
        style={styles.overlay}
        pointerEvents="box-none"
      >
        <Pressable onPress={onPressProfile} style={{ gap: 3 }}>
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
          </View>

          {locationName ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.locationText}>{locationName}</Text>
            </View>
          ) : null}

          {candidate.looking_for ? (
            <View style={styles.lookingForRow}>
              <Feather name="message-circle" size={11} color="#4DEEEA" />
              <Text style={styles.lookingForText} numberOfLines={1}>
                {candidate.looking_for}
              </Text>
            </View>
          ) : null}

          {candidate.bio || candidate.about_me_prompt ? (
            <View style={styles.bioBox}>
              <Text style={styles.bioText} numberOfLines={1}>
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
        </Pressable>
      </LinearGradient>

      {/* Rendered last so the swipe feedback always sits above the photo + overlay. */}
      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "LIKE" : "BEĞEN"}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "PASS" : "GEÇ"}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{language === "en" ? "SUPER" : "SÜPER"}</Text>
      </Animated.View>
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
    padding: spacing.md,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.displayBold,
    fontSize: 19,
    color: colors.surface,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  eventLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 201, 60, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 201, 60, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: -2,
    marginBottom: 2,
  },
  eventLocationPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: "#FFC93C",
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.95)",
  },
  lookingForRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lookingForText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
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
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  eventPillText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.surface,
    flexShrink: 1,
  },
  bioBox: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    marginTop: 1,
  },
  bioText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.surface,
  },
});

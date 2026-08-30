import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
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
  onShowHelp: () => void;
  // When false, that gesture still notifies the parent (which explains why)
  // but the card springs back instead of flying off.
  canLike: boolean;
  canSuperLike: boolean;
}

const FALLBACK_GRADIENT: [string, string] = ["#9385D8", "#5B41CE"];
const DRAG_THRESHOLD_X = 100;
const DRAG_THRESHOLD_Y = 120;
// Generous so a quick, slightly-sloppy double tap still counts as two taps
// rather than a drag.
const TAP_MOVE_THRESHOLD = 12;
// Gap allowed between the two taps of a double tap.
const DOUBLE_TAP_MS = 320;

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
  onShowHelp,
  canLike,
  canSuperLike,
}: SwipeCandidateCardProps) {
  const { language, t } = useAppTheme();
  const photoUrls = candidatePhotoUrls(candidate);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [locationName, setLocationName] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  // The PanResponder is created once, so its handlers must read live values
  // (measured size, latest callbacks) through this ref instead of the stale
  // first-render closure.
  const liveRef = useRef({
    cardWidth: 0,
    cardHeight: 0,
    photoCount: photoUrls.length,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onPressProfile,
    onShowHelp,
    canLike,
    canSuperLike,
  });
  liveRef.current = {
    cardWidth: liveRef.current.cardWidth,
    cardHeight: liveRef.current.cardHeight,
    photoCount: photoUrls.length,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onPressProfile,
    onShowHelp,
    canLike,
    canSuperLike,
  };

  // A single tap opens the profile, a double tap browses photos -- so the
  // single-tap action is held for one double-tap window before it fires.
  const tapStateRef = useRef<{ timer: ReturnType<typeof setTimeout> | null }>({ timer: null });

  useEffect(() => {
    if (hasValidCoordinates(candidate.latitude, candidate.longitude)) {
      resolveCityDistrict(candidate.latitude, candidate.longitude).then(setLocationName);
    }
  }, [candidate.latitude, candidate.longitude]);

  useEffect(() => {
    return () => {
      if (tapStateRef.current.timer) clearTimeout(tapStateRef.current.timer);
    };
  }, []);

  function handleLayout(event: LayoutChangeEvent): void {
    const { width, height } = event.nativeEvent.layout;
    setCardWidth(width);
    liveRef.current.cardWidth = width;
    liveRef.current.cardHeight = height;
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
        const live = liveRef.current;
        const movedEnough =
          Math.abs(gesture.dx) > TAP_MOVE_THRESHOLD || Math.abs(gesture.dy) > TAP_MOVE_THRESHOLD;
        if (!movedEnough) {
          const tapX = evt.nativeEvent.locationX;
          const tapY = evt.nativeEvent.locationY;
          const w = live.cardWidth;
          // Top-right corner opens the "how to swipe" help.
          if (w > 0 && tapX > w - 56 && tapY < 56) {
            live.onShowHelp();
            return;
          }
          const tap = tapStateRef.current;
          if (tap.timer) {
            // Second tap inside the window -> browse photos (left half back,
            // right half forward) instead of opening the profile.
            clearTimeout(tap.timer);
            tapStateRef.current = { timer: null };
            if (live.photoCount > 1 && w > 0) {
              goToPhoto(tapX < w / 2 ? -1 : 1);
            } else {
              live.onPressProfile();
            }
          } else {
            const openProfile = live.onPressProfile;
            tapStateRef.current = {
              timer: setTimeout(() => {
                tapStateRef.current = { timer: null };
                openProfile();
              }, DOUBLE_TAP_MS),
            };
          }
          return;
        }
        // A real drag: drop any single-tap that hasn't fired yet so the
        // profile never opens for a card the user is swiping away.
        if (tapStateRef.current.timer) {
          clearTimeout(tapStateRef.current.timer);
          tapStateRef.current = { timer: null };
        }
        if (gesture.dy < -DRAG_THRESHOLD_Y && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          if (live.canSuperLike) {
            flingOut("up", live.onSwipeUp);
          } else {
            resetPosition();
            live.onSwipeUp();
          }
        } else if (gesture.dx > DRAG_THRESHOLD_X) {
          if (live.canLike) {
            flingOut("right", live.onSwipeRight);
          } else {
            resetPosition();
            live.onSwipeRight();
          }
        } else if (gesture.dx < -DRAG_THRESHOLD_X) {
          flingOut("left", live.onSwipeLeft);
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

      {/* Visual only -- the tap is handled by the card's PanResponder (top-right
          corner), so this moves and rotates with the card. */}
      <View style={styles.helpBadge} pointerEvents="none">
        <Feather name="info" size={15} color="#FFFFFF" />
      </View>

      {/* Plain View, not a Pressable: every tap on the card must reach the
          PanResponder so single-tap (profile) and double-tap (photos) are
          told apart. A Pressable here swallowed taps over the text block and
          opened the profile before the double tap could register. */}
      <LinearGradient
        colors={["transparent", "rgba(10,5,30,0.85)"]}
        style={styles.overlay}
        pointerEvents="none"
      >
        <View style={{ gap: 3 }}>
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
        </View>
      </LinearGradient>

      {/* Rendered last so the swipe feedback always sits above the photo + overlay. */}
      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{t("like")}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{t("pass")}</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]} pointerEvents="none">
        <Text style={styles.stampText}>{t("super")}</Text>
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
  helpBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    alignItems: "center",
    justifyContent: "center",
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
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stampLike: {
    left: spacing.lg,
    backgroundColor: colors.accentGreen,
    transform: [{ rotate: "-12deg" }],
  },
  stampPass: {
    right: spacing.lg,
    backgroundColor: colors.accentRed,
    transform: [{ rotate: "12deg" }],
  },
  stampSuper: {
    alignSelf: "center",
    left: "50%",
    marginLeft: -60,
    backgroundColor: "#2E7FC9",
  },
  stampText: {
    fontFamily: fontFamily.displayBold,
    fontSize: 24,
    color: "#FFFFFF",
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

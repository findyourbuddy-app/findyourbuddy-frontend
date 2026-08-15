import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { getInterestLabel } from "../../constants/interests";
import { colors, fontFamily, radius, spacing } from "../../theme";
import type { User } from "../../types";

interface SwipeCandidateCardProps {
  candidate: User;
}

const FALLBACK_GRADIENT: [string, string] = ["#B8AEE8", "#6C4CF1"];
const CARD_WIDTH = Dimensions.get("window").width - spacing.lg * 2;

function candidatePhotoUrls(candidate: User): string[] {
  const urls = [
    candidate.photo_url,
    ...candidate.photos.map((photo) => photo.photo_url),
  ].filter((url): url is string => Boolean(url));
  return Array.from(new Set(urls));
}

export function SwipeCandidateCard({ candidate }: SwipeCandidateCardProps) {
  const photoUrls = candidatePhotoUrls(candidate);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveIndex(index);
  }

  return (
    <View style={styles.card}>
      {photoUrls.length > 0 ? (
        <FlatList
          data={photoUrls}
          keyExtractor={(url) => url}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.photo} contentFit="cover" />
          )}
        />
      ) : (
        <LinearGradient colors={FALLBACK_GRADIENT} style={StyleSheet.absoluteFill}>
          <View style={styles.placeholderIcon}>
            <Feather name="user" size={72} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      )}

      {photoUrls.length > 1 ? (
        <View style={styles.dotsRow}>
          {photoUrls.map((url, index) => (
            <View
              key={url}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}

      <LinearGradient
        colors={["transparent", "rgba(15,10,40,0.9)"]}
        style={styles.overlay}
      >
        <Text style={styles.name}>
          {candidate.display_name}
          {candidate.age ? `, ${candidate.age}` : ""}
        </Text>
        {candidate.bio ? <Text style={styles.bio}>"{candidate.bio}"</Text> : null}
        {candidate.interests.length > 0 ? (
          <View style={styles.chipRow}>
            {candidate.interests.slice(0, 3).map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.primaryMuted,
  },
  photo: {
    width: CARD_WIDTH,
    height: "100%",
  },
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
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: colors.surface,
  },
  bio: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.9)",
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

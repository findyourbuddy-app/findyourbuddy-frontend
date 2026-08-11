import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme";
import type { User } from "../../types";

interface SwipeCandidateCardProps {
  candidate: User;
}

const FALLBACK_GRADIENT: [string, string] = ["#B8AEE8", "#6C4CF1"];

export function SwipeCandidateCard({ candidate }: SwipeCandidateCardProps) {
  return (
    <View style={styles.card}>
      {candidate.photo_url ? (
        <Image source={{ uri: candidate.photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient colors={FALLBACK_GRADIENT} style={StyleSheet.absoluteFill}>
          <View style={styles.placeholderIcon}>
            <Feather name="user" size={72} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      )}

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
                <Text style={styles.chipText}>{interest}</Text>
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
  placeholderIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

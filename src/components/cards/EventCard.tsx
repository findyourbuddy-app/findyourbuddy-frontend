import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "../ui/Badge";
import { PrimaryButton } from "../ui/PrimaryButton";
import { getCategoryMeta } from "../../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import { formatRelativeTimestamp, isToday } from "../../utils/date";
import type { Event } from "../../types";

interface EventCardProps {
  event: Event;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onPressJoin: () => void;
}

export function EventCard({ event, bookmarked, onToggleBookmark, onPressJoin }: EventCardProps) {
  const category = getCategoryMeta(event.category);
  const startLabel = isToday(event.starts_at)
    ? `Bugün · ${formatRelativeTimestamp(event.starts_at)}`
    : formatRelativeTimestamp(event.starts_at);

  return (
    <View style={styles.card}>
      <LinearGradient colors={category.gradient} style={styles.banner}>
        <Feather name={category.icon} size={40} color={colors.surface} />
        {isToday(event.starts_at) ? (
          <View style={styles.badgeSlot}>
            <Badge label="Bu akşam" variant="yellow" icon="⚡" />
          </View>
        ) : null}
        <Pressable style={styles.bookmark} onPress={onToggleBookmark}>
          <Feather
            name="bookmark"
            size={18}
            color={bookmarked ? colors.accentYellow : colors.surface}
          />
        </Pressable>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={typeScale.h1}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{startLabel}</Text>
          <Feather name="map-pin" size={14} color={colors.textSecondary} style={styles.metaIconSpacer} />
          <Text style={styles.metaText}>{event.location_name}</Text>
        </View>
        <PrimaryButton label="Kankaları Gör" onPress={onPressJoin} />
      </View>
    </View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSlot: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
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
});

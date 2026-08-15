import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getCategoryMeta } from "../../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import { formatRelativeTimestamp } from "../../utils/date";
import type { Event } from "../../types";

interface EventListItemProps {
  event: Event;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onPress: () => void;
}

export function EventListItem({ event, bookmarked, onToggleBookmark, onPress }: EventListItemProps) {
  const category = getCategoryMeta(event.category);

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${formatRelativeTimestamp(event.starts_at)}`}
    >
      <View style={styles.thumbnail}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={category.gradient} style={styles.thumbnailIcon}>
            <Feather name={category.icon} size={22} color={colors.surface} />
          </LinearGradient>
        )}
        <Pressable
          style={styles.bookmark}
          onPress={onToggleBookmark}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Kaydedilenlerden çıkar" : "Kaydet"}
          accessibilityState={{ selected: bookmarked }}
        >
          <Feather
            name="bookmark"
            size={14}
            color={bookmarked ? colors.accentYellow : colors.surface}
          />
        </Pressable>
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.meta}>{formatRelativeTimestamp(event.starts_at)}</Text>
        <Text style={typeScale.h2}>{event.title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  thumbnailIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

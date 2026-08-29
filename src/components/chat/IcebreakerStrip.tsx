import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing, shadows } from "../../theme";
import type { IcebreakerItem } from "../../api/messages";

interface Props {
  icebreakers: IcebreakerItem[];
  isLoading: boolean;
  onSelect: (item: IcebreakerItem) => void;
  onRefresh: () => void;
  language?: string;
}

export function IcebreakerStrip({ icebreakers, isLoading, onSelect, onRefresh, language = "tr" }: Props) {
  if (icebreakers.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Feather name="zap" size={14} color="#8A2BE2" />
          <Text style={styles.headerTitle}>
            {language === "en" ? "Icebreaker AI" : "Yapay Zeka Tanışma Önerileri"}
          </Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshBtn} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#8A2BE2" />
          ) : (
            <Feather name="refresh-cw" size={14} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {icebreakers.map((item) => {
          const isVoice = item.type === "voice";
          return (
            <Pressable
              key={item.text.slice(0, 30)}
              style={[styles.chip, isVoice && styles.voiceChip]}
              onPress={() => onSelect(item)}
            >
              <Feather
                name={isVoice ? "mic" : "message-circle"}
                size={14}
                color={isVoice ? "#FF6B6B" : "#8A2BE2"}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipText, isVoice && styles.voiceChipText]} numberOfLines={3}>
                {item.text}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(138, 43, 226, 0.05)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(138, 43, 226, 0.12)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#8A2BE2",
  },
  refreshBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(138, 43, 226, 0.2)",
    maxWidth: 260,
    ...shadows.soft,
  },
  chipIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  voiceChip: {
    borderColor: "rgba(255, 107, 107, 0.4)",
    backgroundColor: "#FFF5F5",
  },
  voiceChipText: {
    color: "#C53030",
  },
});

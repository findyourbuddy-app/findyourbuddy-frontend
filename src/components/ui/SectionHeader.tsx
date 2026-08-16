import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, spacing, typeScale } from "../../theme";

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, eyebrow, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={typeScale.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typeScale.h2}>{title}</Text>
      </View>
      {actionLabel ? (
        onActionPress ? (
          <Pressable onPress={onActionPress} accessibilityRole="button" accessibilityLabel={actionLabel}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <Text style={styles.actionStatic}>{actionLabel}</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  action: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  actionStatic: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme";

type BadgeVariant = "yellow" | "green" | "red" | "primary";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { background: string; text: string }> = {
  yellow: { background: colors.accentYellow, text: colors.textPrimary },
  green: { background: colors.accentGreen, text: colors.surface },
  red: { background: colors.accentRed, text: colors.surface },
  primary: { background: colors.primary, text: colors.surface },
};

export function Badge({ label, variant = "yellow", icon }: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];
  return (
    <View style={[styles.container, { backgroundColor: variantStyle.background }]}>
      <Text style={[styles.text, { color: variantStyle.text }]}>
        {icon ? `${icon} ` : ""}
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme";

type ButtonVariant = "primary" | "accent" | "outline";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { background: string; text: string; border?: string }> = {
  primary: { background: colors.primary, text: colors.surface },
  accent: { background: colors.accentYellow, text: colors.textPrimary },
  outline: { background: colors.surface, text: colors.primary, border: colors.primary },
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        { backgroundColor: variantStyle.background },
        variantStyle.border ? { borderWidth: 1.5, borderColor: variantStyle.border } : null,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} />
      ) : (
        <View>
          <Text style={[styles.label, { color: variantStyle.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
  },
});

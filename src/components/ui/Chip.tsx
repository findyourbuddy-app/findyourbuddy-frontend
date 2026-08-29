import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.base, active ? styles.active : styles.inactive]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  inactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  activeLabel: {
    color: colors.surface,
  },
});

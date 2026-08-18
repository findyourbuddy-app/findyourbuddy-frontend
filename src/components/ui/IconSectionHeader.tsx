import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../theme";

interface IconSectionHeaderProps {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
}

export function IconSectionHeader({ icon, color, label }: IconSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

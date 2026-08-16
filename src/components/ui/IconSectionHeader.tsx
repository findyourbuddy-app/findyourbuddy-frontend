import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { spacing, typeScale } from "../../theme";

interface IconSectionHeaderProps {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
}

export function IconSectionHeader({ icon, color, label }: IconSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={typeScale.eyebrow}>{label}</Text>
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});

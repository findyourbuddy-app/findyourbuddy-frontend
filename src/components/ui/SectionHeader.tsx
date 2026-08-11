import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typeScale } from "../../theme";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ eyebrow, title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        {eyebrow ? <Text style={typeScale.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typeScale.h1}>{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onActionPress}>
          <Text style={typeScale.caption}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  textColumn: {
    gap: 2,
  },
});

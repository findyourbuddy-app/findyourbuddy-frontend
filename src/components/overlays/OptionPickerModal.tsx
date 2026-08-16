import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";

export interface PickerOption {
  key: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface OptionPickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  onDismiss: () => void;
  selectedKey?: string;
}

import { useAppTheme } from "../../context/ThemeContext";

export function OptionPickerModal({ visible, title, options, onDismiss, selectedKey }: OptionPickerModalProps) {
  const { t } = useAppTheme();

  function handleSelect(option: PickerOption): void {
    onDismiss();
    option.onPress();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={typeScale.h1}>{title}</Text>
          <View style={styles.options}>
            {options.map((option) => {
              const isSelected = selectedKey === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={styles.option}
                  onPress={() => handleSelect(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  {option.icon ? (
                    <Feather
                      name={option.icon}
                      size={18}
                      color={option.destructive ? colors.accentRed : isSelected ? "#2ECC71" : colors.primary}
                    />
                  ) : null}
                  <Text style={[
                    styles.optionText,
                    option.destructive && styles.optionTextDestructive,
                    isSelected && { color: "#2ECC71", fontFamily: fontFamily.bodySemiBold }
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={18} color="#2ECC71" style={{ marginLeft: "auto" }} />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.cancelButton} onPress={onDismiss}>
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.7)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  options: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  optionTextDestructive: {
    color: colors.accentRed,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textSecondary,
  },
});

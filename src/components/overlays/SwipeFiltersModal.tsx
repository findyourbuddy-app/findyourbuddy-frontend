import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../ui/PrimaryButton";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import type { SwipeCandidateFilters } from "../../api/swipes";

interface SwipeFiltersModalProps {
  visible: boolean;
  initialFilters: SwipeCandidateFilters;
  onApply: (filters: SwipeCandidateFilters) => void;
  onDismiss: () => void;
}

function toText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function toNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function SwipeFiltersModal({
  visible,
  initialFilters,
  onApply,
  onDismiss,
}: SwipeFiltersModalProps) {
  const [minAge, setMinAge] = useState(toText(initialFilters.minAge));
  const [maxAge, setMaxAge] = useState(toText(initialFilters.maxAge));
  const [maxDistanceKm, setMaxDistanceKm] = useState(toText(initialFilters.maxDistanceKm));

  useEffect(() => {
    if (visible) {
      setMinAge(toText(initialFilters.minAge));
      setMaxAge(toText(initialFilters.maxAge));
      setMaxDistanceKm(toText(initialFilters.maxDistanceKm));
    }
  }, [visible, initialFilters]);

  function handleApply(): void {
    onApply({
      minAge: toNumber(minAge),
      maxAge: toNumber(maxAge),
      maxDistanceKm: toNumber(maxDistanceKm),
    });
  }

  function handleClear(): void {
    setMinAge("");
    setMaxAge("");
    setMaxDistanceKm("");
    onApply({});
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={typeScale.h1}>Filtreler</Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Min Yaş</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={minAge}
                onChangeText={setMinAge}
                placeholder="18"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Maks Yaş</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={maxAge}
                onChangeText={setMaxAge}
                placeholder="99"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Maksimum Mesafe (km)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxDistanceKm}
              onChangeText={setMaxDistanceKm}
              placeholder="50"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Uygula" onPress={handleApply} />
            <PrimaryButton label="Filtreleri Temizle" variant="outline" onPress={handleClear} />
            <PrimaryButton label="Kapat" variant="outline" onPress={onDismiss} />
          </View>
        </View>
      </View>
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
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  field: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});

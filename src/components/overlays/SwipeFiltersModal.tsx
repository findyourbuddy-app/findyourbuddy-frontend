import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton } from "../ui/PrimaryButton";
import { createCheckoutSession } from "../../api/subscriptions";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import type { SwipeCandidateFilters } from "../../api/swipes";

import { useAppTheme } from "../../context/ThemeContext";

interface SwipeFiltersModalProps {
  visible: boolean;
  initialFilters: SwipeCandidateFilters;
  isPremium: boolean;
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
  isPremium,
  onApply,
  onDismiss,
}: SwipeFiltersModalProps) {
  const { t, language } = useAppTheme();
  const [minAge, setMinAge] = useState(toText(initialFilters.minAge));
  const [maxAge, setMaxAge] = useState(toText(initialFilters.maxAge));
  const [maxDistanceKm, setMaxDistanceKm] = useState(toText(initialFilters.maxDistanceKm));
  const [genderPreference, setGenderPreference] = useState(initialFilters.genderPreference || "all");

  const GENDER_PREFERENCES = [
    { id: "all", label: language === "en" ? "Everyone 👥" : "Herkes 👥" },
    { id: "female", label: language === "en" ? "Female 👩" : "Kadın 👩" },
    { id: "male", label: language === "en" ? "Male 👨" : "Erkek 👨" },
  ];

  useEffect(() => {
    if (visible) {
      setMinAge(toText(initialFilters.minAge));
      setMaxAge(toText(initialFilters.maxAge));
      setMaxDistanceKm(toText(initialFilters.maxDistanceKm));
      setGenderPreference(initialFilters.genderPreference || "all");
    }
  }, [visible, initialFilters]);

  function handleApply(): void {
    onApply({
      minAge: toNumber(minAge),
      maxAge: toNumber(maxAge),
      maxDistanceKm: toNumber(maxDistanceKm),
      genderPreference: genderPreference !== "all" ? genderPreference : undefined,
    });
  }

  function handleClear(): void {
    setMinAge("");
    setMaxAge("");
    setMaxDistanceKm("");
    setGenderPreference("all");
    onApply({});
  }

  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { checkout_url } = await createCheckoutSession();
      if (checkout_url) {
        Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ödeme Hatası", "Ödeme linki alınamadı.");
      }
    } catch {
      Alert.alert(
        "Ödeme Hatası",
        "Ödeme sayfası başlatılamadı. Lütfen sunucunun açık olduğundan emin ol."
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isPremium) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={{ alignItems: "center", gap: spacing.xs, marginVertical: spacing.xs }}>
              <Feather name="sliders" size={36} color={colors.primary} />
              <Text style={typeScale.h1}>{language === "en" ? "Advanced Buddy Filters 🎛️" : "Gelişmiş Kanka Filtreleri 🎛️"}</Text>
              <Text style={[styles.upsellText, { textAlign: "center", lineHeight: 20 }]}>
                {t("premiumFilterNotice")}
              </Text>
            </View>

            <View style={styles.perksList}>
              <View style={styles.perkItem}>
                <Feather name="user-check" size={16} color={colors.primary} />
                <Text style={styles.perkText}>{t("genderPreferenceLabel")}</Text>
              </View>
              <View style={styles.perkItem}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={styles.perkText}>{t("specificAgeRangeLabel")}</Text>
              </View>
              <View style={styles.perkItem}>
                <Feather name="navigation" size={16} color={colors.primary} />
                <Text style={styles.perkText}>{t("distanceLimitLabel")}</Text>
              </View>
              <View style={styles.perkItem}>
                <Feather name="heart" size={16} color={colors.primary} />
                <Text style={styles.perkText}>{t("unlimitedSwipesAndLikes")}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label={isUpgrading ? (language === "en" ? "Loading..." : "Yükleniyor...") : t("getPremiumNowBtn")}
                variant="accent"
                onPress={handleUpgrade}
                loading={isUpgrading}
              />
              <PrimaryButton label={t("close")} variant="outline" onPress={onDismiss} disabled={isUpgrading} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Feather name="sliders" size={16} color={colors.primary} />
              </View>
              <Text style={typeScale.h1}>{language === "en" ? "Advanced Filters" : "Gelişmiş Filtreler"}</Text>
            </View>
            <Pressable
              onPress={onDismiss}
              style={styles.closeIconBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Gender Preference Chips */}
          <View style={styles.field}>
            <Text style={styles.label}>{language === "en" ? "Gender Preference" : "Cinsiyet Tercihi"}</Text>
            <View style={styles.genderRow}>
              {GENDER_PREFERENCES.map((g) => {
                const isSelected = genderPreference === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                    onPress={() => setGenderPreference(g.id)}
                  >
                    <Text style={[styles.genderText, isSelected && styles.genderTextSelected]}>
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{language === "en" ? "Age Range" : "Yaş Aralığı"}</Text>
            <View style={styles.ageRow}>
              <View style={styles.ageInputWrap}>
                <TextInput
                  style={styles.ageInput}
                  keyboardType="number-pad"
                  value={minAge}
                  onChangeText={setMinAge}
                  placeholder="18"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.ageDash} />
              <View style={styles.ageInputWrap}>
                <TextInput
                  style={styles.ageInput}
                  keyboardType="number-pad"
                  value={maxAge}
                  onChangeText={setMaxAge}
                  placeholder="99"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{language === "en" ? "Max Distance" : "Maksimum Mesafe"}</Text>
            <View style={styles.distanceInputWrap}>
              <Feather name="navigation" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.distanceInput}
                keyboardType="number-pad"
                value={maxDistanceKm}
                onChangeText={setMaxDistanceKm}
                placeholder="50"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.unitText}>km</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label={language === "en" ? "Apply" : "Uygula"} onPress={handleApply} />
            <Pressable onPress={handleClear} style={styles.clearLink} hitSlop={8}>
              <Text style={styles.clearLinkText}>{language === "en" ? "Clear Filters" : "Filtreleri Temizle"}</Text>
            </Pressable>
          </View>
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
  dragHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: -spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  ageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ageInputWrap: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  ageInput: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  ageDash: {
    width: 10,
    height: 1.5,
    backgroundColor: colors.border,
  },
  distanceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  distanceInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  unitText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  clearLink: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  clearLinkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
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
  upsellText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  perksList: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  perkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  genderChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  genderChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  genderText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  genderTextSelected: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
});

import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton } from "../ui/PrimaryButton";
import { createCheckoutSession } from "../../api/subscriptions";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import type { SwipeCandidateFilters } from "../../api/swipes";

import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const ZODIAC_LIST = [
  "Tümü", "Koç ♈", "Boğa ♉", "İkizler ♊", "Yengeç ♋",
  "Aslan ♌", "Başak ♍", "Terazi ♎", "Akrep ♏",
  "Yay ♐", "Oğlak ♑", "Kova ♒", "Balık ♓"
];

export function SwipeFiltersModal({
  visible,
  initialFilters,
  isPremium,
  onApply,
  onDismiss,
}: SwipeFiltersModalProps) {
  const insets = useSafeAreaInsets();
  const { t, language } = useAppTheme();
  const [minAge, setMinAge] = useState(toText(initialFilters.minAge));
  const [maxAge, setMaxAge] = useState(toText(initialFilters.maxAge));
  const [maxDistanceKm, setMaxDistanceKm] = useState(toText(initialFilters.maxDistanceKm));
  const [genderPreference, setGenderPreference] = useState(initialFilters.genderPreference || "all");
  const [requirePhoto, setRequirePhoto] = useState(Boolean(initialFilters.requirePhoto));
  const [onlyOnline, setOnlyOnline] = useState(Boolean(initialFilters.onlyOnline));
  const [zodiacSign, setZodiacSign] = useState(initialFilters.zodiacSign || "Tümü");

  const GENDER_PREFERENCES = [
    { id: "all", label: language === "en" ? "Everyone 👥" : "Herkes 👥" },
    { id: "female", label: language === "en" ? "Female 👩" : "Kadın 👩" },
    { id: "male", label: language === "en" ? "Male 👨" : "Erkek 👨" },
  ];

  const AGE_PRESETS = [
    { label: language === "en" ? "All" : "Tümü", min: "", max: "" },
    { label: "18-25", min: "18", max: "25" },
    { label: "26-35", min: "26", max: "35" },
    { label: "36-50", min: "36", max: "50" },
  ];

  const DISTANCE_PRESETS = [
    { label: "5 km", val: "5" },
    { label: "15 km", val: "15" },
    { label: "50 km", val: "50" },
    { label: "100+ km", val: "100" },
  ];

  useEffect(() => {
    if (visible) {
      setMinAge(toText(initialFilters.minAge));
      setMaxAge(toText(initialFilters.maxAge));
      setMaxDistanceKm(toText(initialFilters.maxDistanceKm));
      setGenderPreference(initialFilters.genderPreference || "all");
      setRequirePhoto(Boolean(initialFilters.requirePhoto));
      setOnlyOnline(Boolean(initialFilters.onlyOnline));
      setZodiacSign(initialFilters.zodiacSign || "Tümü");
    }
  }, [visible, initialFilters]);

  function handleApply(): void {
    onApply({
      minAge: toNumber(minAge),
      maxAge: toNumber(maxAge),
      maxDistanceKm: toNumber(maxDistanceKm),
      genderPreference: genderPreference !== "all" ? genderPreference : undefined,
      requirePhoto,
      onlyOnline,
      zodiacSign: zodiacSign !== "Tümü" ? zodiacSign : undefined,
    });
  }

  function handleClear(): void {
    setMinAge("");
    setMaxAge("");
    setMaxDistanceKm("");
    setGenderPreference("all");
    setRequirePhoto(false);
    setOnlyOnline(false);
    setZodiacSign("Tümü");
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
              <Text style={typeScale.h1}>{language === "en" ? "Advanced Buddy Filters 🎛️" : "Gelişmiş Kanka Filtreleri 🎛️"}</Text>
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

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Gender Preference Chips */}
            <View style={styles.field}>
              <Text style={styles.label}>{language === "en" ? "Gender Preference 👤" : "Cinsiyet Tercihi 👤"}</Text>
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

            {/* Age Range Section with Presets */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{language === "en" ? "Age Range 🎂" : "Yaş Aralığı 🎂"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                  {AGE_PRESETS.map((p) => (
                    <Pressable
                      key={p.label}
                      style={[styles.presetChip, minAge === p.min && maxAge === p.max && styles.presetChipSelected]}
                      onPress={() => {
                        setMinAge(p.min);
                        setMaxAge(p.max);
                      }}
                    >
                      <Text style={[styles.presetText, minAge === p.min && maxAge === p.max && styles.presetTextSelected]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.ageRow}>
                <View style={styles.ageInputWrap}>
                  <TextInput
                    style={styles.ageInput}
                    keyboardType="number-pad"
                    value={minAge}
                    onChangeText={setMinAge}
                    placeholder="Min (18)"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Text style={styles.ageDashText}>-</Text>
                <View style={styles.ageInputWrap}>
                  <TextInput
                    style={styles.ageInput}
                    keyboardType="number-pad"
                    value={maxAge}
                    onChangeText={setMaxAge}
                    placeholder="Max (99)"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Distance Radius Section with Presets */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{language === "en" ? "Max Distance 📍" : "Maksimum Mesafe Yarıçapı 📍"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                  {DISTANCE_PRESETS.map((p) => (
                    <Pressable
                      key={p.label}
                      style={[styles.presetChip, maxDistanceKm === p.val && styles.presetChipSelected]}
                      onPress={() => setMaxDistanceKm(p.val)}
                    >
                      <Text style={[styles.presetText, maxDistanceKm === p.val && styles.presetTextSelected]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.distanceInputWrap}>
                <Feather name="navigation" size={16} color={colors.primary} />
                <TextInput
                  style={styles.distanceInput}
                  keyboardType="number-pad"
                  value={maxDistanceKm}
                  onChangeText={setMaxDistanceKm}
                  placeholder="Mesafe (örn. 50)"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.unitText}>km</Text>
              </View>
            </View>

            {/* Toggle Switches */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{language === "en" ? "Profile Photo Only 📸" : "Sadece Fotoğraflı Profiller 📸"}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {language === "en" ? "Only show profiles with verified photos" : "Profilinde fotoğrafı olan kişileri göster"}
                  </Text>
                </View>
                <Switch value={requirePhoto} onValueChange={setRequirePhoto} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
              <View style={styles.toggleDivider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{language === "en" ? "Recently Active Only ⚡" : "Son 24 Saatte Aktif Olanlar ⚡"}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {language === "en" ? "Show recently online users" : "Çevrimiçi ve aktif kankaları öne çıkar"}
                  </Text>
                </View>
                <Switch value={onlyOnline} onValueChange={setOnlyOnline} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
            </View>

            {/* Zodiac Sign Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>{language === "en" ? "Zodiac Sign Synergy ♉" : "Burç Uyum Tercihi ♉"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {ZODIAC_LIST.map((z) => {
                  const isSelected = zodiacSign === z;
                  return (
                    <Pressable
                      key={z}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setZodiacSign(z)}
                    >
                      <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                        {z}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) + spacing.md }]}>
            <PrimaryButton label={language === "en" ? "Apply Filters ✨" : "Filtreleri Uygula ✨"} onPress={handleApply} />
            <Pressable onPress={handleClear} style={styles.clearLink} hitSlop={8}>
              <Text style={styles.clearLinkText}>{language === "en" ? "Clear All Filters" : "Filtreleri Sıfırla"}</Text>
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
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    height: "92%",
    gap: spacing.md,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  labelRow: {
    gap: spacing.xs,
  },
  presetRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  presetTextSelected: {
    color: colors.surface,
    fontFamily: fontFamily.bodySemiBold,
  },
  toggleCard: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  toggleTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  toggleSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  ageDashText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  dragHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
    marginBottom: -spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageInput: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.sm + 2,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.sm + 2,
  },
  unitText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  clearLink: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  clearLinkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
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
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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

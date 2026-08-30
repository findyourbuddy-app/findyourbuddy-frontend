import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Alert } from "../../utils/alert";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton } from "../ui/PrimaryButton";
import { createCheckoutSession } from "../../api/subscriptions";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import type { SwipeCandidateFilters } from "../../api/swipes";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../context/ThemeContext";
import { ZODIAC_GLYPHS, ZODIAC_OPTIONS, zodiacDisplayLabel } from "../../constants/profileOptions";
import { UniversityAutocomplete } from "../ui/UniversityAutocomplete";

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

/** Filter values keep the "Koç ♈" shape for stored-state compatibility. */
const ZODIAC_FILTER_VALUES = ZODIAC_OPTIONS.map(
  (option, index) => `${option.key} ${ZODIAC_GLYPHS[index]}`
);

const MIN_AGE = 18;
const MAX_AGE = 100;

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
  const [university, setUniversity] = useState(initialFilters.university || "");
  const [zodiacSign, setZodiacSign] = useState(initialFilters.zodiacSign || "Tümü");
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(Boolean(initialFilters.isVerifiedOnly));
  const [hasVoiceNote, setHasVoiceNote] = useState(Boolean(initialFilters.hasVoiceNote));
  const [minTrustScore, setMinTrustScore] = useState<number | undefined>(initialFilters.minTrustScore);

  const [lookingFor, setLookingFor] = useState(initialFilters.lookingFor || "Tümü");

  const GENDER_PREFERENCES = [
    { id: "all", label: t("everyone") },
    { id: "female", label: t("female") },
    { id: "male", label: t("male") },
  ];

  const INTENTION_OPTIONS = [
    { id: "Tümü", label: t("all") },
    { id: "Etkinlik Arkadaşı", label: t("eventBuddy") },
    { id: "Kahve & Sohbet", label: t("coffeeChat") },
    { id: "Sadece Eğlence", label: t("justFun") },
    { id: "Spor & Aktivite Partneri", label: t("sportActivity") },
    { id: "Uzun Vadeli Dostluk", label: t("longtermFriendship") },
  ];

  const TRUST_SCORE_PRESETS = [
    { label: t("all"), val: undefined },
    { label: "🛡️ 50+", val: 50 },
    { label: "⭐ 70+", val: 70 },
    { label: "🌟 85+", val: 85 },
  ];

  const AGE_PRESETS = [
    { label: t("all"), min: "", max: "" },
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
      setUniversity(initialFilters.university || "");
      setZodiacSign(initialFilters.zodiacSign || "Tümü");
      setIsVerifiedOnly(Boolean(initialFilters.isVerifiedOnly));
      setHasVoiceNote(Boolean(initialFilters.hasVoiceNote));
      setMinTrustScore(initialFilters.minTrustScore);
      setLookingFor(initialFilters.lookingFor || "Tümü");
    }
  }, [visible, initialFilters]);

  function handleApply(): void {
    const rawMin = toNumber(minAge);
    const rawMax = toNumber(maxAge);

    const clampedMin = rawMin !== undefined
      ? Math.max(MIN_AGE, Math.min(rawMin, MAX_AGE))
      : undefined;
    const clampedMax = rawMax !== undefined
      ? Math.min(MAX_AGE, Math.max(rawMax, MIN_AGE))
      : undefined;

    const validatedMin = clampedMin;
    const validatedMax = clampedMin !== undefined && clampedMax !== undefined && clampedMin > clampedMax
      ? clampedMin
      : clampedMax;

    onApply({
      minAge: validatedMin,
      maxAge: validatedMax,
      maxDistanceKm: toNumber(maxDistanceKm),
      genderPreference: genderPreference !== "all" ? genderPreference : undefined,
      requirePhoto,
      onlyOnline,
      university: university.trim() ? university.trim() : undefined,
      zodiacSign: zodiacSign !== "Tümü" ? zodiacSign : undefined,
      isVerifiedOnly,
      hasVoiceNote,
      minTrustScore,
      lookingFor: lookingFor !== "Tümü" ? lookingFor : undefined,
    });
  }

  function handleClear(): void {
    setMinAge("");
    setMaxAge("");
    setMaxDistanceKm("");
    setGenderPreference("all");
    setRequirePhoto(false);
    setOnlyOnline(false);
    setUniversity("");
    setZodiacSign("Tümü");
    setIsVerifiedOnly(false);
    setHasVoiceNote(false);
    setMinTrustScore(undefined);
    setLookingFor("Tümü");
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
              <Text style={typeScale.h1}>{t("advancedBuddyFilters")}</Text>
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
                label={isUpgrading ? (t("loading")) : t("getPremiumNowBtn")}
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%", height: "100%", justifyContent: "flex-end" }}
        >
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconBadge}>
                  <Feather name="sliders" size={16} color={colors.primary} />
                </View>
                <Text style={[typeScale.h1, styles.headerTitleText]} numberOfLines={1}>
                  {t("advancedBuddyFilters")}
                </Text>
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

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Gender Preference Chips */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("genderPreference")}</Text>
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

            {/* Relationship Intention Filter */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("relationshipGoalIntention")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {INTENTION_OPTIONS.map((item) => {
                  const isSelected = lookingFor === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setLookingFor(item.id)}
                    >
                      <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Age Range Section with Presets */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t("ageRange")}</Text>
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
                <Text style={styles.label}>{t("maxDistance")}</Text>
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

            {/* University / School Filter */}
            <View style={[styles.field, { zIndex: 20 }]}>
              <Text style={styles.label}>{t("universitySchool")}</Text>
              <UniversityAutocomplete
                value={university}
                onChangeText={setUniversity}
                language={language}
                placeholder={t("filterByUniversity")}
              />
            </View>

            {/* Toggle Switches */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{t("profilePhotoOnly")}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {t("onlyShowProfilesWithVerified")}
                  </Text>
                </View>
                <Switch value={requirePhoto} onValueChange={setRequirePhoto} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
              <View style={styles.toggleDivider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{t("blueCheckmarkOnly")}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {t("showOnlyIdentityverifiedUsers")}
                  </Text>
                </View>
                <Switch value={isVerifiedOnly} onValueChange={setIsVerifiedOnly} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
              <View style={styles.toggleDivider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{t("voiceIntroOnly")}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {t("showUsersWhoRecordedA")}
                  </Text>
                </View>
                <Switch value={hasVoiceNote} onValueChange={setHasVoiceNote} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
              <View style={styles.toggleDivider} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{t("recentlyActiveOnly")}</Text>
                  <Text style={styles.toggleSubtitle}>
                    {t("showRecentlyOnlineUsers")}
                  </Text>
                </View>
                <Switch value={onlyOnline} onValueChange={setOnlyOnline} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
            </View>

            {/* Minimum Trust Score Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("minimumTrustScore")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {TRUST_SCORE_PRESETS.map((preset) => {
                  const isSelected = minTrustScore === preset.val;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setMinTrustScore(preset.val)}
                    >
                      <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Zodiac Sign Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("zodiacSignSynergy")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                <Pressable
                  style={[styles.presetChip, zodiacSign === "Tümü" && styles.presetChipSelected]}
                  onPress={() => setZodiacSign("Tümü")}
                >
                  <Text style={[styles.presetText, zodiacSign === "Tümü" && styles.presetTextSelected]}>
                    {t("all")}
                  </Text>
                </Pressable>
                {ZODIAC_FILTER_VALUES.map((value, index) => {
                  const isSelected = zodiacSign === value;
                  return (
                    <Pressable
                      key={value}
                      style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                      onPress={() => setZodiacSign(value)}
                    >
                      <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                        {zodiacDisplayLabel(ZODIAC_OPTIONS[index].key, language)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) + spacing.md }]}>
            <PrimaryButton label={t("applyFilters")} onPress={handleApply} />
            <Pressable onPress={handleClear} style={styles.clearLink} hitSlop={8}>
              <Text style={styles.clearLinkText}>{t("clearAllFilters")}</Text>
            </Pressable>
          </View>
          </View>
        </KeyboardAvoidingView>
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
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    height: "92%",
    maxHeight: "95%",
    gap: spacing.md,
    ...shadows.card,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitleText: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 23,
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

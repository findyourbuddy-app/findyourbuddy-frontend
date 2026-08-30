import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { updateCurrentUser } from "../../api/users";
import { LANGUAGES_LIST, getLanguageLabel } from "../../constants/languages";
import { HOBBIES, MAX_HOBBIES_SELECTION, getHobbyLabel } from "../../constants/hobbies";
import { INTERESTS, getInterestLabel } from "../../constants/interests";
import { BIO_SUGGESTIONS, PROMPT_SUGGESTIONS } from "../../constants/prompts";
import { pickLabel, type LocalizedLabel } from "../../constants/localized";
import {
  BELIEF_OPTIONS,
  CLASS_YEAR_OPTIONS,
  POLITICAL_OPTIONS,
  ZODIAC_OPTIONS,
} from "../../constants/profileOptions";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import type { User, UserUpdate } from "../../types";
import type { FieldKey } from "../../utils/profileCompletion";
import { formatApiError } from "../../utils/error";
import { Alert } from "../../utils/alert";
import { UniversityAutocomplete } from "../ui/UniversityAutocomplete";

interface Props {
  visible: boolean;
  fieldKey: FieldKey | null;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const LOOKING_FOR_QUICK_SUGGESTIONS: LocalizedLabel[] = [
  { tr: "Kahve & Sohbet Kankası ☕", en: "Coffee & Chat Buddy ☕", de: "Kaffee- & Plausch-Buddy ☕", es: "Colega de café y charla ☕", fr: "Pote café et discussion ☕", it: "Amico di caffè e chiacchiere ☕", ru: "Напарник для кофе и разговоров ☕", ar: "رفيق القهوة والدردشة ☕" },
  { tr: "Spor & Yürüyüş Arkadaşı 🏃‍♂️", en: "Sports & Jogging Buddy 🏃‍♂️", de: "Sport- & Lauf-Buddy 🏃‍♂️", es: "Colega de deporte y footing 🏃‍♂️", fr: "Pote sport et jogging 🏃‍♂️", it: "Amico di sport e jogging 🏃‍♂️", ru: "Напарник для спорта и пробежек 🏃‍♂️", ar: "رفيق الرياضة والجري 🏃‍♂️" },
  { tr: "Konser & Festival Ekibi 🎶", en: "Concert & Event Squad 🎶", de: "Konzert- & Festival-Crew 🎶", es: "Equipo de conciertos y eventos 🎶", fr: "Équipe concerts et festivals 🎶", it: "Squadra di concerti ed eventi 🎶", ru: "Команда для концертов и фестивалей 🎶", ar: "فريق الحفلات والفعاليات 🎶" },
  { tr: "Ders & Çalışma Kankası 📚", en: "Study & Project Buddy 📚", de: "Lern- & Projekt-Buddy 📚", es: "Colega de estudio y proyectos 📚", fr: "Pote d'étude et de projets 📚", it: "Amico di studio e progetti 📚", ru: "Напарник для учёбы и проектов 📚", ar: "رفيق الدراسة والمشاريع 📚" },
  { tr: "Seyahat & Yol Arkadaşı ✈️", en: "Travel & Road Buddy ✈️", de: "Reise- & Roadtrip-Buddy ✈️", es: "Compañero de viajes y carretera ✈️", fr: "Compagnon de voyage et de route ✈️", it: "Compagno di viaggio e di strada ✈️", ru: "Напарник для путешествий и поездок ✈️", ar: "رفيق السفر والطريق ✈️" },
];

export function QuickFieldEditModal({ visible, fieldKey, user, onClose, onSaved }: Props) {
  const { updateUser } = useAuth();
  const { language, accentColor, t } = useAppTheme();
  const [isSaving, setIsSaving] = useState(false);

  // Field values
  const [heightText, setHeightText] = useState("");
  const [bioText, setBioText] = useState("");
  const [promptText, setPromptText] = useState("");
  const [lookingForText, setLookingForText] = useState("");
  const [occupationText, setOccupationText] = useState("");
  const [universityText, setUniversityText] = useState("");
  const [classYearVal, setClassYearVal] = useState("");
  const [zodiacVal, setZodiacVal] = useState("");
  const [politicalVal, setPoliticalVal] = useState("");
  const [beliefVal, setBeliefVal] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set());
  const [selectedHobbies, setSelectedHobbies] = useState<Set<string>>(new Set());
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setHeightText(user.height ? String(user.height) : "");
      setBioText(user.bio ?? "");
      setPromptText(user.about_me_prompt ?? "");
      setLookingForText(user.looking_for ?? "");
      setOccupationText(user.occupation ?? "");
      setUniversityText(user.university ?? "");
      setClassYearVal(user.class_year ?? "");
      setZodiacVal(user.zodiac_sign ?? "");
      setPoliticalVal(user.political_views ?? "");
      setBeliefVal(user.beliefs ?? "");
      setSelectedLangs(new Set(user.languages_spoken ?? []));
      setSelectedHobbies(new Set(user.hobbies ?? []));
      setSelectedInterests(new Set(user.interests ?? []));
    }
  }, [user, visible]);

  if (!fieldKey || !user) return null;

  function getModalTitle(): string {
    switch (fieldKey) {
      case "height":
        return t("enterHeightCm");
      case "languages":
        return t("selectLanguagesSpoken");
      case "bio":
        return t("writeBio");
      case "prompt":
        return t("aboutMePrompt");
      case "looking_for":
        return t("whatAreYouLookingFor");
      case "occupation":
        return t("occupationUniversity");
      case "zodiac":
        return t("selectZodiacSign");
      case "worldview":
        return t("worldviewBeliefs");
      case "hobbies":
        return t("selectHobbies");
      case "interests":
        return t("selectInterests");
      default:
        return t("editProfileField");
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload: UserUpdate = {};

      if (fieldKey === "height") {
        const parsed = parseInt(heightText.trim(), 10);
        if (isNaN(parsed) || parsed < 120 || parsed > 230) {
          Alert.alert(
            t("invalidHeight"),
            t("pleaseEnterAValidHeight")
          );
          setIsSaving(false);
          return;
        }
        payload.height = parsed;
      } else if (fieldKey === "languages") {
        payload.languages_spoken = Array.from(selectedLangs);
      } else if (fieldKey === "bio") {
        payload.bio = bioText.trim();
      } else if (fieldKey === "prompt") {
        payload.about_me_prompt = promptText.trim();
      } else if (fieldKey === "looking_for") {
        payload.looking_for = lookingForText.trim();
      } else if (fieldKey === "occupation") {
        payload.occupation = occupationText.trim();
        payload.university = universityText.trim();
        payload.class_year = classYearVal ? classYearVal : null;
      } else if (fieldKey === "zodiac") {
        payload.zodiac_sign = zodiacVal;
      } else if (fieldKey === "worldview") {
        payload.political_views = politicalVal;
        payload.beliefs = beliefVal;
      } else if (fieldKey === "hobbies") {
        payload.hobbies = Array.from(selectedHobbies);
      } else if (fieldKey === "interests") {
        payload.interests = Array.from(selectedInterests);
      }

      const updated = await updateCurrentUser(payload);
      updateUser(updated);
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert(
        t("error"),
        formatApiError(err, language)
      );
    } finally {
      setIsSaving(false);
    }
  }

  function toggleLanguage(code: string) {
    setSelectedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleHobby(slug: string) {
    setSelectedHobbies((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        if (next.size >= MAX_HOBBIES_SELECTION) {
          Alert.alert(
            t("hobbyLimit"),
            t("maxP0HobbiesAllowed", { p0: MAX_HOBBIES_SELECTION })
          );
          return prev;
        }
        next.add(slug);
      }
      return next;
    });
  }

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoiding}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={typeScale.h2}>{getModalTitle()}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} keyboardShouldPersistTaps="handled">
            {/* HEIGHT */}
            {fieldKey === "height" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldDesc}>
                  {t("enterYourHeightInCentimeters")}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 178"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={heightText}
                  onChangeText={setHeightText}
                  maxLength={3}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {[160, 165, 170, 175, 180, 185, 190].map((h) => (
                      <Pressable
                        key={h}
                        style={[styles.chip, heightText === String(h) && styles.chipActive]}
                        onPress={() => setHeightText(String(h))}
                      >
                        <Text style={[styles.chipText, heightText === String(h) && styles.chipTextActive]}>
                          {h} cm
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* LANGUAGES */}
            {fieldKey === "languages" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldDesc}>
                  {t("selectTheLanguagesYouCan")}
                </Text>
                <View style={styles.chipGrid}>
                  {LANGUAGES_LIST.map((lang) => {
                    const active = selectedLangs.has(lang.code);
                    return (
                      <Pressable
                        key={lang.code}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleLanguage(lang.code)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {lang.flag} {getLanguageLabel(lang.code, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* BIO */}
            {fieldKey === "bio" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldDesc}>
                  {t("tapAQuickSuggestionOr")}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {BIO_SUGGESTIONS.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.suggestionPill}
                        onPress={() => setBioText(pickLabel(item.placeholder, language))}
                      >
                        <Text style={styles.suggestionText}>
                          {pickLabel(item.question, language)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { height: 100 }]}
                  placeholder={t("tellOthersAboutYourself")}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={bioText}
                  onChangeText={setBioText}
                />
              </View>
            )}

            {/* PROMPT */}
            {fieldKey === "prompt" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldDesc}>
                  {t("tapAQuestionPromptTo")}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {PROMPT_SUGGESTIONS.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.suggestionPill}
                        onPress={() => {
                          setPromptText(`${pickLabel(item.question, language)} `);
                        }}
                      >
                        <Text style={styles.suggestionText}>
                          {pickLabel(item.question, language)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { height: 90 }]}
                  placeholder={t("egMyPerfectSundayIs")}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={promptText}
                  onChangeText={setPromptText}
                />
              </View>
            )}

            {/* LOOKING FOR */}
            {fieldKey === "looking_for" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldDesc}>
                  {t("selectAQuickExpectationOr")}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {LOOKING_FOR_QUICK_SUGGESTIONS.map((item, idx) => (
                      <Pressable
                        key={idx}
                        style={styles.suggestionPill}
                        onPress={() => setLookingForText(pickLabel(item, language))}
                      >
                        <Text style={styles.suggestionText}>{pickLabel(item, language)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  placeholder={t("egLookingForAWeekend")}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={lookingForText}
                  onChangeText={setLookingForText}
                />
              </View>
            )}

            {/* OCCUPATION & UNIVERSITY */}
            {fieldKey === "occupation" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>{t("occupationJobTitle")}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t("egSoftwareEngineer")}
                  placeholderTextColor={colors.textSecondary}
                  value={occupationText}
                  onChangeText={setOccupationText}
                />

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("universitySchool")}</Text>
                <UniversityAutocomplete
                  value={universityText}
                  onChangeText={setUniversityText}
                  language={language}
                />

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("classGraduation")}</Text>
                <View style={styles.chipGrid}>
                  {CLASS_YEAR_OPTIONS.map((item) => {
                    const active = classYearVal === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setClassYearVal(active ? "" : item.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {pickLabel(item.labels, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ZODIAC */}
            {fieldKey === "zodiac" && (
              <View style={styles.fieldSection}>
                <View style={styles.chipGrid}>
                  {ZODIAC_OPTIONS.map((item) => {
                    const active = zodiacVal === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setZodiacVal(item.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {pickLabel(item.labels, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* WORLDVIEW */}
            {fieldKey === "worldview" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>{t("politicalView")}</Text>
                <View style={[styles.chipGrid, { marginBottom: spacing.md }]}>
                  {POLITICAL_OPTIONS.map((item) => {
                    const active = politicalVal === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setPoliticalVal(item.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {pickLabel(item.labels, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>{t("beliefReligion")}</Text>
                <View style={styles.chipGrid}>
                  {BELIEF_OPTIONS.map((item) => {
                    const active = beliefVal === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setBeliefVal(item.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {pickLabel(item.labels, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* HOBBIES */}
            {fieldKey === "hobbies" && (
              <View style={styles.fieldSection}>
                <View style={styles.chipGrid}>
                  {HOBBIES.map((h) => {
                    const active = selectedHobbies.has(h.slug);
                    return (
                      <Pressable
                        key={h.slug}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleHobby(h.slug)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {getHobbyLabel(h.slug, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* INTERESTS */}
            {fieldKey === "interests" && (
              <View style={styles.fieldSection}>
                <View style={styles.chipGrid}>
                  {INTERESTS.map((int) => {
                    const active = selectedInterests.has(int.slug);
                    return (
                      <Pressable
                        key={int.slug}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleInterest(int.slug)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {getInterestLabel(int.slug, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.saveBtnText}>
                {t("saveUpdateProfile")}
              </Text>
            )}
          </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.55)",
    justifyContent: "flex-end",
  },
  keyboardAvoiding: {
    width: "100%",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.xl,
    maxHeight: "85%",
    minHeight: "45%",
    gap: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    padding: spacing.xs,
  },
  bodyScroll: {
    flexGrow: 1,
  },
  fieldSection: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  fieldDesc: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(74, 194, 226, 0.15)",
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
  },
  suggestionPill: {
    backgroundColor: "#FEF9C3",
    borderColor: "#FDE047",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  suggestionText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#854D0E",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
  },
});

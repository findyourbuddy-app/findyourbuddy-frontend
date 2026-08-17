import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { updateCurrentUser } from "../../api/users";
import { LANGUAGES_LIST } from "../../constants/languages";
import { HOBBIES, MAX_HOBBIES_SELECTION, getHobbyLabel } from "../../constants/hobbies";
import { INTERESTS, getInterestLabel } from "../../constants/interests";
import { BIO_SUGGESTIONS, PROMPT_SUGGESTIONS } from "../../constants/prompts";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import type { User, UserUpdate } from "../../types";
import type { FieldKey } from "../../utils/profileCompletion";
import { formatApiError } from "../../utils/error";
import { Alert } from "../../utils/alert";

interface Props {
  visible: boolean;
  fieldKey: FieldKey | null;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const ZODIAC_SIGNS = [
  { key: "Koç", tr: "Koç", en: "Aries" },
  { key: "Boğa", tr: "Boğa", en: "Taurus" },
  { key: "İkizler", tr: "İkizler", en: "Gemini" },
  { key: "Yengeç", tr: "Yengeç", en: "Cancer" },
  { key: "Aslan", tr: "Aslan", en: "Leo" },
  { key: "Başak", tr: "Başak", en: "Virgo" },
  { key: "Terazi", tr: "Terazi", en: "Libra" },
  { key: "Akrep", tr: "Akrep", en: "Scorpio" },
  { key: "Yay", tr: "Yay", en: "Sagittarius" },
  { key: "Oğlak", tr: "Oğlak", en: "Capricorn" },
  { key: "Kova", tr: "Kova", en: "Aquarius" },
  { key: "Balık", tr: "Balık", en: "Pisces" },
];

const POLITICAL_OPTIONS = [
  { key: "Apolitik / Nötr", tr: "Apolitik / Nötr", en: "Apolitical / Neutral" },
  { key: "Sosyal Demokrat", tr: "Sosyal Demokrat", en: "Social Democrat" },
  { key: "Liberal", tr: "Liberal", en: "Liberal" },
  { key: "Muhafazakar", tr: "Muhafazakar", en: "Conservative" },
  { key: "Milliyetçi", tr: "Milliyetçi", en: "Nationalist" },
  { key: "Sol / İlerici", tr: "Sol / İlerici", en: "Progressive / Left" },
  { key: "Belirtmek İstemiyorum", tr: "Belirtmek İstemiyorum", en: "Prefer not to say" },
];

const BELIEF_OPTIONS = [
  { key: "Deist", tr: "Deist", en: "Deist" },
  { key: "Müslüman", tr: "Müslüman", en: "Muslim" },
  { key: "Ateist", tr: "Ateist", en: "Atheist" },
  { key: "Agnostik", tr: "Agnostik", en: "Agnostic" },
  { key: "Hristiyan", tr: "Hristiyan", en: "Christian" },
  { key: "Spirütüel", tr: "Spirütüel", en: "Spiritual" },
  { key: "Belirtmek İstemiyorum", tr: "Belirtmek İstemiyorum", en: "Prefer not to say" },
];

export function QuickFieldEditModal({ visible, fieldKey, user, onClose, onSaved }: Props) {
  const { updateUser } = useAuth();
  const { language, accentColor } = useAppTheme();
  const [isSaving, setIsSaving] = useState(false);

  // Field values
  const [heightText, setHeightText] = useState("");
  const [bioText, setBioText] = useState("");
  const [promptText, setPromptText] = useState("");
  const [occupationText, setOccupationText] = useState("");
  const [universityText, setUniversityText] = useState("");
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
      setOccupationText(user.occupation ?? "");
      setUniversityText(user.university ?? "");
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
        return language === "en" ? "Enter Height (cm)" : "Boy Bilgisi (cm)";
      case "languages":
        return language === "en" ? "Select Languages Spoken" : "Konuştuğun Diller";
      case "bio":
        return language === "en" ? "Write Bio" : "Biyografi Yaz";
      case "prompt":
        return language === "en" ? "About Me Prompt" : "Hakkımda Sorusu";
      case "occupation":
        return language === "en" ? "Occupation & University" : "Meslek & Üniversite";
      case "zodiac":
        return language === "en" ? "Select Zodiac Sign" : "Burç Seçimi";
      case "worldview":
        return language === "en" ? "Worldview & Beliefs" : "Dünya Görüşü & İnanç";
      case "hobbies":
        return language === "en" ? "Select Hobbies" : "Hobi Seçimi";
      case "interests":
        return language === "en" ? "Select Interests" : "İlgi Alanları";
      default:
        return language === "en" ? "Edit Profile Field" : "Profil Alanını Düzenle";
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
            language === "en" ? "Invalid Height" : "Geçersiz Boy",
            language === "en" ? "Please enter a valid height between 120 cm and 230 cm." : "Lütfen 120 cm ile 230 cm arasında geçerli bir değer girin."
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
      } else if (fieldKey === "occupation") {
        payload.occupation = occupationText.trim();
        payload.university = universityText.trim();
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
        language === "en" ? "Error" : "Hata",
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
            language === "en" ? "Hobby Limit" : "Hobi Limiti",
            language === "en" ? `Max ${MAX_HOBBIES_SELECTION} hobbies allowed.` : `En fazla ${MAX_HOBBIES_SELECTION} hobi seçebilirsin.`
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
                  {language === "en" ? "Enter your height in centimeters:" : "Boyunuzu santimetre (cm) cinsinden girin:"}
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
                  {language === "en" ? "Select the languages you can speak:" : "Akıcı veya günlük konuştuğun dilleri seçin:"}
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
                          {lang.flag} {language === "en" ? lang.labelEn : lang.label}
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
                  {language === "en" ? "Tap a quick suggestion or type your bio:" : "Hızlı bir şablona tıklayın veya kendinizi anlatın:"}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {BIO_SUGGESTIONS.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.suggestionPill}
                        onPress={() => setBioText(language === "en" ? item.placeholderEn : item.placeholderTr)}
                      >
                        <Text style={styles.suggestionText}>
                          {language === "en" ? item.questionEn : item.questionTr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { height: 100 }]}
                  placeholder={language === "en" ? "Tell others about yourself..." : "Kendin hakkında kısa bilgi ver..."}
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
                  {language === "en" ? "Tap a question prompt to complete:" : "Cevaplamak istediğin eğlenceli soruyu seç:"}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {PROMPT_SUGGESTIONS.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.suggestionPill}
                        onPress={() => {
                          const q = language === "en" ? item.questionEn : item.questionTr;
                          setPromptText(`${q} `);
                        }}
                      >
                        <Text style={styles.suggestionText}>
                          {language === "en" ? item.questionEn : item.questionTr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.textInput, { height: 90 }]}
                  placeholder={language === "en" ? "e.g. My perfect Sunday is morning coffee..." : "Örn: Mükemmel bir Pazar günüm sabah kahvesi..."}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={promptText}
                  onChangeText={setPromptText}
                />
              </View>
            )}

            {/* OCCUPATION & UNIVERSITY */}
            {fieldKey === "occupation" && (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>{language === "en" ? "Occupation / Job Title" : "Meslek / İş Unvanı"}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={language === "en" ? "e.g. Software Engineer" : "Örn: Yazılım Mühendisi"}
                  placeholderTextColor={colors.textSecondary}
                  value={occupationText}
                  onChangeText={setOccupationText}
                />

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{language === "en" ? "University / School" : "Üniversite / Okul"}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={language === "en" ? "e.g. ITU / Boğaziçi" : "Örn: İTÜ / Boğaziçi"}
                  placeholderTextColor={colors.textSecondary}
                  value={universityText}
                  onChangeText={setUniversityText}
                />
              </View>
            )}

            {/* ZODIAC */}
            {fieldKey === "zodiac" && (
              <View style={styles.fieldSection}>
                <View style={styles.chipGrid}>
                  {ZODIAC_SIGNS.map((item) => {
                    const active = zodiacVal === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setZodiacVal(item.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {language === "en" ? item.en : item.tr}
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
                <Text style={styles.fieldLabel}>{language === "en" ? "Political View" : "Siyasi Görüş"}</Text>
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
                          {language === "en" ? item.en : item.tr}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>{language === "en" ? "Belief / Religion" : "İnanç / Din"}</Text>
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
                          {language === "en" ? item.en : item.tr}
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
                {language === "en" ? "Save & Update Profile ⚡" : "Kaydet & Profili Güncelle ⚡"}
              </Text>
            )}
          </Pressable>
        </Pressable>
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

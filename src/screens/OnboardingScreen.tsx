import { useState } from "react";
import axios from "axios";
import { validateBirthDateString, validateDisplayName } from "../utils/profile";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";
import {
  deleteGalleryPhoto,
  listMyPhotos,
  uploadGalleryPhoto,
  uploadProfilePhoto,
} from "../api/users";
import { HOBBIES } from "../constants/hobbies";
import { INTERESTS, getInterestLabel } from "../constants/interests";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User, UserPhoto } from "../types";

type NavigationProp = NativeStackNavigationProp<MainStackParamList, "Onboarding">;

const ZODIAC_SIGNS = [
  "Koç", "Boğa", "İkizler", "Yengeç",
  "Aslan", "Başak", "Terazi", "Akrep",
  "Yay", "Oğlak", "Kova", "Balık"
];

const GENDER_OPTIONS = ["Kadın", "Erkek", "Non-binary", "Belirtmek İstemiyorum"];

const LOOKING_FOR_OPTIONS = [
  "Kahve & Sohbet",
  "Spor Arkadaşı",
  "Konser Kankası",
  "Yeni Şehirde Rehber",
  "Sadece Eğlence",
  "Uzun Vadeli Dostluk",
  "Ciddi Arkadaşlık",
];

const MAX_PHOTOS = 6;

export function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser, clearJustRegistered } = useAuth();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [zodiacSign, setZodiacSign] = useState(user?.zodiac_sign || "");
  const [lookingFor, setLookingFor] = useState(user?.looking_for || "");
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(user?.hobbies || []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [mainPhotoUrl, setMainPhotoUrl] = useState<string | null>(user?.photo_url || null);
  const [galleryPhotos, setGalleryPhotos] = useState<UserPhoto[]>(user?.photos || []);
  const [bio, setBio] = useState(user?.bio || "");
  const [aboutMePrompt, setAboutMePrompt] = useState(user?.about_me_prompt || "");
  const [occupation, setOccupation] = useState(user?.occupation || "");
  const [university, setUniversity] = useState(user?.university || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMainPhoto, setIsUploadingMainPhoto] = useState(false);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zodiacPickerVisible, setZodiacPickerVisible] = useState(false);
  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [lookingForPickerVisible, setLookingForPickerVisible] = useState(false);

  // Zodiac Options
  const zodiacOptions = ZODIAC_SIGNS.map((sign) => ({
    key: sign,
    label: sign,
    onPress: () => {
      setZodiacSign(sign);
      setZodiacPickerVisible(false);
    },
  }));

  // Gender Options
  const genderOptions = GENDER_OPTIONS.map((g) => ({
    key: g,
    label: g,
    onPress: () => {
      setGender(g);
      setGenderPickerVisible(false);
    },
  }));

  // Looking For Options
  const lookingForOptions = LOOKING_FOR_OPTIONS.map((opt) => ({
    key: opt,
    label: opt,
    onPress: () => {
      setLookingFor(opt);
      setLookingForPickerVisible(false);
    },
  }));

  function toggleHobby(hobbySlug: string): void {
    if (selectedHobbies.includes(hobbySlug)) {
      setSelectedHobbies((prev) => prev.filter((h) => h !== hobbySlug));
    } else {
      if (selectedHobbies.length >= 4) {
        Alert.alert("Hobi Sınırı", "En fazla 4 adet hobi seçebilirsiniz.");
        return;
      }
      setSelectedHobbies((prev) => [...prev, hobbySlug]);
    }
  }

  function toggleInterest(interestSlug: string): void {
    if (selectedInterests.includes(interestSlug)) {
      setSelectedInterests((prev) => prev.filter((i) => i !== interestSlug));
    } else {
      setSelectedInterests((prev) => [...prev, interestSlug]);
    }
  }

  async function handlePickMainPhoto(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Profil fotoğrafı seçebilmek için galeri iznini açmanız gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setIsUploadingMainPhoto(true);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "main_photo.jpg";
      const updatedUser = await uploadProfilePhoto(asset.uri, fileName);
      setMainPhotoUrl(updatedUser.photo_url);
      updateUser(updatedUser);
    } catch {
      Alert.alert("Hata", "Profil fotoğrafı yüklenemedi, lütfen tekrar deneyin.");
    } finally {
      setIsUploadingMainPhoto(false);
    }
  }

  async function handleAddGalleryPhoto(): Promise<void> {
    if (galleryPhotos.length >= MAX_PHOTOS - 1) {
      Alert.alert("Limit Doldu", `En fazla ${MAX_PHOTOS - 1} ekstra galeri fotoğrafı ekleyebilirsiniz.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Fotoğraf seçebilmek için galeri iznini açmanız gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setIsUploadingGalleryPhoto(true);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "gallery_photo.jpg";
      const uploaded = await uploadGalleryPhoto(asset.uri, fileName);
      const nextPhotos = [...galleryPhotos, uploaded];
      setGalleryPhotos(nextPhotos);
      if (user) updateUser({ ...user, photos: nextPhotos });
    } catch {
      Alert.alert("Hata", "Fotoğraf galeriye yüklenemedi.");
    } finally {
      setIsUploadingGalleryPhoto(false);
    }
  }

  async function handleDeleteGalleryPhoto(photoId: number): Promise<void> {
    try {
      await deleteGalleryPhoto(photoId);
      const nextPhotos = galleryPhotos.filter((p) => p.id !== photoId);
      setGalleryPhotos(nextPhotos);
      if (user) updateUser({ ...user, photos: nextPhotos });
    } catch {
      Alert.alert("Hata", "Fotoğraf silinemedi.");
    }
  }

  function handleNextStep(): void {
    setError(null);
    if (step === 1) {
      const nameCheck = validateDisplayName(displayName);
      if (!nameCheck.valid) {
        setError(nameCheck.error || "Geçersiz isim");
        return;
      }

      const birthCheck = validateBirthDateString(dateOfBirth);
      if (!birthCheck.valid) {
        setError(birthCheck.error || "Geçersiz doğum tarihi");
        return;
      }

      setStep(2);
    } else if (step === 2) {
      if (selectedHobbies.length === 0) {
        setError("Lütfen en az 1 adet hobi seçin (Max 4).");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!mainPhotoUrl) {
        setError("Lütfen galeriden en az 1 adet ana profil fotoğrafı seçip yükleyin.");
        return;
      }
      setStep(4);
    }
  }

  async function handleFinish(): Promise<void> {
    setError(null);
    
    // Final pre-submit checks
    const nameCheck = validateDisplayName(displayName);
    if (!nameCheck.valid) {
      setError(nameCheck.error || "Geçersiz isim");
      setStep(1);
      return;
    }

    const birthCheck = validateBirthDateString(dateOfBirth);
    if (!birthCheck.valid) {
      setError(birthCheck.error || "Geçersiz doğum tarihi");
      setStep(1);
      return;
    }

    if (selectedHobbies.length === 0) {
      setError("Lütfen en az 1 hobi seçin.");
      setStep(2);
      return;
    }

    if (!mainPhotoUrl) {
      setError("Profil fotoğrafı zorunludur.");
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.patch<User>("/users/me", {
        display_name: displayName.trim(),
        date_of_birth: dateOfBirth.trim(),
        gender: gender || undefined,
        zodiac_sign: zodiacSign || undefined,
        looking_for: lookingFor || undefined,
        hobbies: selectedHobbies,
        interests: selectedInterests,
        bio: bio.trim() || undefined,
        about_me_prompt: aboutMePrompt.trim() || undefined,
        occupation: occupation.trim() || undefined,
        university: university.trim() || undefined,
      });

      updateUser(res.data);
      clearJustRegistered();
      navigation.replace("Tabs");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          setError(detail);
        } else if (Array.isArray(detail) && detail.length > 0) {
          const firstErr = detail[0];
          const fieldName = firstErr.loc ? firstErr.loc[firstErr.loc.length - 1] : "";
          setError(`Hata (${fieldName}): ${firstErr.msg}`);
        } else {
          setError("Girdiğiniz bilgiler geçersiz. Lütfen alanları kontrol ediniz.");
        }
      } else {
        setError("Profil kaydı esnasında bir bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header Progress Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilini Oluştur ✨</Text>
        <Text style={styles.stepSubtitle}>Adım {step} / 4</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* STEP 1: Basic Personal Info */}
        {step === 1 ? (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Temel Bilgiler & Kimlik 👤</Text>
            <Text style={styles.stepDescription}>
              Sana en uygun kankaları önerebilmemiz için kimlik bilgilerini ve beklentini gir.
            </Text>

            {/* Display Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Görünen İsim (Ad veya Rumuz) ✨</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn. Ahmet, Merve K., Ece..."
                placeholderTextColor={colors.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* Birth Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Doğum Tarihi (YYYY-AA-GG)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn. 1998-05-15"
                placeholderTextColor={colors.textSecondary}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>

            {/* Gender Picker Button */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cinsiyet</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setGenderPickerVisible(true)}
              >
                <Text style={gender ? styles.selectButtonText : styles.selectPlaceholder}>
                  {gender || "Cinsiyetini Seç"}
                </Text>
                <Feather name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Zodiac Sign Picker Button */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Burç 🔮</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setZodiacPickerVisible(true)}
              >
                <Text style={zodiacSign ? styles.selectButtonText : styles.selectPlaceholder}>
                  {zodiacSign || "Burcunu Seç"}
                </Text>
                <Feather name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Looking For Expectation Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ne Arıyorsun? (Beklentim) 🎯</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setLookingForPickerVisible(true)}
              >
                <Text style={lookingFor ? styles.selectButtonText : styles.selectPlaceholder}>
                  {lookingFor || "Nasıl bir arkadaşlık arıyorsun?"}
                </Text>
                <Feather name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label="Devam Et ➡️" onPress={handleNextStep} />
            </View>
          </View>
        ) : null}

        {/* STEP 2: Hobbies & Interests */}
        {step === 2 ? (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Hobilerin & Aktivitelerin 🎯</Text>
            <Text style={styles.stepDescription}>
              Sunulan hobi listesinden en fazla 4 hobi seç (Seçilen: {selectedHobbies.length}/4)
            </Text>

            <Text style={styles.fieldLabel}>Hobilerim (Max 4)</Text>
            <View style={styles.chipGrid}>
              {HOBBIES.map((h) => {
                const isSelected = selectedHobbies.includes(h.slug);
                return (
                  <TouchableOpacity
                    key={h.slug}
                    style={[styles.hobbyChip, isSelected && styles.hobbyChipSelected]}
                    onPress={() => toggleHobby(h.slug)}
                  >
                    <Text style={[styles.hobbyText, isSelected && styles.hobbyTextSelected]}>
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Yapmak İstediğin Aktiviteler</Text>
            <View style={styles.chipGrid}>
              {INTERESTS.slice(0, 12).map((i) => {
                const isSelected = selectedInterests.includes(i.slug);
                return (
                  <TouchableOpacity
                    key={i.slug}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleInterest(i.slug)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {getInterestLabel(i.slug)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Devam Et ➡️" onPress={handleNextStep} />
              </View>
            </View>
          </View>
        ) : null}

        {/* STEP 3: Photos Grid (Direct Device Upload up to 6 Photos) */}
        {step === 3 ? (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Profil Fotoğrafların 📸</Text>
            <Text style={styles.stepDescription}>
              Galerinden fotoğraf seç. İlk fotoğraf senin ana profil fotoğrafın olacaktır. (En fazla {MAX_PHOTOS} fotoğraf).
            </Text>

            {/* Main Avatar Slot */}
            <Text style={styles.fieldLabel}>1. Ana Profil Fotoğrafı (Zorunlu)</Text>
            <TouchableOpacity
              style={styles.mainPhotoBox}
              onPress={handlePickMainPhoto}
              disabled={isUploadingMainPhoto}
            >
              {isUploadingMainPhoto ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : mainPhotoUrl ? (
                <Image source={{ uri: mainPhotoUrl }} style={styles.fullImage} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="camera" size={36} color={colors.primary} />
                  <Text style={styles.photoPlaceholderText}>Galeriden Ana Fotoğraf Seç 📷</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Gallery Photos Grid (5 Extra Slots) */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Ekstra Galeri Fotoğrafları</Text>
            <View style={styles.galleryGrid}>
              {galleryPhotos.map((photo) => (
                <View key={photo.id} style={styles.gallerySlot}>
                  <Image source={{ uri: photo.photo_url }} style={styles.fullImage} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.deleteBadge}
                    onPress={() => handleDeleteGalleryPhoto(photo.id)}
                  >
                    <Feather name="x" size={14} color={colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}

              {galleryPhotos.length < MAX_PHOTOS - 1 ? (
                <TouchableOpacity
                  style={styles.addGallerySlot}
                  onPress={handleAddGalleryPhoto}
                  disabled={isUploadingGalleryPhoto}
                >
                  {isUploadingGalleryPhoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Feather name="plus-circle" size={28} color={colors.primary} />
                      <Text style={styles.addSlotText}>Fotoğraf Ekle</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Devam Et ➡️" onPress={handleNextStep} />
              </View>
            </View>
          </View>
        ) : null}

        {/* STEP 4: Bio, Prompts, Career & Finish */}
        {step === 4 ? (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Hakkımda & Detaylar 📝</Text>
            <Text style={styles.stepDescription}>
              Son adım! Kendinden bahset ve profiline eğlenceli detaylar ekle.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hakkımda (Bio)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Örn. Kahve içmeyi, canlı müzik dinlemeyi ve yeni yerler keşfetmeyi seviyorum..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={bio}
                onChangeText={setBio}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Beni Yakından Tanımak İstersen (Eğlenceli Detay)</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn. Pazar sabahları tırmanışa gitmeye asla hayır demem..."
                placeholderTextColor={colors.textSecondary}
                value={aboutMePrompt}
                onChangeText={setAboutMePrompt}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Meslek</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn. Yazılım Mühendisi, Mimar..."
                placeholderTextColor={colors.textSecondary}
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Üniversite / Okul</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn. İTÜ, Boğaziçi Üniversitesi..."
                placeholderTextColor={colors.textSecondary}
                value={university}
                onChangeText={setUniversity}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={isSubmitting ? "Kaydediliyor..." : "Profilimi Kaydet ve Kankalarını Bul 🚀"}
                  onPress={handleFinish}
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Option Pickers */}
      <OptionPickerModal
        visible={zodiacPickerVisible}
        title="Burcunu Seç 🔮"
        options={zodiacOptions}
        onDismiss={() => setZodiacPickerVisible(false)}
      />

      <OptionPickerModal
        visible={genderPickerVisible}
        title="Cinsiyetini Seç"
        options={genderOptions}
        onDismiss={() => setGenderPickerVisible(false)}
      />

      <OptionPickerModal
        visible={lookingForPickerVisible}
        title="Ne Arıyorsun?"
        options={lookingForOptions}
        onDismiss={() => setLookingForPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    ...typeScale.h2,
    color: colors.primary,
  },
  stepSubtitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  stepHeading: {
    ...typeScale.h2,
    color: colors.textPrimary,
  },
  stepDescription: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectPlaceholder: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  hobbyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hobbyChipSelected: {
    backgroundColor: "#F3E8FF",
    borderColor: "#8A2BE2",
  },
  hobbyText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  hobbyTextSelected: {
    color: "#8A2BE2",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  mainPhotoBox: {
    height: 220,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPlaceholderText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gallerySlot: {
    width: 95,
    height: 95,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.background,
    position: "relative",
  },
  deleteBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  addGallerySlot: {
    width: 95,
    height: 95,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addSlotText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    alignItems: "center",
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

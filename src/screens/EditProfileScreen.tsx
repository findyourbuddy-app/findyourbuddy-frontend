import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Modal, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { IconSectionHeader } from "../components/ui/IconSectionHeader";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import { UniversityAutocomplete } from "../components/ui/UniversityAutocomplete";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { LocationPickerModal } from "../components/overlays/LocationPickerModal";
import { PhotoVerificationModal } from "../components/overlays/PhotoVerificationModal";
import * as Location from "expo-location";
import { reverseGeocode } from "../api/geocoding";
import type { GeocodingResult } from "../api/geocoding";
import {
  deleteGalleryPhoto,
  listMyPhotos,
  updateCurrentUser,
  uploadGalleryPhoto,
  uploadProfilePhoto,
  uploadVoiceNote,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { apiClient } from "../api/client";
import { LANGUAGES_LIST, getLanguageLabel } from "../constants/languages";
import { BIO_SUGGESTIONS, PROMPT_SUGGESTIONS } from "../constants/prompts";
import { INTERESTS } from "../constants/interests";
import { HOBBIES, MAX_HOBBIES_SELECTION } from "../constants/hobbies";
import { pickLabel } from "../constants/localized";
import {
  BELIEF_OPTIONS,
  CLASS_YEAR_OPTIONS,
  GENDER_OPTIONS,
  LOOKING_FOR_OPTIONS,
  optionLabel,
  POLITICAL_OPTIONS,
  ZODIAC_OPTIONS,
} from "../constants/profileOptions";
import {
  MAX_BIO_LENGTH,
  MAX_OCCUPATION_LENGTH,
  calculateAge,
  isValidBirthDate,
} from "../utils/profile";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User, UserPhoto } from "../types";

const MAX_GALLERY_PHOTOS = 6;

type EditProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "EditProfile">;

export function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { user, updateUser, justRegistered, clearJustRegistered } = useAuth();
  const { t, accentColor, bgGradient, language } = useAppTheme();

  const initialBirthDate = user?.date_of_birth ? new Date(user.date_of_birth) : null;
  const [birthDay, setBirthDay] = useState(
    initialBirthDate ? String(initialBirthDate.getDate()) : ""
  );
  const [birthMonth, setBirthMonth] = useState(
    initialBirthDate ? String(initialBirthDate.getMonth() + 1) : ""
  );
  const [birthYear, setBirthYear] = useState(
    initialBirthDate ? String(initialBirthDate.getFullYear()) : ""
  );
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [occupation, setOccupation] = useState(user?.occupation ?? "");
  const [university, setUniversity] = useState(user?.university ?? "");
  const [classYear, setClassYear] = useState(user?.class_year ?? "");
  const [classYearPickerVisible, setClassYearPickerVisible] = useState(false);
  const [zodiacSign, setZodiacSign] = useState(user?.zodiac_sign ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [lookingFor, setLookingFor] = useState(user?.looking_for ?? "");
  const [aboutMePrompt, setAboutMePrompt] = useState(user?.about_me_prompt ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  const [zodiacPickerVisible, setZodiacPickerVisible] = useState(false);
  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [lookingForPickerVisible, setLookingForPickerVisible] = useState(false);

  const zodiacOptions = ZODIAC_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setZodiacSign(item.key),
  }));

  const classYearOptions = CLASS_YEAR_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setClassYear(item.key),
  }));

  const genderOptions = GENDER_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setGender(item.key),
  }));

  const lookingForOptions = LOOKING_FOR_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setLookingFor(item.key),
  }));

  const politicalOptions = POLITICAL_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setPoliticalViews(item.key),
  }));

  const beliefOptions = BELIEF_OPTIONS.map((item) => ({
    key: item.key,
    label: pickLabel(item.labels, language),
    onPress: () => setBeliefs(item.key),
  }));

  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set(user?.languages_spoken && user.languages_spoken.length > 0 ? user.languages_spoken : ["tr"])
  );
  const [politicalViews, setPoliticalViews] = useState<string | null>(user?.political_views ?? null);
  const [beliefs, setBeliefs] = useState<string | null>(user?.beliefs ?? null);
  const [politicalPickerVisible, setPoliticalPickerVisible] = useState(false);
  const [beliefsPickerVisible, setBeliefsPickerVisible] = useState(false);

  function toggleLanguage(code: string): void {
    setSelectedLanguages((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        if (next.size > 1) next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  const [height, setHeight] = useState<string>(user?.height ? String(user.height) : "");
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(
    new Set(user?.hidden_fields ?? [])
  );

  function toggleFieldPrivacy(fieldKey: string): void {
    setHiddenFields((current) => {
      const next = new Set(current);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      const hiddenArray = Array.from(next);
      updateCurrentUser({ hidden_fields: hiddenArray })
        .then((updatedUser) => updateUser(updatedUser))
        .catch(() => {});
      return next;
    });
  }

  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(user?.interests ?? [])
  );
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude != null && user?.longitude != null
      ? { latitude: user.latitude, longitude: user.longitude }
      : null
  );
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string | null>(null);

  const handleAutoUpdateCurrentLocation = useCallback(async () => {
    setIsLocatingCurrent(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("locationPermissionRequired"),
          t("pleaseGrantLocationAccessTo")
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocation({ latitude: lat, longitude: lng });

      const reverseRes = await reverseGeocode(lat, lng);
      const label = reverseRes.display_name.split(",").slice(0, 2).join(",").trim();
      setCurrentLocationLabel(label);

      Alert.alert(
        t("locationUpdated"),
        t("yourPositionHasBeenAutomatically", { p0: label })
      );
    } catch {
      Alert.alert(
        t("error"),
        t("couldNotFetchCurrentGps")
      );
    } finally {
      setIsLocatingCurrent(false);
    }
  }, [language]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(user?.voice_note_url ?? null);
  const [showRecorderModal, setShowRecorderModal] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const recordedSeconds = Math.floor(recorderState.durationMillis / 1000);
  const MAX_RECORDING_SECONDS = 10;

  useEffect(() => {
    if (recorderState.isRecording && recordedSeconds >= MAX_RECORDING_SECONDS) {
      audioRecorder.stop().then(() => setRecordedUri(audioRecorder.uri));
    }
  }, [recorderState.isRecording, recordedSeconds, audioRecorder]);

  useFocusEffect(
    useCallback(() => {
      listMyPhotos()
        .then(setPhotos)
        .catch(() => {
          // Gallery is a non-critical enhancement; failing to load it shouldn't
          // block the rest of the profile screen.
        });
    }, [])
  );

  if (!user) {
    return null;
  }

  function leaveScreen(): void {
    clearJustRegistered();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Tabs");
    }
  }

  function toggleInterest(slug: string): void {
    setSelectedInterests((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  const [selectedHobbies, setSelectedHobbies] = useState<Set<string>>(
    new Set(user?.hobbies ?? [])
  );

  function toggleHobby(slug: string): void {
    setSelectedHobbies((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        if (next.size >= MAX_HOBBIES_SELECTION) {
          Alert.alert("Hobi Limiti", `En fazla ${MAX_HOBBIES_SELECTION} hobi seçebilirsin.`);
          return current;
        }
        next.add(slug);
      }
      return next;
    });
  }

  function handleLocationSelect(result: GeocodingResult): void {
    setLocation({ latitude: result.latitude, longitude: result.longitude });
    setLocationPickerVisible(false);
  }

  const [photoVerificationVisible, setPhotoVerificationVisible] = useState(false);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);

  function handleVerifyPhoto(): void {
    if (!user?.photo_url) {
      Alert.alert("Profil Fotoğrafı Gerekli", "Doğrulama yapabilmek için lütfen önce ana profil fotoğrafı yükleyin.");
      return;
    }

    // KVKK m.6 requires explicit, distinct consent before processing biometric
    // data -- bundling it into the general ToS acceptance at signup isn't
    // enough for a selfie/face-match flow specifically.
    Alert.alert(
      t("biometricDataConsent"),
      t("toGrantABlueCheckmark"),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("iConsent"), onPress: () => runVerifyPhoto() },
      ]
    );
  }

  async function runVerifyPhoto(): Promise<void> {
    if (!user) return;
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== "granted") {
        Alert.alert(
          t("cameraPermissionRequired"),
          t("aLiveSelfieFromThe")
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.front,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setIsVerifyingPhoto(true);
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "selfie.jpg";
      const uploadedUser = await uploadProfilePhoto(asset.uri, fileName);
      const res = await apiClient.post("/users/me/verify-photo", {
        selfie_photo_url: uploadedUser.photo_url,
      });

      if (res.data?.verified) {
        updateUser({ ...uploadedUser, is_verified: true });
        Alert.alert(
          t("verificationSuccessful"),
          t("p0aConfirmationEmailHasBeen", { p0: res.data.message || "Your profile has been verified!", p1: user.email })
        );
      } else {
        Alert.alert(
          t("verificationFailed"),
          res.data?.message || (t("selfieDidNotMatchYour"))
        );
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf doğrulaması sırasında bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsVerifyingPhoto(false);
    }
  }

  async function handlePickPhoto(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Profil fotoğrafı seçebilmek için galeri iznini açman gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    const previousPhoto = user?.photo_url;
    setIsUploadingPhoto(true);
    setError(null);
    if (user) updateUser({ ...user, photo_url: asset.uri });

    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      const uploaded = await uploadProfilePhoto(asset.uri, fileName);
      updateUser(uploaded);
    } catch {
      if (user) updateUser({ ...user, photo_url: previousPhoto ?? null });
      setError("Fotoğraf yüklenemedi, tekrar dener misin?");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleAddGalleryPhoto(): Promise<void> {
    if (photos.length >= MAX_GALLERY_PHOTOS) {
      Alert.alert("Fotoğraf limiti doldu", `En fazla ${MAX_GALLERY_PHOTOS} fotoğraf ekleyebilirsin.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Fotoğraf seçebilmek için galeri iznini açman gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setIsUploadingGalleryPhoto(true);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      const uploaded = await uploadGalleryPhoto(asset.uri, fileName);
      const next = [...photos, uploaded];
      setPhotos(next);
      if (user) updateUser({ ...user, photos: next });
    } catch {
      Alert.alert("Bir sorun oluştu", "Fotoğraf yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsUploadingGalleryPhoto(false);
    }
  }

  async function handleDeleteGalleryPhoto(photo: UserPhoto): Promise<void> {
    const previous = photos;
    const next = photos.filter((p) => p.id !== photo.id);
    setPhotos(next);
    if (user) updateUser({ ...user, photos: next });
    try {
      await deleteGalleryPhoto(photo.id);
    } catch {
      setPhotos(previous);
      if (user) updateUser({ ...user, photos: previous });
      Alert.alert("Bir sorun oluştu", "Fotoğraf silinemedi. Lütfen tekrar dene.");
    }
  }

  async function startRecording(): Promise<void> {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Mikrofon izni gerekli", "Ses kaydı yapabilmek için mikrofon iznini açman gerekiyor.");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    setRecordedUri(null);
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }

  async function stopRecording(): Promise<void> {
    await audioRecorder.stop();
    setRecordedUri(audioRecorder.uri);
  }

  async function handleUploadVoiceNote() {
    if (!recordedUri) return;
    setIsSaving(true);
    try {
      const updatedUser = await uploadVoiceNote(recordedUri);
      updateUser(updatedUser);
      setVoiceNoteUrl(updatedUser.voice_note_url);
      setShowRecorderModal(false);
      Alert.alert("Başarılı", "Ses tanıtımın başarıyla kaydedildi.");
    } catch {
      Alert.alert("Hata", "Ses kaydı yüklenirken bir sorun oluştu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteVoiceNote() {
    setIsSaving(true);
    try {
      const updated = await updateCurrentUser({
        voice_note_url: null,
      });
      updateUser(updated);
      setVoiceNoteUrl(null);
      Alert.alert(
        t("success"),
        t("voiceIntroRemovedFromProfile")
      );
    } catch {
      Alert.alert(
        t("error"),
        t("failedToDeleteVoiceIntro")
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (isSaving) return;
    setError(null);

    if (!displayName.trim()) {
      setError(t("nameCannotBeEmpty"));
      return;
    }

    const hasBirthDateInput = birthDay.trim() || birthMonth.trim() || birthYear.trim();
    let birthDateIso: string | undefined;
    if (hasBirthDateInput) {
      const day = Number(birthDay);
      const month = Number(birthMonth);
      const year = Number(birthYear);
      if (!isValidBirthDate(day, month, year)) {
        setError(t("pleaseEnterAValidBirth"));
        return;
      }
      birthDateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    setIsSaving(true);
    try {
      const updated = await updateCurrentUser({
        display_name: displayName.trim(),
        date_of_birth: birthDateIso,
        occupation: occupation.trim() ? occupation.trim() : undefined,
        university: university.trim() ? university.trim() : null,
        class_year: classYear ? classYear : null,
        zodiac_sign: zodiacSign ? zodiacSign : null,
        gender: gender ? gender : null,
        height: height.trim() ? Number(height.trim()) : null,
        political_views: politicalViews ? politicalViews : null,
        beliefs: beliefs ? beliefs : null,
        languages_spoken: Array.from(selectedLanguages),
        hidden_fields: Array.from(hiddenFields),
        looking_for: lookingFor ? lookingFor : null,
        about_me_prompt: aboutMePrompt.trim() ? aboutMePrompt.trim() : null,
        bio: bio.trim() ? bio.trim() : undefined,
        interests: Array.from(selectedInterests),
        hobbies: Array.from(selectedHobbies),
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      updateUser(updated);
      leaveScreen();
    } catch {
      setError(t("profileCouldNotBeSaved"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={[styles.background, { backgroundColor: bgGradient[0] }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      {justRegistered ? (
        <View style={styles.welcomeHeader}>
          <Text style={typeScale.h1}>Hoş geldin, {user.display_name}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Sana en uygun etkinlikleri ve kankaları önerebilmemiz için birkaç bilgiye
            ihtiyacımız var. 1 dakikanı alır.
          </Text>
          <Pressable onPress={leaveScreen} style={styles.skipLink}>
            <Text style={styles.skipText}>Şimdi değil, sonra tamamlarım</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickPhoto} disabled={isUploadingPhoto}>
          <Avatar name={user.display_name} photoUrl={user.photo_url} isVerified={user.is_verified} size={96} />
          <View style={styles.avatarBadge}>
            <Feather name={isUploadingPhoto ? "loader" : "camera"} size={14} color={colors.surface} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.groupCard, styles.cardAccentBlue]}>
        <IconSectionHeader icon="user" color="#2E7FC9" label={t("identity")} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("name")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("fullName")}
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("gender")}</Text>
          <Pressable style={styles.inputPressable} onPress={() => setGenderPickerVisible(true)}>
            <Text style={[styles.inputText, !gender && { color: colors.textSecondary }]}>
              {gender ? optionLabel(GENDER_OPTIONS, gender, language) : t("selectGender")}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("birthDate")}</Text>
          <View style={styles.birthDateRow}>
            <TextInput
              style={[styles.input, styles.birthDateInput]}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor={colors.textSecondary}
              value={birthDay}
              onChangeText={setBirthDay}
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.birthDateInput]}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={colors.textSecondary}
              value={birthMonth}
              onChangeText={setBirthMonth}
              maxLength={2}
            />
            <TextInput
              style={[styles.input, styles.birthDateInputYear]}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor={colors.textSecondary}
              value={birthYear}
              onChangeText={setBirthYear}
              maxLength={4}
            />
          </View>
          {birthDay && birthMonth && birthYear && isValidBirthDate(Number(birthDay), Number(birthMonth), Number(birthYear)) ? (
            <Text style={styles.charCount}>
              {t("age")}: {calculateAge(new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay)))}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentPink]}>
        <View style={styles.bioHeader}>
          <IconSectionHeader icon="image" color="#D9427F" label={t("photos")} />
          <Text style={styles.charCount}>
            {photos.length}/{MAX_GALLERY_PHOTOS}
          </Text>
        </View>
        <View style={styles.galleryGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.galleryTile}>
              <Image source={{ uri: resolvePhotoUrl(photo.photo_url) ?? undefined }} style={styles.galleryImage} contentFit="cover" />
              <Pressable
                style={styles.galleryRemove}
                onPress={() => handleDeleteGalleryPhoto(photo)}
              >
                <Feather name="x" size={12} color={colors.surface} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_GALLERY_PHOTOS ? (
            <Pressable
              style={[styles.galleryTile, styles.galleryAddTile]}
              onPress={handleAddGalleryPhoto}
              disabled={isUploadingGalleryPhoto}
            >
              <Feather
                name={isUploadingGalleryPhoto ? "loader" : "plus"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentTeal]}>
        <View style={styles.cardHeaderWithPrivacy}>
          <IconSectionHeader icon="briefcase" color="#2FA88B" label={t("careerAndEdu")} />
          <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("occupation")}>
            <Feather name={hiddenFields.has("occupation") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("occupation") ? colors.accentRed : colors.primary} />
            <Text style={[styles.privacyBtnText, hiddenFields.has("occupation") && { color: colors.accentRed }]}>
              {hiddenFields.has("occupation") ? (t("hidden")) : (t("visible"))}
            </Text>
          </Pressable>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("occupation")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("egSoftwareEngineer")}
            placeholderTextColor={colors.textSecondary}
            value={occupation}
            onChangeText={(text) => setOccupation(text.slice(0, MAX_OCCUPATION_LENGTH))}
            maxLength={MAX_OCCUPATION_LENGTH}
          />
        </View>
        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("universityOrSchool")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("university")}>
              <Feather name={hiddenFields.has("university") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("university") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("university") && { color: colors.accentRed }]}>
                {hiddenFields.has("university") ? (t("hidden")) : (t("grnr"))}
              </Text>
            </Pressable>
          </View>
          <UniversityAutocomplete
            value={university}
            onChangeText={setUniversity}
            language={language}
          />
        </View>
        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("classGraduation")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("class_year")}>
              <Feather name={hiddenFields.has("class_year") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("class_year") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("class_year") && { color: colors.accentRed }]}>
                {hiddenFields.has("class_year") ? (t("hidden")) : (t("visible"))}
              </Text>
            </Pressable>
          </View>
          <Pressable style={styles.inputPressable} onPress={() => setClassYearPickerVisible(true)}>
            <Text style={[styles.inputText, !classYear && { color: colors.textSecondary }]}>
              {classYear ? optionLabel(CLASS_YEAR_OPTIONS, classYear, language) : t("select")}
            </Text>
            <Feather name="book-open" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentPurple]}>
        <IconSectionHeader icon="compass" color={colors.primary} label={t("personalityAndPreferences")} />
        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("zodiacSign")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("zodiac_sign")}>
              <Feather name={hiddenFields.has("zodiac_sign") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("zodiac_sign") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("zodiac_sign") && { color: colors.accentRed }]}>
                {hiddenFields.has("zodiac_sign") ? (t("hidden")) : (t("visible"))}
              </Text>
            </Pressable>
          </View>
          <Pressable style={styles.inputPressable} onPress={() => setZodiacPickerVisible(true)}>
            <Text style={[styles.inputText, !zodiacSign && { color: colors.textSecondary }]}>
              {zodiacSign ? optionLabel(ZODIAC_OPTIONS, zodiacSign, language) : t("selectZodiacSign2")}
            </Text>
            <Feather name="compass" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("heightCm")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("height")}>
              <Feather name={hiddenFields.has("height") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("height") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("height") && { color: colors.accentRed }]}>
                {hiddenFields.has("height") ? (t("hidden")) : (t("visible"))}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t("eg178")}
            placeholderTextColor={colors.textSecondary}
            value={height}
            onChangeText={(text) => setHeight(text.replace(/[^0-9]/g, "").slice(0, 3))}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("politicalViews")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("political_views")}>
              <Feather name={hiddenFields.has("political_views") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("political_views") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("political_views") && { color: colors.accentRed }]}>
                {hiddenFields.has("political_views") ? (t("hidden")) : (t("visible"))}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t("typeOrSelectPoliticalView")}
            placeholderTextColor={colors.textSecondary}
            value={politicalViews ?? ""}
            onChangeText={setPoliticalViews}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {POLITICAL_OPTIONS.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.chip, politicalViews === item.key && styles.chipActive]}
                  onPress={() => setPoliticalViews(item.key)}
                >
                  <Text style={[styles.chipText, politicalViews === item.key && styles.chipTextActive]}>
                    {pickLabel(item.labels, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeaderWithPrivacy}>
            <Text style={styles.fieldLabel}>{t("beliefsPhilosophy")}</Text>
            <Pressable style={styles.privacyBtn} onPress={() => toggleFieldPrivacy("beliefs")}>
              <Feather name={hiddenFields.has("beliefs") ? "eye-off" : "eye"} size={12} color={hiddenFields.has("beliefs") ? colors.accentRed : colors.primary} />
              <Text style={[styles.privacyBtnText, hiddenFields.has("beliefs") && { color: colors.accentRed }]}>
                {hiddenFields.has("beliefs") ? (t("hidden")) : (t("visible"))}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t("typeOrSelectBelief")}
            placeholderTextColor={colors.textSecondary}
            value={beliefs ?? ""}
            onChangeText={setBeliefs}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {BELIEF_OPTIONS.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.chip, beliefs === item.key && styles.chipActive]}
                  onPress={() => setBeliefs(item.key)}
                >
                  <Text style={[styles.chipText, beliefs === item.key && styles.chipTextActive]}>
                    {pickLabel(item.labels, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("lookingForIntention")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("typeOrSelectWhatYoure")}
            placeholderTextColor={colors.textSecondary}
            value={lookingFor ?? ""}
            onChangeText={setLookingFor}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {LOOKING_FOR_OPTIONS.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.chip, lookingFor === item.key && styles.chipActive]}
                  onPress={() => setLookingFor(item.key)}
                >
                  <Text style={[styles.chipText, lookingFor === item.key && styles.chipTextActive]}>
                    {pickLabel(item.labels, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Languages Spoken Card */}
      <View style={[styles.groupCard, styles.cardAccentTeal]}>
        <IconSectionHeader icon="globe" color="#2FA88B" label={t("languagesSpoken")} />
        <View style={styles.chipGrid}>
          {LANGUAGES_LIST.map((lang) => {
            const active = selectedLanguages.has(lang.code);
            return (
              <Chip
                key={lang.code}
                label={`${lang.flag} ${getLanguageLabel(lang.code, language)}`}
                active={active}
                onPress={() => toggleLanguage(lang.code)}
              />
            );
          })}
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentYellow]}>
        <IconSectionHeader icon="feather" color="#E0A800" label={t("introduceYourself")} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("funDetailPrompt")}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
            {t("tapASuggestionToStart")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {PROMPT_SUGGESTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  style={{
                    backgroundColor: "#FEF9C3",
                    borderColor: "#FDE047",
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                  }}
                  onPress={() => {
                    setAboutMePrompt(`${pickLabel(item.question, language)} `);
                  }}
                >
                  <Text style={{ color: "#854D0E", fontWeight: "600", fontFamily: fontFamily.body, fontSize: 13 }}>
                    {pickLabel(item.question, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder={t("egMyPerfectSundayIs2")}
            placeholderTextColor={colors.textSecondary}
            value={aboutMePrompt}
            onChangeText={setAboutMePrompt}
            multiline
          />
        </View>
        <View style={styles.field}>
          <View style={styles.bioHeader}>
            <Text style={styles.fieldLabel}>{t("aboutMe")}</Text>
            <Text style={styles.charCount}>
              {bio.length}/{MAX_BIO_LENGTH}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
            {t("tapASuggestionToFill")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {BIO_SUGGESTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  style={{
                    backgroundColor: "#E0F2FE",
                    borderColor: "#38BDF8",
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                  }}
                  onPress={() => {
                    setBio(pickLabel(item.placeholder, language).slice(0, MAX_BIO_LENGTH));
                  }}
                >
                  <Text style={{ color: "#0369A1", fontWeight: "600", fontFamily: fontFamily.body, fontSize: 13 }}>
                    {pickLabel(item.question, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder={t("tellUsBrieflyAboutYourself")}
            placeholderTextColor={colors.textSecondary}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, MAX_BIO_LENGTH))}
            multiline
            maxLength={MAX_BIO_LENGTH}
          />
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentPurple]}>
        <IconSectionHeader icon="star" color="#8A2BE2" label={t("hobbies")} />
        <View style={styles.chipGrid}>
          {HOBBIES.map((hobby) => (
            <Chip
              key={hobby.slug}
              label={pickLabel(hobby.labels, language)}
              active={selectedHobbies.has(hobby.slug)}
              onPress={() => toggleHobby(hobby.slug)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentGreen]}>
        <IconSectionHeader icon="heart" color={colors.accentGreen} label={t("activitiesIWantToDo")} />
        <View style={styles.chipGrid}>
          {INTERESTS.map((interest) => (
            <Chip
              key={interest.slug}
              label={pickLabel(interest.labels, language)}
              active={selectedInterests.has(interest.slug)}
              onPress={() => toggleInterest(interest.slug)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.groupCard, styles.cardAccentPink]}>
        <IconSectionHeader icon="mic" color="#D9427F" label={t("voiceIntro")} />
        {voiceNoteUrl ? (
          <VoiceNotePlayer audioUrl={resolvePhotoUrl(voiceNoteUrl)} onDelete={handleDeleteVoiceNote} />
        ) : (
          <Pressable style={styles.voiceNotePlaceholder} onPress={() => setShowRecorderModal(true)}>
            <Feather name="mic" size={20} color={colors.primary} />
            <Text style={styles.voiceNotePlaceholderText}>{t("recordVoiceIntroMax10s")}</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.groupCard, styles.cardAccentBlue]}>
        <IconSectionHeader icon="map-pin" color="#2E7FC9" label={t("locationGps")} />
        <View style={styles.voiceNoteCard}>
          <Feather name="navigation" size={18} color={accentColor} />
          <Text style={{ flex: 1, fontFamily: fontFamily.body, fontSize: 13, color: colors.textPrimary }}>
            {currentLocationLabel || (location ? (t("gpsLocationActiveSaved")) : (t("gpsLocationNotSet")))}
          </Text>
        </View>
        <PrimaryButton
          label={isLocatingCurrent ? (t("updatingGps")) : (t("updateCurrentLocationGps"))}
          onPress={handleAutoUpdateCurrentLocation}
          variant="accent"
        />
      </View>
      <View style={[styles.groupCard, styles.cardAccentBlue]}>
        <IconSectionHeader icon="shield" color="#1DA1F2" label={t("accountVerification")} />
        <Pressable
          style={styles.settingsMenuRow}
          onPress={user.is_verified ? undefined : () => setPhotoVerificationVisible(true)}
          disabled={isVerifyingPhoto}
        >
          <View style={styles.settingsMenuLeft}>
            <View style={[styles.settingsIconBox, { backgroundColor: "rgba(29, 161, 242, 0.1)" }]}>
              <Feather name="check-circle" size={18} color="#1DA1F2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsMenuTitle}>
                {user.is_verified
                  ? (t("verifiedProfile"))
                  : (t("verifyProfile"))}
              </Text>
              <Text style={styles.settingsMenuSub}>
                {user.is_verified
                  ? (t("yourAccountIsVerifiedWith"))
                  : user.verification_status === "rejected"
                  ? (t("verificationRejectedTapToRetake"))
                  : user.verification_status === "pending"
                  ? (t("verificationPendingTapToRetake"))
                  : (t("takeALiveSelfieTo2"))}
              </Text>
            </View>
          </View>

          {isVerifyingPhoto ? (
            <ActivityIndicator size="small" color="#1DA1F2" />
          ) : user.is_verified ? (
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedPillText}>{t("verified")}</Text>
            </View>
          ) : user.verification_status === "rejected" ? (
            <View style={[styles.verifiedPill, { backgroundColor: "rgba(235, 87, 87, 0.15)" }]}>
              <Text style={[styles.verifiedPillText, { color: colors.accentRed }]}>{t("rejected")}</Text>
            </View>
          ) : user.verification_status === "pending" ? (
            <View style={[styles.verifiedPill, { backgroundColor: "rgba(241, 196, 15, 0.15)" }]}>
              <Text style={[styles.verifiedPillText, { color: "#D4AC0D" }]}>{t("pending")}</Text>
            </View>
          ) : (
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={t("save")} onPress={handleSave} loading={isSaving} />

      {/* Voice Recorder Modal */}
      <Modal
        visible={showRecorderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecorderModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRecorderModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={typeScale.h2}>Ses Tanıtımı Kaydet</Text>
            
            <View style={styles.recorderBody}>
              {recorderState.isRecording ? (
                <View style={styles.recordingPulseContainer}>
                  <View style={styles.recordingIndicatorRed} />
                  <Text style={styles.recordingTimerText}>
                    00:{recordedSeconds < 10 ? "0" : ""}
                    {recordedSeconds}
                  </Text>
                </View>
              ) : recordedUri ? (
                <View style={styles.recordingPulseContainer}>
                  <Feather name="check-circle" size={32} color="#2ECC71" />
                  <Text style={styles.recordingTimerText}>Ses Kaydı Başarılı!</Text>
                </View>
              ) : (
                <Text style={styles.recorderInstruction}>Butona basarak ses kaydını başlatabilirsiniz (Maks. 10 saniye)</Text>
              )}
            </View>

            <View style={styles.recorderActions}>
              {!recorderState.isRecording && !recordedUri && (
                <Pressable style={[styles.recorderBtn, styles.recordStartBtn]} onPress={startRecording}>
                  <Feather name="mic" size={18} color={colors.surface} />
                  <Text style={styles.recorderBtnText}>Kayda Başla</Text>
                </Pressable>
              )}
              {recorderState.isRecording && (
                <Pressable style={[styles.recorderBtn, styles.recordingActiveBtn]} onPress={stopRecording}>
                  <Feather name="square" size={16} color={colors.surface} />
                  <Text style={styles.recorderBtnText}>Kaydı Durdur</Text>
                </Pressable>
              )}
              {recordedUri && (
                <Pressable style={[styles.recorderBtn, styles.recordUploadBtn]} onPress={handleUploadVoiceNote} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <>
                      <Feather name="upload-cloud" size={18} color={colors.surface} />
                      <Text style={styles.recorderBtnText}>Kaydı Yükle</Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                style={[styles.recorderBtn, styles.recordCancelBtn]}
                onPress={async () => {
                  if (recorderState.isRecording) {
                    await audioRecorder.stop();
                  }
                  setShowRecorderModal(false);
                  setRecordedUri(null);
                }}
              >
                <Text style={[styles.recorderBtnText, { color: colors.textSecondary }]}>Vazgeç</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <OptionPickerModal
        visible={zodiacPickerVisible}
        title="Burcunu Seç"
        options={zodiacOptions}
        onDismiss={() => setZodiacPickerVisible(false)}
      />

      <OptionPickerModal
        visible={classYearPickerVisible}
        title={t("selectClassGraduation")}
        options={classYearOptions}
        selectedKey={classYear}
        onDismiss={() => setClassYearPickerVisible(false)}
      />

      <OptionPickerModal
        visible={genderPickerVisible}
        title="Cinsiyetini Seç"
        options={genderOptions}
        onDismiss={() => setGenderPickerVisible(false)}
      />

      <OptionPickerModal
        visible={lookingForPickerVisible}
        title="Beklentini Seç"
        options={lookingForOptions}
        onDismiss={() => setLookingForPickerVisible(false)}
      />

      <OptionPickerModal
        visible={politicalPickerVisible}
        title={t("selectPoliticalViews")}
        options={politicalOptions}
        onDismiss={() => setPoliticalPickerVisible(false)}
      />

      <OptionPickerModal
        visible={beliefsPickerVisible}
        title={t("selectBeliefsPhilosophy")}
        options={beliefOptions}
        onDismiss={() => setBeliefsPickerVisible(false)}
      />

      <LocationPickerModal
        visible={locationPickerVisible}
        onSelect={handleLocationSelect}
        onDismiss={() => setLocationPickerVisible(false)}
        initialLatitude={location?.latitude}
        initialLongitude={location?.longitude}
      />

      <PhotoVerificationModal
        visible={photoVerificationVisible}
        onClose={() => setPhotoVerificationVisible(false)}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  welcomeHeader: {
    gap: spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  skipLink: {
    alignSelf: "flex-end",
  },
  skipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  cardHeaderWithPrivacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldHeaderWithPrivacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  privacyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  cardAccentBlue: {
    borderLeftColor: "#2E7FC9",
  },
  cardAccentPink: {
    borderLeftColor: "#D9427F",
  },
  cardAccentTeal: {
    borderLeftColor: "#2FA88B",
  },
  cardAccentPurple: {
    borderLeftColor: colors.primary,
  },
  cardAccentYellow: {
    borderLeftColor: "#E0A800",
  },
  cardAccentGreen: {
    borderLeftColor: colors.accentGreen,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  galleryTile: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryAddTile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  bioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  birthDateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  birthDateInput: {
    flex: 1,
    textAlign: "center",
  },
  birthDateInputYear: {
    flex: 1.5,
    textAlign: "center",
  },
  bioInput: {
    borderRadius: radius.card,
    minHeight: 96,
    textAlignVertical: "top",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
  },
  voiceNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceNotePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
  },
  voiceNotePlaceholderText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  recorderBody: {
    height: 160,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  recordingPulseContainer: {
    alignItems: "center",
    gap: spacing.sm,
  },
  recordingIndicatorRed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentRed,
  },
  recordingTimerText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  recorderInstruction: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  recorderActions: {
    gap: spacing.sm,
  },
  recorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  recordStartBtn: {
    backgroundColor: colors.primary,
  },
  recordingActiveBtn: {
    backgroundColor: colors.accentRed,
  },
  recordUploadBtn: {
    backgroundColor: "#2ECC71",
  },
  recordCancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recorderBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.surface,
  },
  settingsMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  settingsMenuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  settingsMenuTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  settingsMenuSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  verifiedPill: {
    backgroundColor: "rgba(29, 161, 242, 0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: "#1DA1F2",
  },
});

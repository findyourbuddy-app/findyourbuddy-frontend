import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View, Modal, ActivityIndicator } from "react-native";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { OptionPickerModal } from "../components/overlays/OptionPickerModal";
import { LocationPickerModal } from "../components/overlays/LocationPickerModal";
import { MapLocationPicker } from "../components/maps/MapLocationPicker";
import type { GeocodingResult } from "../api/geocoding";
import {
  deleteGalleryPhoto,
  listMyPhotos,
  updateCurrentUser,
  uploadGalleryPhoto,
  uploadProfilePhoto,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";
import { INTERESTS } from "../constants/interests";
import {
  MAX_BIO_LENGTH,
  MAX_OCCUPATION_LENGTH,
  calculateAge,
  isValidBirthDate,
} from "../utils/profile";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User, UserPhoto } from "../types";

const MAX_GALLERY_PHOTOS = 6;

type EditProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "EditProfile">;

export function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { user, updateUser, justRegistered, clearJustRegistered } = useAuth();

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
  const [occupation, setOccupation] = useState(user?.occupation ?? "");
  const [university, setUniversity] = useState(user?.university ?? "");
  const [zodiacSign, setZodiacSign] = useState(user?.zodiac_sign ?? "");
  const [lookingFor, setLookingFor] = useState(user?.looking_for ?? "");
  const [aboutMePrompt, setAboutMePrompt] = useState(user?.about_me_prompt ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  const [zodiacPickerVisible, setZodiacPickerVisible] = useState(false);
  const [lookingForPickerVisible, setLookingForPickerVisible] = useState(false);

  const ZODIAC_SIGNS = [
    "Koç", "Boğa", "İkizler", "Yengeç",
    "Aslan", "Başak", "Terazi", "Akrep",
    "Yay", "Oğlak", "Kova", "Balık"
  ];

  const LOOKING_FOR_OPTIONS = [
    "Kahve & Sohbet",
    "Spor Arkadaşı",
    "Konser Kankası",
    "Yeni Şehirde Rehber",
    "Sadece Eğlence",
    "Uzun Vadeli Dostluk"
  ];

  const zodiacOptions = ZODIAC_SIGNS.map((sign) => ({
    key: sign,
    label: sign,
    onPress: () => setZodiacSign(sign),
  }));

  const lookingForOptions = LOOKING_FOR_OPTIONS.map((option) => ({
    key: option,
    label: option,
    onPress: () => setLookingFor(option),
  }));

  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(user?.interests ?? [])
  );
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude != null && user?.longitude != null
      ? { latitude: user.latitude, longitude: user.longitude }
      : null
  );
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(user?.voice_note_url ?? null);
  const [showRecorderModal, setShowRecorderModal] = useState(false);
  const [isRecordingMock, setIsRecordingMock] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

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

  function handleLocationSelect(result: GeocodingResult): void {
    setLocation({ latitude: result.latitude, longitude: result.longitude });
    setLocationPickerVisible(false);
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

    setIsUploadingPhoto(true);
    setError(null);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      updateUser(await uploadProfilePhoto(asset.uri, fileName));
    } catch {
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
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setIsUploadingGalleryPhoto(true);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      const uploaded = await uploadGalleryPhoto(asset.uri, fileName);
      setPhotos((current) => [...current, uploaded]);
    } catch {
      Alert.alert("Bir sorun oluştu", "Fotoğraf yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsUploadingGalleryPhoto(false);
    }
  }

  async function handleDeleteGalleryPhoto(photo: UserPhoto): Promise<void> {
    const previous = photos;
    setPhotos((current) => current.filter((p) => p.id !== photo.id));
    try {
      await deleteGalleryPhoto(photo.id);
    } catch {
      setPhotos(previous);
      Alert.alert("Bir sorun oluştu", "Fotoğraf silinemedi. Lütfen tekrar dene.");
    }
  }

  function startRecordingMock() {
    setIsRecordingMock(true);
    setRecordedDuration(0);
    setRecordedUri(null);
    const interval = setInterval(() => {
      setRecordedDuration((prev) => {
        if (prev >= 10) {
          clearInterval(interval);
          setIsRecordingMock(false);
          setRecordedUri("mock-recorded-audio-uri");
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  }

  async function handleUploadVoiceNote() {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: "mock-audio-uri",
        name: "voice_note.m4a",
        type: "audio/m4a",
      } as any);

      const res = await apiClient.post<User>("/users/me/voice-note", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data);
      setVoiceNoteUrl(res.data.voice_note_url);
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
      } as any);
      updateUser(updated);
      setVoiceNoteUrl(null);
      Alert.alert("Başarılı", "Ses tanıtımın profilinden kaldırıldı.");
    } catch {
      Alert.alert("Hata", "Ses tanıtımı silinirken bir sorun oluştu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(): Promise<void> {
    setError(null);

    const hasBirthDateInput = birthDay.trim() || birthMonth.trim() || birthYear.trim();
    let birthDateIso: string | undefined;
    if (hasBirthDateInput) {
      const day = Number(birthDay);
      const month = Number(birthMonth);
      const year = Number(birthYear);
      if (!isValidBirthDate(day, month, year)) {
        setError("Lütfen geçerli bir doğum tarihi gir (18-99 yaş arası).");
        return;
      }
      birthDateIso = new Date(year, month - 1, day).toISOString().slice(0, 10);
    }

    setIsSaving(true);
    try {
      const updated = await updateCurrentUser({
        date_of_birth: birthDateIso,
        occupation: occupation.trim() ? occupation.trim() : undefined,
        university: university.trim() ? university.trim() : null,
        zodiac_sign: zodiacSign ? zodiacSign : null,
        looking_for: lookingFor ? lookingFor : null,
        about_me_prompt: aboutMePrompt.trim() ? aboutMePrompt.trim() : null,
        bio: bio.trim() ? bio.trim() : undefined,
        interests: Array.from(selectedInterests),
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      updateUser(updated);
      leaveScreen();
    } catch {
      setError("Profil kaydedilemedi, bilgileri kontrol edip tekrar dene.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      {justRegistered ? (
        <View style={styles.welcomeHeader}>
          <Text style={typeScale.h1}>Hoş geldin, {user.display_name}! 👋</Text>
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
          <Avatar name={user.display_name} photoUrl={user.photo_url} size={96} />
          <View style={styles.avatarBadge}>
            <Feather name={isUploadingPhoto ? "loader" : "camera"} size={14} color={colors.surface} />
          </View>
        </Pressable>
      </View>

      <View style={styles.field}>
        <View style={styles.bioHeader}>
          <Text style={typeScale.eyebrow}>Fotoğraflar</Text>
          <Text style={styles.charCount}>
            {photos.length}/{MAX_GALLERY_PHOTOS}
          </Text>
        </View>
        <View style={styles.galleryGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.galleryTile}>
              <Image source={{ uri: photo.photo_url }} style={styles.galleryImage} />
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

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Doğum Tarihi</Text>
        <View style={styles.birthDateRow}>
          <TextInput
            style={[styles.input, styles.birthDateInput]}
            keyboardType="number-pad"
            placeholder="GG"
            placeholderTextColor={colors.textSecondary}
            value={birthDay}
            onChangeText={setBirthDay}
            maxLength={2}
          />
          <TextInput
            style={[styles.input, styles.birthDateInput]}
            keyboardType="number-pad"
            placeholder="AA"
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
            Yaş: {calculateAge(new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay)))}
          </Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Meslek</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn. Yazılım Mühendisi"
          placeholderTextColor={colors.textSecondary}
          value={occupation}
          onChangeText={(text) => setOccupation(text.slice(0, MAX_OCCUPATION_LENGTH))}
          maxLength={MAX_OCCUPATION_LENGTH}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Üniversite / Okul</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn. İstanbul Üniversitesi"
          placeholderTextColor={colors.textSecondary}
          value={university}
          onChangeText={setUniversity}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Burç</Text>
        <Pressable style={styles.inputPressable} onPress={() => setZodiacPickerVisible(true)}>
          <Text style={[styles.inputText, !zodiacSign && { color: colors.textSecondary }]}>
            {zodiacSign || "Burcunu seç..."}
          </Text>
          <Feather name="compass" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Beklenti / Ne Arıyorsun?</Text>
        <Pressable style={styles.inputPressable} onPress={() => setLookingForPickerVisible(true)}>
          <Text style={[styles.inputText, !lookingFor && { color: colors.textSecondary }]}>
            {lookingFor || "Uygulamada ne aradığını belirt..."}
          </Text>
          <Feather name="target" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Eğlenceli Detay (Beni yakından tanımak istersen:)</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Örn: Hafta sonları kamp yapmayı ve yeni diller öğrenmeyi severim..."
          placeholderTextColor={colors.textSecondary}
          value={aboutMePrompt}
          onChangeText={setAboutMePrompt}
          multiline
        />
      </View>

      <View style={styles.field}>
        <View style={styles.bioHeader}>
          <Text style={typeScale.eyebrow}>Hakkında</Text>
          <Text style={styles.charCount}>
            {bio.length}/{MAX_BIO_LENGTH}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Kendinden kısaca bahset..."
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={(text) => setBio(text.slice(0, MAX_BIO_LENGTH))}
          multiline
          maxLength={MAX_BIO_LENGTH}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>İlgi Alanları</Text>
        <View style={styles.chipGrid}>
          {INTERESTS.map((interest) => (
            <Chip
              key={interest.slug}
              label={interest.label}
              active={selectedInterests.has(interest.slug)}
              onPress={() => toggleInterest(interest.slug)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Ses Tanıtımı 🎙️</Text>
        {voiceNoteUrl ? (
          <View style={styles.voiceNoteCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
              <Feather name="mic" size={20} color={colors.primary} />
              <Text style={styles.voiceNoteTitle}>Ses Tanıtımın Yüklendi</Text>
            </View>
            <Pressable style={styles.voiceNoteDeleteBtn} onPress={handleDeleteVoiceNote}>
              <Feather name="trash-2" size={16} color={colors.accentRed} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.voiceNotePlaceholder} onPress={() => setShowRecorderModal(true)}>
            <Feather name="mic" size={20} color={colors.primary} />
            <Text style={styles.voiceNotePlaceholderText}>Ses Tanıtımı Kaydet (Max 10sn)</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Konum</Text>
        {location ? (
          <MapLocationPicker
            latitude={location.latitude}
            longitude={location.longitude}
            onChange={setLocation}
          />
        ) : null}
        <PrimaryButton
          label={location ? "Konumu Değiştir" : "Konum Seç"}
          onPress={() => setLocationPickerVisible(true)}
          variant="outline"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Kaydet" onPress={handleSave} loading={isSaving} />

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
              {isRecordingMock ? (
                <View style={styles.recordingPulseContainer}>
                  <View style={styles.recordingIndicatorRed} />
                  <Text style={styles.recordingTimerText}>00:{recordedDuration < 10 ? "0" : ""}{recordedDuration}</Text>
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
              {!isRecordingMock && !recordedUri && (
                <Pressable style={[styles.recorderBtn, styles.recordStartBtn]} onPress={startRecordingMock}>
                  <Feather name="mic" size={18} color={colors.surface} />
                  <Text style={styles.recorderBtnText}>Kayda Başla</Text>
                </Pressable>
              )}
              {isRecordingMock && (
                <View style={[styles.recorderBtn, styles.recordingActiveBtn]}>
                  <ActivityIndicator color={colors.surface} style={{ marginRight: 6 }} />
                  <Text style={styles.recorderBtnText}>Kaydediliyor...</Text>
                </View>
              )}
              {recordedUri && (
                <Pressable style={[styles.recorderBtn, styles.recordUploadBtn]} onPress={handleUploadVoiceNote}>
                  <Feather name="upload-cloud" size={18} color={colors.surface} />
                  <Text style={styles.recorderBtnText}>Kaydı Yükle</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.recorderBtn, styles.recordCancelBtn]}
                onPress={() => {
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
        visible={lookingForPickerVisible}
        title="Beklentini Seç"
        options={lookingForOptions}
        onDismiss={() => setLookingForPickerVisible(false)}
      />

      <LocationPickerModal
        visible={locationPickerVisible}
        onSelect={handleLocationSelect}
        onDismiss={() => setLocationPickerVisible(false)}
      />
    </ScrollView>
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
  field: {
    gap: spacing.sm,
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
  voiceNoteTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  voiceNoteDeleteBtn: {
    padding: spacing.xs,
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
});

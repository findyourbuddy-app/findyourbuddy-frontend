import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Chip } from "../components/ui/Chip";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import {
  deleteGalleryPhoto,
  listMyPhotos,
  updateCurrentUser,
  uploadGalleryPhoto,
  uploadProfilePhoto,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { INTERESTS } from "../constants/interests";
import {
  MAX_BIO_LENGTH,
  MAX_OCCUPATION_LENGTH,
  calculateAge,
  isValidBirthDate,
} from "../utils/profile";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { UserPhoto } from "../types";

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
  const [bio, setBio] = useState(user?.bio ?? "");
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(user?.interests ?? [])
  );
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude != null && user?.longitude != null
      ? { latitude: user.latitude, longitude: user.longitude }
      : null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);

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

  async function handleUseLocation(): Promise<void> {
    setIsLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Konum izni gerekli",
          "Yakınındaki etkinlikleri gösterebilmemiz için konum iznini açman gerekiyor."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert("Konum alınamadı", "Bir sorun oluştu, tekrar dener misin?");
    } finally {
      setIsLocating(false);
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
        <Text style={typeScale.eyebrow}>Konum</Text>
        <PrimaryButton
          label={location ? "Konum Güncellendi ✓" : "Konumumu Kullan"}
          onPress={handleUseLocation}
          variant="outline"
          loading={isLocating}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Kaydet" onPress={handleSave} loading={isSaving} />
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
});

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import {
  deleteGalleryPhoto,
  listMyPhotos,
  uploadGalleryPhoto,
  uploadProfilePhoto,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { UserPhoto } from "../types";
import { Alert } from "../utils/alert";

const MAX_PHOTOS = 6;

export function MyPhotosScreen() {
  const { user, updateUser } = useAuth();
  const { bgGradient, accentColor, t } = useAppTheme();

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const gallery = await listMyPhotos();
      setPhotos(gallery);
    } catch {
      // best-effort
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  async function handlePickMainPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("İzin Gerekli", "Galeriye erişim izni vermen gerekiyor.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const fileName = uri.split("/").pop() || "profile.jpg";

        setIsUploadingMain(true);
        const updatedUser = await uploadProfilePhoto(uri, fileName);
        updateUser(updatedUser);
        Alert.alert("Başarılı", "Ana profil fotoğrafın güncellendi!");
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf yüklenirken bir sorun oluştu.");
    } finally {
      setIsUploadingMain(false);
    }
  }

  async function handleAddGalleryPhoto(index: number) {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("İzin Gerekli", "Galeriye erişim izni vermen gerekiyor.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const fileName = uri.split("/").pop() || `gallery_${index}.jpg`;

        setUploadingSlot(index);
        const newPhoto = await uploadGalleryPhoto(uri, fileName);
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf galeriye eklenirken bir sorun oluştu.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function handleDeletePhoto(photoId: number) {
    Alert.alert("Fotoğrafı Sil", "Bu fotoğrafı galerinden silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGalleryPhoto(photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
          } catch {
            Alert.alert("Hata", "Fotoğraf silinemedi.");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: bgGradient[0] }]}
      contentContainerStyle={styles.content}
    >
      {/* Main Profile Photo Section */}
      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>Ana Profil Fotoğrafı</Text>

        <View style={styles.mainAvatarRow}>
          <Avatar
            name={user?.display_name ?? "?"}
            photoUrl={user?.photo_url}
            isVerified={user?.is_verified}
            size={90}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.mainPhotoTitle}>{user?.display_name}</Text>
            <Text style={styles.mainPhotoSub}>
              Diğer kankalar seni ilk olarak bu fotoğrafla görecek.
            </Text>
            <Pressable
              style={[styles.changeMainBtn, { backgroundColor: `${accentColor}15`, borderColor: accentColor }]}
              onPress={handlePickMainPhoto}
              disabled={isUploadingMain}
            >
              {isUploadingMain ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <>
                  <Feather name="camera" size={14} color={accentColor} />
                  <Text style={[styles.changeMainBtnText, { color: accentColor }]}>
                    Fotoğrafı Değiştir
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Gallery Grid Section */}
      <View style={styles.card}>
        <View style={styles.galleryHeader}>
          <Text style={typeScale.eyebrow}>Fotoğraf Galerim ({photos.length}/{MAX_PHOTOS})</Text>
          <Text style={styles.galleryInfoText}>En az 2 fotoğraf eklemen eşleşme şansını artırır.</Text>
        </View>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
              const photo = photos[index];
              const isUploadingThis = uploadingSlot === index;

              if (photo) {
                const resolvedUri = resolvePhotoUrl(photo.photo_url);
                return (
                  <View key={photo.id} style={styles.photoBox}>
                    <Pressable onPress={() => setLightboxPhoto(photo.photo_url)}>
                      {resolvedUri ? (
                        <Image source={{ uri: resolvedUri }} style={styles.photoImage} />
                      ) : (
                        <View style={styles.emptyBox}>
                          <Feather name="image" size={24} color={colors.textSecondary} />
                        </View>
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeletePhoto(photo.id)}
                    >
                      <Feather name="trash-2" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                );
              }

              return (
                <Pressable
                  key={`empty_${index}`}
                  style={styles.emptyBox}
                  onPress={() => handleAddGalleryPhoto(index)}
                  disabled={isUploadingThis}
                >
                  {isUploadingThis ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <>
                      <Feather name="plus-circle" size={24} color={accentColor} />
                      <Text style={styles.addText}>Ekle</Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <PhotoLightboxModal
        visible={lightboxPhoto !== null}
        photoUrl={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  mainAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  mainPhotoTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  mainPhotoSub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  changeMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  changeMainBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
  },
  galleryHeader: {
    gap: 2,
  },
  galleryInfoText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  loaderBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  photoBox: {
    width: "30%",
    aspectRatio: 0.8,
    borderRadius: radius.card,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    width: "30%",
    aspectRatio: 0.8,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
  },
  addText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

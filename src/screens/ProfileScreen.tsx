import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { IconSectionHeader } from "../components/ui/IconSectionHeader";
import { ProfileCompletionCard } from "../components/profile/ProfileCompletionCard";
import { QuickFieldEditModal } from "../components/profile/QuickFieldEditModal";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import type { FieldKey } from "../utils/profileCompletion";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { hasValidCoordinates, resolveCityDistrict } from "../utils/location";
import { LANGUAGES_LIST } from "../constants/languages";
import { getInterestLabel } from "../constants/interests";
import { getHobbyLabel } from "../constants/hobbies";
import { formatEventDate, formatMemberSince, isNewMember } from "../utils/date";
import { listMyAttendingEvents } from "../api/events";
import * as ImagePicker from "expo-image-picker";
import { LocationPickerModal } from "../components/overlays/LocationPickerModal";
import { TrustScoreInfoModal } from "../components/overlays/TrustScoreInfoModal";
import type { GeocodingResult } from "../api/geocoding";
import { activateBoost, getCurrentUser, updateCurrentUser, uploadProfilePhoto } from "../api/users";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type ProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "Profile">;

const ZODIAC_SIGNS = [
  { key: "Koç", tr: "Koç ♈", en: "Aries ♈" },
  { key: "Boğa", tr: "Boğa ♉", en: "Taurus ♉" },
  { key: "İkizler", tr: "İkizler ♊", en: "Gemini ♊" },
  { key: "Yengeç", tr: "Yengeç ♋", en: "Cancer ♋" },
  { key: "Aslan", tr: "Aslan ♌", en: "Leo ♌" },
  { key: "Başak", tr: "Başak ♍", en: "Virgo ♍" },
  { key: "Terazi", tr: "Terazi ♎", en: "Libra ♎" },
  { key: "Akrep", tr: "Akrep ♏", en: "Scorpio ♏" },
  { key: "Yay", tr: "Yay ♐", en: "Sagittarius ♐" },
  { key: "Oğlak", tr: "Oğlak ♑", en: "Capricorn ♑" },
  { key: "Kova", tr: "Kova ♒", en: "Aquarius ♒" },
  { key: "Balık", tr: "Balık ♓", en: "Pisces ♓" },
];

function getZodiacLabel(key: string, language: string): string {
  const item = ZODIAC_SIGNS.find((z) => z.key === key);
  if (!item) return key;
  return language === "en" ? item.en : item.tr;
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, signOut, isPremium, updateUser, refreshSubscription } = useAuth();
  const { t, accentColor, bgGradient, language } = useAppTheme();
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isAttendingExpanded, setIsAttendingExpanded] = useState(false);
  const [isPastExpanded, setIsPastExpanded] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [quickEditKey, setQuickEditKey] = useState<FieldKey | null>(null);
  const [quickEditVisible, setQuickEditVisible] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ url: string; photos: string[] } | null>(null);
  const [trustInfoVisible, setTrustInfoVisible] = useState(false);

  async function handleLocationSelect(result: GeocodingResult) {
    try {
      const updated = await updateCurrentUser({
        latitude: result.latitude,
        longitude: result.longitude,
      });
      updateUser(updated);
      if (hasValidCoordinates(result.latitude, result.longitude)) {
        resolveCityDistrict(result.latitude, result.longitude).then(setLocationName);
      }
      Alert.alert(
        language === "en" ? "Location Updated" : "Konum Güncellendi",
        language === "en"
          ? "Your location has been updated successfully!"
          : "Anlık / sanal konumunuz başarıyla kaydedildi!"
      );
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Hata",
        language === "en" ? "Failed to update location." : "Konum güncellenemedi."
      );
    } finally {
      setLocationPickerVisible(false);
    }
  }



  async function runPickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        language === "en" ? "Permission Required" : "İzin Gerekli",
        language === "en"
          ? "Please grant gallery permission to update your profile photo."
          : "Profil fotoğrafını değiştirmek için galeri izni vermen gerekiyor."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setIsUploadingPhoto(true);
    const originalUser = user ? { ...user } : null;
    if (user) {
      updateUser({ ...user, photo_url: asset.uri });
    }

    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "profile.jpg";
      const updatedUser = await uploadProfilePhoto(asset.uri, fileName);
      if (updatedUser) {
        updateUser(updatedUser);
      }
      Alert.alert(
        language === "en" ? "Success" : "Başarılı",
        language === "en" ? "Profile photo updated successfully!" : "Profil fotoğrafın başarıyla güncellendi!"
      );
    } catch (err: any) {
      if (originalUser) {
        updateUser(originalUser);
      }
      const msg = err?.message || (language === "en" ? "Failed to update profile photo. Please try again." : "Profil fotoğrafı güncellenemedi. Lütfen tekrar dene.");
      Alert.alert(
        language === "en" ? "Upload Failed" : "Yükleme Başarısız",
        msg
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleOpenQuickEdit(key: FieldKey) {
    if (key === "photo" || key === "gallery") {
      navigation.navigate("MyPhotos");
    } else {
      setQuickEditKey(key);
      setQuickEditVisible(true);
    }
  }

  useFocusEffect(
    useCallback(() => {
      refreshSubscription().catch(() => {});
      getCurrentUser()
        .then((u) => {
          updateUser(u);
          if (hasValidCoordinates(u.latitude, u.longitude)) {
            resolveCityDistrict(u.latitude, u.longitude).then(setLocationName);
          }
        })
        .catch(() => {});


      if (user && hasValidCoordinates(user.latitude, user.longitude)) {
        resolveCityDistrict(user.latitude, user.longitude).then(setLocationName);
      }

      listMyAttendingEvents(true)
        .then(setAttendingEvents)
        .catch(() => {});

      listMyAttendingEvents(false)
        .then((all) => setPastEvents(all.filter((event) => new Date(event.starts_at) < new Date())))
        .catch(() => {});
    }, [])
  );

  async function handleBoostClick(): Promise<void> {
    if (!user) return;
    const isBoosted = user.boosted_until ? new Date(user.boosted_until).getTime() > Date.now() : false;
    if (isBoosted) {
      const remainingSecs = Math.max(0, Math.floor((new Date(user.boosted_until!).getTime() - Date.now()) / 1000));
      const mins = Math.floor(remainingSecs / 60);
      Alert.alert(
        language === "en" ? "Spotlight Active!" : "Spotlight Aktif!",
        language === "en"
          ? `Your profile is currently featured at top. Remaining time: ${mins} mins.`
          : `Profilin şu an öne çıkarılmış durumda. Kalan süre: ${mins} dakika.`
      );
      return;
    }

    if (user.boosts_balance && user.boosts_balance > 0) {
      Alert.alert(
        language === "en" ? "Activate Spotlight?" : "Spotlight Başlatılsın mı?",
        language === "en"
          ? `Use 1 Spotlight credit to feature your profile at top for 60 minutes. (Credits left: ${user.boosts_balance})`
          : `Mevcut Spotlight hakkından 1 adet kullanarak profilini 60 dakikalığına öne çıkar. (Kalan hak: ${user.boosts_balance} adet)`,
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: language === "en" ? "Activate" : "Başlat",
            onPress: async () => {
              try {
                const updatedUser = await activateBoost();
                updateUser(updatedUser);
                Alert.alert(
                  language === "en" ? "Spotlight Activated!" : "Spotlight Başlatıldı!",
                  language === "en" ? "Your profile has been moved to top list!" : "Profilin en üst sıraya taşındı!"
                );
              } catch {
                Alert.alert(
                  language === "en" ? "Error" : "Hata",
                  language === "en" ? "Could not activate Spotlight. Please try again." : "Spotlight başlatılamadı. Lütfen tekrar dene."
                );
              }
            }
          }
        ]
      );
    } else {
      navigation.navigate("Tabs", { screen: "Swipe", params: { openStore: true } });
    }
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[accentColor, "#9B7BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroDecorLarge} />
        <View style={styles.heroDecorSmall} />
        <View style={styles.avatarRing}>
          <Pressable
            onPress={() => {
              if (user?.photo_url) {
                setLightboxData({ url: user.photo_url, photos: [user.photo_url] });
              }
            }}
          >
            <Avatar name={user.display_name} photoUrl={user.photo_url} size={88} />
          </Pressable>

          <Pressable
            style={styles.cameraIconBadge}
            onPress={runPickPhoto}
            disabled={isUploadingPhoto}
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafı değiştir"
          >
            <Feather name="camera" size={14} color={colors.surface} />
          </Pressable>
        </View>
        <Text style={styles.heroName}>
          {user.display_name}
          {user.age ? `, ${user.age}` : ""}
        </Text>
        {locationName ? (
          <View style={styles.heroLocationRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroLocationText}>{locationName}</Text>
          </View>
        ) : null}
        <Text style={styles.heroEmail}>{user.email}</Text>
        <View style={styles.heroBadgeRow}>
          {isPremium ? <Badge label={language === "en" ? "Premium Member" : "Premium Üye"} variant="yellow" icon="⭐" /> : null}
          {user.is_verified || user.verification_status === "verified" ? (
            <Badge label={language === "en" ? "Verified Profile" : "Mavi Tik Onaylı"} variant="blue" icon="✓" />
          ) : null}
        </View>

        <Pressable style={styles.heroTrustScorePill} onPress={() => setTrustInfoVisible(true)}>
          <Feather name="shield" size={15} color={colors.surface} />
          <Text style={styles.heroTrustScoreText}>{t("trustScore")}: {user.trust_score}</Text>
          <Feather name="info" size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 4 }} />
        </Pressable>

        <View style={styles.heroMemberSinceRow}>
          <Feather name="calendar" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroMemberSinceText}>{formatMemberSince(user.created_at, language)}</Text>
          {isNewMember(user.created_at) ? (
            <View style={styles.newMemberBadgeInline}>
              <Text style={styles.newMemberBadgeText}>{t("newMember")}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {/* Profile Completion Bar */}
      <ProfileCompletionCard user={user} onPressFieldKey={handleOpenQuickEdit} />

      {hasValidCoordinates(user.latitude, user.longitude) ? (
        <Pressable style={[styles.card, styles.cardAccentBlue]} onPress={() => setLocationPickerVisible(true)}>
          <IconSectionHeader icon="map-pin" color="#2E7FC9" label={t("location")} />
          <Text style={styles.bio}>{locationName || (language === "en" ? "Location Saved" : "Konum Kaydedildi")}</Text>
        </Pressable>
      ) : null}

      {user.about_me_prompt ? (
        <Pressable style={[styles.card, styles.cardAccentPurple]} onPress={() => handleOpenQuickEdit("prompt")}>
          <IconSectionHeader icon="help-circle" color="#9B51E0" label={language === "en" ? "About Me Prompt" : "Soru & Cevap"} />
          <Text style={styles.bio}>"{user.about_me_prompt}"</Text>
        </Pressable>
      ) : null}

      {user.occupation || user.university || user.class_year ? (
        <Pressable style={[styles.card, styles.cardAccentBlue]} onPress={() => handleOpenQuickEdit("occupation")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="briefcase" color="#2E7FC9" label={t("occupation")} />
            {user.hidden_fields?.includes("occupation") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bio}>
            {[user.occupation, user.university, user.class_year].filter(Boolean).join(" • ")}
          </Text>
        </Pressable>
      ) : null}

      {user.looking_for ? (
        <Pressable style={[styles.card, styles.cardAccentYellow]} onPress={() => handleOpenQuickEdit("looking_for")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="target" color="#E0A800" label={language === "en" ? "Looking For" : "Aradığı İletişim"} />
            {user.hidden_fields?.includes("looking_for") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bio}>{user.looking_for}</Text>
        </Pressable>
      ) : null}

      {user.height ? (
        <Pressable style={[styles.card, styles.cardAccentBlue]} onPress={() => handleOpenQuickEdit("height")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="user" color="#2E7FC9" label={language === "en" ? "Height" : "Boy"} />
            {user.hidden_fields?.includes("height") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bio}>{user.height} cm</Text>
        </Pressable>
      ) : null}

      {user.zodiac_sign ? (
        <Pressable style={[styles.card, styles.cardAccentPurple]} onPress={() => handleOpenQuickEdit("zodiac")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="moon" color="#9B51E0" label={language === "en" ? "Zodiac Sign" : "Burç"} />
            {user.hidden_fields?.includes("zodiac_sign") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bio}>{getZodiacLabel(user.zodiac_sign, language)}</Text>
        </Pressable>
      ) : null}

      {user.languages_spoken && user.languages_spoken.length > 0 ? (
        <Pressable style={[styles.card, styles.cardAccentBlue]} onPress={() => handleOpenQuickEdit("languages")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="globe" color="#2FA88B" label={language === "en" ? "Languages Spoken" : "Bildiği Diller"} />
            {user.hidden_fields?.includes("languages_spoken") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {user.languages_spoken.map((code) => {
              const item = LANGUAGES_LIST.find((l) => l.code === code);
              return (
                <View key={code} style={styles.chip}>
                  <Text style={styles.chipText}>{item ? `${item.flag} ${language === "en" ? item.labelEn : item.label}` : code}</Text>
                </View>
              );
            })}
          </View>
        </Pressable>
      ) : null}

      {user.political_views || user.beliefs ? (
        <Pressable style={[styles.card, styles.cardAccentPurple]} onPress={() => handleOpenQuickEdit("worldview")}>
          <View style={styles.cardHeaderWithHidden}>
            <IconSectionHeader icon="compass" color="#9B51E0" label={language === "en" ? "Worldview & Beliefs" : "Dünya Görüşü & İnanç"} />
            {user.hidden_fields?.includes("political_views") || user.hidden_fields?.includes("beliefs") ? (
              <View style={styles.hiddenBadge}>
                <Feather name="eye-off" size={11} color={colors.textSecondary} />
                <Text style={styles.hiddenBadgeText}>{language === "en" ? "Hidden" : "Gizli"}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {user.political_views ? (
              <View style={[styles.chip, { backgroundColor: "#F3E8FF" }]}>
                <Text style={[styles.chipText, { color: "#9B51E0" }]}>{user.political_views}</Text>
              </View>
            ) : null}
            {user.beliefs ? (
              <View style={[styles.chip, { backgroundColor: "#F3E8FF" }]}>
                <Text style={[styles.chipText, { color: "#9B51E0" }]}>{user.beliefs}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {user.photos.length > 0 ? (
        <Pressable style={[styles.card, styles.cardAccentPink]} onPress={() => handleOpenQuickEdit("gallery")}>
          <IconSectionHeader icon="image" color="#D9427F" label={t("myPhotos")} />
          <FlatList
            data={user.photos}
            keyExtractor={(photo) => String(photo.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const galleryPhotos = user.photos.map((p) => p.photo_url).filter((u): u is string => Boolean(u));
              return (
                <Pressable onPress={() => setLightboxData({ url: item.photo_url, photos: galleryPhotos })}>
                  <Image source={{ uri: resolvePhotoUrl(item.photo_url) ?? undefined }} style={styles.galleryImage} contentFit="cover" cachePolicy="memory-disk" pointerEvents="none" />
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          />
        </Pressable>
      ) : null}

      {user.bio ? (
        <Pressable style={[styles.card, styles.cardAccentPurple]} onPress={() => handleOpenQuickEdit("bio")}>
          <IconSectionHeader icon="feather" color={colors.primary} label={t("aboutMe")} />
          <Text style={styles.bio}>{user.bio}</Text>
        </Pressable>
      ) : null}

      {user.hobbies && user.hobbies.length > 0 ? (
        <Pressable style={[styles.card, styles.cardAccentPurple]} onPress={() => handleOpenQuickEdit("hobbies")}>
          <IconSectionHeader icon="star" color="#8A2BE2" label={t("hobbies")} />
          <View style={styles.chipRow}>
            {user.hobbies.map((hobby) => (
              <View key={hobby} style={[styles.chip, { backgroundColor: "#F3E8FF" }]}>
                <Text style={[styles.chipText, { color: "#8A2BE2" }]}>{getHobbyLabel(hobby, language)}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}

      {user.interests.length > 0 ? (
        <Pressable style={[styles.card, styles.cardAccentYellow]} onPress={() => handleOpenQuickEdit("interests")}>
          <IconSectionHeader icon="heart" color="#E0A800" label={t("interests")} />
          <View style={styles.chipRow}>
            {user.interests.map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest, language)}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}

      {attendingEvents.length > 0 ? (
        <View style={[styles.card, styles.cardAccentGreen]}>
          <IconSectionHeader icon="calendar" color={colors.accentGreen} label={language === "en" ? `Attending Events (${attendingEvents.length})` : `Katılacağı Etkinlikler (${attendingEvents.length})`} />
          {(isAttendingExpanded ? attendingEvents : attendingEvents.slice(0, 2)).map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventRow}
              onPress={() => navigation.navigate("EventDetail", { eventId: event.id })}
              accessibilityRole="button"
              accessibilityLabel={event.title}
            >
              <View style={styles.eventRowLeft}>
                <View style={styles.eventIcon}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <View style={styles.eventTextColumn}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatEventDate(event.starts_at, language)}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
          {attendingEvents.length > 2 ? (
            <Pressable
              style={styles.expandPillBtn}
              onPress={() => setIsAttendingExpanded((prev) => !prev)}
            >
              <Text style={styles.expandPillText}>
                {isAttendingExpanded
                  ? (language === "en" ? "Show Less" : "Daha Az Göster")
                  : (language === "en" ? `Show All (${attendingEvents.length})` : `Tümünü Gör (${attendingEvents.length})`)}
              </Text>
              <Feather
                name={isAttendingExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {pastEvents.length > 0 ? (
        <View style={[styles.card, styles.cardAccentBlue]}>
          <IconSectionHeader icon="clock" color="#2E7FC9" label={`${t("pastEvents")} (${pastEvents.length})`} />
          {(isPastExpanded ? pastEvents : pastEvents.slice(0, 2)).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.eventRowLeft}>
                <View style={[styles.eventIcon, styles.eventIconPast]}>
                  <Feather name="calendar" size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.eventTextColumn}>
                  <Text style={[styles.eventTitle, styles.eventTitlePast]}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatEventDate(event.starts_at, language)}</Text>
                </View>
              </View>
            </View>
          ))}
          {pastEvents.length > 2 ? (
            <Pressable
              style={styles.expandPillBtn}
              onPress={() => setIsPastExpanded((prev) => !prev)}
            >
              <Text style={styles.expandPillText}>
                {isPastExpanded
                  ? (language === "en" ? "Show Less" : "Daha Az Göster")
                  : (language === "en" ? `Show All (${pastEvents.length})` : `Tümünü Gör (${pastEvents.length})`)}
              </Text>
              <Feather
                name={isPastExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionsCard}>
        <PrimaryButton label={t("editProfile")} onPress={() => navigation.navigate("EditProfile")} />
        <Pressable
          style={styles.actionRow}
          onPress={handleBoostClick}
          accessibilityRole="button"
          accessibilityLabel={t("spotlightBoost")}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIcon, styles.actionIconBoost]}>
              <Feather name="zap" size={16} color="#F1C40F" />
            </View>
            <View style={{ gap: 1 }}>
              <Text style={styles.actionLabel}>
                {user.boosted_until && new Date(user.boosted_until).getTime() > Date.now()
                  ? "Spotlight Active!"
                  : t("spotlightBoost")}
              </Text>
              <Text style={styles.actionSublabel}>
                {user.boosted_until && new Date(user.boosted_until).getTime() > Date.now()
                  ? "Currently top listed!"
                  : `${t("creditsLeft")}: ${user.boosts_balance ?? 0}`}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={styles.actionRow}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel={t("signOut")}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIcon, styles.actionIconDanger]}>
              <Feather name="log-out" size={16} color={colors.accentRed} />
            </View>
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>{t("signOut")}</Text>
          </View>
        </Pressable>
      </View>

      <QuickFieldEditModal
        visible={quickEditVisible}
        fieldKey={quickEditKey}
        user={user}
        onClose={() => setQuickEditVisible(false)}
        onSaved={() => {
          getCurrentUser().then(updateUser);
        }}
      />

      <PhotoLightboxModal
        visible={lightboxData !== null}
        photoUrl={lightboxData?.url}
        photos={lightboxData?.photos}
        onClose={() => setLightboxData(null)}
      />

      <LocationPickerModal
        visible={locationPickerVisible}
        onSelect={handleLocationSelect}
        onDismiss={() => setLocationPickerVisible(false)}
        initialLatitude={user?.latitude ?? undefined}
        initialLongitude={user?.longitude ?? undefined}
      />

      <TrustScoreInfoModal
        visible={trustInfoVisible}
        trustScore={user?.trust_score}
        onClose={() => setTrustInfoVisible(false)}
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
  heroCard: {
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.card,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
    position: "relative",
    ...shadows.card,
  },
  heroDecorLarge: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroDecorSmall: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: spacing.sm,
    position: "relative",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: colors.surface,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  heroLocationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.95)",
  },
  heroEmail: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  memberSince: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: spacing.xs,
  },
  heroTrustScorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "center",
  },
  heroTrustScoreText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.surface,
  },
  heroMemberSinceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  heroMemberSinceText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  newMemberBadgeInline: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 4,
  },
  newMemberBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderWithHidden: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hiddenBadge: {
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
  hiddenBadgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
    color: colors.textSecondary,
  },
  cardAccentBlue: {
    borderLeftColor: "#2E7FC9",
  },
  cardAccentPink: {
    borderLeftColor: "#D9427F",
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
  galleryImage: {
    width: 96,
    height: 96,
    borderRadius: radius.sm,
  },
  bio: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  eventRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginRight: spacing.sm,
  },
  eventTextColumn: {
    flex: 1,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  eventIconPast: {
    backgroundColor: colors.background,
  },
  eventTitlePast: {
    color: colors.textSecondary,
  },
  eventDate: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  expandPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  expandPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconDanger: {
    backgroundColor: "#FFE5E8",
  },
  actionLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  actionLabelDanger: {
    color: colors.accentRed,
  },
  actionIconBoost: {
    backgroundColor: "#F1C40F15",
  },
  actionSublabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

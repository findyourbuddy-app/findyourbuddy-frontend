import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { getInterestLabel } from "../constants/interests";
import { getHobbyLabel } from "../constants/hobbies";
import { formatMemberSince } from "../utils/date";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { apiClient } from "../api/client";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import type { User } from "../types";

import { Alert } from "../utils/alert";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { hasValidCoordinates, resolveCityDistrict } from "../utils/location";

export function ViewProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { bgGradient, accentColor, language } = useAppTheme();
  const [profile, setProfile] = useState<User | null>(user ?? null);
  const [isLoading, setIsLoading] = useState(!user);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  function openTrustInfo() {
    Alert.alert(
      language === "en" ? "What is Trust Score?" : "Güven Skoru Nedir?",
      language === "en"
        ? "• Default Score: 50 points\n• Event Check-in: +5 points for every confirmed GPS event check-in.\n• Blue Badge: +10 points for verifying your profile photo.\n• No-Show: -10 points if you join an event and don't show up.\n\nNote: Keeping a low score for long durations flags the account as a troll account."
        : "• Başlangıç Skorunuz: 50 Puan\n• Etkinlik Check-In: Katıldığınız her etkinlikte GPS konum doğrulaması ile +5 puan kazanırsınız.\n• Mavi Tık Doğrulaması: Profilinizi doğruladığınızda +10 puan eklenir.\n• Katılmama (No-Show): Katılacağım dediğiniz etkinliğe gitmezseniz -10 puan düşer.\n\nDüşük Skor Uyarısı: Skoru sürekli düşük kalan hesaplar kısıtlanır."
    );
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      apiClient.get<User>("/users/me")
        .then((res) => {
          if (active) {
            setProfile(res.data);
            if (hasValidCoordinates(res.data.latitude, res.data.longitude)) {
              resolveCityDistrict(res.data.latitude, res.data.longitude).then(setLocationName);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  if (isLoading || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: bgGradient[0] }]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  const [lightboxData, setLightboxData] = useState<{ url: string; photos: string[] } | null>(null);

  const profilePhoto = profile.photo_url || null;
  const galleryPhotos = (profile.photos || [])
    .map((p) => p.photo_url)
    .filter((u): u is string => Boolean(u));

  const photo1 = profilePhoto || galleryPhotos[0] || null;
  const displayedGalleryPhotos = galleryPhotos.filter((url) => url !== photo1);

  const photo2 = displayedGalleryPhotos[0] || null;
  const photo3 = displayedGalleryPhotos[1] || null;
  const remainingPhotos = displayedGalleryPhotos.slice(2);

  return (
    <>
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Photo 1 Hero Header */}
      <View style={styles.mainPhotoCard}>
        {photo1 ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { console.log("[DEBUG] photo1 pressed"); setLightboxData({ url: photo1, photos: galleryPhotos }); }}>
            <Image source={{ uri: resolvePhotoUrl(photo1) ?? undefined }} style={styles.fullImage} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Avatar name={profile.display_name} photoUrl={null} size={96} />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.photoGradient}
          pointerEvents="box-none"
        >
          <View style={styles.nameRow}>
            <Text style={styles.heroName}>
              {profile.display_name}
              {profile.age ? `, ${profile.age}` : ""}
            </Text>
            {profile.is_verified || profile.verification_status === "verified" ? (
              <Feather name="check-circle" size={20} color="#1DA1F2" style={{ marginLeft: 6 }} />
            ) : profile.verification_status === "pending" ? (
              <Feather name="clock" size={18} color="#FFD15C" style={{ marginLeft: 6 }} />
            ) : null}
          </View>

          {locationName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                {locationName}
              </Text>
            </View>
          ) : null}

          <View style={styles.badgeRow}>
            <Pressable style={styles.trustBadge} onPress={openTrustInfo}>
              <Feather name="shield" size={12} color={colors.surface} />
              <Text style={styles.trustText}>{profile.trust_score || 50} Güven Skoru</Text>
            </Pressable>
            {profile.zodiac_sign && !profile.hidden_fields?.includes("zodiac_sign") ? (
              <View style={styles.trustBadge}>
                <Text style={styles.trustText}>{profile.zodiac_sign}</Text>
              </View>
            ) : null}
            {profile.height && !profile.hidden_fields?.includes("height") ? (
              <View style={styles.trustBadge}>
                <Text style={styles.trustText}>{profile.height} cm</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.memberSince}>{formatMemberSince(profile.created_at)}</Text>
        </LinearGradient>
      </View>

      {/* Verbal Card 1: Bio, Prompt & Voice Note */}
      {(profile.bio || profile.about_me_prompt || profile.voice_note_url) ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Hakkımda & Detaylar</Text>
          </View>

          {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

          {profile.about_me_prompt ? (
            <View style={styles.promptBox}>
              <Text style={styles.promptQuestion}>Beni yakından tanımak istersen:</Text>
              <Text style={styles.promptAnswer}>“{profile.about_me_prompt}”</Text>
            </View>
          ) : null}

          <Pressable
            style={{ marginTop: spacing.xs }}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs }}>
              <Text style={styles.promptQuestion}>Ses Tanıtımı</Text>
              <Text style={{ fontSize: 12, color: colors.primary, fontFamily: fontFamily.bodySemiBold }}>
                {profile.voice_note_url ? (language === "en" ? "Edit" : "Düzenle") : (language === "en" ? "+ Add Voice" : "+ Ses Ekle")}
              </Text>
            </View>
            {profile.voice_note_url ? (
              <VoiceNotePlayer audioUrl={resolvePhotoUrl(profile.voice_note_url)} />
            ) : (
              <View style={styles.emptyVoiceBox}>
                <Feather name="mic" size={18} color={colors.primary} />
                <Text style={styles.emptyVoiceText}>
                  {language === "en" ? "Tap to record your voice introduction" : "Ses tanıtımını kaydetmek için dokun"}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* Interspersed Photo 2 Card */}
      {photo2 ? (
        <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: photo2, photos: galleryPhotos })}>
          <Image source={{ uri: resolvePhotoUrl(photo2) ?? undefined }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ) : null}

      {/* Verbal Card 2: Hobilerim & Yapmak İstediğim Aktiviteler */}
      {(profile.hobbies && profile.hobbies.length > 0) || (profile.interests && profile.interests.length > 0) ? (
        <View style={styles.card}>
          {profile.hobbies && profile.hobbies.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <View style={styles.cardHeader}>
                <Feather name="heart" size={18} color="#8A2BE2" />
                <Text style={[styles.cardTitle, { color: "#8A2BE2" }]}>Hobilerim</Text>
              </View>
              <View style={styles.chipRow}>
                {profile.hobbies.map((hobby) => (
                  <View key={hobby} style={styles.hobbyChip}>
                    <Text style={styles.hobbyChipText}>{getHobbyLabel(hobby)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile.interests && profile.interests.length > 0 ? (
            <View style={{ gap: spacing.xs, marginTop: profile.hobbies?.length ? spacing.md : 0 }}>
              <View style={styles.cardHeader}>
                <Feather name="activity" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Yapmak İstediğim Aktiviteler</Text>
              </View>
              <View style={styles.chipRow}>
                {profile.interests.map((interest) => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText}>{getInterestLabel(interest)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Interspersed Photo 3 Card */}
      {photo3 ? (
        <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: photo3, photos: galleryPhotos })}>
          <Image source={{ uri: resolvePhotoUrl(photo3) ?? undefined }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ) : null}

      {/* Verbal Card 3: Kariyer & Okul & Beklentiler */}
      {((profile.occupation && !profile.hidden_fields?.includes("occupation")) ||
        (profile.university && !profile.hidden_fields?.includes("university")) ||
        (profile.class_year && !profile.hidden_fields?.includes("class_year")) ||
        (profile.looking_for && !profile.hidden_fields?.includes("looking_for")) ||
        (profile.languages_spoken && profile.languages_spoken.length > 0 && !profile.hidden_fields?.includes("languages_spoken"))) ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="briefcase" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Kariyer, Eğitim & İletişim</Text>
          </View>

          {profile.occupation && !profile.hidden_fields?.includes("occupation") ? (
            <View style={styles.infoRow}>
              <Feather name="briefcase" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.occupation}</Text>
            </View>
          ) : null}

          {profile.university && !profile.hidden_fields?.includes("university") ? (
            <View style={styles.infoRow}>
              <Feather name="book-open" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.university}</Text>
            </View>
          ) : null}

          {profile.class_year && !profile.hidden_fields?.includes("class_year") ? (
            <View style={styles.infoRow}>
              <Feather name="award" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.class_year}</Text>
            </View>
          ) : null}

          {profile.looking_for && !profile.hidden_fields?.includes("looking_for") ? (
            <View style={styles.infoRow}>
              <Feather name="target" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Ne Arıyor: {profile.looking_for}</Text>
            </View>
          ) : null}

          {profile.languages_spoken && profile.languages_spoken.length > 0 && !profile.hidden_fields?.includes("languages_spoken") ? (
            <View style={styles.infoRow}>
              <Feather name="globe" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Bildiği Diller: {profile.languages_spoken.join(", ")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Verbal Card 4: Dünya Görüşü & Kişisel Tercihler */}
      {((profile.gender && !profile.hidden_fields?.includes("gender")) ||
        (profile.political_views && !profile.hidden_fields?.includes("political_views")) ||
        (profile.beliefs && !profile.hidden_fields?.includes("beliefs"))) ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="compass" size={18} color="#9B51E0" />
            <Text style={[styles.cardTitle, { color: "#9B51E0" }]}>Dünya Görüşü & Tercihler</Text>
          </View>

          {profile.gender && !profile.hidden_fields?.includes("gender") ? (
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Cinsiyet: {profile.gender}</Text>
            </View>
          ) : null}

          {profile.political_views && !profile.hidden_fields?.includes("political_views") ? (
            <View style={styles.infoRow}>
              <Feather name="compass" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Siyasi Görüş: {profile.political_views}</Text>
            </View>
          ) : null}

          {profile.beliefs && !profile.hidden_fields?.includes("beliefs") ? (
            <View style={styles.infoRow}>
              <Feather name="sun" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>İnanç: {profile.beliefs}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Remaining Photos Interspersed */}
      {remainingPhotos.map((uri, idx) => (
        <Pressable key={idx} style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: uri, photos: galleryPhotos })}>
          <Image source={{ uri: resolvePhotoUrl(uri) ?? undefined }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ))}
    </ScrollView>

    <PhotoLightboxModal
      visible={lightboxData !== null}
      photoUrl={lightboxData?.url}
      photos={lightboxData?.photos}
      onClose={() => setLightboxData(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 60,
  },
  mainPhotoCard: {
    height: 380,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
    justifyContent: "flex-end",
    ...shadows.card,
  },
  fullImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  photoGradient: {
    padding: spacing.lg,
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 24,
    color: colors.surface,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 4,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  trustText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.surface,
  },
  memberSince: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bioText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  promptBox: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  promptQuestion: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  promptAnswer: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 2,
  },
  voicePlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  voicePlayerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voiceText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  emptyVoiceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyVoiceText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  interspersedPhotoCard: {
    height: 340,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  hobbyChip: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  hobbyChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "#8A2BE2",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
});

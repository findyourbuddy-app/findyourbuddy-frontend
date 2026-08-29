import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { getInterestLabel } from "../constants/interests";
import { getHobbyLabel } from "../constants/hobbies";
import { getUserUpcomingEvents } from "../api/events";
import { getUserById } from "../api/users";
import { formatEventDate, formatMemberSince, isNewMember } from "../utils/date";
import { getCategoryMeta } from "../constants/categories";
import type { EventPublicSummary } from "../types";
import { hasValidCoordinates, resolveCityDistrict } from "../utils/location";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import { resolvePhotoUrl } from "../components/ui/Avatar";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import { TrustScoreInfoModal } from "../components/overlays/TrustScoreInfoModal";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useAppTheme } from "../context/ThemeContext";

type Props = NativeStackScreenProps<MainStackParamList, "CandidateProfile">;

export function CandidateProfileScreen({ route }: Props) {
  const { candidate } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { bgGradient, language } = useAppTheme();
  const [profile, setProfile] = useState(candidate);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [trustInfoVisible, setTrustInfoVisible] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventPublicSummary[]>([]);

  useEffect(() => {
    setProfile(candidate);
    let cancelled = false;

    // Prefetch candidate primary photo & existing photos immediately so they render in 0ms
    if (candidate.photo_url) {
      const url = resolvePhotoUrl(candidate.photo_url);
      if (url) Image.prefetch(url).catch(() => {});
    }
    candidate.photos?.forEach((p) => {
      const url = resolvePhotoUrl(p.photo_url);
      if (url) Image.prefetch(url).catch(() => {});
    });

    // Fire independently -- the profile fields (bio, voice note, interests...)
    // must not wait for the slower upcoming-events call before they render.
    getUserById(candidate.id)
      .then((fullUser) => {
        if (cancelled || !fullUser) return;
        setProfile((prev) => ({ ...prev, ...fullUser }));
        if (fullUser.photo_url) {
          const url = resolvePhotoUrl(fullUser.photo_url);
          if (url) Image.prefetch(url).catch(() => {});
        }
        fullUser.photos?.forEach((p: any) => {
          const url = resolvePhotoUrl(p.photo_url);
          if (url) Image.prefetch(url).catch(() => {});
        });
      })
      .catch(() => {});

    getUserUpcomingEvents(candidate.id)
      .then((events) => {
        if (!cancelled) setUpcomingEvents(events);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [candidate]);

  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidCoordinates(profile.latitude, profile.longitude)) {
      resolveCityDistrict(profile.latitude, profile.longitude).then(setLocationName);
    }
  }, [profile.latitude, profile.longitude]);

  const [lightboxData, setLightboxData] = useState<{ url: string; photos: string[] } | null>(null);

  // Separate profile photo (avatar) from gallery photos category
  const profilePhoto = profile.photo_url || null;
  const galleryPhotos: string[] = (profile.photos || [])
    .map((p) => p.photo_url)
    .filter((u): u is string => Boolean(u));

  const photo1 = profilePhoto || galleryPhotos[0] || null;
  const displayedGalleryPhotos = galleryPhotos.filter((url) => url !== photo1);

  const photo2 = displayedGalleryPhotos[0] || null;
  const photo3 = displayedGalleryPhotos[1] || null;
  const remainingPhotos = displayedGalleryPhotos.slice(2);

  return (
    <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Main Photo 1 Hero with overlay */}
        <View style={styles.mainPhotoCard}>
          {photo1 ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightboxData({ url: photo1, photos: galleryPhotos })}>
              <Image source={{ uri: resolvePhotoUrl(photo1) ?? undefined }} style={styles.fullImage} contentFit="cover" cachePolicy="memory-disk" pointerEvents="none" />
            </Pressable>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={64} color={colors.textSecondary} />
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
                {!profile.hidden_fields?.includes("age") && profile.age ? `, ${profile.age}` : ""}
              </Text>
              {profile.is_verified || profile.verification_status === "verified" ? (
                <Feather name="check-circle" size={20} color="#1DA1F2" style={{ marginLeft: 6 }} />
              ) : null}
            </View>

            {!profile.hidden_fields?.includes("location") && locationName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                  {locationName}
                </Text>
              </View>
            ) : null}

            <View style={styles.badgeRow}>
              {profile.trust_score > 0 ? (
                <Pressable style={styles.trustBadge} onPress={() => setTrustInfoVisible(true)}>
                  <Feather name="shield" size={13} color={colors.surface} />
                  <Text style={styles.trustText}>
                    Güven Skoru: {profile.trust_score}
                  </Text>
                  <Feather name="info" size={11} color="rgba(255,255,255,0.85)" style={{ marginLeft: 3 }} />
                </Pressable>
              ) : null}
              {!profile.hidden_fields?.includes("zodiac_sign") && profile.zodiac_sign ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>{profile.zodiac_sign}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroMemberSinceRow}>
              <Feather name="calendar" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMemberSinceText}>{formatMemberSince(profile.created_at)}</Text>
              {isNewMember(profile.created_at) ? (
                <View style={styles.newMemberBadgeInline}>
                  <Text style={styles.newMemberBadgeText}>Yeni Üye</Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>

        {/* SECTION 2: Verbal Card 1 - Bio & Prompts & Voice */}
        {((profile.bio && !profile.hidden_fields?.includes("bio")) ||
          (profile.about_me_prompt && !profile.hidden_fields?.includes("about_me_prompt")) ||
          (profile.voice_note_url && !profile.hidden_fields?.includes("voice_note"))) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Hakkında & Detaylar</Text>
            </View>

            {profile.bio && !profile.hidden_fields?.includes("bio") ? (
              <Text style={styles.bioText}>{profile.bio}</Text>
            ) : null}

            {profile.about_me_prompt && !profile.hidden_fields?.includes("about_me_prompt") ? (
              <View style={styles.promptBox}>
                <Text style={styles.promptQuestion}>Beni yakından tanımak istersen:</Text>
                <Text style={styles.promptAnswer}>“{profile.about_me_prompt}”</Text>
              </View>
            ) : null}

            {profile.voice_note_url && !profile.hidden_fields?.includes("voice_note") ? (
              <View style={{ marginTop: spacing.xs }}>
                <Text style={[styles.promptQuestion, { marginBottom: spacing.xs }]}>
                  Ses Tanıtımı
                </Text>
                <VoiceNotePlayer audioUrl={resolvePhotoUrl(profile.voice_note_url)} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Upcoming/created events -- shown so buddies can see shared plans, not just a bio */}
        {upcomingEvents.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="calendar" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>
                {language === "en" ? "Going To" : "Katılacağı Etkinlikler"}
              </Text>
            </View>
            {upcomingEvents.map((event) => {
              const category = getCategoryMeta(event.category, language);
              return (
                <Pressable
                  key={event.id}
                  style={styles.eventRow}
                  onPress={() => navigation.navigate("EventDetail", { eventId: event.id, initialEvent: event as any })}
                  accessibilityRole="button"
                  accessibilityLabel={event.title}
                >
                  <View style={styles.eventIcon}>
                    <Feather name={category.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.eventDate}>{formatEventDate(event.starts_at, language)} · {event.location_name}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* SECTION 3: Interspersed Photo 2 Card */}
        {photo2 ? (
          <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: photo2, photos: galleryPhotos })}>
            <Image source={{ uri: resolvePhotoUrl(photo2) ?? undefined }} style={styles.fullImage} contentFit="cover" cachePolicy="memory-disk" pointerEvents="none" />
          </Pressable>
        ) : null}

        {/* SECTION 4: Verbal Card 2 - Hobilerim & Yapmak İstediğim Aktiviteler */}
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

        {/* SECTION 5: Interspersed Photo 3 Card */}
        {photo3 ? (
          <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: photo3, photos: galleryPhotos })}>
            <Image source={{ uri: resolvePhotoUrl(photo3) ?? undefined }} style={styles.fullImage} contentFit="cover" cachePolicy="memory-disk" pointerEvents="none" />
          </Pressable>
        ) : null}

        {/* SECTION 6: Verbal Card 3 - Career, University & Expectations */}
        {((profile.occupation && !profile.hidden_fields?.includes("occupation")) ||
          (profile.university && !profile.hidden_fields?.includes("university")) ||
          (profile.class_year && !profile.hidden_fields?.includes("class_year")) ||
          (profile.looking_for && !profile.hidden_fields?.includes("looking_for")) ||
          (profile.languages_spoken && profile.languages_spoken.length > 0 && !profile.hidden_fields?.includes("languages_spoken"))) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="briefcase" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>
                {language === "en" ? "Career, Education & Intention" : "Kariyer, Eğitim & Arkadaşlık İlişkisi"}
              </Text>
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
                <Text style={styles.infoText}>
                  {language === "en" ? "Looking for: " : "Aradığı Arkadaşlık İlişkisi: "}
                  {profile.looking_for}
                </Text>
              </View>
            ) : null}

            {candidate.languages_spoken && candidate.languages_spoken.length > 0 && !candidate.hidden_fields?.includes("languages_spoken") ? (
              <View style={styles.infoRow}>
                <Feather name="globe" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>Bildiği Diller: {candidate.languages_spoken.join(", ")}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 7: Verbal Card 4 - Worldview & Preferences */}
        {((candidate.gender && !candidate.hidden_fields?.includes("gender")) ||
          (candidate.political_views && !candidate.hidden_fields?.includes("political_views")) ||
          (candidate.beliefs && !candidate.hidden_fields?.includes("beliefs"))) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="compass" size={18} color="#9B51E0" />
              <Text style={[styles.cardTitle, { color: "#9B51E0" }]}>Dünya Görüşü & Tercihler</Text>
            </View>

            {candidate.gender && !candidate.hidden_fields?.includes("gender") ? (
              <View style={styles.infoRow}>
                <Feather name="user" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>Cinsiyet: {candidate.gender}</Text>
              </View>
            ) : null}

            {candidate.political_views && !candidate.hidden_fields?.includes("political_views") ? (
              <View style={styles.infoRow}>
                <Feather name="compass" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>Siyasi Görüş: {candidate.political_views}</Text>
              </View>
            ) : null}

            {candidate.beliefs && !candidate.hidden_fields?.includes("beliefs") ? (
              <View style={styles.infoRow}>
                <Feather name="sun" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>İnanç: {candidate.beliefs}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 7: Remaining Photos Interspersed */}
        {remainingPhotos.map((uri, idx) => (
          <Pressable key={idx} style={styles.interspersedPhotoCard} onPress={() => setLightboxData({ url: uri, photos: galleryPhotos })}>
            <Image source={{ uri: resolvePhotoUrl(uri) ?? undefined }} style={styles.fullImage} contentFit="cover" cachePolicy="memory-disk" pointerEvents="none" />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoLightboxModal
        visible={lightboxData !== null}
        photoUrl={lightboxData?.url}
        photos={lightboxData?.photos}
        onClose={() => setLightboxData(null)}
      />

      <TrustScoreInfoModal
        visible={trustInfoVisible}
        trustScore={profile.trust_score}
        onClose={() => setTrustInfoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  trustText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.surface,
  },
  heroMemberSinceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
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
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  eventDate: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
});


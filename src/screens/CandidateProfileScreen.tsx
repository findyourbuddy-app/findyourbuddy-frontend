import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useAppTheme } from "../context/ThemeContext";

type Props = NativeStackScreenProps<MainStackParamList, "CandidateProfile">;

export function CandidateProfileScreen({ route }: Props) {
  const { candidate, eventTitle, onExitGroupSwipe, onSwipeLeft, onSwipeRight, onSwipeUp } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { bgGradient, language } = useAppTheme();
  const [profile, setProfile] = useState(candidate);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventPublicSummary[]>([]);

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture intentional horizontal swipes (dx > 40 AND dx > dy * 2.0)
        // so vertical scrolling on the profile remains 100% smooth and never wiggles!
        return Math.abs(gestureState.dx) > 40 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.0;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.x.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 90) {
          Animated.timing(pan, { toValue: { x: 500, y: 0 }, duration: 180, useNativeDriver: false }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            act(onSwipeRight);
          });
        } else if (gestureState.dx < -90) {
          Animated.timing(pan, { toValue: { x: -500, y: 0 }, duration: 180, useNativeDriver: false }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            act(onSwipeLeft);
          });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    setProfile(candidate);
    getUserById(candidate.id)
      .then((fullUser) => {
        if (fullUser) {
          setProfile((prev) => ({ ...prev, ...fullUser }));
        }
      })
      .catch(() => {});
  }, [candidate.id]);

  async function act(action?: () => any): Promise<void> {
    if (action) {
      const nextCandidate = await action();
      if (nextCandidate) {
        setProfile(nextCandidate);
      } else {
        navigation.goBack();
      }
    }
  }

  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidCoordinates(profile.latitude, profile.longitude)) {
      resolveCityDistrict(profile.latitude, profile.longitude).then(setLocationName);
    }
  }, [profile.latitude, profile.longitude]);

  useEffect(() => {
    getUserUpcomingEvents(profile.id)
      .then(setUpcomingEvents)
      .catch(() => {
        // Best-effort; the section just stays hidden if this fails.
      });
  }, [profile.id]);

  // Extract all photos (main photo_url + photos array)
  const allPhotoUrls: string[] = [];
  if (profile.photo_url) {
    allPhotoUrls.push(profile.photo_url);
  }
  if (profile.photos && profile.photos.length > 0) {
    profile.photos.forEach((p) => {
      if (p.photo_url && !allPhotoUrls.includes(p.photo_url)) {
        allPhotoUrls.push(p.photo_url);
      }
    });
  }

  const photo1 = allPhotoUrls[0] || null;
  const photo2 = allPhotoUrls[1] || null;
  const photo3 = allPhotoUrls[2] || null;
  const remainingPhotos = allPhotoUrls.slice(3);

  return (
    <Animated.View style={[{ flex: 1 }, pan.getLayout()]} {...panResponder.panHandlers}>
      <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      {eventTitle ? (
        <View style={styles.groupSwipeHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupSwipeTag}>Grup Etkinliği Eşleşmesi</Text>
            <Text style={styles.groupSwipeTitle} numberOfLines={1}>
              {eventTitle}
            </Text>
          </View>
          <Pressable
            style={styles.exitGroupSwipeBtn}
            onPress={() => {
              if (onExitGroupSwipe) {
                onExitGroupSwipe();
              } else {
                navigation.goBack();
              }
            }}
          >
            <Feather name="log-out" size={14} color="#FFFFFF" />
            <Text style={styles.exitGroupSwipeBtnText}>Grup Eşleşmesinden Çık</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Main Photo 1 Hero with overlay */}
        <View style={styles.mainPhotoCard}>
          {photo1 ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightboxPhoto(photo1)}>
              <Image source={{ uri: resolvePhotoUrl(photo1) ?? undefined }} style={styles.fullImage} contentFit="cover" />
            </Pressable>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={64} color={colors.textSecondary} />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={styles.photoGradient}
          >
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>
                {profile.display_name}
                {profile.age ? `, ${profile.age}` : ""}
              </Text>
              {profile.is_verified || profile.verification_status === "verified" ? (
                <Feather name="check-circle" size={20} color="#1DA1F2" style={{ marginLeft: 6 }} />
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
              {profile.trust_score > 0 ? (
                <View style={styles.trustBadge}>
                  <Feather name="shield" size={12} color={colors.surface} />
                  <Text style={styles.trustText}>
                    {profile.trust_score} Onaylı Buluşma
                  </Text>
                </View>
              ) : null}
              {isNewMember(profile.created_at) ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>Yeni Üye</Text>
                </View>
              ) : null}
              {profile.zodiac_sign ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>{profile.zodiac_sign}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.memberSince}>{formatMemberSince(profile.created_at)}</Text>
          </LinearGradient>
        </View>

        {/* SECTION 2: Verbal Card 1 - Bio & Prompts & Voice */}
        {(profile.bio || profile.about_me_prompt || profile.voice_note_url) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Hakkında & Detaylar</Text>
            </View>

            {profile.bio ? (
              <Text style={styles.bioText}>{profile.bio}</Text>
            ) : null}

            {profile.about_me_prompt ? (
              <View style={styles.promptBox}>
                <Text style={styles.promptQuestion}>Beni yakından tanımak istersen:</Text>
                <Text style={styles.promptAnswer}>“{profile.about_me_prompt}”</Text>
              </View>
            ) : null}

            {profile.voice_note_url ? (
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
                  onPress={() => navigation.navigate("EventDetail", { eventId: event.id })}
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
          <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(photo2)}>
            <Image source={{ uri: resolvePhotoUrl(photo2) ?? undefined }} style={styles.fullImage} contentFit="cover" />
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
          <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(photo3)}>
            <Image source={{ uri: resolvePhotoUrl(photo3) ?? undefined }} style={styles.fullImage} contentFit="cover" />
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
          <Pressable key={idx} style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(uri)}>
            <Image source={{ uri: resolvePhotoUrl(uri) ?? undefined }} style={styles.fullImage} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoLightboxModal
        visible={lightboxPhoto !== null}
        photoUrl={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />

      {/* Floating Bottom Action Bar */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, styles.passButton]}
          onPress={() => act(onSwipeLeft)}
          accessibilityRole="button"
          accessibilityLabel="Geç"
        >
          <Feather name="x" size={24} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.superButton]}
          onPress={() => act(onSwipeUp)}
          accessibilityRole="button"
          accessibilityLabel="Süper beğen"
        >
          <Feather name="star" size={22} color={colors.surface} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => act(onSwipeRight)}
          accessibilityRole="button"
          accessibilityLabel="Beğen"
        >
          <Feather name="heart" size={24} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  </Animated.View>
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
    paddingBottom: 110,
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
  actionRow: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.sm + 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: radius.pill,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  passButton: {
    backgroundColor: colors.surface,
  },
  superButton: {
    backgroundColor: "#2E7FC9",
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
  groupSwipeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    zIndex: 10,
  },
  groupSwipeTag: {
    ...typeScale.caption,
    fontFamily: fontFamily.displayBold,
    color: colors.primary,
  },
  groupSwipeTitle: {
    ...typeScale.body,
    color: colors.textPrimary,
  },
  exitGroupSwipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentRed,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    gap: 4,
  },
  exitGroupSwipeBtnText: {
    ...typeScale.caption,
    fontFamily: fontFamily.displayBold,
    color: "#FFFFFF",
  },
});


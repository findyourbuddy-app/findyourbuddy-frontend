import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { getInterestLabel } from "../constants/interests";
import { getHobbyLabel } from "../constants/hobbies";
import { formatMemberSince, isNewMember } from "../utils/date";
import { hasValidCoordinates, resolveCityDistrict } from "../utils/location";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { useAppTheme } from "../context/ThemeContext";

type Props = NativeStackScreenProps<MainStackParamList, "CandidateProfile">;

export function CandidateProfileScreen({ route }: Props) {
  const { candidate, onSwipeLeft, onSwipeRight, onSwipeUp } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { bgGradient, language } = useAppTheme();

  function act(action: () => void): void {
    action();
    navigation.goBack();
  }

  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidCoordinates(candidate.latitude, candidate.longitude)) {
      resolveCityDistrict(candidate.latitude, candidate.longitude).then(setLocationName);
    }
  }, [candidate.latitude, candidate.longitude]);

  // Extract all photos (main photo_url + photos array)
  const allPhotoUrls: string[] = [];
  if (candidate.photo_url) {
    allPhotoUrls.push(candidate.photo_url);
  }
  if (candidate.photos && candidate.photos.length > 0) {
    candidate.photos.forEach((p) => {
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
    <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Main Photo 1 Hero with overlay */}
        <View style={styles.mainPhotoCard}>
          {photo1 ? (
            <Image source={{ uri: photo1 }} style={styles.fullImage} contentFit="cover" />
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
                {candidate.display_name}
                {candidate.age ? `, ${candidate.age}` : ""}
              </Text>
              {candidate.is_verified || candidate.verification_status === "verified" ? (
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
              {candidate.trust_score > 0 ? (
                <View style={styles.trustBadge}>
                  <Feather name="shield" size={12} color={colors.surface} />
                  <Text style={styles.trustText}>
                    {candidate.trust_score} Onaylı Buluşma
                  </Text>
                </View>
              ) : null}
              {isNewMember(candidate.created_at) ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>✨ Yeni Üye</Text>
                </View>
              ) : null}
              {candidate.zodiac_sign ? (
                <View style={styles.trustBadge}>
                  <Text style={styles.trustText}>{candidate.zodiac_sign}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.memberSince}>{formatMemberSince(candidate.created_at)}</Text>
          </LinearGradient>
        </View>

        {/* SECTION 2: Verbal Card 1 - Bio & Prompts & Voice */}
        {(candidate.bio || candidate.about_me_prompt || candidate.voice_note_url) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Hakkında & Detaylar</Text>
            </View>

            {candidate.bio ? (
              <Text style={styles.bioText}>{candidate.bio}</Text>
            ) : null}

            {candidate.about_me_prompt ? (
              <View style={styles.promptBox}>
                <Text style={styles.promptQuestion}>Beni yakından tanımak istersen:</Text>
                <Text style={styles.promptAnswer}>“{candidate.about_me_prompt}”</Text>
              </View>
            ) : null}

            {candidate.voice_note_url ? (
              <View style={{ marginTop: spacing.xs }}>
                <Text style={[styles.promptQuestion, { marginBottom: spacing.xs }]}>
                  Ses Tanıtımı 🎙️
                </Text>
                <VoiceNotePlayer audioUrl={candidate.voice_note_url} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 3: Interspersed Photo 2 Card */}
        {photo2 ? (
          <View style={styles.interspersedPhotoCard}>
            <Image source={{ uri: photo2 }} style={styles.fullImage} contentFit="cover" />
          </View>
        ) : null}

        {/* SECTION 4: Verbal Card 2 - Hobilerim & Yapmak İstediğim Aktiviteler */}
        {(candidate.hobbies && candidate.hobbies.length > 0) || (candidate.interests && candidate.interests.length > 0) ? (
          <View style={styles.card}>
            {candidate.hobbies && candidate.hobbies.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <View style={styles.cardHeader}>
                  <Feather name="heart" size={18} color="#8A2BE2" />
                  <Text style={[styles.cardTitle, { color: "#8A2BE2" }]}>Hobilerim (Max 4)</Text>
                </View>
                <View style={styles.chipRow}>
                  {candidate.hobbies.map((hobby) => (
                    <View key={hobby} style={styles.hobbyChip}>
                      <Text style={styles.hobbyChipText}>{getHobbyLabel(hobby)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {candidate.interests && candidate.interests.length > 0 ? (
              <View style={{ gap: spacing.xs, marginTop: candidate.hobbies?.length ? spacing.md : 0 }}>
                <View style={styles.cardHeader}>
                  <Feather name="activity" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Yapmak İstediğim Aktiviteler</Text>
                </View>
                <View style={styles.chipRow}>
                  {candidate.interests.map((interest) => (
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
          <View style={styles.interspersedPhotoCard}>
            <Image source={{ uri: photo3 }} style={styles.fullImage} contentFit="cover" />
          </View>
        ) : null}

        {/* SECTION 6: Verbal Card 3 - Career, University & Expectations */}
        {(candidate.occupation || candidate.university || candidate.looking_for) ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="briefcase" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Kariyer & Beklentiler</Text>
            </View>

            {candidate.occupation ? (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{candidate.occupation}</Text>
              </View>
            ) : null}

            {candidate.university ? (
              <View style={styles.infoRow}>
                <Feather name="book-open" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{candidate.university}</Text>
              </View>
            ) : null}

            {candidate.looking_for ? (
              <View style={styles.infoRow}>
                <Feather name="target" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>Ne Arıyor: {candidate.looking_for}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION 7: Remaining Photos Interspersed */}
        {remainingPhotos.map((uri, idx) => (
          <View key={idx} style={styles.interspersedPhotoCard}>
            <Image source={{ uri }} style={styles.fullImage} contentFit="cover" />
          </View>
        ))}
      </ScrollView>

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
  actionRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
});


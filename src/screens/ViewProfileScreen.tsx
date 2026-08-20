import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Avatar } from "../components/ui/Avatar";
import { getInterestLabel } from "../constants/interests";
import { getHobbyLabel } from "../constants/hobbies";
import { formatMemberSince } from "../utils/date";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { apiClient } from "../api/client";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import type { User } from "../types";

import { useAppTheme } from "../context/ThemeContext";
import { hasValidCoordinates, resolveCityDistrict } from "../utils/location";

export function ViewProfileScreen() {
  const { bgGradient, accentColor, language } = useAppTheme();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoading(true);
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

  // Extract all photo URLs
  const allPhotoUrls: string[] = [];
  if (profile.photo_url) {
    allPhotoUrls.push(profile.photo_url);
  }
  profile.photos.forEach((p) => {
    if (p.photo_url && !allPhotoUrls.includes(p.photo_url)) {
      allPhotoUrls.push(p.photo_url);
    }
  });

  const photo1 = allPhotoUrls[0];
  const photo2 = allPhotoUrls[1];
  const photo3 = allPhotoUrls[2];
  const remainingPhotos = allPhotoUrls.slice(3);

  return (
    <>
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Photo 1 Hero Header */}
      <View style={styles.mainPhotoCard}>
        {photo1 ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightboxPhoto(photo1)}>
            <Image source={{ uri: photo1 }} style={styles.fullImage} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Avatar name={profile.display_name} photoUrl={null} size={96} />
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
            {profile.trust_score > 0 ? (
              <View style={styles.trustBadge}>
                <Feather name="shield" size={12} color={colors.surface} />
                <Text style={styles.trustText}>{profile.trust_score} Onaylı Buluşma</Text>
              </View>
            ) : null}
            {profile.zodiac_sign && !profile.hidden_fields?.includes("zodiac_sign") ? (
              <View style={styles.trustBadge}>
                <Text style={styles.trustText}>{profile.zodiac_sign}</Text>
              </View>
            ) : null}
            {profile.height && !profile.hidden_fields?.includes("height") ? (
              <View style={styles.trustBadge}>
                <Text style={styles.trustText}>📏 {profile.height} cm</Text>
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

          {profile.voice_note_url ? (
            <View style={{ marginTop: spacing.xs }}>
              <Text style={[styles.promptQuestion, { marginBottom: spacing.xs }]}>
                Ses Tanıtımı 🎙️
              </Text>
              <VoiceNotePlayer audioUrl={profile.voice_note_url} />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Interspersed Photo 2 Card */}
      {photo2 ? (
        <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(photo2)}>
          <Image source={{ uri: photo2 }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ) : null}

      {/* Verbal Card 2: Hobilerim & Yapmak İstediğim Aktiviteler */}
      {(profile.hobbies && profile.hobbies.length > 0) || (profile.interests && profile.interests.length > 0) ? (
        <View style={styles.card}>
          {profile.hobbies && profile.hobbies.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <View style={styles.cardHeader}>
                <Feather name="heart" size={18} color="#8A2BE2" />
                <Text style={[styles.cardTitle, { color: "#8A2BE2" }]}>Hobilerim (Max 4)</Text>
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
        <Pressable style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(photo3)}>
          <Image source={{ uri: photo3 }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ) : null}

      {/* Verbal Card 3: Kariyer & Beklentiler */}
      {(profile.occupation || profile.university || profile.looking_for) ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="briefcase" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Kariyer & Beklentiler</Text>
          </View>

          {profile.occupation ? (
            <View style={styles.infoRow}>
              <Feather name="briefcase" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.occupation}</Text>
            </View>
          ) : null}

          {profile.university ? (
            <View style={styles.infoRow}>
              <Feather name="book-open" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.university}</Text>
            </View>
          ) : null}

          {profile.looking_for ? (
            <View style={styles.infoRow}>
              <Feather name="target" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Ne Arıyor: {profile.looking_for}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Remaining Photos Interspersed */}
      {remainingPhotos.map((uri, idx) => (
        <Pressable key={idx} style={styles.interspersedPhotoCard} onPress={() => setLightboxPhoto(uri)}>
          <Image source={{ uri }} style={styles.fullImage} contentFit="cover" />
        </Pressable>
      ))}
    </ScrollView>

    <PhotoLightboxModal
      visible={lightboxPhoto !== null}
      photoUrl={lightboxPhoto}
      onClose={() => setLightboxPhoto(null)}
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

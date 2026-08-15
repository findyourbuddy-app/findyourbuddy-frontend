import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Avatar } from "../components/ui/Avatar";
import { getInterestLabel } from "../constants/interests";
import { formatMemberSince } from "../utils/date";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { apiClient } from "../api/client";
import type { User } from "../types";

export function ViewProfileScreen() {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  function handlePlayVoice() {
    setIsPlayingVoice(!isPlayingVoice);
    if (!isPlayingVoice) {
      setTimeout(() => {
        setIsPlayingVoice(false);
      }, 5000);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoading(true);
      apiClient.get<User>("/users/me")
        .then((res) => {
          if (active) setProfile(res.data);
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.primary, "#9B7BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Avatar name={profile.display_name} photoUrl={profile.photo_url} size={96} />
        <View style={styles.nameRow}>
          <Text style={styles.heroName}>
            {profile.display_name}
            {profile.age ? `, ${profile.age}` : ""}
          </Text>
          {profile.verification_status === "verified" ? (
            <Feather name="check-circle" size={20} color="#20E290" style={{ marginLeft: spacing.xs, marginTop: spacing.sm }} />
          ) : profile.verification_status === "pending" ? (
            <Feather name="clock" size={18} color="#FFD15C" style={{ marginLeft: spacing.xs, marginTop: spacing.sm }} />
          ) : null}
        </View>

        <View style={styles.badgeRow}>
          {profile.trust_score > 0 ? (
            <View style={styles.trustBadge}>
              <Feather name="check-circle" size={13} color={colors.surface} />
              <Text style={styles.trustText}>
                {profile.trust_score} kişi buluştuğunu onayladı
              </Text>
            </View>
          ) : null}
          {profile.verification_status === "verified" ? (
            <View style={styles.trustBadge}>
              <Text style={styles.trustText}>✓ Doğrulanmış Üye</Text>
            </View>
          ) : profile.verification_status === "pending" ? (
            <View style={styles.trustBadge}>
              <Text style={styles.trustText}>⏳ Onay Bekliyor</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.memberSince}>{formatMemberSince(profile.created_at)}</Text>
      </LinearGradient>

      {/* University & Occupation */}
      {(profile.occupation || profile.university) ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Eğitim ve Meslek</Text>
          {profile.occupation ? (
            <View style={styles.row}>
              <Feather name="briefcase" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.occupation}</Text>
            </View>
          ) : null}
          {profile.university ? (
            <View style={styles.row}>
              <Feather name="book-open" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{profile.university}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Expectation & Zodiac */}
      {(profile.looking_for || profile.zodiac_sign) ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Kişisel Özellikler</Text>
          {profile.looking_for ? (
            <View style={styles.row}>
              <Feather name="target" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Beklenti: {profile.looking_for}</Text>
            </View>
          ) : null}
          {profile.zodiac_sign ? (
            <View style={styles.row}>
              <Feather name="compass" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>Burç: {profile.zodiac_sign}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Voice note intro */}
      {profile.voice_note_url ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Ses Tanıtımı 🎙️</Text>
          <Pressable
            style={[styles.voicePlayer, isPlayingVoice && styles.voicePlayerActive]}
            onPress={handlePlayVoice}
          >
            <Feather
              name={isPlayingVoice ? "pause-circle" : "play-circle"}
              size={28}
              color={isPlayingVoice ? colors.surface : colors.primary}
            />
            <Text
              style={[
                styles.voiceText,
                isPlayingVoice && { color: colors.surface }
              ]}
            >
              {isPlayingVoice ? "Ses Kaydı Oynatılıyor..." : "Ses Tanıtımını Dinle"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Photos */}
      {profile.photos.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Fotoğraflar</Text>
          <FlatList
            data={profile.photos}
            keyExtractor={(photo) => String(photo.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image source={{ uri: item.photo_url }} style={styles.galleryImage} />
            )}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          />
        </View>
      ) : null}

      {/* Bio */}
      {profile.bio ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Hakkımda</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* Profile Prompt */}
      {profile.about_me_prompt ? (
        <View style={styles.card}>
          <Text style={[typeScale.eyebrow, { color: colors.primary }]}>Eğlenceli Detay</Text>
          <Text style={styles.promptQuestion}>Beni yakından tanımak istersen:</Text>
          <Text style={styles.promptAnswer}>{profile.about_me_prompt}</Text>
        </View>
      ) : null}

      {/* Interests */}
      {profile.interests.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>İlgi Alanları</Text>
          <View style={styles.chipRow}>
            {profile.interests.map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
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
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: 60,
  },
  heroCard: {
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.card,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: colors.surface,
    marginTop: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  memberSince: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  trustText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: radius.sm,
  },
  bio: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  promptQuestion: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  promptAnswer: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
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
  voicePlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
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
});

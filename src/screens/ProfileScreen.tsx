import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { getInterestLabel } from "../constants/interests";
import { formatEventDate, formatMemberSince, isNewMember } from "../utils/date";
import { listMyAttendingEvents } from "../api/events";
import { activateBoost } from "../api/users";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type ProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "Profile">;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, signOut, isPremium, updateUser } = useAuth();
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);

  useFocusEffect(
    useCallback(() => {
      listMyAttendingEvents()
        .then(setAttendingEvents)
        .catch(() => {
          // Non-critical enhancement; profile still works without it.
        });
    }, [])
  );

  async function handleBoostClick(): Promise<void> {
    if (!user) return;
    const isBoosted = user.boosted_until ? new Date(user.boosted_until).getTime() > Date.now() : false;
    if (isBoosted) {
      const remainingSecs = Math.max(0, Math.floor((new Date(user.boosted_until!).getTime() - Date.now()) / 1000));
      const mins = Math.floor(remainingSecs / 60);
      Alert.alert("Spotlight Aktif! 🚀", `Profilin şu an öne çıkarılmış durumda. Kalan süre: ${mins} dakika.`);
      return;
    }

    if (user.boosts_balance && user.boosts_balance > 0) {
      Alert.alert(
        "Spotlight Başlatılsın mı?",
        `Mevcut Spotlight hakkından 1 adet kullanarak profilini 60 dakikalığına öne çıkar. (Kalan hak: ${user.boosts_balance} adet)`,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Başlat",
            onPress: async () => {
              try {
                const updatedUser = await activateBoost();
                updateUser(updatedUser);
                Alert.alert("Spotlight Baştalıldı! 🚀", "Profilin en üst sıraya taşındı!");
              } catch {
                Alert.alert("Hata", "Spotlight başlatılamadı. Lütfen tekrar dene.");
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        "Spotlight Hakkın Yok",
        "Spotlight başlatabilmek için kaydırma ekranındaki Buddy Mağazası'nı ziyaret ederek hak satın alabilirsin!",
        [{ text: "Tamam" }]
      );
    }
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.primary, "#9B7BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.avatarRing}>
          <Avatar name={user.display_name} photoUrl={user.photo_url} size={88} />
        </View>
        <Text style={styles.heroName}>
          {user.display_name}
          {user.age ? `, ${user.age}` : ""}
        </Text>
        <Text style={styles.heroEmail}>{user.email}</Text>
        <View style={styles.heroBadgeRow}>
          {isPremium ? <Badge label="Premium Üye" variant="yellow" icon="⭐" /> : null}
          {isNewMember(user.created_at) ? (
            <Badge label="Yeni Üye" variant="green" icon="✨" />
          ) : null}
        </View>
        <Text style={styles.memberSince}>{formatMemberSince(user.created_at)}</Text>
      </LinearGradient>

      {user.occupation ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Meslek</Text>
          <Text style={styles.bio}>{user.occupation}</Text>
        </View>
      ) : null}

      {user.photos.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Fotoğraflarım</Text>
          <FlatList
            data={user.photos}
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

      {user.bio ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Hakkında</Text>
          <Text style={styles.bio}>{user.bio}</Text>
        </View>
      ) : null}

      {user.interests.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>İlgi Alanları</Text>
          <View style={styles.chipRow}>
            {user.interests.map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {attendingEvents.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Katılacağı Etkinlikler</Text>
          {attendingEvents.map((event) => (
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
                <View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatEventDate(event.starts_at)}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsCard}>
        <PrimaryButton label="Profili Düzenle" onPress={() => navigation.navigate("EditProfile")} />
        <Pressable
          style={styles.actionRow}
          onPress={handleBoostClick}
          accessibilityRole="button"
          accessibilityLabel="Spotlight Öne Çıkar"
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIcon, styles.actionIconBoost]}>
              <Feather name="zap" size={16} color="#F1C40F" />
            </View>
            <View style={{ gap: 1 }}>
              <Text style={styles.actionLabel}>
                {user.boosted_until && new Date(user.boosted_until).getTime() > Date.now()
                  ? "Spotlight Aktif! 🚀"
                  : "Spotlight Öne Çıkar"}
              </Text>
              <Text style={styles.actionSublabel}>
                {user.boosted_until && new Date(user.boosted_until).getTime() > Date.now()
                  ? "Şu an en üst sıradasın!"
                  : `Mevcut Hak: ${user.boosts_balance ?? 0}`}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={styles.actionRow}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Çıkış Yap"
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIcon, styles.actionIconDanger]}>
              <Feather name="log-out" size={16} color={colors.accentRed} />
            </View>
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Çıkış Yap</Text>
          </View>
        </Pressable>
      </View>
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
    ...shadows.card,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: spacing.sm,
  },
  heroName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: colors.surface,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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

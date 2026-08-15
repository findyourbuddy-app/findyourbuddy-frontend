import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { getInterestLabel } from "../constants/interests";
import { formatMemberSince, isNewMember } from "../utils/date";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type ProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "Profile">;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, signOut, isPremium } = useAuth();

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

      <View style={styles.actionsCard}>
        <PrimaryButton label="Profili Düzenle" onPress={() => navigation.navigate("EditProfile")} />
        <Pressable
          style={styles.actionRow}
          onPress={() => navigation.navigate("Settings")}
          accessibilityRole="button"
          accessibilityLabel="Ayarlar"
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIcon}>
              <Feather name="settings" size={16} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Ayarlar</Text>
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
});

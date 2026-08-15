import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { getInterestLabel } from "../constants/interests";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "CandidateProfile">;

export function CandidateProfileScreen({ route }: Props) {
  const { candidate, onSwipeLeft, onSwipeRight, onSwipeUp } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  function act(action: () => void): void {
    action();
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.primary, "#9B7BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Avatar name={candidate.display_name} photoUrl={candidate.photo_url} size={96} />
        <Text style={styles.heroName}>
          {candidate.display_name}
          {candidate.age ? `, ${candidate.age}` : ""}
        </Text>
        {candidate.trust_score > 0 ? (
          <View style={styles.trustBadge}>
            <Feather name="check-circle" size={13} color={colors.surface} />
            <Text style={styles.trustText}>
              {candidate.trust_score} kişi gerçekten buluştuğunu onayladı
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {candidate.photos.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Fotoğraflar</Text>
          <FlatList
            data={candidate.photos}
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

      {candidate.bio ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>Hakkında</Text>
          <Text style={styles.bio}>{candidate.bio}</Text>
        </View>
      ) : null}

      {candidate.interests.length > 0 ? (
        <View style={styles.card}>
          <Text style={typeScale.eyebrow}>İlgi Alanları</Text>
          <View style={styles.chipRow}>
            {candidate.interests.map((interest) => (
              <View key={interest} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(interest)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, styles.passButton]}
          onPress={() => act(onSwipeLeft)}
          accessibilityRole="button"
          accessibilityLabel="Geç"
        >
          <Feather name="x" size={22} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.superButton]}
          onPress={() => act(onSwipeUp)}
          accessibilityRole="button"
          accessibilityLabel="Süper beğen"
        >
          <Feather name="star" size={20} color={colors.surface} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => act(onSwipeRight)}
          accessibilityRole="button"
          accessibilityLabel="Beğen"
        >
          <Feather name="heart" size={22} color={colors.surface} />
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
  heroName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: colors.surface,
    marginTop: spacing.sm,
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  likeButton: {
    backgroundColor: colors.primary,
  },
});

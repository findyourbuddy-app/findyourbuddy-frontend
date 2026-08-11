import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { getInterestLabel } from "../constants/interests";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type ProfileNavigationProp = NativeStackNavigationProp<MainStackParamList, "Profile">;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={user.display_name} photoUrl={user.photo_url} size={88} />
        <Text style={typeScale.h1}>{user.display_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

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

      <PrimaryButton label="Profili Düzenle" onPress={() => navigation.navigate("EditProfile")} />
      <PrimaryButton label="Çıkış Yap" onPress={signOut} variant="outline" />
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
  header: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  email: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
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
});

import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import axios from "axios";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "../components/ui/Avatar";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createSwipe, getIncomingLikes } from "../api/swipes";
import type { LikerResponse } from "../api/swipes";
import { createCheckoutSession } from "../api/subscriptions";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing } from "../theme";

import { useAppTheme } from "../context/ThemeContext";

function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return trimmed;
  return `${trimmed[0]}${"•".repeat(Math.max(3, Math.min(trimmed.length - 1, 6)))}`;
}

type LikesReceivedNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function LikesReceivedScreen() {
  const { isPremium } = useAuth();
  const { t, language, bgGradient, accentColor } = useAppTheme();
  const navigation = useNavigation<LikesReceivedNavigationProp>();
  const [likers, setLikers] = useState<LikerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const likersRef = useRef(likers);
  likersRef.current = likers;

  const loadLikers = useCallback(async () => {
    if (likersRef.current.length === 0) {
      setIsLoading(true);
    }
    try {
      const results = await getIncomingLikes();
      const seen = new Map<number, LikerResponse>();
      for (const item of results) {
        if (!seen.has(item.user.id)) {
          seen.set(item.user.id, item);
        }
      }
      setLikers(Array.from(seen.values()));
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 403) {
        Alert.alert(
          t("error"),
          t("couldNotLoadPleaseTry")
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadLikers();
    }, [loadLikers])
  );

  const handleLike = async (item: LikerResponse) => {
    if (!isPremium) {
      Alert.alert(
        t("premiumFeature"),
        t("upgradeToMatchDesc"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("upgradeToPremium"), onPress: handleUpgrade },
        ]
      );
      return;
    }

    const previousLikers = [...likers];
    setLikers((prev) => prev.filter((l) => l.user.id !== item.user.id));

    try {
      const result = await createSwipe({
        target_id: item.user.id,
        event_id: item.event_id,
        direction: "like",
      });
      if (result.match_id !== null) {
        Alert.alert(
          t("itsAMatch"),
          `${item.user.display_name} ${t("isYourNewBuddy")}`
        );
      }
    } catch (error) {
      setLikers(previousLikers);
      Alert.alert(
        t("error"),
        t("couldNotSaveLikePlease")
      );
    }
  };

  const handlePass = async (item: LikerResponse) => {
    if (!isPremium) {
      Alert.alert(
        t("premiumFeature"),
        t("upgradeToPassDesc"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("upgradeToPremium"), onPress: handleUpgrade },
        ]
      );
      return;
    }

    const previousLikers = [...likers];
    setLikers((prev) => prev.filter((l) => l.user.id !== item.user.id));

    try {
      await createSwipe({
        target_id: item.user.id,
        event_id: item.event_id,
        direction: "pass",
      });
    } catch (error) {
      setLikers(previousLikers);
      Alert.alert(
        t("error"),
        t("couldNotSaveActionPlease")
      );
    }
  };

  const handleViewProfile = (item: LikerResponse) => {
    if (!isPremium) {
      Alert.alert(
        t("premiumFeature"),
        t("upgradeToMatchDesc"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("upgradeToPremium"), onPress: handleUpgrade },
        ]
      );
      return;
    }
    navigation.navigate("CandidateProfile", { candidate: item.user });
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { checkout_url } = await createCheckoutSession();
      if (checkout_url) {
        Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ödeme Hatası", "Ödeme linki alınamadı.");
      }
    } catch {
      Alert.alert(
        "Ödeme Hatası",
        "Ödeme sayfası başlatılamadı. Lütfen sunucunun açık olduğundan emin ol."
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const renderHeader = () => {
    if (isLoading || likers.length === 0) return null;

    return (
      <View style={styles.headerContainer}>
        <Text style={styles.countText}>
          {t("peopleWhoLikedYou")}
          <Text style={styles.countNumber}>{likers.length}</Text>
          {t("str")}
        </Text>

        {!isPremium && (
          <View style={styles.premiumCard}>
            <View style={styles.premiumCardHeader}>
              <Feather name="star" size={20} color={colors.accentYellow} style={{ marginRight: spacing.xs }} />
              <Text style={styles.premiumCardTitle}>{t("premiumMembership")}</Text>
            </View>
            <Text style={styles.premiumCardBody}>
              {t("unblurPhotosAndMatchInstantly")}
            </Text>
            <PrimaryButton
              label={isUpgrading ? (t("loading")) : t("upgradeToPremium")}
              variant="accent"
              onPress={handleUpgrade}
              loading={isUpgrading}
            />
          </View>
        )}
      </View>
    );
  };

  if (isLoading && likers.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgGradient[0] }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
      contentContainerStyle={styles.list}
      data={likers}
      keyExtractor={(item) => String(item.user.id)}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyContainer}>
            <Feather name="heart" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyText}>{t("noLikesYet")}</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => handleViewProfile(item)}
          accessibilityRole="button"
          accessibilityLabel={item.user.display_name}
        >
          <Avatar
            name={item.user.display_name}
            photoUrl={item.user.photo_url}
            size={48}
            blurRadius={isPremium ? undefined : 15}
          />
          <View style={styles.userInfo}>
            <Text style={styles.name}>
              {isPremium ? item.user.display_name : maskName(item.user.display_name)}
            </Text>
            {!isPremium && (
              <View style={styles.lockRow}>
                <Feather name="lock" size={12} color={colors.textSecondary} style={{ marginRight: 2 }} />
                <Text style={styles.lockText}>{t("unlockWithPremium")}</Text>
              </View>
            )}
          </View>

          <View style={styles.rowActions}>
            <Pressable
              style={[styles.itemActionButton, styles.itemPassButton]}
              onPress={() => handlePass(item)}
              accessibilityRole="button"
              accessibilityLabel="Geç"
            >
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.itemActionButton, styles.itemLikeButton]}
              onPress={() => handleLike(item)}
              accessibilityRole="button"
              accessibilityLabel="Beğen"
            >
              <Feather name="heart" size={16} color={colors.surface} />
            </Pressable>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  lockText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemPassButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  itemLikeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  countText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  countNumber: {
    color: colors.primary,
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
  },
  premiumCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  premiumCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumCardTitle: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 18,
    color: colors.surface,
  },
  premiumCardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.primaryMuted,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});

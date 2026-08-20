import { useCallback, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import * as Notifications from "expo-notifications";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Badge } from "../components/ui/Badge";
import { registerDeviceToken, unregisterDeviceToken } from "../api/notifications";
import { deleteCurrentUser, exportMyData } from "../api/users";
import { createCheckoutSession } from "../api/subscriptions";
import { useAuth } from "../context/AuthContext";
import { getExpoPushToken } from "../utils/pushNotifications";
import { apiClient } from "../api/client";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import { PhotoVerificationModal } from "../components/overlays/PhotoVerificationModal";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User } from "../types";

type PermissionStatus = "granted" | "denied" | "undetermined";

function formatExpiryDate(iso: string): string {
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return date.toLocaleDateString("tr-TR");
}

import { THEME_PRESETS, useAppTheme } from "../context/ThemeContext";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user, updateUser, signOut, isPremium, premiumExpiresAt } = useAuth();
  const { themeKey, accentColor, bgGradient, language, setThemeKey, setLanguage, t } = useAppTheme();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const [verificationModalVisible, setVerificationModalVisible] = useState(false);

  const handleVerifyPress = () => {
    if (!user) return;
    if (user.is_verified || user.verification_status === "verified") {
      Alert.alert("Profil Doğrulanmış 🔵", "Profilin zaten doğrulanmış. Mavi tikin keyfini çıkar!");
    } else {
      setVerificationModalVisible(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setPermissionStatus(status as PermissionStatus);
      });
    }, [])
  );

  async function handleEnableNotifications(): Promise<void> {
    setIsUpdating(true);
    try {
      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      if (currentStatus === "denied") {
        Alert.alert(
          "Bildirim İzni Gerekli",
          "Bildirimleri tekrar açmak için telefon ayarlarından bu uygulamaya bildirim izni vermelisin.",
          [
            { text: "İptal", style: "cancel" },
            { text: "Ayarları Aç", onPress: () => Linking.openSettings() }
          ]
        );
        setIsUpdating(false);
        return;
      }
      
      const token = await getExpoPushToken();
      if (token) {
        await registerDeviceToken(token);
      }
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status as PermissionStatus);
    } catch {
      Alert.alert("Bir sorun oluştu", "Bildirim izni ayarlanamadı. Lütfen tekrar dene.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDisableNotifications(): Promise<void> {
    setIsUpdating(true);
    try {
      const token = await getExpoPushToken();
      if (token) {
        await unregisterDeviceToken(token);
      }
      setPermissionStatus("denied");
      Alert.alert("Bildirimler Kapatıldı", "Bu cihaz için bildirim alımı başarıyla kapatıldı.");
    } catch {
      Alert.alert("Bir sorun oluştu", "Bildirimler kapatılamadı. Lütfen tekrar dene.");
    } finally {
      setIsUpdating(false);
    }
  }

  const handleToggleSwitch = async (value: boolean) => {
    if (value) {
      await handleEnableNotifications();
    } else {
      await handleDisableNotifications();
    }
  };

  async function handleExportData(): Promise<void> {
    setIsExporting(true);
    try {
      const data = await exportMyData();
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      Alert.alert("Bir sorun oluştu", "Verilerin dışa aktarılamadı. Lütfen tekrar dene.");
    } finally {
      setIsExporting(false);
    }
  }

  function confirmDeleteAccount(): void {
    Alert.alert(
      "Hesabını Sil",
      "Bu işlem geri alınamaz. Hesabın ve profil bilgilerin kalıcı olarak silinecek.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCurrentUser();
              await signOut();
            } catch {
              Alert.alert("Bir sorun oluştu", "Hesap silinemedi. Lütfen tekrar dene.");
            }
          },
        },
      ]
    );
  }

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

  const [isGhostMode, setIsGhostMode] = useState(false);

  function handleToggleGhostMode(val: boolean) {
    if (!isPremium && val) {
      Alert.alert(
        language === "en" ? "⭐ Premium Ghost Mode" : "⭐ Premium Gizli Mod",
        language === "en"
          ? "Ghost Mode allows you to browse profiles invisibly! Upgrade to Premium to enable."
          : "Gizli Mod (Ghost Mode 👻) sayesinde profillerde tamamen gizli gezebilirsin! Açmak için Premium'a yükselt.",
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("upgradeToPremium"), onPress: handleUpgrade },
        ]
      );
      return;
    }
    setIsGhostMode(val);
  }

  function handlePassportPress() {
    if (!isPremium) {
      Alert.alert(
        language === "en" ? "✈️ Premium Passport" : "✈️ Premium Pasaport",
        language === "en"
          ? "Travel Passport lets you teleport to any city in the world to find buddies! Upgrade to Premium."
          : "Pasaport (Passport ✈️) özelliğiyle Türkiye'nin veya dünyanın istediğin şehrine ışınlanıp oradaki kankalarla eşleşebilirsin! Premium'a yükselt.",
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("upgradeToPremium"), onPress: handleUpgrade },
        ]
      );
      return;
    }
    Alert.alert(
      language === "en" ? "✈️ Passport Active" : "✈️ Pasaport Modu",
      language === "en" ? "You can teleport to any city from the Discover map!" : "Işınlanmak istediğin şehri Keşfet haritasından veya arama çubuğundan seçebilirsin!"
    );
  }

  return (
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
      {isPremium ? (
        <LinearGradient
          colors={[accentColor, "#9B7BFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.row}>
            <Text style={styles.premiumEyebrow}>PREMIUM</Text>
            <Badge label={language === "en" ? "Active" : "Aktif"} variant="yellow" icon="⭐" />
          </View>
          <Text style={styles.premiumLabel}>
            {language === "en"
              ? "Seeing likes, unlimited swiping, advanced filters, and priority visibility are with you."
              : "Beğenenleri görme, sınırsız swipe, gelişmiş filtreler ve öncelikli görünürlük seninle."}
          </Text>
          {premiumExpiresAt ? (
            <Text style={styles.premiumSubLabel}>
              {language === "en" ? "Expiry date: " : "Bitiş tarihi: "}{formatExpiryDate(premiumExpiresAt)}
            </Text>
          ) : null}
        </LinearGradient>
      ) : (
        <View style={styles.premiumCardFree}>
          <Text style={typeScale.eyebrow}>Premium</Text>
          <Text style={styles.rowLabel}>
            {language === "en"
              ? "See who liked you, swipe unlimitedly, use advanced filters and get featured."
              : "Seni beğenenleri gör, sınırsız swipe yap, gelişmiş filtreler kullan ve öne çık."}
          </Text>
          <PrimaryButton
            label={isUpgrading ? (language === "en" ? "Loading..." : "Yükleniyor...") : t("upgradeToPremium")}
            variant="accent"
            onPress={handleUpgrade}
            loading={isUpgrading}
          />
        </View>
      )}

      {/* Theme & Language Card */}
      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>{t("appearanceAndLang")}</Text>

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.sectionSubTitle}>{t("appLanguage")}</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langChip, language === "tr" && { backgroundColor: accentColor, borderColor: accentColor }]}
              onPress={() => setLanguage("tr")}
            >
              <Text style={[styles.langChipText, language === "tr" && { color: colors.surface }]}>
                🇹🇷 Türkçe
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, language === "en" && { backgroundColor: accentColor, borderColor: accentColor }]}
              onPress={() => setLanguage("en")}
            >
              <Text style={[styles.langChipText, language === "en" && { color: colors.surface }]}>
                🇬🇧 English
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Text style={styles.sectionSubTitle}>{t("themeAccentColor")}</Text>
          <View style={styles.themeGridRow}>
            {THEME_PRESETS.map((preset) => {
              const isSelected = themeKey === preset.key;
              const themeName = language === "en" ? preset.labelEn : preset.label;
              return (
                <Pressable
                  key={preset.key}
                  style={[
                    styles.themeButtonChip,
                    isSelected && { borderColor: preset.color, backgroundColor: `${preset.color}15` },
                  ]}
                  onPress={() => {
                    if (preset.isPremium && !isPremium) {
                      Alert.alert(
                        t("premiumThemeAlertTitle"),
                        `"${themeName}" ${t("premiumThemeAlertMsg")}`,
                        [
                          { text: t("cancel"), style: "cancel" },
                          { text: t("upgradeToPremium"), onPress: handleUpgrade },
                        ]
                      );
                    } else {
                      setThemeKey(preset.key);
                    }
                  }}
                >
                  <View style={[styles.themeColorSwatch, { backgroundColor: preset.color }]}>
                    {isSelected && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <Text style={[styles.themeButtonChipText, isSelected && { color: preset.color, fontFamily: fontFamily.bodySemiBold }]}>
                    {themeName}
                  </Text>
                  {preset.isPremium && (
                    <View style={styles.themeCrownBadge}>
                      <Text style={{ fontSize: 10 }}>👑</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>{t("notifications")}</Text>
        <Pressable
          style={[
            styles.notifModuleBox,
            permissionStatus === "granted" && { borderColor: accentColor, backgroundColor: `${accentColor}08` }
          ]}
          onPress={() => handleToggleSwitch(permissionStatus !== "granted")}
          disabled={isUpdating}
        >
          <View style={[styles.notifIconContainer, { backgroundColor: `${accentColor}18` }]}>
            <Feather name="bell" size={20} color={accentColor} />
          </View>
          
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Text style={styles.notifTitle}>{t("pushNotifications")}</Text>
              <View style={[styles.statusDot, { backgroundColor: permissionStatus === "granted" ? "#2ECC71" : colors.textSecondary }]} />
            </View>
            <Text style={styles.notifSubText}>
              {t("pushNotificationsSub")}
            </Text>
          </View>

          <Switch
            value={permissionStatus === "granted"}
            onValueChange={handleToggleSwitch}
            disabled={isUpdating}
            trackColor={{ false: colors.border, true: `${accentColor}40` }}
            thumbColor={permissionStatus === "granted" ? accentColor : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Privacy & Special Power-Ups Card */}
      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>
          {language === "en" ? "Privacy & Power-Ups 👑" : "Gizlilik & Özel Yetenekler 👑"}
        </Text>

        <Pressable style={styles.notifModuleBox} onPress={handlePassportPress}>
          <View style={[styles.notifIconContainer, { backgroundColor: `${accentColor}18` }]}>
            <Feather name="navigation" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Text style={styles.notifTitle}>
                {language === "en" ? "Travel Passport ✈️" : "Sanal Konum / Pasaport ✈️"}
              </Text>
              {!isPremium && <Text style={{ fontSize: 10 }}>👑</Text>}
            </View>
            <Text style={styles.notifSubText}>
              {language === "en"
                ? "Teleport to any city in the world to meet new buddies!"
                : "İstediğin şehre ışınlanıp oradaki kankalarla eşleş!"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.notifModuleBox} onPress={() => handleToggleGhostMode(!isGhostMode)}>
          <View style={[styles.notifIconContainer, { backgroundColor: `${accentColor}18` }]}>
            <Feather name="eye-off" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Text style={styles.notifTitle}>
                {language === "en" ? "Ghost Mode 👻" : "Gizli Gezinme (Ghost Mode 👻)"}
              </Text>
              {!isPremium && <Text style={{ fontSize: 10 }}>👑</Text>}
            </View>
            <Text style={styles.notifSubText}>
              {language === "en"
                ? "Browse profiles completely invisibly. Only people you like can see you."
                : "Profilleri tamamen gizli gez. Sadece beğendiğin kişiler seni görebilsin."}
            </Text>
          </View>
          <Switch
            value={isGhostMode}
            onValueChange={handleToggleGhostMode}
            trackColor={{ false: colors.border, true: `${accentColor}40` }}
            thumbColor={isGhostMode ? accentColor : colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>{t("profileAndRules")}</Text>
        <SettingsRow
          icon="edit-3"
          label={t("editProfile")}
          onPress={() => navigation.navigate("EditProfile")}
        />
        <SettingsRow
          icon="eye"
          label={t("viewMyProfile")}
          onPress={() => navigation.navigate("ViewProfile")}
        />
        <SettingsRow
          icon="image"
          label={t("myPhotos")}
          onPress={() => navigation.navigate("MyPhotos")}
        />
        <SettingsRow
          icon="check-circle"
          label={
            user?.verification_status === "verified"
              ? t("verificationVerified")
              : user?.verification_status === "pending"
                ? t("verificationPending")
                : t("verifyProfile")
          }
          onPress={handleVerifyPress}
        />
        <SettingsRow
          icon="book-open"
          label={t("communityGuidelines")}
          onPress={() => navigation.navigate("CommunityGuidelines")}
        />
      </View>

      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>{t("account")}</Text>
        <SettingsRow
          icon="lock"
          label={t("changePassword")}
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <SettingsRow
          icon="bookmark"
          label={t("savedEvents")}
          onPress={() => navigation.navigate("SavedEvents")}
        />
        <SettingsRow
          icon="shield"
          label={t("blockedUsers")}
          onPress={() => navigation.navigate("BlockedUsers")}
        />
        <SettingsRow
          icon="download"
          label={isExporting ? "..." : t("downloadData")}
          onPress={handleExportData}
          loading={isExporting}
        />
        <SettingsRow icon="trash-2" label={t("deleteAccount")} onPress={confirmDeleteAccount} danger />
      </View>

      <PhotoVerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
      />
    </ScrollView>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
}

function SettingsRow({ icon, label, onPress, danger, loading }: SettingsRowProps) {
  return (
    <Pressable
      style={styles.settingsRow}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionRowLeft}>
        <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
          <Feather name={icon} size={16} color={danger ? colors.accentRed : colors.primary} />
        </View>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </Pressable>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  premiumCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  premiumCardFree: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  premiumEyebrow: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.85)",
  },
  premiumLabel: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.surface,
  },
  premiumSubLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowLabelDanger: {
    color: colors.accentRed,
  },
  rowValue: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingsRow: {
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  modalBodyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  modalActions: {
    width: "100%",
    gap: spacing.sm,
  },
  sectionSubTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  themeGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  themeButtonChip: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  themeColorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  themeButtonChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  themeCrownBadge: {
    marginLeft: "auto",
  },
  notifModuleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  notifSubText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

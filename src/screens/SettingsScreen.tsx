import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
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
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type PermissionStatus = "granted" | "denied" | "undetermined";

const STATUS_LABEL: Record<PermissionStatus, string> = {
  granted: "Açık",
  denied: "Kapalı",
  undetermined: "Henüz sorulmadı",
};

function formatExpiryDate(iso: string): string {
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return date.toLocaleDateString("tr-TR");
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signOut, isPremium, premiumExpiresAt } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

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

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      {isPremium ? (
        <LinearGradient
          colors={[colors.primary, "#9B7BFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.row}>
            <Text style={styles.premiumEyebrow}>PREMIUM</Text>
            <Badge label="Aktif" variant="yellow" icon="⭐" />
          </View>
          <Text style={styles.premiumLabel}>
            Beğenenleri görme, sınırsız swipe, gelişmiş filtreler ve öncelikli görünürlük
            seninle.
          </Text>
          {premiumExpiresAt ? (
            <Text style={styles.premiumSubLabel}>Bitiş tarihi: {formatExpiryDate(premiumExpiresAt)}</Text>
          ) : null}
        </LinearGradient>
      ) : (
        <View style={styles.premiumCardFree}>
          <Text style={typeScale.eyebrow}>Premium</Text>
          <Text style={styles.rowLabel}>
            Seni beğenenleri gör, sınırsız swipe yap, gelişmiş filtreler kullan ve öne çık.
          </Text>
          <PrimaryButton
            label={isUpgrading ? "Yükleniyor..." : "Premium'a Yükselt"}
            variant="accent"
            onPress={handleUpgrade}
            loading={isUpgrading}
          />
        </View>
      )}

      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>Bildirimler</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2, marginRight: spacing.md }}>
            <Text style={styles.rowLabel}>Push Bildirimleri</Text>
            <Text style={{ fontFamily: fontFamily.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              Yeni mesajlar ve eşleşmelerden anında haberdar ol.
            </Text>
          </View>
          <Switch
            value={permissionStatus === "granted"}
            onValueChange={handleToggleSwitch}
            disabled={isUpdating}
            trackColor={{ false: colors.border, true: colors.primaryMuted }}
            thumbColor={permissionStatus === "granted" ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>Hesap</Text>
        <SettingsRow
          icon="image"
          label="Fotoğraflarım"
          onPress={() => navigation.navigate("EditProfile")}
        />
        <SettingsRow
          icon="lock"
          label="Şifre Değiştir"
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <SettingsRow
          icon="shield"
          label="Engellenen Kullanıcılar"
          onPress={() => navigation.navigate("BlockedUsers")}
        />
        <SettingsRow
          icon="download"
          label={isExporting ? "Hazırlanıyor..." : "Verilerimi İndir"}
          onPress={handleExportData}
          loading={isExporting}
        />
        <SettingsRow icon="trash-2" label="Hesabımı Sil" onPress={confirmDeleteAccount} danger />
      </View>
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
});

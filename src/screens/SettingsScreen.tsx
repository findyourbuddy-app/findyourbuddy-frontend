import { useCallback, useState } from "react";
import { Alert, Linking, Share, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { registerDeviceToken } from "../api/notifications";
import { deleteCurrentUser, exportMyData } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { getExpoPushToken } from "../utils/pushNotifications";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

type PermissionStatus = "granted" | "denied" | "undetermined";

const STATUS_LABEL: Record<PermissionStatus, string> = {
  granted: "Açık",
  denied: "Kapalı",
  undetermined: "Henüz sorulmadı",
};

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signOut } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setPermissionStatus(status as PermissionStatus);
      });
    }, [])
  );

  async function handleEnableNotifications(): Promise<void> {
    if (permissionStatus === "denied") {
      Linking.openSettings();
      return;
    }

    setIsUpdating(true);
    try {
      const token = await getExpoPushToken();
      if (token) {
        await registerDeviceToken(token);
      }
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status as PermissionStatus);
    } catch {
      Alert.alert("Bir sorun oluştu", "Bildirim izni ayarlanamadı. Lütfen tekrar dene.");
    } finally {
      setIsUpdating(false);
    }
  }

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

  return (
    <View style={styles.background}>
      <View style={styles.card}>
        <Text style={typeScale.eyebrow}>Bildirimler</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push bildirimleri</Text>
          <Text style={styles.rowValue}>{STATUS_LABEL[permissionStatus]}</Text>
        </View>
        {permissionStatus !== "granted" ? (
          <PrimaryButton
            label={
              isUpdating
                ? "Güncelleniyor..."
                : permissionStatus === "denied"
                  ? "Sistem Ayarlarını Aç"
                  : "Bildirimlere İzin Ver"
            }
            onPress={handleEnableNotifications}
            loading={isUpdating}
            variant="outline"
          />
        ) : null}
      </View>

      <PrimaryButton
        label="Engellenen Kullanıcılar"
        onPress={() => navigation.navigate("BlockedUsers")}
        variant="outline"
      />

      <PrimaryButton
        label={isExporting ? "Hazırlanıyor..." : "Verilerimi İndir"}
        onPress={handleExportData}
        loading={isExporting}
        variant="outline"
      />

      <PrimaryButton
        label="Hesabımı Sil"
        onPress={confirmDeleteAccount}
        variant="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
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
  rowValue: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});

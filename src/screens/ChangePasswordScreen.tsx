import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Alert } from "../utils/alert";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { changePassword } from "../api/auth";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";

import { useAppTheme } from "../context/ThemeContext";

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { bgGradient, language } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (!currentPassword) {
      setError(language === "en" ? "Enter your current password." : "Mevcut şifreni gir.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(language === "en" ? `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` : `Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(language === "en" ? "New passwords do not match." : "Yeni şifreler eşleşmiyor.");
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert(language === "en" ? "Success" : "Başarılı", language === "en" ? "Password updated." : "Şifren güncellendi.");
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError(language === "en" ? "Current password incorrect." : "Mevcut şifren yanlış.");
      } else {
        setError(language === "en" ? "Failed to change password. Please try again." : "Şifre değiştirilemedi. Lütfen tekrar dene.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{language === "en" ? "Current Password" : "Mevcut Şifre"}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={language === "en" ? "Current password" : "Mevcut şifren"}
          placeholderTextColor={colors.textSecondary}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{language === "en" ? "New Password" : "Yeni Şifre"}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={language === "en" ? "New password" : "Yeni şifre"}
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{language === "en" ? "New Password (Repeat)" : "Yeni Şifre (Tekrar)"}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={language === "en" ? "Re-enter new password" : "Yeni şifreni tekrar gir"}
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={language === "en" ? "Update Password" : "Şifreyi Güncelle"} onPress={handleSubmit} loading={isSaving} />
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
  field: {
    gap: spacing.sm,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
  },
});

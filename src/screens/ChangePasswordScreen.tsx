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

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (!currentPassword) {
      setError("Mevcut şifreni gir.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert("Başarılı", "Şifren güncellendi.");
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError("Mevcut şifren yanlış.");
      } else {
        setError("Şifre değiştirilemedi. Lütfen tekrar dene.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.background}>
      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Mevcut Şifre</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Mevcut şifren"
          placeholderTextColor={colors.textSecondary}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Yeni Şifre</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Yeni şifre"
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>Yeni Şifre (Tekrar)</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Yeni şifreni tekrar gir"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Şifreyi Güncelle" onPress={handleSubmit} loading={isSaving} />
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

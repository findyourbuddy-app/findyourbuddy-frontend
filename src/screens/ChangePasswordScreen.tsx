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
  const { bgGradient, language, t } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (!currentPassword) {
      setError(t("enterYourCurrentPassword"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("newPasswordMustBeAt", { p0: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("newPasswordsDoNotMatch"));
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert(t("success"), t("passwordUpdated"));
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError(t("currentPasswordIncorrect"));
      } else {
        setError(t("failedToChangePasswordPlease"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.background, { backgroundColor: bgGradient[0] }]}>
      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("currentPassword")}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={t("currentPassword2")}
          placeholderTextColor={colors.textSecondary}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("newPassword")}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={t("newPassword2")}
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View style={styles.field}>
        <Text style={typeScale.eyebrow}>{t("newPasswordRepeat")}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={t("reenterNewPassword")}
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={t("updatePassword")} onPress={handleSubmit} loading={isSaving} />
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

import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { confirmPasswordReset, requestPasswordReset } from "../api/auth";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Step = "request" | "confirm" | "done";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setStep("confirm");
    } catch {
      setError("İstek gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token.trim(), newPassword);
      setStep("done");
    } catch {
      setError("Kod geçersiz veya süresi dolmuş. Lütfen tekrar dene.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <View style={styles.container}>
        <Text style={typeScale.h1}>Şifren güncellendi</Text>
        <Text style={styles.helperText}>Artık yeni şifrenle giriş yapabilirsin.</Text>
        <PrimaryButton label="Giriş Ekranına Dön" onPress={() => navigation.navigate("Login")} />
      </View>
    );
  }

  if (step === "confirm") {
    return (
      <View style={styles.container}>
        <Text style={typeScale.h1}>Kodu Gir</Text>
        <Text style={styles.helperText}>
          E-postana bir sıfırlama kodu gönderildi. Kodu ve yeni şifreni gir.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Sıfırlama kodu"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />
        <TextInput
          style={styles.input}
          placeholder="Yeni şifre"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={isSubmitting ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          onPress={handleConfirm}
          loading={isSubmitting}
          disabled={!token.trim() || newPassword.length < 6}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={typeScale.h1}>Şifreni mi unuttun?</Text>
      <Text style={styles.helperText}>
        E-posta adresini gir, sana bir sıfırlama kodu gönderelim.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={isSubmitting ? "Gönderiliyor..." : "Kod Gönder"}
        onPress={handleRequest}
        loading={isSubmitting}
        disabled={!email.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  helperText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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

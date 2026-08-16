import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { verifyPhoneCode, resendPhoneCode } from "../api/auth";
import { getCurrentUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";

import { useAppTheme } from "../context/ThemeContext";

export function VerifyPhoneScreen() {
  const { user, updateUser, signOut } = useAuth();
  const { bgGradient } = useAppTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (code.trim().length !== 6) {
      setError("Lütfen 6 haneli kodu gir.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyPhoneCode(code.trim());
      updateUser(await getCurrentUser());
    } catch {
      setError("Kod hatalı veya süresi dolmuş. Tekrar dener misin?");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    setIsResending(true);
    setError(null);
    try {
      await resendPhoneCode();
      setResent(true);
    } catch {
      setError("Kod yeniden gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: bgGradient[0] }]}>
      <Text style={styles.title}>Telefon Numaranı Doğrula</Text>
      <Text style={styles.subtitle}>
        {user?.phone_number} numarasına gönderilen 6 haneli doğrulama kodunu gir.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Doğrulama Kodu"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resent ? <Text style={styles.resentText}>Yeni kod gönderildi.</Text> : null}
      <PrimaryButton
        label={isSubmitting ? "Doğrulanıyor..." : "Doğrula"}
        onPress={handleSubmit}
        loading={isSubmitting}
      />
      <TouchableOpacity onPress={handleResend} disabled={isResending}>
        <Text style={styles.link}>{isResending ? "Gönderiliyor..." : "Kodu Tekrar Gönder"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={signOut}>
        <Text style={styles.signOutLink}>Çıkış Yap</Text>
      </TouchableOpacity>
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
  title: {
    ...typeScale.display,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
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
  resentText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
  },
  link: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  signOutLink: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});

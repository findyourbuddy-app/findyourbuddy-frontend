import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
    } catch {
      setError("Giriş başarısız. E-posta veya şifre hatalı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>FindYourBuddy</Text>
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
        onPress={handleSubmit}
        loading={isSubmitting}
      />
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Hesabın yok mu? Kayıt ol</Text>
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
  brand: {
    ...typeScale.display,
    textAlign: "center",
    marginBottom: spacing.xl,
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
  link: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  error: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
    textAlign: "center",
  },
});

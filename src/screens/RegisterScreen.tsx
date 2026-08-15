import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

const PHONE_REGEX = /^\+?\d{10,15}$/;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!displayName.trim()) {
      setError("Lütfen adınızı ve soyadınızı girin.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    const normalizedPhone = phoneNumber.trim().replace(/[\s()-]/g, "");
    if (!PHONE_REGEX.test(normalizedPhone)) {
      setError("Lütfen geçerli bir telefon numarası girin (örn. 05XXXXXXXXX).");
      return;
    }
    if (password.length < 6) {
      setError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if (!acceptedTerms) {
      setError("Devam etmek için Kullanım Şartları ve Gizlilik Politikası'nı kabul etmelisin.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await signUp({
        display_name: displayName,
        email,
        password,
        accepted_terms: acceptedTerms,
        phone_number: normalizedPhone,
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail as string | undefined;
        if (detail?.toLowerCase().includes("phone")) {
          setError("Bu telefon numarası sistemde zaten kayıtlı. Farklı bir numara dener misin?");
        } else {
          setError("Bu e-posta adresi zaten kayıtlı.");
        }
      } else {
        setError("Kayıt oluşturulamadı. Bilgileri kontrol edip tekrar dene.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hesap Oluştur</Text>
      <TextInput
        style={styles.input}
        placeholder="Ad Soyad"
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
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
        placeholder="Telefon Numarası (örn. 05XXXXXXXXX)"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setAcceptedTerms((current) => !current)}
      >
        <Feather
          name={acceptedTerms ? "check-square" : "square"}
          size={18}
          color={acceptedTerms ? colors.primary : colors.textSecondary}
        />
        <Text style={styles.termsText}>
          <Text onPress={() => navigation.navigate("Legal", { kind: "terms" })} style={styles.termsLink}>
            Kullanım Şartları
          </Text>
          {" ve "}
          <Text onPress={() => navigation.navigate("Legal", { kind: "privacy" })} style={styles.termsLink}>
            Gizlilik Politikası
          </Text>
          {"'nı okudum, kabul ediyorum."}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!acceptedTerms}
      />
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Zaten hesabın var mı? Giriş yap</Text>
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  termsLink: {
    fontFamily: fontFamily.bodyMedium,
    color: colors.primary,
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

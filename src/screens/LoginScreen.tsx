import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BuddyLogo } from "../components/ui/BuddyLogo";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { formatApiError } from "../utils/error";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const { signIn } = useAuth();
  const { language, setLanguage } = useAppTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      setError(language === "en" ? "Please enter your email address." : "Lütfen e-posta adresinizi girin.");
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError(language === "en" ? "Please enter a valid email address." : "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      setError(language === "en" ? "Password must be at least 6 characters." : "Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: cleanEmail, password });
    } catch (err) {
      setError(formatApiError(err, language));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Background Soft Gradient & Organic Shapes */}
      <LinearGradient
        colors={["#E3F7FA", "#F8F9FE", "#FFF0EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top Left Liquid Blob */}
      <View style={styles.blobTopLeft} />
      {/* Bottom Right Liquid Blob */}
      <View style={styles.blobBottomRight} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Language Selector */}
          <View style={styles.topBarRow}>
            <Pressable
              style={styles.langPill}
              onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
              accessibilityRole="button"
              accessibilityLabel="Change Language"
            >
              <Feather name="globe" size={14} color={colors.textPrimary} />
              <Text style={styles.langPillText}>
                {language === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}
              </Text>
            </Pressable>
          </View>

          {/* Logo & Brand Header */}
          <View style={styles.headerBox}>
            <BuddyLogo size={90} showText={true} />
          </View>

          {/* Form Fields Box */}
          <View style={styles.formBox}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === "en" ? "Email Address" : "E-posta Adresi"}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === "en" ? "Password" : "Şifre"}
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color="#94A3B8"
                />
              </Pressable>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Gradient Primary Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.buttonTouch,
                pressed && { opacity: 0.9 },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#4AC2E2", "#FF6B6B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting
                    ? (language === "en" ? "Logging In..." : "Giriş Yapılıyor...")
                    : (language === "en" ? "Log In" : "Giriş Yap")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Links Section */}
          <View style={styles.linksBox}>
            <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.linkTextText}>
                {language === "en" ? "Forgot Password?" : "Şifremi Unuttum?"}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={styles.signUpText}>
                {language === "en" ? "Don't have an account? " : "Hesabın yok mu? "}
                <Text style={styles.signUpHighlight}>
                  {language === "en" ? "Sign Up Free" : "Ücretsiz Kayıt Ol"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(74, 194, 226, 0.22)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 107, 107, 0.18)",
  },
  topBarRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  langPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 36,
  },
  formBox: {
    gap: spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...shadows.soft,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: "#1E293B",
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.accentRed,
  },
  buttonTouch: {
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: spacing.xs,
    ...shadows.card,
  },
  buttonGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  linksBox: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: 28,
  },
  linkTextText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: "#64748B",
  },
  signUpText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
  },
  signUpHighlight: {
    fontFamily: fontFamily.bodySemiBold,
    color: "#1B4958",
  },
});

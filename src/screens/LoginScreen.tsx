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
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(null);

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
      {/* Background Soft Gradient */}
      <LinearGradient
        colors={["#E8F0FE", "#F4F0FF", "#FFF3EF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Top Header Bar (Back button + Language selector) */}
      <View style={styles.topHeaderBar}>
        <Pressable
          style={styles.backPill}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={20} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          style={styles.langPill}
          onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel="Change Language"
        >
          <Feather name="globe" size={13} color={colors.textPrimary} />
          <Text style={styles.langPillText}>
            {language === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Brand Header */}
          <View style={styles.headerBox}>
            <BuddyLogo size={85} showText={true} />
            <Text style={styles.headerTitle}>
              {language === "en" ? "Welcome Back! 👋" : "Tekrar Hoş Geldin! 👋"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {language === "en"
                ? "Log in to discover new events & buddies around you"
                : "Etkinlikleri ve kankalarını keşfetmek için giriş yap"}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.formBox}>
              {/* Email Input */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" && styles.inputWrapperFocused,
                ]}
              >
                <Feather
                  name="mail"
                  size={18}
                  color={focusedInput === "email" ? colors.primary : "#94A3B8"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Email Address" : "E-posta Adresi"}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "password" && styles.inputWrapperFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={focusedInput === "password" ? colors.primary : "#94A3B8"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Password" : "Şifre"}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
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

              {/* Forgot Password Link */}
              <Pressable
                style={styles.forgotBtn}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.linkTextText}>
                  {language === "en" ? "Forgot Password?" : "Şifremi Unuttum?"}
                </Text>
              </Pressable>

              {/* Gradient Primary Action Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.buttonTouch,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                hitSlop={8}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={["#6C4CF1", "#FF6B6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? (language === "en" ? "Logging In..." : "Giriş Yapılıyor...")
                      : (language === "en" ? "Log In" : "Giriş Yap")}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* Links Section */}
          <View style={styles.linksBox}>
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
    top: -70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(108, 76, 241, 0.15)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 107, 107, 0.14)",
  },
  topHeaderBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 40,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 999,
  },
  backPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...shadows.soft,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...shadows.soft,
  },
  langPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingBottom: spacing.xxl,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    ...shadows.card,
  },
  formBox: {
    gap: spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF",
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
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#FCA5A5",
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
    flexDirection: "row",
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
    marginTop: 24,
  },
  linkTextText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  signUpText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
  },
  signUpHighlight: {
    fontFamily: fontFamily.displayBold,
    color: colors.primary,
  },
});


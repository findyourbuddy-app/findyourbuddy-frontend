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

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

const PHONE_REGEX = /^\+?\d{10,15}$/;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigationProp>();
  const { signUp } = useAuth();
  const { language, setLanguage } = useAppTheme();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"name" | "email" | "phone" | "password" | null>(null);

  async function handleSubmit(): Promise<void> {
    if (!displayName.trim()) {
      setError(language === "en" ? "Please enter your full name." : "Lütfen adınızı ve soyadınızı girin.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(language === "en" ? "Please enter a valid email address." : "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    const normalizedPhone = phoneNumber.trim().replace(/[\s()-]/g, "");
    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError(language === "en" ? "Please enter a valid phone number (e.g. +905XXXXXXXXX)." : "Lütfen geçerli bir telefon numarası girin (örn. 05XXXXXXXXX).");
      return;
    }
    if (password.length < 6) {
      setError(language === "en" ? "Password must be at least 6 characters." : "Şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if (!acceptedTerms) {
      setError(language === "en" ? "You must accept the Terms of Service and Privacy Policy to continue." : "Devam etmek için Kullanım Şartları ve Gizlilik Politikası'nı kabul etmelisin.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signUp({
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        accepted_terms: acceptedTerms,
        phone_number: normalizedPhone || undefined,
      });
    } catch (err) {
      setError(formatApiError(err, language));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
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
          {/* Header Box */}
          <View style={styles.headerBox}>
            <BuddyLogo size={80} showText={true} />
            <Text style={styles.headerTitle}>
              {language === "en" ? "Join FindYourBuddy" : "Aramıza Katıl!"}
            </Text>
            <Text style={styles.headerSub}>
              {language === "en"
                ? "Create a free account, find new buddies!"
                : "Ücretsiz hesap oluştur, yeni kankalar bul!"}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.formBox}>
              {/* Display Name */}
              <View style={[styles.inputWrapper, focusedInput === "name" && styles.inputWrapperFocused]}>
                <Feather name="user" size={18} color={focusedInput === "name" ? colors.primary : "#94A3B8"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Full Name" : "Ad Soyad"}
                  placeholderTextColor="#94A3B8"
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => setFocusedInput("name")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Email */}
              <View style={[styles.inputWrapper, focusedInput === "email" && styles.inputWrapperFocused]}>
                <Feather name="mail" size={18} color={focusedInput === "email" ? colors.primary : "#94A3B8"} style={styles.inputIcon} />
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

              {/* Phone */}
              <View style={[styles.inputWrapper, focusedInput === "phone" && styles.inputWrapperFocused]}>
                <Feather name="phone" size={18} color={focusedInput === "phone" ? colors.primary : "#94A3B8"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Phone Number (e.g. +905XXXXXXXXX)" : "Telefon Numarası (örn. 05XXXXXXXXX)"}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onFocus={() => setFocusedInput("phone")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrapper, focusedInput === "password" && styles.inputWrapperFocused]}>
                <Feather name="lock" size={18} color={focusedInput === "password" ? colors.primary : "#94A3B8"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Password (min 6 chars)" : "Şifre (en az 6 karakter)"}
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
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              </View>

              {/* Terms Checkbox */}
              <Pressable
                style={styles.termsRow}
                onPress={() => setAcceptedTerms((current) => !current)}
              >
                <Feather
                  name={acceptedTerms ? "check-square" : "square"}
                  size={18}
                  color={acceptedTerms ? colors.primary : "#94A3B8"}
                />
                <Text style={styles.termsText}>
                  {language === "en" ? "I have read and accept the " : ""}
                  <Text
                    onPress={() => navigation.navigate("Legal", { kind: "terms" })}
                    style={styles.termsLink}
                  >
                    {language === "en" ? "Terms of Service" : "Kullanım Şartları"}
                  </Text>
                  {language === "en" ? " and " : " ve "}
                  <Text
                    onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
                    style={styles.termsLink}
                  >
                    {language === "en" ? "Privacy Policy" : "Gizlilik Politikası"}
                  </Text>
                  {language === "en" ? "." : "'nı okudum, kabul ediyorum."}
                </Text>
              </Pressable>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={colors.accentRed} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Gradient Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.buttonTouch,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  (!acceptedTerms || isSubmitting) && { opacity: 0.6 },
                ]}
                onPress={handleSubmit}
                disabled={!acceptedTerms || isSubmitting}
              >
                <LinearGradient
                  colors={["#6C4CF1", "#FF6B6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? (language === "en" ? "Creating Account..." : "Kayıt Yapılıyor...")
                      : (language === "en" ? "Create Account" : "Ücretsiz Kayıt Ol")}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          <View style={styles.linksBox}>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginText}>
                {language === "en" ? "Already have an account? " : "Zaten hesabın var mı? "}
                <Text style={styles.loginHighlight}>
                  {language === "en" ? "Log In" : "Giriş Yap"}
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? 90 : 70,
    paddingBottom: spacing.xxl,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  headerSub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    marginTop: spacing.xs,
    textAlign: "center",
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.primary,
    textDecorationLine: "underline",
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
  loginText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
  },
  loginHighlight: {
    fontFamily: fontFamily.displayBold,
    color: colors.primary,
  },
});

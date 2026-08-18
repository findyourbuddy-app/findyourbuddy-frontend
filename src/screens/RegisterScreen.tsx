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
import axios from "axios";
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
        colors={["#E3F7FA", "#F8F9FE", "#FFF0EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.blobTopLeft} />
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
          <View style={styles.topBarRow}>
            <Pressable
              style={styles.langPill}
              onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
            >
              <Feather name="globe" size={14} color={colors.textPrimary} />
              <Text style={styles.langPillText}>
                {language === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.headerBox}>
            <BuddyLogo size={80} showText={true} />
            <Text style={styles.headerSub}>
              {language === "en"
                ? "Create a free account, find new buddies!"
                : "Ücretsiz hesap oluştur, yeni kankalar bul!"}
            </Text>
          </View>

          <View style={styles.formBox}>
            {/* Display Name */}
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === "en" ? "Full Name" : "Ad Soyad"}
                placeholderTextColor="#94A3B8"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* Email */}
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

            {/* Phone */}
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === "en" ? "Phone Number (e.g. +905XXXXXXXXX)" : "Telefon Numarası (örn. 05XXXXXXXXX)"}
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === "en" ? "Password (min 6 chars)" : "Şifre (en az 6 karakter)"}
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

            {/* Terms Checkbox */}
            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((current) => !current)}
            >
              <Feather
                name={acceptedTerms ? "check-square" : "square"}
                size={18}
                color={acceptedTerms ? "#FF6B6B" : "#94A3B8"}
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
                pressed && { opacity: 0.9 },
                (!acceptedTerms || isSubmitting) && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={!acceptedTerms || isSubmitting}
            >
              <LinearGradient
                colors={["#4AC2E2", "#FF6B6B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting
                    ? (language === "en" ? "Creating Account..." : "Kayıt Yapılıyor...")
                    : (language === "en" ? "Create Account" : "Ücretsiz Kayıt Ol")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.linksBox}>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signUpText}>
                {language === "en" ? "Already have an account? " : "Zaten hesabın var mı? "}
                <Text style={styles.signUpHighlight}>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
  headerBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  headerSub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
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
    height: 54,
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs + 2,
    marginVertical: 4,
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  termsLink: {
    fontFamily: fontFamily.bodySemiBold,
    color: "#1B4958",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  linksBox: {
    alignItems: "center",
    marginTop: 24,
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

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
import { confirmPasswordReset, requestPasswordReset } from "../api/auth";
import { useAppTheme } from "../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Step = "request" | "confirm" | "done";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { language, setLanguage } = useAppTheme();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setStep("confirm");
    } catch {
      setError(
        language === "en"
          ? "Request failed. Please try again."
          : "İstek gönderilemedi. Lütfen tekrar dene."
      );
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
      setError(
        language === "en"
          ? "Invalid code or expired. Please try again."
          : "Kod geçersiz veya süresi dolmuş. Lütfen tekrar dene."
      );
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
          <View style={styles.headerBox}>
            <BuddyLogo size={80} showText={true} />
          </View>

          {step === "done" && (
            <View style={styles.formBox}>
              <View style={styles.successBadge}>
                <Feather name="check-circle" size={48} color="#2ECC71" />
              </View>
              <Text style={styles.titleText}>
                {language === "en" ? "Password Updated! 🎉" : "Şifreniz Güncellendi! 🎉"}
              </Text>
              <Text style={styles.helperText}>
                {language === "en"
                  ? "You can now log in to your account using your new password."
                  : "Artık yeni şifrenizi kullanarak hesabınıza giriş yapabilirsiniz."}
              </Text>

              <Pressable
                style={styles.buttonTouch}
                onPress={() => navigation.navigate("Login")}
              >
                <LinearGradient
                  colors={["#4AC2E2", "#FF6B6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {language === "en" ? "Back to Login" : "Giriş Ekranına Dön"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {step === "confirm" && (
            <View style={styles.formBox}>
              <Text style={styles.titleText}>
                {language === "en" ? "Enter Reset Code" : "Sıfırlama Kodunu Girin"}
              </Text>
              <Text style={styles.helperText}>
                {language === "en"
                  ? "A reset code has been sent to your email. Enter the code and your new password."
                  : "E-posta adresinize bir sıfırlama kodu gönderildi. Kodu ve yeni şifrenizi girin."}
              </Text>

              <View style={styles.inputWrapper}>
                <Feather name="key" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "Reset Code" : "Sıfırlama Kodu"}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  value={token}
                  onChangeText={setToken}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={language === "en" ? "New Password (min 6 chars)" : "Yeni Şifre (en az 6 karakter)"}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
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

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={colors.accentRed} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.buttonTouch,
                  pressed && { opacity: 0.9 },
                  (!token.trim() || newPassword.length < 6 || isSubmitting) && { opacity: 0.6 },
                ]}
                onPress={handleConfirm}
                disabled={!token.trim() || newPassword.length < 6 || isSubmitting}
              >
                <LinearGradient
                  colors={["#4AC2E2", "#FF6B6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? (language === "en" ? "Updating..." : "Güncelleniyor...")
                      : (language === "en" ? "Update Password" : "Şifreyi Güncelle")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {step === "request" && (
            <View style={styles.formBox}>
              <Text style={styles.titleText}>
                {language === "en" ? "Forgot your password?" : "Şifrenizi mi unuttunuz?"}
              </Text>
              <Text style={styles.helperText}>
                {language === "en"
                  ? "Enter the email associated with your account and we'll send you a reset code."
                  : "Hesabınıza kayıtlı e-posta adresinizi girin. Size bir sıfırlama kodu gönderelim."}
              </Text>

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

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color={colors.accentRed} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.buttonTouch,
                  pressed && { opacity: 0.9 },
                  (!email.trim() || isSubmitting) && { opacity: 0.6 },
                ]}
                onPress={handleRequest}
                disabled={!email.trim() || isSubmitting}
              >
                <LinearGradient
                  colors={["#4AC2E2", "#FF6B6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isSubmitting
                      ? (language === "en" ? "Sending..." : "Gönderiliyor...")
                      : (language === "en" ? "Send Reset Code" : "Sıfırlama Kodu Gönder")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          <View style={styles.linksBox}>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signUpText}>
                {language === "en" ? "Click here to " : "Giriş ekranına dönmek için "}
                <Text style={styles.signUpHighlight}>
                  {language === "en" ? "return to login" : "tıklayın"}
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
  backButton: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  formBox: {
    gap: spacing.md,
  },
  titleText: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    fontWeight: "700",
    color: "#1B4958",
    textAlign: "center",
  },
  helperText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  successBadge: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
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

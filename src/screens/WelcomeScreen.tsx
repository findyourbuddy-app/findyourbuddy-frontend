import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { BuddyLogo } from "../components/ui/BuddyLogo";
import { GoogleIcon } from "../components/ui/GoogleIcon";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { formatApiError } from "../utils/error";
import { firebaseAuth, googleAuthConfig } from "../config/firebase";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

WebBrowser.maybeCompleteAuthSession();

type WelcomeNavigationProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavigationProp>();
  const { signInWithFirebase } = useAuth();
  const { language, setLanguage } = useAppTheme();

  const [error, setError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const [googleRequest, , promptGoogleSignIn] = Google.useAuthRequest({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    androidClientId: googleAuthConfig.androidClientId,
  });

  async function handleGoogleSignIn(): Promise<void> {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await promptGoogleSignIn();
      if (result?.type !== "success") return;

      const googleIdToken = result.authentication?.idToken ?? result.params?.id_token;
      if (!googleIdToken) {
        setError(language === "en" ? "Google sign-in did not return a token." : "Google girişi bir belirteç döndürmedi.");
        return;
      }

      const credential = GoogleAuthProvider.credential(googleIdToken);
      const firebaseResult = await signInWithCredential(firebaseAuth, credential);

      // Route to phone verification BEFORE calling signInWithFirebase --
      // that call sets AuthContext's `user`, which flips RootNavigator
      // straight to MainNavigator and unmounts this whole AuthStack, so any
      // navigation.navigate() to PhoneVerification after it is a no-op on a
      // torn-down stack. Checking the Firebase user's own phoneNumber here
      // (rather than asking the backend) keeps us inside AuthStack until
      // phone verification is actually done.
      if (!firebaseResult.user.phoneNumber) {
        navigation.navigate("PhoneVerification", { fromGoogleSignIn: true });
        return;
      }

      const backendIdToken = await firebaseResult.user.getIdToken();
      await signInWithFirebase(backendIdToken);
    } catch (err) {
      setError(formatApiError(err, language));
    } finally {
      setIsGoogleSubmitting(false);
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

      <View style={styles.topRightLangContainer}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo & Headline Box */}
        <View style={styles.headerBox}>
          <BuddyLogo size={95} showText={true} />
          <Text style={styles.headerTitle}>
            {language === "en" ? "Find Your Activity Buddy 🚀" : "Etkinlik Arkadaşını Keşfet 🚀"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === "en"
              ? "Never go alone! Connect with like-minded friends for concerts, coffee & events."
              : "Konser, kahve ve sohbet kankanı bul, etkinlikleri tek başına kaçırma!"}
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <View style={styles.formBox}>
            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                (isGoogleSubmitting || !googleRequest) && { opacity: 0.7 },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleSubmitting || !googleRequest}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={language === "en" ? "Continue with Google" : "Google ile Devam Et"}
            >
              <GoogleIcon size={20} />
              <Text style={styles.googleButtonText}>
                {isGoogleSubmitting
                  ? (language === "en" ? "Signing in..." : "Giriş yapılıyor...")
                  : (language === "en" ? "Continue with Google" : "Google ile Devam Et")}
              </Text>
            </Pressable>

            {/* Divider Line */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {language === "en" ? "or" : "veya"}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.emailButtonTouch,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => navigation.navigate("Login")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={language === "en" ? "Continue with Email" : "E-posta ile Devam Et"}
            >
              <LinearGradient
                colors={["#6C4CF1", "#FF6B6B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emailButtonGradient}
              >
                <Feather name="mail" size={18} color={colors.surface} style={{ marginRight: 8 }} />
                <Text style={styles.emailButtonText}>
                  {language === "en" ? "Continue with Email" : "E-posta ile Devam Et"}
                </Text>
              </LinearGradient>
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
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
  topRightLangContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 40,
    right: spacing.lg,
    zIndex: 999,
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
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: spacing.xxl,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  headerTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 23,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  headerSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...shadows.soft,
  },
  googleButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: "#1E293B",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "#94A3B8",
    paddingHorizontal: spacing.md,
  },
  emailButtonTouch: {
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.card,
  },
  emailButtonGradient: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  emailButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
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
});

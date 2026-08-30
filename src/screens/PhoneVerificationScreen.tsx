import { useRef, useState } from "react";
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
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import {
  PhoneAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from "firebase/auth";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { BuddyLogo } from "../components/ui/BuddyLogo";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { formatApiError } from "../utils/error";
import { firebaseAuth, firebaseConfig } from "../config/firebase";
import { getCurrentUser } from "../api/users";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

const PHONE_REGEX = /^\+?\d{10,15}$/;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "PhoneVerification">;
type ScreenRouteProp = RouteProp<AuthStackParamList, "PhoneVerification">;

export function PhoneVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { fromSocialSignIn } = route.params;
  const { signInWithFirebase } = useAuth();
  const { language, t } = useAppTheme();

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendCode(): Promise<void> {
    setError(null);
    const normalized = phoneNumber.trim().replace(/[\s()-]/g, "");
    if (!PHONE_REGEX.test(normalized)) {
      setError(
        t("pleaseEnterAValidPhone")
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const phoneProvider = new PhoneAuthProvider(firebaseAuth);
      const id = await phoneProvider.verifyPhoneNumber(normalized, recaptchaVerifier.current!);
      setVerificationId(id);
      setStep("code");
    } catch (err) {
      setError(formatApiError(err, language));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmCode(): Promise<void> {
    if (!verificationId) return;
    setError(null);
    if (code.trim().length < 6) {
      setError(t("enterThe6digitCode"));
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.trim());

      // A Google/Apple sign-in already left us with a signed-in Firebase user
      // (just missing phone verification) -- linking keeps the same
      // firebase_uid so the backend updates that same account instead of
      // provisioning a second, duplicate one for the phone credential.
      const firebaseResult =
        fromSocialSignIn && firebaseAuth.currentUser
          ? await linkWithCredential(firebaseAuth.currentUser, credential)
          : await signInWithCredential(firebaseAuth, credential);

      const backendIdToken = await firebaseResult.user.getIdToken();
      await signInWithFirebase(backendIdToken);
      await getCurrentUser();
      // MainNavigator already routes incomplete profiles to Onboarding.
    } catch (err) {
      setError(formatApiError(err, language));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
          <View style={styles.headerBox}>
            <BuddyLogo size={72} showText={false} />
            <Text style={styles.title}>
              {t("verifyYourPhone")}
            </Text>
            <Text style={styles.subtitle}>
              {step === "phone"
                ? (t("weNeedToVerifyYour"))
                : (t("enterTheCodeSentTo", { p0: phoneNumber }))}
            </Text>
          </View>

          <View style={styles.formBox}>
            {step === "phone" ? (
              <View style={styles.inputWrapper}>
                <Feather name="phone" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t("phoneNumberEg905xxxxxxxxx")}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t("6digitCode")}
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                />
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && { opacity: 0.9 },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={step === "phone" ? handleSendCode : handleConfirmCode}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting
                  ? (t("pleaseWait"))
                  : step === "phone"
                    ? (t("sendCode"))
                    : (t("verify"))}
              </Text>
            </Pressable>

            {step === "code" ? (
              <Pressable onPress={() => setStep("phone")} style={{ alignItems: "center", marginTop: spacing.sm }}>
                <Text style={styles.changeNumberText}>
                  {t("changePhoneNumber")}
                </Text>
              </Pressable>
            ) : null}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  headerBox: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 36,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    color: "#1E293B",
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: spacing.lg,
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
  button: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  changeNumberText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: "#64748B",
    textDecorationLine: "underline",
  },
});

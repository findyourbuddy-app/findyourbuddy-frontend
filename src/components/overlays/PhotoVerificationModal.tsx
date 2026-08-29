import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../ui/PrimaryButton";
import { uploadMedia, verifyPhotoWithVision } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import { Alert } from "../../utils/alert";

interface PhotoVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "intro" | "preview";

export function PhotoVerificationModal({
  visible,
  onClose,
  onSuccess,
}: PhotoVerificationModalProps) {
  const { user, updateUser } = useAuth();
  const { accentColor, language, t } = useAppTheme();

  const [step, setStep] = useState<Step>("intro");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [acceptedKvkk, setAcceptedKvkk] = useState(false);

  const resetState = () => {
    setStep("intro");
    setCapturedUri(null);
    setAcceptedKvkk(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleLaunchCamera = async () => {
    if (!acceptedKvkk) {
      Alert.alert(
        language === "en" ? "Consent Required" : "Açık Rıza Gerekli",
        language === "en"
          ? "Please accept the KVKK biometric data processing consent to proceed."
          : "Devam edebilmek için lütfen KVKK biyometrik veri işleme açık rıza metnini onaylayın."
      );
      return;
    }

    if (!user?.photo_url) {
      Alert.alert(
        language === "en" ? "Profile Photo Required" : "Profil Fotoğrafı Gerekli",
        language === "en"
          ? "Please upload a main profile photo before verifying your identity."
          : "Doğrulama yapabilmek için lütfen önce ana profil fotoğrafı yükleyin."
      );
      return;
    }

    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== "granted") {
        Alert.alert(
          language === "en" ? "Camera Permission Needed" : "Kamera İzni Gerekli",
          language === "en"
            ? "Camera permission is required to take a live verification selfie."
            : "Mavi Tik doğrulaması için ön kamera ile selfie çekilmesi gerekmektedir."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.front,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setCapturedUri(result.assets[0].uri);
        setStep("preview");
      }
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Hata",
        language === "en" ? "Could not open camera." : "Kamera açılırken bir sorun oluştu."
      );
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!capturedUri) return;

    const uriToUpload = capturedUri;

    // 1. Instantly set status to pending in local user state
    if (user) {
      updateUser({
        ...user,
        verification_status: "pending",
      });
    }

    // 2. Alert user and close modal immediately so user isn't blocked waiting
    Alert.alert(
      language === "en" ? "Verification Submitted!" : "Doğrulama Alındı!",
      language === "en"
        ? "Your selfie was received. AI vision verification is processing in the background."
        : "Selfie fotoğrafınız alındı! Yapay zeka doğrulaması arka planda devam ediyor. Tamamlandığında Mavi Tik rozetiniz aktif edilecektir."
    );
    handleClose();

    // 3. Process AI verification asynchronously in background
    try {
      const fileName = uriToUpload.split("/").pop() || "selfie.jpg";
      const uploadRes = await uploadMedia(uriToUpload, fileName);
      const res = await verifyPhotoWithVision(uploadRes.url);

      if (res.verified && user) {
        updateUser({
          ...user,
          is_verified: true,
          verification_status: "verified",
        });
        Alert.alert(
          language === "en" ? "Profile Verified!" : "Profiliniz Doğrulandı!",
          language === "en"
            ? "Congratulations! Your profile has been verified with a blue checkmark."
            : "Tebrikler! Profiliniz Yapay Zeka tarafından başarıyla doğrulandı ve Mavi Tik rozeti tanımlandı."
        );
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch {
      // background error handled gracefully
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Feather name="x" size={20} color={colors.textSecondary} />
          </Pressable>

          {/* STEP 1: INTRO */}
          {step === "intro" && (
            <View style={styles.stepContainer}>
              <View style={[styles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
                <Feather name="check-circle" size={36} color={accentColor} />
              </View>
              <Text style={typeScale.h1}>
                {language === "en" ? "Verify Profile" : "Profilini Doğrula"}
              </Text>
              <Text style={styles.bodyText}>
                {language === "en"
                  ? "Take a live selfie to compare against your profile photos with AI Vision to verify your identity."
                  : "Yapay Zeka Vision teknolojisi ile anlık çekeceğin selfie, yüklediğin profil fotoğraflarıyla karşılaştırılacak ve hesabın doğrulanacaktır."}
              </Text>
              <Pressable
                style={styles.consentRow}
                onPress={() => setAcceptedKvkk(!acceptedKvkk)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedKvkk }}
              >
                <Feather
                  name={acceptedKvkk ? "check-square" : "square"}
                  size={18}
                  color={acceptedKvkk ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.consentText}>
                  {language === "en"
                    ? "I explicitly consent to the processing of my facial biometric data for identity verification (KVKK)."
                    : "Biyometrik yüz verimin Mavi Tik doğrulaması amacıyla işlenmesine açık rıza veriyorum (KVKK m.6)."}
                </Text>
              </Pressable>
              <View style={styles.actionGroup}>
                <PrimaryButton
                  label={language === "en" ? "Take Live Selfie" : "Canlı Selfie Çek"}
                  variant="accent"
                  onPress={handleLaunchCamera}
                />
                <PrimaryButton label={t("cancel")} variant="outline" onPress={handleClose} />
              </View>
            </View>
          )}

          {/* STEP 2: PREVIEW & CONFIRMATION */}
          {step === "preview" && capturedUri && (
            <View style={styles.stepContainer}>
              <Text style={typeScale.h1}>
                {language === "en" ? "Review Selfie Photo" : "Selfie Fotoğrafı Kontrolü"}
              </Text>
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} />
              </View>
              <Text style={styles.bodyText}>
                {language === "en"
                  ? "Confirm to send this selfie for AI Vision verification in the background."
                  : "Bu selfie fotoğrafını profil doğrulaması için Yapay Zeka Vision sistemine göndermeyi onaylıyor musunuz?"}
              </Text>

              <View style={styles.actionGroup}>
                <PrimaryButton
                  label={language === "en" ? "Confirm & Submit" : "Onayla ve Gönder"}
                  variant="accent"
                  onPress={handleConfirmAndSubmit}
                />
                <PrimaryButton
                  label={language === "en" ? "Retake" : "Yeniden Çek"}
                  variant="outline"
                  onPress={handleLaunchCamera}
                />
                <PrimaryButton label={t("cancel")} variant="outline" onPress={handleClose} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    position: "relative",
    ...shadows.card,
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  stepContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  bodyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  imagePreviewWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.primary,
    marginVertical: spacing.xs,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  actionGroup: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  consentText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});

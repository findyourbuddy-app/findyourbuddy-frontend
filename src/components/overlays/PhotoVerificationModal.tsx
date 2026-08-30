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
        t("consentRequired"),
        t("pleaseAcceptTheKvkkBiometric")
      );
      return;
    }

    if (!user?.photo_url) {
      Alert.alert(
        t("profilePhotoRequired"),
        t("pleaseUploadAMainProfile")
      );
      return;
    }

    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== "granted") {
        Alert.alert(
          t("cameraPermissionNeeded"),
          t("cameraPermissionIsRequiredTo")
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
        t("error"),
        t("couldNotOpenCamera")
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
      t("verificationSubmitted"),
      t("yourSelfieWasReceivedAi")
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
          t("profileVerified"),
          t("congratulationsYourProfileHasBeen")
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
                {t("verifyProfile")}
              </Text>
              <Text style={styles.bodyText}>
                {t("takeALiveSelfieTo")}
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
                  {t("iExplicitlyConsentToThe")}
                </Text>
              </Pressable>
              <View style={styles.actionGroup}>
                <PrimaryButton
                  label={t("takeLiveSelfie")}
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
                {t("reviewSelfiePhoto")}
              </Text>
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} />
              </View>
              <Text style={styles.bodyText}>
                {t("confirmToSendThisSelfie")}
              </Text>

              <View style={styles.actionGroup}>
                <PrimaryButton
                  label={t("confirmSubmit")}
                  variant="accent"
                  onPress={handleConfirmAndSubmit}
                />
                <PrimaryButton
                  label={t("retake")}
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

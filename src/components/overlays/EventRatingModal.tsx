import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { rateEvent } from "../../api/events";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import { Alert } from "../../utils/alert";

interface EventRatingModalProps {
  visible: boolean;
  eventId: number;
  eventTitle: string;
  creatorName?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EventRatingModal({
  visible,
  eventId,
  eventTitle,
  creatorName,
  onClose,
  onSuccess,
}: EventRatingModalProps) {
  const { language, t } = useAppTheme();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await rateEvent(eventId, rating, comment.trim() ? comment.trim() : undefined);
      Alert.alert(
        t("thankYou"),
        t("yourFeedbackAndRatingHave")
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (t("couldNotSubmitRatingYou"));
      Alert.alert(t("notice"), msg);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdropOverlay} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.badgePill}>
              <Feather name="star" size={14} color={colors.accentYellow} />
              <Text style={styles.badgePillText}>
                {t("eventFeedback")}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.subtitle}>
            {creatorName
              ? (t("howWasYourExperienceWith", { p0: creatorName }))
              : (t("howWasYourExperienceAt"))}
          </Text>

          {/* Star Rating Control */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= rating;
              return (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starTouch}
                >
                  <Feather
                    name="star"
                    size={36}
                    color={isFilled ? colors.accentYellow : colors.border}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.ratingTextLabel}>
            {rating === 5
              ? (t("mkemmel55"))
              : rating === 4
              ? (t("okIyi45"))
              : rating === 3
              ? (t("ortalama35"))
              : rating === 2
              ? (t("ktydi25"))
              : (t("okKt15"))}
          </Text>

          {/* Comment Input */}
          <TextInput
            style={styles.commentInput}
            multiline
            placeholder={
              t("writeACommentAboutThe")
            }
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            maxLength={300}
          />

          <Pressable
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {t("submitFeedback")}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.accentYellow}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgePillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  eventTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  starTouch: {
    padding: spacing.xs,
  },
  ratingTextLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  commentInput: {
    width: "100%",
    height: 80,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  submitBtn: {
    width: "100%",
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

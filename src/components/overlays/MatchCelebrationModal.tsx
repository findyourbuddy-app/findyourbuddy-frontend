import { Modal, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../ui/Avatar";
import { PrimaryButton } from "../ui/PrimaryButton";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import type { UserPublic } from "../../types";

import { useAppTheme } from "../../context/ThemeContext";

interface MatchCelebrationModalProps {
  matchedUser: UserPublic | null;
  onSendMessage: () => void;
  onDismiss: () => void;
}

export function MatchCelebrationModal({
  matchedUser,
  onSendMessage,
  onDismiss,
}: MatchCelebrationModalProps) {
  const { t, language } = useAppTheme();

  return (
    <Modal visible={matchedUser !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t("itsAMatch")}</Text>
          {matchedUser ? (
            <>
              <Avatar name={matchedUser.display_name} photoUrl={matchedUser.photo_url} size={88} />
              <Text style={[typeScale.h1, styles.title]}>
                {t("youMatchedWithP0", { p0: matchedUser.display_name })}
              </Text>
              <Text style={styles.subtitle}>
                {t("sendAMessageAndPlan")}
              </Text>
              <View style={styles.actions}>
                <PrimaryButton label={t("sendMessage")} onPress={onSendMessage} />
                <PrimaryButton label={t("close")} variant="outline" onPress={onDismiss} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: "center",
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  actions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

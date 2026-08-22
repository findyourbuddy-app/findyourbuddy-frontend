import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PrimaryButton } from "../ui/PrimaryButton";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../../theme";
import { useAppTheme } from "../../context/ThemeContext";

interface StealthModeInfoModalProps {
  visible: boolean;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  onClose: () => void;
}

export function StealthModeInfoModal({
  visible,
  isEnabled,
  onToggle,
  onClose,
}: StealthModeInfoModalProps) {
  const { language } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 36 }}>👻</Text>
            <View style={styles.statusBadge}>
              <Feather name={isEnabled ? "eye-off" : "eye"} size={12} color="#FFF" />
            </View>
          </View>

          <Text style={typeScale.h1}>
            {language === "en" ? "Ghost Stealth Mode 👻" : "Gizli Gezinme Modu 👻"}
          </Text>

          <Text style={styles.subtitle}>
            {language === "en"
              ? "Browse profiles and events without leaving a trace."
              : "Profillerde ve etkinliklerde hiç iz bırakmadan özgürce gez!"}
          </Text>

          {/* Dummy Profile Preview Card */}
          <View style={styles.previewCard}>
            <Text style={styles.previewHeader}>
              {language === "en" ? "DECK PREVIEW (HOW YOU APPEAR)" : "DUMMY ÖNİZLEME (NASIL GÖRÜNÜRSÜN?)"}
            </Text>

            <View style={styles.dummyProfileRow}>
              <View style={styles.dummyAvatar}>
                <Text style={{ fontSize: 24 }}>🥷</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.dummyName}>
                  {isEnabled ? (language === "en" ? "Hidden Buddy 👻" : "Gizli Kanka 👻") : "Ahmet K. (Normal)"}
                </Text>
                <Text style={styles.dummySubtext}>
                  {isEnabled
                    ? (language === "en" ? "Invisible mode active" : "Görünmez mod aktif • İz Bırakmaz")
                    : (language === "en" ? "Publicly visible" : "Herkes görebilir")}
                </Text>
              </View>
              <View style={[styles.activePill, isEnabled && styles.activePillStealth]}>
                <Text style={styles.activePillText}>
                  {isEnabled ? "GİZLİ 👻" : "AÇIK 👁️"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.perksList}>
            <View style={styles.perkItem}>
              <View style={styles.perkIconBadge}>
                <Feather name="shield" size={14} color={colors.primary} />
              </View>
              <Text style={styles.perkText}>
                {language === "en"
                  ? "Only users you LIKE will see your real profile."
                  : "Sadece senin BEĞENDİĞİN kişiler gerçek profilini görebilir."}
              </Text>
            </View>
            <View style={styles.perkItem}>
              <View style={styles.perkIconBadge}>
                <Feather name="eye-off" size={14} color={colors.primary} />
              </View>
              <Text style={styles.perkText}>
                {language === "en"
                  ? "Zero profile view notifications are sent."
                  : "İncelediğin profillere hiç iz veya bildirim bırakmazsın."}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={
                isEnabled
                  ? (language === "en" ? "Turn Off Stealth Mode" : "Gizli Gezinmeyi Kapat")
                  : (language === "en" ? "Activate Stealth Mode ✨" : "Gizli Gezinmeyi Başlat ✨")
              }
              variant={isEnabled ? "outline" : "accent"}
              onPress={() => {
                onToggle(!isEnabled);
                onClose();
              }}
            />
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>{language === "en" ? "Close" : "Kapat"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card * 1.5,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.card,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: -spacing.xs,
  },
  previewCard: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  dummyProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dummyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dummyName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dummySubtext: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  activePillStealth: {
    backgroundColor: colors.primary,
  },
  activePillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.surface,
  },
  perksList: {
    width: "100%",
    gap: spacing.xs,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  perkIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  perkText: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  actions: {
    width: "100%",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  closeBtn: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  closeBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

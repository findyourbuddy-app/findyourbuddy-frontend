import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, shadows, spacing } from "../../theme";

interface TrustScoreInfoModalProps {
  visible: boolean;
  trustScore?: number;
  onClose: () => void;
}

export function TrustScoreInfoModal({
  visible,
  trustScore,
  onClose,
}: TrustScoreInfoModalProps) {
  const { language } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="shield" size={26} color={colors.primary} />
            </View>
            <Text style={styles.title}>
              {language === "en" ? "Trust Score Guide" : "Güven Skoru Rehberi"}
            </Text>
            {trustScore !== undefined ? (
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>
                  {language === "en" ? `Score: ${trustScore}/100` : `Skor: ${trustScore}/100`}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.description}>
            {language === "en"
              ? "Trust Score measures user authenticity, attendance reliability, and community respect."
              : "Güven Skoru, kullanıcının gerçekliğini, etkinlik devamlılığını ve topluluk içindeki saygınlığını temsil eden 0-100 arası puan sistemidir."}
          </Text>

          <View style={styles.list}>
            <View style={styles.item}>
              <Feather name="check-circle" size={16} color="#1DA1F2" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Profile Photo Verification (+25 Pts)" : "Mavi Tik Profil Doğrulaması (+25 Puan)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "AI selfie matching for authentic profile check." : "Yapay zeka selfie eşlemesiyle kimlik onayı."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="smartphone" size={16} color="#27AE60" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Phone & Email Verification (+15 Pts)" : "Telefon & E-posta Onayı (+15 Puan)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Verified contact details." : "Doğrulanmış iletişim kanalları."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="star" size={16} color="#F1C40F" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Event Attendance & Positive Rating (+20 Pts)" : "Etkinlik Katılımı & Olumlu Değerlendirme (+20 Puan)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Attending events on time and receiving positive ratings." : "Zamanında katılım ve kankalardan yüksek puan alma."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="alert-triangle" size={16} color="#E74C3C" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "No-Show & Rule Violations (-30 Pts)" : "Sebepsiz Katılmama veya İhlal (-30 Puan)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Unexcused event absences or community reports." : "Etkinliğe gelmeme veya topluluk şikayetleri."}
                </Text>
              </View>
            </View>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>
              {language === "en" ? "Got It" : "Anladım"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  scorePill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  scorePillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm + 2,
    marginVertical: spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  itemSub: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  closeBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.surface,
  },
});

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
              ? "A 0-100 score recalculated from your real activity: verification, showing up to events, ratings from other buddies, and any reports. It always reflects your current standing -- a rough patch can be recovered."
              : "Doğrulama, etkinliklere katılım, kankalardan aldığın puanlar ve şikayetler gibi gerçek verilerden yeniden hesaplanan 0-100 arası bir puandır. Her zaman güncel durumunu yansıtır -- kötü bir dönem sonradan telafi edilebilir."}
          </Text>

          <View style={styles.list}>
            <View style={styles.item}>
              <Feather name="check-circle" size={16} color="#1DA1F2" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Photo verification (+25)" : "Selfie/foto doğrulaması (+25)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "AI selfie match. Phone (+8) and account (+5) verification add more." : "AI selfie eşlemesi. Telefon (+8) ve hesap (+5) doğrulaması da ekler."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="calendar" size={16} color="#27AE60" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Showing up (up to +15)" : "Etkinliklere katılım (+15'e kadar)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Your check-in rate for events you RSVP'd to." : "Katılacağım dediğin etkinliklere gerçekten gitme oranın."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="star" size={16} color="#F1C40F" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "Buddy ratings & meetups (±12, +8)" : "Kanka puanları & buluşmalar (±12, +8)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Average rating you get as an event host, plus confirmed real-life meetups." : "Etkinlik düzenleyen olarak aldığın ortalama puan ve doğrulanmış gerçek buluşmalar."}
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <Feather name="alert-triangle" size={16} color="#E74C3C" style={styles.itemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {language === "en" ? "No-shows, reports & blocks (down to -30)" : "Gelmeme, şikayet & engellenme (-30'a kadar)"}
                </Text>
                <Text style={styles.itemSub}>
                  {language === "en" ? "Unexcused absences and community reports lower your score." : "Sebepsiz katılmama ve topluluk şikayetleri skorunu düşürür."}
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

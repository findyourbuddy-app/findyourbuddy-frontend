import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";

interface GuidelineItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  shortDesc: string;
  longDesc: string;
  accentColor: string;
}

const GUIDELINES: GuidelineItem[] = [
  {
    id: "respect",
    icon: "heart",
    title: "Saygı ve Nezaket",
    shortDesc: "Diğer üyelere her zaman kibar ve hoşgörülü davranın.",
    longDesc: "FindYourBuddy, herkesin güvende hissettiği bir topluluktur. Din, dil, ırk, cinsiyet veya fiziksel özellikler üzerinden yapılacak ayrımcılıklar, kaba davranışlar veya aşağılamalar kesinlikle tolere edilmez. Biriyle eşleştiğinizde konuşmaya kibar bir selamla başlayın.",
    accentColor: colors.primary,
  },
  {
    id: "safety",
    icon: "shield",
    title: "Güvenlik ve Gizlilik",
    shortDesc: "Kişisel verilerinizi hemen paylaşmayın ve temkinli olun.",
    longDesc: "Telefon numaranız, ev adresiniz veya sosyal medya hesaplarınız gibi hassas bilgileri hemen paylaşmamanızı öneririz. Biriyle ilk kez buluşurken mutlaka halka açık, kalabalık yerleri tercih edin ve güvendiğiniz bir arkadaşınıza buluşma detaylarını iletin.",
    accentColor: "#2E7FC9",
  },
  {
    id: "honesty",
    icon: "user-check",
    title: "Gerçek ve Dürüst Profiller",
    shortDesc: "Kendi fotoğraflarınızı ve doğru bilgilerinizi kullanın.",
    longDesc: "Başkalarının fotoğraflarını kullanmak, sahte yaş belirtmek veya başkası gibi davranmak topluluktan süresiz uzaklaştırılma sebebidir. Güvenilir bir topluluk için kendiniz olun. Profilinizi doğrulayarak diğer üyelere gerçek olduğunuzu kanıtlayabilirsiniz.",
    accentColor: colors.accentYellow,
  },
  {
    id: "spam",
    icon: "slash",
    title: "Sıfır Tolerans (Spam & Taciz)",
    shortDesc: "Yasa dışı paylaşımlar, reklam ve tacizin cezası engellenmedir.",
    longDesc: "Uygulama içinde herhangi bir ürün/hizmet satışı yapmak, kişileri taciz etmek, cinsellik veya şiddet içeren görseller/mesajlar göndermek yasaktır. Bu tür durumlarla karşılaştığınızda kullanıcıyı profilindeki 'Rapor Et' butonunu kullanarak anında bildirebilirsiniz.",
    accentColor: "#E15252",
  },
];

import { useAppTheme } from "../context/ThemeContext";

export function CommunityGuidelinesScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { bgGradient, language } = useAppTheme();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
      <Text style={typeScale.display}>Topluluk Kuralları</Text>
      <Text style={styles.subtitle}>
        FindYourBuddy topluluğunun tüm üyeleri için daha güvenli, samimi ve keyifli bir ortam yaratmak adına lütfen aşağıdaki kurallara özen gösterin.
      </Text>

      <View style={styles.list}>
        {GUIDELINES.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                isExpanded && { borderColor: item.accentColor, borderWidth: 1.5 },
              ]}
              onPress={() => toggleExpand(item.id)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: `${item.accentColor}20` }]}>
                  <Feather name={item.icon} size={20} color={item.accentColor} />
                </View>
                <View style={styles.headerText}>
                  <Text style={typeScale.h2}>{item.title}</Text>
                  {!isExpanded && <Text style={styles.shortDesc}>{item.shortDesc}</Text>}
                </View>
                <Feather
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </View>

              {isExpanded && (
                <View style={styles.cardBody}>
                  <View style={[styles.divider, { backgroundColor: `${item.accentColor}40` }]} />
                  <Text style={styles.longDesc}>{item.longDesc}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 60,
    gap: spacing.lg,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  shortDesc: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardBody: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  longDesc: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});

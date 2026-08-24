import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { apiClient } from "../api/client";
import { createCheckoutSession } from "../api/subscriptions";
import { VoiceNotePlayer } from "../components/ui/VoiceNotePlayer";
import { resolvePhotoUrl } from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, shadows, spacing } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User } from "../types";

import { useAppTheme } from "../context/ThemeContext";

interface Recommendation {
  user: User;
  match_score: number;
}

export function AIRecommendationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isPremium, refreshSubscription } = useAuth();
  const { t, language, bgGradient, accentColor } = useAppTheme();
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (isPremium) {
      fetchRecommendations();
    }
  }, [isPremium]);

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const res = await apiClient.get<Recommendation[]>("/users/me/ai-recommendations");
      setRecommendations(res.data);
    } catch {
      Alert.alert("Hata", "AI önerileri yüklenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setIsUpgrading(true);
    try {
      const { checkout_url } = await createCheckoutSession();
      if (checkout_url) {
        Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ödeme Hatası", "Ödeme linki alınamadı.");
      }
    } catch {
      Alert.alert("Bağlantı Hatası", "Ödeme sayfasına bağlanılamadı.");
    } finally {
      setIsUpgrading(false);
    }
  }

  if (!isPremium) {
    return (
      <ScrollView style={{ backgroundColor: bgGradient[0] }} contentContainerStyle={styles.premiumPromoContainer}>
        <LinearGradient
          colors={["#2D1B6B", "#0F0B26"]}
          style={styles.promoHeaderGradient}
        >
          <Feather name="cpu" size={60} color="#FFD700" style={styles.promoIcon} />
          <Text style={styles.promoTitle}>
            {language === "en" ? "AI Buddy Matcher" : "AI Kanka Eşleştirici"}
          </Text>
          <Text style={styles.promoSubtitle}>
            {language === "en"
              ? "Advanced AI algorithm analyzes your mutual interests, zodiac compatibility, and location to find your ideal buddies."
              : "Gelişmiş yapay zeka algoritması ortak ilgi alanlarınızı, burç uyumunuzu ve konumunuzu analiz ederek en ideal kankalarınızı bulur."}
          </Text>
        </LinearGradient>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="target" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>
                {language === "en" ? "99% Hobbies & Activity Synergy" : "%99 Hobiler & Aktivite Uyum Analizi"}
              </Text>
              <Text style={styles.featureItemDesc}>
                {language === "en"
                  ? "Friendship compatibility is calculated based on intersecting hobbies (Sports, Gaming, Movies, etc.) and shared activities."
                  : "Ortak hobiler (Spor, Oyun, Sinema vb.) ve birlikte yapılmak istenen aktivitelerin kesişimine göre arkadaşlık denkliği hesaplanır."}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="moon" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>
                {language === "en" ? "Astrological Element Synergy" : "Astrolojik Element Sinerjisi"}
              </Text>
              <Text style={styles.featureItemDesc}>
                {language === "en"
                  ? "Personal temperament and energy compatibility is analyzed based on Zodiac element groups (Fire, Earth, Air, Water)."
                  : "Zodyak element gruplarına (Ateş, Toprak, Hava, Su) göre kişisel mizaç ve enerji uyumluluğu analiz edilir."}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="briefcase" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>
                {language === "en" ? "School, Occupation & Lifestyle Alignment" : "Okul, Meslek & Yaşam Tarzı Hizalaması"}
              </Text>
              <Text style={styles.featureItemDesc}>
                {language === "en"
                  ? "Buddies with matching universities, career goals, and social life paces are prioritized."
                  : "Ortak üniversite, kariyer hedefleri ve sosyal yaşam temposuna en uygun kankalar önceliklendirilir."}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="mic" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>
                {language === "en" ? "Profile Voice Intros" : "Profil Ses Kayıtları"}
              </Text>
              <Text style={styles.featureItemDesc}>
                {language === "en"
                  ? "Listen to your potential buddy's voice tone, warmth, and energy before meeting."
                  : "Potansiyel kankanın ses tonunu, samimiyetini ve enerjisini buluşmadan önce dinleme olanağı sunar."}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="sliders" size={20} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>
                {language === "en" ? "Advanced Gender, Age & Distance Filters" : "Gelişmiş Cinsiyet, Yaş & Konum Filtreleri"}
              </Text>
              <Text style={styles.featureItemDesc}>
                {language === "en"
                  ? "Filtering by gender preference (Female / Male / Everyone), specific age range, and distance limit (km) is exclusive to Premium."
                  : "Cinsiyet tercihi (Kadın / Erkek / Herkes), özel yaş aralığı ve mesafe sınırı (km) ile tam hedefindeki kişileri filtrelemek Premium'a özeldir."}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.upgradeBtn}
          onPress={handleUpgrade}
          disabled={isUpgrading}
        >
          <LinearGradient
            colors={[colors.primary, "#8E44AD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBtnGradient}
          >
            {isUpgrading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Feather name="award" size={20} color={colors.surface} />
                <Text style={styles.upgradeBtnText}>
                  {language === "en" ? "Become Premium Buddy ($4.99)" : "Premium Buddy Ol (49 TL)"}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgGradient[0] }]}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>
            {language === "en" ? "Calculating your best matched buddies..." : "En uygun kankaların hesaplanıyor..."}
          </Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="users" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {language === "en"
              ? "No new recommendations found. Please try again later."
              : "Henüz yeni bir öneri bulunamadı. Lütfen daha sonra tekrar deneyin."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {recommendations.map(({ user, match_score }) => (
            <View key={user.id} style={styles.candidateCard}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: user.photo_url || "https://placehold.co/150" }} style={styles.avatar} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.nameText}>
                    {user.display_name}, {user.age || "N/A"}
                  </Text>
                  <Text style={styles.uniText}>
                    {user.university || (language === "en" ? "University Not Specified" : "Üniversite Belirtilmedi")}
                  </Text>
                  
                  {/* Zodiac Element Tag */}
                  {user.zodiac_sign && (
                    <View style={styles.zodiacTag}>
                      <Feather name="sun" size={12} color={colors.primary} />
                      <Text style={styles.zodiacText}>{user.zodiac_sign}</Text>
                    </View>
                  )}
                </View>

                {/* Compatibility Score Gold Badge */}
                <LinearGradient
                  colors={["#FFD700", "#FFA500"]}
                  style={styles.scoreBadge}
                >
                  <Text style={styles.scoreText}>
                    {language === "en" ? `${match_score}% Match` : `%${match_score} Uyum`}
                  </Text>
                </LinearGradient>
              </View>

              {user.bio ? (
                <Text style={styles.bioText} numberOfLines={3}>
                  {user.bio}
                </Text>
              ) : null}

              {user.voice_note_url && (
                <View style={styles.voicePlayerWrapper}>
                  <VoiceNotePlayer audioUrl={resolvePhotoUrl(user.voice_note_url)} />
                </View>
              )}

              {/* Open Profile Button */}
              <Pressable
                style={styles.viewProfileBtn}
                onPress={() => {
                  navigation.navigate("CandidateProfile", {
                    candidate: user,
                    onSwipeLeft: () => {},
                    onSwipeRight: () => {},
                    onSwipeUp: () => {},
                  });
                }}
              >
                <Text style={styles.viewProfileText}>{t("viewMyProfile")}</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loaderText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  candidateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
  },
  nameText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  uniText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  zodiacTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  zodiacText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  scoreText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.surface,
  },
  bioText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  voicePlayerWrapper: {
    marginTop: spacing.xs,
  },
  viewProfileBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  viewProfileText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  premiumPromoContainer: {
    paddingBottom: 40,
    backgroundColor: "#0F0B26",
  },
  promoHeaderGradient: {
    paddingVertical: 50,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  promoIcon: {
    marginBottom: spacing.xs,
  },
  promoTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 26,
    color: colors.surface,
    textAlign: "center",
  },
  promoSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  featuresList: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(108, 92, 231, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureItemTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
  },
  featureItemDesc: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  upgradeBtn: {
    marginHorizontal: spacing.xl,
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.card,
  },
  upgradeBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  upgradeBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.surface,
  },
});

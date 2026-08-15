import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { apiClient } from "../api/client";
import { createCheckoutSession } from "../api/subscriptions";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, shadows, spacing, typeScale } from "../theme";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { User } from "../types";

interface Recommendation {
  user: User;
  match_score: number;
}

export function AIRecommendationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isPremium, refreshSubscription } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);

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

  function handlePlayVoice(userId: number) {
    if (playingVoiceId === userId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(userId);
      // Mock duration release
      setTimeout(() => {
        setPlayingVoiceId((current) => (current === userId ? null : current));
      }, 5000);
    }
  }

  if (!isPremium) {
    return (
      <ScrollView contentContainerStyle={styles.premiumPromoContainer}>
        <LinearGradient
          colors={["#2D1B6B", "#0F0B26"]}
          style={styles.promoHeaderGradient}
        >
          <Feather name="cpu" size={60} color="#FFD700" style={styles.promoIcon} />
          <Text style={styles.promoTitle}>AI Kanka Eşleştirici</Text>
          <Text style={styles.promoSubtitle}>
            Gelişmiş yapay zeka algoritması ortak ilgi alanlarınızı, burç uyumunuzu ve konumunuzu analiz ederek en ideal kankalarınızı bulur.
          </Text>
        </LinearGradient>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="trending-up" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>%99 Eşleşme Analizi</Text>
              <Text style={styles.featureItemDesc}>Ortak hobiler ve aktivite sıklıklarına göre uyumluluk derecesi hesaplanır.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="moon" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Astrolojik Element Uyumu</Text>
              <Text style={styles.featureItemDesc}>Zodyak element gruplarına (Ateş, Toprak, Hava, Su) göre sinerji analizi yapılır.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Feather name="mic" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureItemTitle}>Profil Ses Kayıtları</Text>
              <Text style={styles.featureItemDesc}>Kullanıcıların kendi seslerinden kendilerini tanıttığı kayıtları dinleyin.</Text>
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
                <Text style={styles.upgradeBtnText}>Premium Buddy Ol (💎 49 TL)</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[typeScale.h1, styles.headerTitle]}>🌟 Yapay Zeka Uyum Önerileri</Text>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>En uygun kankaların hesaplanıyor...</Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="users" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Henüz yeni bir öneri bulunamadı. Lütfen daha sonra tekrar deneyin.</Text>
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
                  <Text style={styles.uniText}>{user.university || "Üniversite Belirtilmedi"}</Text>
                  
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
                  <Text style={styles.scoreText}>%{match_score} Uyum</Text>
                </LinearGradient>
              </View>

              {user.bio ? (
                <Text style={styles.bioText} numberOfLines={3}>
                  {user.bio}
                </Text>
              ) : null}

              {/* Voice Note Player Mockup if voice note is present */}
              {user.voice_note_url && (
                <Pressable
                  style={[styles.voicePlayer, playingVoiceId === user.id && styles.voicePlayerActive]}
                  onPress={() => handlePlayVoice(user.id)}
                >
                  <Feather
                    name={playingVoiceId === user.id ? "pause-circle" : "play-circle"}
                    size={28}
                    color={playingVoiceId === user.id ? colors.surface : colors.primary}
                  />
                  <Text
                    style={[
                      styles.voiceText,
                      playingVoiceId === user.id && { color: colors.surface }
                    ]}
                  >
                    {playingVoiceId === user.id ? "Ses Kaydı Oynatılıyor..." : "Ses Tanıtımını Dinle"}
                  </Text>
                </Pressable>
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
                <Text style={styles.viewProfileText}>Profili Görüntüle</Text>
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
  headerTitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  voicePlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  voicePlayerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voiceText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
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

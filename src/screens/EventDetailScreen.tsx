import { useCallback, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import { attendEvent, checkInToEvent, getEvent, uploadEventTicket } from "../api/events";
import { getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { formatEventDate } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "EventDetail">;

export function EventDetailScreen({ route }: Props) {
  const { eventId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isPremium } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isUploadingTicket, setIsUploadingTicket] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      Promise.all([getEvent(eventId), listMyBookmarks()])
        .then(([loadedEvent, bookmarks]) => {
          if (cancelled) return;
          setEvent(loadedEvent);
          setIsBookmarked(bookmarks.some((b) => b.event.id === eventId));
        })
        .catch(() => {
          if (!cancelled) {
            Alert.alert("Bir sorun oluştu", "Etkinlik yüklenemedi. Lütfen tekrar dene.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [eventId])
  );

  async function toggleBookmark(): Promise<void> {
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    try {
      if (wasBookmarked) {
        await deleteBookmark(eventId);
      } else {
        await createBookmark(eventId);
      }
    } catch {
      setIsBookmarked(wasBookmarked);
      Alert.alert("Bir sorun oluştu", "Kaydetme işlemi tamamlanamadı. Lütfen tekrar dene.");
    }
  }

  const handleOpenMap = () => {
    if (!event) return;
    const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
    const latLng = `${event.latitude},${event.longitude}`;
    const label = event.location_name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`
    });
    
    Linking.openURL(url);
  };

  function goToSwipe(): void {
    if (!event) return;
    navigation.navigate("Tabs", {
      screen: "Swipe",
      params: { eventId: event.id, eventTitle: event.title },
    });
  }

  async function handleAttendAndSwipe(): Promise<void> {
    if (!event) return;
    if (event.is_attending) {
      goToSwipe();
      return;
    }
    setIsJoining(true);
    try {
      const updated = await attendEvent(event.id);
      // Stay on this screen after joining -- the attendance verification
      // step below (ticket upload for paid events, GPS check-in for free
      // ones) needs to actually be visible instead of being skipped past.
      setEvent(updated);
    } catch {
      Alert.alert("Bir sorun oluştu", "Etkinliğe katılamadın. Lütfen tekrar dene.");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleCheckIn(): Promise<void> {
    if (!event) return;
    setIsCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum izni gerekli", "Etkinlikte olduğunu doğrulamak için konum iznine ihtiyacımız var.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const updated = await checkInToEvent(event.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setEvent(updated);
      Alert.alert("Katılımın Onaylandı! ✓", "Bu etkinlikte olduğun doğrulandı.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const detail = err.response.data?.detail as string | undefined;
        if (detail?.toLowerCase().includes("far")) {
          Alert.alert("Çok Uzaktasın", "Katılımını onaylamak için etkinlik konumuna yakın olman gerekiyor.");
        } else {
          Alert.alert("Check-in Zamanı Değil", "Check-in sadece etkinlik saatine yakın zamanlarda yapılabilir.");
        }
      } else {
        Alert.alert("Bir sorun oluştu", "Konum alınamadı, tekrar dener misin?");
      }
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleUploadTicket(): Promise<void> {
    if (!event) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Bilet fotoğrafını seçebilmek için galeri iznini açman gerekiyor.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setIsUploadingTicket(true);
    try {
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "ticket.jpg";
      const updated = await uploadEventTicket(event.id, asset.uri, fileName);
      setEvent(updated);
      Alert.alert("Bilet Doğrulandı! ✓", "Biletindeki QR/barkod okundu, katılımın onaylandı.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        Alert.alert(
          "Kod Okunamadı",
          "Bu fotoğraftan bir QR kod/barkod okunamadı. Daha net bir fotoğrafla tekrar dener misin?"
        );
      } else {
        Alert.alert("Bir sorun oluştu", "Bilet yüklenemedi. Lütfen tekrar dene.");
      }
    } finally {
      setIsUploadingTicket(false);
    }
  }

  if (isLoading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const category = getCategoryMeta(event.category);

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={category.gradient} style={StyleSheet.absoluteFill}>
            <View style={styles.bannerIcon}>
              <Feather name={category.icon} size={48} color={colors.surface} />
            </View>
          </LinearGradient>
        )}
        <Pressable style={styles.bookmark} onPress={toggleBookmark}>
          <Feather
            name="bookmark"
            size={20}
            color={isBookmarked ? colors.accentYellow : colors.surface}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={typeScale.display}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatEventDate(event.starts_at)}</Text>
        </View>
        <Pressable style={styles.metaRow} onPress={handleOpenMap}>
          <Feather name="map-pin" size={16} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.primary, textDecorationLine: "underline" }]}>
            {event.location_name}
          </Text>
        </Pressable>
        <View style={styles.metaRow}>
          <Feather name={category.icon} size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{category.label}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name={event.is_paid ? "credit-card" : "gift"} size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{event.is_paid ? "Ücretli (Biletli)" : "Ücretsiz"}</Text>
        </View>
        {event.attendee_count > 0 ? (
          <View style={styles.metaRow}>
            <Feather name="users" size={16} color={colors.primary} />
            <Text style={styles.attendeeText}>
              Katılımcılar: {event.attendee_count} / {event.max_attendees || "Sınırsız"}
            </Text>
          </View>
        ) : event.max_attendees ? (
          <View style={styles.metaRow}>
            <Feather name="users" size={16} color={colors.textSecondary} />
            <Text style={styles.attendeeText}>
              Kontenjan: 0 / {event.max_attendees} kişi
            </Text>
          </View>
        ) : null}

        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        {event.creator && (
          <View style={styles.creatorSection}>
            <Text style={typeScale.eyebrow}>Etkinlik Sahibi</Text>
            {isPremium ? (
              <Pressable
                style={styles.creatorRow}
                onPress={() => {
                  navigation.navigate("CandidateProfile", {
                    candidate: event.creator,
                    onSwipeLeft: () => {},
                    onSwipeRight: () => {},
                    onSwipeUp: () => {},
                  } as any);
                }}
              >
                <Image source={{ uri: event.creator.photo_url || "https://placehold.co/100" }} style={styles.creatorAvatar} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.creatorName}>{event.creator.display_name}</Text>
                  <Text style={styles.creatorUni}>{event.creator.university || "Üniversite Belirtilmedi"}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            ) : (
              <View style={styles.creatorRowLocked}>
                <View style={[styles.creatorAvatar, styles.avatarLocked]}>
                  <Feather name="lock" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.creatorName, styles.lockedText]}>••••••••••••</Text>
                  <Text style={[styles.creatorUni, styles.lockedText]}>•••••••••••••••••••••</Text>
                </View>
                <Pressable
                  style={styles.lockedBadge}
                  onPress={() => navigation.navigate("AIRecommendations")}
                >
                  <Feather name="award" size={12} color={colors.surface} style={{ marginRight: 2 }} />
                  <Text style={styles.lockedBadgeText}>Premium ile Gör 🔓</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <PrimaryButton
          label={event.is_attending ? "Kankaları Gör" : "Bu Etkinliğe Gidiyorum"}
          onPress={handleAttendAndSwipe}
          loading={isJoining}
        />

        {event.is_attending ? (
          event.is_paid ? (
            event.is_ticket_verified ? (
              <View style={styles.checkedInBadge}>
                <Feather name="check-circle" size={16} color="#2ECC71" />
                <Text style={styles.checkedInText}>Bilet doğrulandı ✓</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <PrimaryButton
                  label="Bilet QR Kodunu Yükle"
                  onPress={handleUploadTicket}
                  loading={isUploadingTicket}
                  variant="outline"
                />
                <Text style={styles.helperText}>
                  Bu etkinlik ücretli olduğu için katılımın, bilet üzerindeki QR/barkod okunarak doğrulanır.
                </Text>
              </View>
            )
          ) : event.is_checked_in ? (
            <View style={styles.checkedInBadge}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.checkedInText}>Etkinlikte olduğun doğrulandı ✓</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Etkinlikteyim, Katılımımı Onayla"
              onPress={handleCheckIn}
              loading={isCheckingIn}
              variant="outline"
            />
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  banner: {
    height: 220,
  },
  bannerIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  attendeeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  creatorSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  creatorRowLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
  },
  avatarLocked: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    opacity: 0.7,
  },
  creatorName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  creatorUni: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  lockedText: {
    opacity: 0.3,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  lockedBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: colors.surface,
  },
  checkedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  checkedInText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#2ECC71",
  },
  helperText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

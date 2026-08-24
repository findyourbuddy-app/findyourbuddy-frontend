import { useCallback, useRef, useState } from "react";
import { Animated, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { openAddToCalendar } from "../utils/calendar";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Badge } from "../components/ui/Badge";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { createBookmark, deleteBookmark, listMyBookmarks } from "../api/bookmarks";
import {
  attendEvent,
  checkInToEvent,
  getEvent,
  listJoinRequests,
  respondToJoinRequest,
} from "../api/events";
import { Avatar } from "../components/ui/Avatar";
import { DoubleBuddyModal } from "../components/overlays/DoubleBuddyModal";
import { EventOrganizerApprovalModal } from "../components/overlays/EventOrganizerApprovalModal";
import { FormattedHtmlText } from "../components/ui/FormattedHtmlText";
import { getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { cleanHtmlText } from "../utils/text";
import { formatEventDate } from "../utils/date";
import { hasValidCoordinates } from "../utils/location";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event, User } from "../types";

import { useAppTheme } from "../context/ThemeContext";

type Props = NativeStackScreenProps<MainStackParamList, "EventDetail">;

export function EventDetailScreen({ route }: Props) {
  const { eventId, initialEvent } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user, isPremium } = useAuth();
  const { t, accentColor, bgGradient, language } = useAppTheme();
  const [event, setEvent] = useState<Event | null>(initialEvent ? (initialEvent as Event) : null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialEvent);
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [joinRequests, setJoinRequests] = useState<User[]>([]);
  const [respondingUserId, setRespondingUserId] = useState<number | null>(null);
  const [doubleBuddyVisible, setDoubleBuddyVisible] = useState(false);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);

  const isOwnerOfGroupEvent = Boolean(
    event && event.is_group_event && user && event.creator_id === user.id
  );

  const refreshJoinRequests = useCallback(async (eventIdToLoad: number) => {
    try {
      const requests = await listJoinRequests(eventIdToLoad);
      setJoinRequests(requests);
    } catch {
      // Best-effort; not critical to the rest of the screen.
    }
  }, []);

  async function handleJoinRequestResponse(requesterId: number, approved: boolean): Promise<void> {
    if (!event) return;
    setRespondingUserId(requesterId);
    try {
      const updated = await respondToJoinRequest(event.id, requesterId, approved);
      setEvent(updated);
      setJoinRequests((current) => current.filter((requester) => requester.id !== requesterId));
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Response to request failed. Please try again." : "İstek yanıtlanamadı. Lütfen tekrar dene."
      );
    } finally {
      setRespondingUserId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!event || event.id !== eventId) {
        setIsLoading(true);
      }
      Promise.all([getEvent(eventId), listMyBookmarks()])
        .then(([loadedEvent, bookmarks]) => {
          if (cancelled) return;
          setEvent(loadedEvent);
          setIsBookmarked(bookmarks.some((b) => b.event.id === eventId));
          if (loadedEvent.is_group_event && user && loadedEvent.creator_id === user.id) {
            refreshJoinRequests(eventId);
          }
        })
        .catch(() => {
          if (!cancelled && (!event || event.id !== eventId)) {
            Alert.alert(
              language === "en" ? "Error" : "Bir sorun oluştu",
              language === "en" ? "Event could not be loaded. Please try again." : "Etkinlik yüklenemedi. Lütfen tekrar dene."
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [eventId, user, refreshJoinRequests, event])
  );

  const bookmarkScale = useRef(new Animated.Value(1)).current;

  async function toggleBookmark(): Promise<void> {
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    Animated.sequence([
      Animated.timing(bookmarkScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(bookmarkScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
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

  async function goToSwipe(): Promise<void> {
    if (!event) return;
    try {
      const { getSwipeCandidates, createSwipe } = require("../api/swipes");
      const candidates = await getSwipeCandidates(event.id);
      if (candidates && candidates.length > 0) {
        const openCandidate = (index: number) => {
          if (index >= candidates.length) {
            Alert.alert("Tebrikler!", "Bu etkinlik için tüm adayları gördün 🎉");
            return;
          }
          const cand = candidates[index];
          navigation.navigate("CandidateProfile", {
            candidate: cand,
            eventTitle: event.title,
            onExitGroupSwipe: () => {
              navigation.popToTop();
            },
            onSwipeLeft: async () => {
              try { await createSwipe({ target_id: cand.id, event_id: event.id, direction: "pass" }); } catch {}
              openCandidate(index + 1);
            },
            onSwipeRight: async () => {
              try { await createSwipe({ target_id: cand.id, event_id: event.id, direction: "like" }); } catch {}
              openCandidate(index + 1);
            },
            onSwipeUp: async () => {
              try { await createSwipe({ target_id: cand.id, event_id: event.id, direction: "super_like" }); } catch {}
              openCandidate(index + 1);
            },
          });
        };
        openCandidate(0);
        return;
      } else {
        Alert.alert("Henüz Aday Yok", "Bu etkinliğe katılan henüz başka aday bulunmuyor.");
        return;
      }
    } catch {
      Alert.alert("Bilgi", "Adaylar yüklenirken bir sorun oluştu.");
    }
  }

  async function handleAttendAndSwipe(): Promise<void> {
    if (!event) return;
    if (event.is_attending) {
      await goToSwipe();
      return;
    }
    if (event.is_pending) return;
    setIsJoining(true);
    try {
      const updated = await attendEvent(event.id);
      setEvent(updated);
      if (updated.is_pending) {
        Alert.alert(
          language === "en" ? "Request Sent" : "İstek Gönderildi",
          language === "en"
            ? "Your request was sent to the organizer. You'll be notified once it's approved."
            : "İsteğin organizatöre gönderildi. Onaylanınca bilgilendirileceksin."
        );
      }
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Could not join event. Please try again." : "Etkinliğe katılamadın. Lütfen tekrar dene."
      );
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
      Alert.alert("Katılımın Onaylandı!", "Bu etkinlikte olduğun doğrulandı.");
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

  if (isLoading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const category = getCategoryMeta(event.category, language);

  return (
    <>
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
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
        {event.creator_id ? (
          <View style={styles.badgeSlot}>
            <Badge label={language === "en" ? "User Event" : "Kullanıcı Etkinliği"} variant="primary" />
          </View>
        ) : null}
        <View style={styles.bannerActions}>
          <Pressable
            style={styles.bannerIconButton}
            onPress={() => openAddToCalendar(event)}
            accessibilityRole="button"
            accessibilityLabel={language === "en" ? "Add to Calendar" : "Takvime Ekle"}
          >
            <Feather name="calendar" size={18} color={colors.surface} />
          </Pressable>
          <Pressable
            style={styles.bannerIconButton}
            onPress={() => {
              Share.share({
                title: event.title,
                message:
                  language === "en"
                    ? `Check out this FindYourBuddy event: "${event.title}" at ${event.location_name}!`
                    : `FindYourBuddy'de bu etkinliğe göz at: "${event.title}" - ${event.location_name}!`,
              }).catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel={language === "en" ? "Share" : "Paylaş"}
          >
            <Feather name="share-2" size={18} color={colors.surface} />
          </Pressable>
          <Pressable style={styles.bannerIconButton} onPress={toggleBookmark}>
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <Feather
                name="bookmark"
                size={18}
                color={isBookmarked ? colors.accentYellow : colors.surface}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={typeScale.display}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatEventDate(event.starts_at, language)}</Text>
        </View>
        {hasValidCoordinates(event.latitude, event.longitude) ? (
          <Pressable style={styles.metaRow} onPress={handleOpenMap}>
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary, textDecorationLine: "underline" }]}>
              {event.location_name}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{event.location_name}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Feather name={category.icon} size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>{category.label}</Text>
        </View>
        {event.creator_id ? (
          // Sadece kullanıcıların oluşturduğu etkinliklerde ücret bilgisi
          // gösteriliyor -- hazır/çekilmiş (scraped) etkinliklere gidenler
          // zaten kaynağından bilet gerekip gerekmediğini biliyor.
          <View style={styles.metaRow}>
            <Feather name={event.is_paid ? "credit-card" : "gift"} size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {event.is_paid
                ? `${t("ticket")}${event.ticket_price ? `: ${event.ticket_price} ₺` : ""}`
                : t("free")}
            </Text>
          </View>
        ) : null}
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

        {event.description ? <FormattedHtmlText html={event.description} /> : null}

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
                  <Text style={styles.lockedBadgeText}>Premium ile Gör</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {isOwnerOfGroupEvent ? (
          <View style={styles.joinRequestsSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs }}>
              <Text style={typeScale.eyebrow}>
                Katılım İstekleri{joinRequests.length > 0 ? ` (${joinRequests.length})` : ""}
              </Text>
              <Pressable
                style={styles.manageRequestsBtn}
                onPress={() => setIsApprovalModalVisible(true)}
              >
                <Feather name="check-square" size={14} color="#FFFFFF" />
                <Text style={styles.manageRequestsBtnText}>Yönet & Toplu Onayla</Text>
              </Pressable>
            </View>

            {joinRequests.length === 0 ? (
              <Text style={styles.helperText}>Şu an bekleyen istek yok.</Text>
            ) : (
              joinRequests.map((requester) => (
                <View key={requester.id} style={styles.joinRequestRow}>
                  <Avatar name={requester.display_name} photoUrl={requester.photo_url} size={40} />
                  <Text style={styles.joinRequestName} numberOfLines={1}>
                    {requester.display_name}
                  </Text>
                  <Pressable
                    style={styles.joinRequestApprove}
                    onPress={() => handleJoinRequestResponse(requester.id, true)}
                    disabled={respondingUserId === requester.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${requester.display_name} isteğini onayla`}
                  >
                    <Feather name="check" size={16} color={colors.surface} />
                  </Pressable>
                  <Pressable
                    style={styles.joinRequestReject}
                    onPress={() => handleJoinRequestResponse(requester.id, false)}
                    disabled={respondingUserId === requester.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${requester.display_name} isteğini reddet`}
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <PrimaryButton
              label={
                event.is_attending
                  ? (!event.is_group_event
                      ? (language === "en" ? "View Buddy & Connect" : "Kankayı Gör & İletişime Geç")
                      : (language === "en" ? "See Buddies" : "Kankaları Gör"))
                  : event.is_pending
                  ? (language === "en" ? "Awaiting Approval" : "Onay Bekleniyor")
                  : (language === "en" ? "I'm Going to This Event" : "Bu Etkinliğe Gidiyorum")
              }
              onPress={handleAttendAndSwipe}
              loading={isJoining}
              disabled={event.is_pending}
            />
            {!event.is_attending ? (
              <Pressable
                style={styles.trustInfoRow}
                onPress={() =>
                  Alert.alert(
                    language === "en" ? "How does the trust score work?" : "Güven skoru nasıl işliyor?",
                    language === "en"
                      ? "When you say you're going, we check your location at the event. Show up and check in: your trust score goes up. Don't show up: it goes down. If your score stays too low for a while, your account gets flagged as a troll account and may be restricted."
                      : "Katılıyorum dediğinde etkinlikte GPS ile konumunu kontrol ediyoruz. Gidip check-in yaparsan güven skorun artar; gitmezsen düşer. Skorun bir süre çok düşük kalırsa hesabın troll hesap olarak değerlendirilip kısıtlanabilir."
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={language === "en" ? "About trust score" : "Güven skoru hakkında"}
              >
                <Feather name="info" size={13} color={colors.textSecondary} />
                <Text style={styles.trustInfoText}>
                  {language === "en" ? "How does the trust score work?" : "Güven skoru nasıl işliyor?"}
                </Text>
              </Pressable>
            ) : null}
            {!event.is_attending ? (
              <Pressable
                style={styles.trustInfoRow}
                onPress={() => setDoubleBuddyVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={language === "en" ? "Join as Double Buddy" : "İkili (Double Buddy) olarak katıl"}
              >
                <Feather name="users" size={13} color={colors.textSecondary} />
                <Text style={styles.trustInfoText}>
                  {language === "en"
                    ? "Joining alone, or as a Double Buddy duo?"
                    : "Tek mi katılıyorsun, yoksa ikili (Double Buddy) mi?"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {!isOwnerOfGroupEvent && event.is_attending ? (
          event.is_checked_in ? (
            <View style={styles.checkedInBadge}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.checkedInText}>Etkinlikte olduğun doğrulandı</Text>
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

    <DoubleBuddyModal
      visible={doubleBuddyVisible}
      onClose={() => setDoubleBuddyVisible(false)}
      language={language}
    />

    {event && (
      <EventOrganizerApprovalModal
        visible={isApprovalModalVisible}
        eventId={event.id}
        eventTitle={event.title}
        onDismiss={() => setIsApprovalModalVisible(false)}
        onUpdated={() => {
          getEvent(eventId).then(setEvent);
          listJoinRequests(eventId).then(setJoinRequests);
        }}
      />
    )}
    </>
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
  bannerActions: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  bannerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  trustInfoText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  badgeSlot: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
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
  joinRequestsSection: {
    gap: spacing.sm,
  },
  manageRequestsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    gap: 4,
  },
  manageRequestsBtnText: {
    ...typeScale.caption,
    fontFamily: fontFamily.displayBold,
    color: "#FFFFFF",
  },
  joinRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  joinRequestName: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  joinRequestApprove: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  joinRequestReject: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});

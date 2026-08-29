import { useCallback, useEffect, useRef, useState } from "react";
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
import { EventRatingModal } from "../components/overlays/EventRatingModal";
import { EventOrganizerApprovalModal } from "../components/overlays/EventOrganizerApprovalModal";
import { FormattedHtmlText } from "../components/ui/FormattedHtmlText";
import { getCategoryMeta } from "../constants/categories";
import { colors, fontFamily, radius, spacing, typeScale } from "../theme";
import { cleanHtmlText } from "../utils/text";
import { formatEventDate } from "../utils/date";
import { getFastCurrentLocation, hasValidCoordinates } from "../utils/location";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Event, User } from "../types";
import { resolvePhotoUrl } from "../components/ui/Avatar";

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
  const [showRatingModal, setShowRatingModal] = useState(false);

  const isOwnerOfGroupEvent = Boolean(
    event && user && event.creator_id === user.id
  );

  useEffect(() => {
    if (route.params?.autoOpenRating && event && !event.has_rated && !isOwnerOfGroupEvent) {
      setShowRatingModal(true);
    }
    if (route.params?.autoOpenRequests) {
      setIsApprovalModalVisible(true);
    }
  }, [route.params?.autoOpenRating, route.params?.autoOpenRequests, event, isOwnerOfGroupEvent]);

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
          if (user && loadedEvent.creator_id === user.id) {
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

  useEffect(() => {
    if (user && event && event.creator_id === user.id) {
      refreshJoinRequests(event.id);
    }
  }, [user, event?.id, event?.creator_id, refreshJoinRequests]);

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

  function goToSwipe(): void {
    if (!event) return;
    // The Swipe screen owns the candidate deck for both 1-on-1 and group
    // events; for a group event it shows the deck with an "exit" bar.
    navigation.navigate("Tabs", {
      screen: "Swipe",
      params: {
        eventId: event.id,
        eventTitle: event.title,
        isGroup: Boolean(event.is_group_event),
      },
    });
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
      // 1. STRICT TIME WINDOW CHECK (1 hour before start time up to 3 hours after start time)
      const nowMs = Date.now();
      const eventStartMs = new Date(event.starts_at).getTime();
      const oneHourBeforeMs = eventStartMs - 60 * 60 * 1000;
      const threeHoursAfterMs = eventStartMs + 3 * 60 * 60 * 1000;

      if (nowMs < oneHourBeforeMs) {
        Alert.alert(
          language === "en" ? "Not Check-in Time Yet" : "Henüz Etkinlik Saati Gelmedi",
          language === "en"
            ? `Check-in opens 1 hour before the event start time.\n\n📅 Event Time: ${formatEventDate(event.starts_at, language)}\n⏰ Check-in Window: Opens 1 hour before event.`
            : `Katılımını onaylayabilmek için etkinlik saatine en az 1 saat kalmış olmalı.\n\n📅 Etkinlik Saati: ${formatEventDate(event.starts_at, language)}\n⏰ Katılım Onay Penceresi: Etkinlikten 1 saat önce başlar.`
        );
        setIsCheckingIn(false);
        return;
      }

      if (nowMs > threeHoursAfterMs) {
        Alert.alert(
          language === "en" ? "Check-in Window Closed" : "Check-in Süresi Doldu",
          language === "en"
            ? "The check-in window for this event has expired."
            : "Bu etkinliğin katılım onaylama süresi tamamlanmıştır."
        );
        setIsCheckingIn(false);
        return;
      }

      // 2. STRICT GPS PROXIMITY LOCATION CHECK (< 500m)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          language === "en" ? "Location Permission Required" : "Konum İzni Gerekli",
          language === "en"
            ? "We need your location permission to verify that you are at the event location."
            : "Etkinlik alanında olduğunu doğrulamak için konum iznine ihtiyacımız var."
        );
        setIsCheckingIn(false);
        return;
      }
      const position = await getFastCurrentLocation();
      if (!position) {
        setIsCheckingIn(false);
        Alert.alert("Konum Alınamadı", "Konumunuz tespit edilemedi.");
        return;
      }

      if (hasValidCoordinates(event.latitude, event.longitude)) {
        const R = 6371;
        const dLat = (event.latitude - position.coords.latitude) * (Math.PI / 180);
        const dLon = (event.longitude - position.coords.longitude) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(position.coords.latitude * (Math.PI / 180)) *
            Math.cos(event.latitude * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distKm = R * c;

        if (distKm > 0.5) {
          const distMeters = Math.round(distKm * 1000);
          const distanceFormatted = distKm >= 1 ? `${distKm.toFixed(1)} km` : `${distMeters} metre`;
          Alert.alert(
            language === "en" ? "Too Far From Event Location" : "Etkinlik Konumuna Uzaktasın 📍",
            language === "en"
              ? `You must be within 500 meters of the event area to check in.\n\n📍 Location: ${event.location_name}\n📏 Your Distance: ${distanceFormatted}`
              : `Katılımını onaylayabilmek için etkinlik alanına (en fazla 500m) yakın olmalısın.\n\n📍 Etkinlik Adresi: ${event.location_name}\n📏 Şu Anki Mesafen: ${distanceFormatted}`
          );
          setIsCheckingIn(false);
          return;
        }
      }

      const updated = await checkInToEvent(event.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setEvent(updated);
      Alert.alert(
        language === "en" ? "🎉 Attendance Confirmed!" : "🎉 Katılımın Onaylandı!",
        language === "en"
          ? "Your location and event time have been verified (+5 Trust Score!)."
          : "Hem konumun hem de etkinlik saatin doğrulandı! Katılımın başarıyla onaylandı (+5 Güven Puanı!)."
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const detail = String(err.response.data?.detail || "").toLowerCase();
        if (detail.includes("far")) {
          Alert.alert(
            language === "en" ? "Too Far Away" : "Çok Uzaktasın",
            language === "en"
              ? "You must be at the event location (max 500m) to confirm attendance."
              : "Katılımını onaylamak için etkinlik alanında (en fazla 500m) olmalısın."
          );
        } else {
          Alert.alert(
            language === "en" ? "Not Check-in Time" : "Check-in Zamanı Değil",
            language === "en"
              ? "Check-in is only available around the event's start time."
              : "Check-in sadece etkinlik saatine yakın zamanlarda yapılabilir."
          );
        }
      } else {
        Alert.alert(
          language === "en" ? "Error" : "Bir sorun oluştu",
          language === "en" ? "Location could not be verified. Please try again." : "Konum doğrulanamadı. Lütfen tekrar dene."
        );
      }
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleStartGroupChat(): Promise<void> {
    if (!event) return;
    try {
      const { listMyMatches } = require("../api/matches");
      const matches = await listMyMatches();
      const existingGroupMatch = matches.find((m: any) => m.event_id === event.id);
      if (existingGroupMatch) {
        navigation.navigate("Chat", {
          matchId: existingGroupMatch.id,
          otherUserId: existingGroupMatch.other_user.id,
          otherUserName: existingGroupMatch.other_user.display_name,
          otherUserPhoto: existingGroupMatch.other_user.photo_url,
          eventTitle: event.title,
          isGroupEvent: true,
          eventCreatorId: event.creator_id || undefined,
        });
      } else {
        const { approveAllEventJoinRequests } = require("../api/events");
        await approveAllEventJoinRequests(event.id);
        const freshMatches = await listMyMatches();
        const createdGroupMatch = freshMatches.find((m: any) => m.event_id === event.id);
        if (createdGroupMatch) {
          navigation.navigate("Chat", {
            matchId: createdGroupMatch.id,
            otherUserId: createdGroupMatch.other_user.id,
            otherUserName: createdGroupMatch.other_user.display_name,
            otherUserPhoto: createdGroupMatch.other_user.photo_url,
            eventTitle: event.title,
            isGroupEvent: true,
            eventCreatorId: event.creator_id || undefined,
          });
        } else {
          Alert.alert("Bilgi", "Grup sohbeti başlatmak için en az bir katılımcı isteği onaylanmalıdır.");
        }
      }
    } catch {
      Alert.alert("Hata", "Grup sohbeti açılırken bir sorun oluştu.");
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
        {event.creator_id && event.creator?.photo_url ? (
          <Image source={{ uri: resolvePhotoUrl(event.creator.photo_url) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : event.image_url ? (
          <Image source={{ uri: resolvePhotoUrl(event.image_url) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
          <View style={{ gap: spacing.md }}>
            <PrimaryButton
              label={language === "en" ? "Start / Open Group Chat" : "Grup Sohbetini Başlat / Aç"}
              onPress={handleStartGroupChat}
            />
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
                    <Pressable
                      style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm }}
                      onPress={() => navigation.navigate("CandidateProfile", { candidate: requester, eventTitle: event.title })}
                    >
                      <Avatar name={requester.display_name} photoUrl={requester.photo_url} size={40} />
                      <Text style={styles.joinRequestName} numberOfLines={1}>
                        {requester.display_name}
                      </Text>
                    </Pressable>
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
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            {event.is_checked_in ? (
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
            )}

            {/* Rating button ONLY appears after check-in OR after event starts, and can only be used 1 time */}
            {event.is_checked_in || new Date(event.starts_at) <= new Date() ? (
              event.has_rated ? (
                <View style={styles.alreadyRatedBadge}>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.alreadyRatedText}>
                    {language === "en" ? "Event & Host Rated ⭐" : "Değerlendirildi ⭐"}
                  </Text>
                </View>
              ) : (
                <PrimaryButton
                  label={language === "en" ? "Rate Host & Event" : "Organizatörü & Etkinliği Değerlendir"}
                  onPress={() => setShowRatingModal(true)}
                  variant="outline"
                />
              )
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>

    <DoubleBuddyModal
      visible={doubleBuddyVisible}
      onClose={() => setDoubleBuddyVisible(false)}
      language={language}
    />

    {event && (
      <>
        <EventOrganizerApprovalModal
          visible={isApprovalModalVisible}
          eventId={event.id}
          eventTitle={event.title}
          onDismiss={() => setIsApprovalModalVisible(false)}
          onUpdated={() => {
            if (event) {
              getEvent(event.id).then(setEvent);
              listJoinRequests(event.id).then(setJoinRequests);
            }
          }}
        />
        <EventRatingModal
          visible={showRatingModal}
          eventId={event.id}
          eventTitle={event.title}
          creatorName={event.creator?.display_name}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => setEvent((prev) => (prev ? { ...prev, has_rated: true } : prev))}
        />
        <EventOrganizerApprovalModal
          visible={isApprovalModalVisible}
          eventId={event.id}
          eventTitle={event.title}
          onDismiss={() => setIsApprovalModalVisible(false)}
          onUpdated={() => {
            if (event) refreshJoinRequests(event.id);
          }}
        />
      </>
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
  alreadyRatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  alreadyRatedText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
});

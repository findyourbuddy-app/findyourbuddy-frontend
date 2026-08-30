import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { listMessages, markMessagesAsRead, sendMessage, getIcebreakers, uploadChatMedia, type IcebreakerItem } from "../api/messages";
import { IcebreakerStrip } from "../components/chat/IcebreakerStrip";
import { GifPickerModal } from "../components/chat/GifPickerModal";
import { MessageBubble } from "../components/chat/MessageBubble";
import { uploadGalleryPhoto } from "../api/users";
import { submitMatchFeedback } from "../api/matches";
import { blockUser, reportUser } from "../api/safety";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { useAppTheme } from "../context/ThemeContext";
import { apiClient } from "../api/client";
import { API_BASE_URL } from "../constants/config";
import { colors, fontFamily, radius, spacing, typeScale, shadows } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../components/ui/Avatar";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Message, ReportReason, UserPublic } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

function reactionsEqual(a: Record<string, string> = {}, b: Record<string, string> = {}): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

// True when two snapshots of the same message would render identically, so the
// listener can keep the previous object reference instead of a fresh one.
function messagesRenderEqual(a: Message, b: Message): boolean {
  return (
    a.content === b.content &&
    a.is_read === b.is_read &&
    a.message_type === b.message_type &&
    a.media_url === b.media_url &&
    a.media_width === b.media_width &&
    a.media_height === b.media_height &&
    a.created_at === b.created_at &&
    reactionsEqual(a.reactions, b.reactions)
  );
}

// Last-seen messages per recently opened thread, so re-opening a chat paints
// instantly from memory instead of flashing a spinner while the network and
// Firestore reconnect.
type CachedThread = { historical: Message[]; live: Message[] };
const threadCache = new Map<number, CachedThread>();
const THREAD_CACHE_LIMIT = 15;

function cacheThread(matchId: number, patch: Partial<CachedThread>): void {
  const existing = threadCache.get(matchId) ?? { historical: [], live: [] };
  threadCache.delete(matchId);
  threadCache.set(matchId, { ...existing, ...patch });
  if (threadCache.size > THREAD_CACHE_LIMIT) {
    const oldest = threadCache.keys().next().value;
    if (oldest !== undefined) threadCache.delete(oldest);
  }
}

export function ChatScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { matchId, otherUserId, otherUserName, otherUserPhoto, needsFeedback, isGroupEvent, eventCreatorId, eventTitle, eventId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, accentColor, bgGradient } = useAppTheme();
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>(
    () => threadCache.get(matchId)?.historical ?? []
  );
  const [liveMessages, setLiveMessages] = useState<Message[]>(
    () => threadCache.get(matchId)?.live ?? []
  );
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<
    { uri: string; name?: string; type?: string; width?: number; height?: number } | null
  >(null);
  // Natural aspect ratio (w/h) per message image, filled from expo-image's
  // onLoad for messages that don't carry explicit media_width/media_height.
  const [imageAspects, setImageAspects] = useState<Record<string, number>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendLockRef = useRef<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(Boolean(needsFeedback));

  const isOrganizer = Boolean(user && eventCreatorId && user.id === eventCreatorId);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const openGroupMembersModal = useCallback(async () => {
    if (!isOrganizer) {
      Alert.alert(
        t("eventBuddyMatching"),
        t("youCanSwipeThroughCandidate")
      );
      return;
    }
    setShowMembersModal(true);
    setIsLoadingMembers(true);
    try {
      if (eventId) {
        const { getEventAttendees } = require("../api/events");
        const attendees = await getEventAttendees(eventId);
        setGroupMembers(attendees);
      } else {
        const { listMyMatches } = require("../api/matches");
        const matches = await listMyMatches();
        const eventMatches = matches.filter((m: any) => m.event_is_group && m.event_title === eventTitle);
        const members = eventMatches.map((m: any) => m.other_user);
        setGroupMembers(members);
      }
    } catch {
      // Best effort
    } finally {
      setIsLoadingMembers(false);
    }
  }, [isOrganizer, eventId, eventTitle, language]);

  const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
    { reason: "harassment", label: t("harassmentInappropriateBehavior") },
    { reason: "spam", label: t("spam") },
    { reason: "fake_profile", label: t("fakeProfile") },
    { reason: "inappropriate_content", label: t("inappropriateContent") },
    { reason: "other", label: t("other") },
  ];

  const defaultIcebreakers = useMemo<IcebreakerItem[]>(
    () => [
      { text: t("hiP0SoExcitedFor", { p0: otherUserName }), type: "text" },
      { text: t("10secondVoiceNoteChallengeSay"), type: "voice" },
      { text: t("checkedYourProfileLetsConnect"), type: "text" },
    ],
    [otherUserName, language]
  );

  const [aiIcebreakers, setAiIcebreakers] = useState<IcebreakerItem[]>(defaultIcebreakers);
  const [isLoadingIcebreakers, setIsLoadingIcebreakers] = useState(false);

  const fetchAiIcebreakers = useCallback(async () => {
    // Background fetch: update icebreakers seamlessly without blocking UI spinner
    try {
      const items = await getIcebreakers(matchId);
      if (items && items.length > 0) {
        setAiIcebreakers(items);
      }
    } catch {
      // Best-effort; default/cached icebreakers stay in place.
    }
  }, [matchId]);

  useEffect(() => {
    fetchAiIcebreakers();
  }, [fetchAiIcebreakers]);



  const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [visibleTimestampId, setVisibleTimestampId] = useState<string | number | null>(null);

  async function handleToggleReaction(messageId: string | number, emoji: string) {
    setSelectedMessageForReaction(null);
    if (!user) return;
    try {
      const docRef = doc(db, "matches", String(matchId), "messages", String(messageId));
      const targetMessage = liveMessages.find((m) => String(m.id) === String(messageId));
      const currentReactions = targetMessage?.reactions || {};
      const existing = currentReactions[user.id];
      const newReactions = { ...currentReactions };
      if (existing === emoji) {
        delete newReactions[user.id];
      } else {
        newReactions[user.id] = emoji;
      }
      await updateDoc(docRef, { reactions: newReactions });
    } catch {}
  }

  const [gifModalVisible, setGifModalVisible] = useState(false);

  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Throttles the "still typing" Firestore writes to at most one per interval
  // instead of one per keystroke.
  const lastTypingWriteRef = useRef<number>(0);
  const localUriMapRef = useRef<Record<string, string>>({});

  const [incomingCall, setIncomingCall] = useState<{
    callerName: string;
    callerPhoto: string | null;
    callType: "voice" | "video";
  } | null>(null);

  // Firestore signaling listener for incoming calls
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "matches", String(matchId), "call", "signal");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "ringing" && data.caller_id !== user.id) {
          setIncomingCall({
            callerName: data.caller_name,
            callerPhoto: data.caller_photo,
            callType: data.call_type,
          });
        } else if (data.status === "ended" || data.status === "declined") {
          setIncomingCall(null);
        }
      } else {
        setIncomingCall(null);
      }
    }, () => {
      setIncomingCall(null);
    });
    return () => unsubscribe();
  }, [matchId, user?.id]);

  // Listen for other user's typing status
  useEffect(() => {
    if (!user) return;
    const typingRef = doc(db, "matches", String(matchId), "typing", String(otherUserId));
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOtherUserTyping(false);
        return;
      }
      const data = snapshot.data();
      const updatedAt: Date | null = data.updated_at?.toDate?.() ?? null;
      const isRecent = updatedAt ? Date.now() - updatedAt.getTime() < 5000 : false;
      setOtherUserTyping(Boolean(data.is_typing) && isRecent);
    }, () => {
      setOtherUserTyping(false);
    });
    return () => unsubscribe();
  }, [matchId, otherUserId, user?.id]);

  const reportTyping = useCallback(async (isTyping: boolean) => {
    if (!user) return;
    const typingRef = doc(db, "matches", String(matchId), "typing", String(user.id));
    try {
      await setDoc(typingRef, { is_typing: isTyping, updated_at: serverTimestamp() });
    } catch {}
  }, [matchId, user?.id]);

  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (text.length === 0) {
      lastTypingWriteRef.current = 0;
      reportTyping(false);
      return;
    }

    const now = Date.now();
    if (now - lastTypingWriteRef.current > 2500) {
      lastTypingWriteRef.current = now;
      reportTyping(true);
    }
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingWriteRef.current = 0;
      reportTyping(false);
    }, 4000);
  }, [reportTyping]);

  // Clear the typing flag when leaving the chat (or switching match/user) so it
  // doesn't linger for the other participant.
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      reportTyping(false);
    };
  }, [reportTyping]);

  const initiateCall = useCallback(async (type: "voice" | "video") => {
    if (!user) return;
    const docRef = doc(db, "matches", String(matchId), "call", "signal");
    try {
      await setDoc(docRef, {
        status: "ringing",
        call_type: type,
        caller_id: user.id,
        caller_name: user.display_name,
        caller_photo: user.photo_url,
      });
    } catch {}

    navigation.navigate("Call", {
      matchId,
      otherUserName,
      otherUserPhoto: null,
      isCaller: true,
      callType: type,
    });
  }, [user, matchId, otherUserName, navigation]);

  async function handleAcceptCall() {
    if (!incomingCall) return;
    const docRef = doc(db, "matches", String(matchId), "call", "signal");
    try {
      await updateDoc(docRef, { status: "connected" });
      const tempCall = incomingCall;
      setIncomingCall(null);
      navigation.navigate("Call", {
        matchId,
        otherUserName,
        otherUserPhoto: tempCall.callerPhoto,
        isCaller: false,
        callType: tempCall.callType,
      });
    } catch {
      Alert.alert("Arama Bağlanamadı", "Bir sorun oluştu.");
    }
  }

  async function handleDeclineCall() {
    const docRef = doc(db, "matches", String(matchId), "call", "signal");
    try {
      await updateDoc(docRef, { status: "declined" });
      await deleteDoc(docRef);
    } catch {}
    setIncomingCall(null);
  }

  function confirmUnmatch(): void {
    Alert.alert(
      t("unmatch"),
      t("areYouSureYouWant3", { p0: otherUserName }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("unmatch"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/matches/${matchId}`);
              navigation.goBack();
            } catch {
              Alert.alert(
                t("error"),
                t("aProblemOccurredWhileRemoving")
              );
            }
          },
        },
      ]
    );
  }

  function answerFeedback(metInPerson: boolean | null): void {
    setShowFeedbackBanner(false);
    submitMatchFeedback(matchId, metInPerson).catch(() => {
      // Best-effort; this is a lightweight prompt, not a critical flow.
    });
  }

  function confirmBlock(): void {
    Alert.alert(
      t("blockUser"),
      t("areYouSureYouWant4", { p0: otherUserName }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("block"),
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(otherUserId);
              navigation.goBack();
            } catch {
              Alert.alert(
                t("error"),
                t("couldNotBlockUserPlease")
              );
            }
          },
        },
      ]
    );
  }

  function submitReport(reason: ReportReason): void {
    reportUser({ reported_user_id: otherUserId, reason }).then(
      () => Alert.alert(
        t("thankYou2"),
        t("yourReportHasBeenReceived")
      ),
      () => Alert.alert(
        t("error"),
        t("reportCouldNotBeSent")
      )
    );
  }

  function openReportReasons(): void {
    Alert.alert(
      t("reportReason"),
      t("whyAreYouReportingThis"),
      [
        ...REPORT_REASONS.map(({ reason, label }) => ({
          text: label,
          onPress: () => submitReport(reason),
        })),
        { text: t("cancel"), style: "cancel" as const },
      ]
    );
  }

  const openSafetyMenu = useCallback(() => {
    Alert.alert(otherUserName, undefined, [
      { text: t("didYouMeet"), onPress: () => setShowFeedbackBanner(true) },
      { text: t("unmatch"), style: "destructive", onPress: confirmUnmatch },
      { text: t("report"), onPress: openReportReasons },
      { text: t("block"), style: "destructive", onPress: confirmBlock },
      { text: t("cancel"), style: "cancel" },
    ]);
  }, [user, otherUserId, otherUserName, language]);

  function openTargetUserProfile(): void {
    const initialCandidate: UserPublic = {
      id: otherUserId,
      display_name: otherUserName,
      photo_url: otherUserPhoto,
    } as any;

    navigation.navigate("CandidateProfile", { candidate: initialCandidate as any });
  }

  useEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "left",
      headerBackVisible: false,
      headerLeft: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginLeft: Platform.OS === "ios" ? -8 : -4 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ paddingRight: 6, paddingVertical: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <Feather name="chevron-left" size={26} color={colors.textPrimary} />
          </Pressable>
          {isGroupEvent ? (
            <Pressable
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
              onPress={openGroupMembersModal}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Feather name="users" size={18} color="#FFFFFF" />
              </View>
              <View style={{ maxWidth: 180 }}>
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                  {eventTitle || (t("groupEventChat"))}
                </Text>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.primary }}>
                  {isOrganizer
                    ? (t("manageParticipantsOrganizer"))
                    : (t("groupAnnouncementChannel"))}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
              onPress={openTargetUserProfile}
            >
              <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={36} />
              <Text
                style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 16, color: colors.textPrimary, maxWidth: 140 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {otherUserName}
              </Text>
            </Pressable>
          )}
        </View>
      ),
      headerTitle: "",
      headerRight: () => (
        !isGroupEvent ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable onPress={() => initiateCall("voice")} style={styles.headerButton}>
              <Feather name="phone" size={18} color={accentColor} />
            </Pressable>
            <Pressable onPress={() => initiateCall("video")} style={styles.headerButton}>
              <Feather name="video" size={18} color={accentColor} />
            </Pressable>
            <Pressable onPress={openSafetyMenu} style={styles.headerButton}>
              <Feather name="more-vertical" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : null
      ),
    });
  }, [
    otherUserId,
    otherUserName,
    otherUserPhoto,
    accentColor,
    initiateCall,
    openSafetyMenu,
    isGroupEvent,
    isOrganizer,
    eventTitle,
    language,
    openGroupMembersModal,
  ]);

  const [isInitialLoading, setIsInitialLoading] = useState(() => !threadCache.get(matchId));

  // Firestore only carries messages sent after the real-time chat migration --
  // older conversation history lives in Postgres and needs a one-time fetch so
  // it doesn't appear to have "disappeared".
  useEffect(() => {
    const cached = threadCache.get(matchId);
    setHistoricalMessages(cached?.historical ?? []);
    setLiveMessages(cached?.live ?? []);
    setSelectedImage(null);
    setDraft("");
    setIsInitialLoading(!cached);

    listMessages(matchId)
      .then((history) => {
        setHistoricalMessages(history);
        cacheThread(matchId, { historical: history });
        setIsInitialLoading(false);
      })
      .catch(() => {
        setIsInitialLoading(false);
      });
  }, [matchId]);

  // Real-time Firestore message listener
  useEffect(() => {
    if (!user) return;

    // Don't blank the list here -- it's already seeded from cache (or empty),
    // and the first snapshot below replaces it. Clearing caused a flash.
    setErrorText(null);
    const messagesRef = collection(db, "matches", String(matchId), "messages");
    const q = query(messagesRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const incoming: Message[] = [];
        const unreadIncomingIds: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data({ serverTimestamps: "estimate" });
          incoming.push({
            id: docSnap.id,
            match_id: matchId,
            sender_id: data.sender_id,
            content: data.content,
            message_type: data.message_type || "text",
            media_url: data.media_url || null,
            media_width: data.media_width ?? null,
            media_height: data.media_height ?? null,
            created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            is_read: data.is_read || false,
            reactions: data.reactions || {},
            client_temp_id: data.client_temp_id || null,
          });

          if (data.sender_id !== user.id && !data.is_read) {
            unreadIncomingIds.push(docSnap.id);
          }
        });

        // One batched write for all newly-seen messages, so opening a chat with
        // N unread messages fires a single follow-up snapshot instead of N
        // (each of which used to rebuild the whole list).
        if (unreadIncomingIds.length > 0) {
          const batch = writeBatch(db);
          for (const id of unreadIncomingIds) {
            batch.update(doc(db, "matches", String(matchId), "messages", id), { is_read: true });
          }
          batch.commit().catch(() => {});
        }

        setLiveMessages((prev) => {
          // Reuse the previous object for any message whose rendered fields are
          // unchanged, so the memoized list rows don't churn on every snapshot.
          const prevById = new Map(prev.map((m) => [String(m.id), m]));
          const list = incoming.map((next) => {
            const old = prevById.get(String(next.id));
            return old && messagesRenderEqual(old, next) ? old : next;
          });

          const temps = prev.filter(
            (m) => typeof m.id === "string" && m.id.startsWith("temp_")
          );
          if (temps.length === 0) {
            return list;
          }

          const isMatch = (real: Message, temp: Message): boolean => {
            if (real.sender_id !== temp.sender_id) return false;
            if ((real.message_type || "text") !== (temp.message_type || "text")) return false;
            if (real.client_temp_id && (real.client_temp_id === temp.id || real.client_temp_id === temp.client_temp_id)) return true;
            if (temp.client_temp_id && (temp.client_temp_id === real.id || temp.client_temp_id === real.client_temp_id)) return true;
            if (
              Math.abs(
                new Date(real.created_at).getTime() - new Date(temp.created_at).getTime()
              ) > 120000
            ) {
              return false;
            }
            return (temp.message_type || "text") === "text"
              ? real.content === temp.content
              : Boolean(real.media_url);
          };

          const isLocalUri = (u?: string | null) =>
            Boolean(u && /^(file:|content:|ph:|assets-library:)/.test(u));

          // Map delivered real messages, preserving local media URI to avoid image flashing
          const merged = list.map((real) => {
            const src = temps.find((t) => isMatch(real, t));
            if (!src) return real;
            return {
              ...real,
              media_url:
                isLocalUri(src.media_url) && real.sender_id === user.id
                  ? src.media_url
                  : real.media_url,
              media_width: real.media_width ?? src.media_width ?? null,
              media_height: real.media_height ?? src.media_height ?? null,
            };
          });

          // Purge all delivered temp placeholders completely
          const unfulfilledTemps = temps.filter(
            (t) => !list.some((real) => isMatch(real, t))
          );

          return [...merged, ...unfulfilledTemps];
        });
        setIsInitialLoading(false);
      },
      () => {
        setErrorText("Gerçek zamanlı sohbet bağlantı hatası.");
        setIsInitialLoading(false);
      }
    );

    return () => unsubscribe();
    // user identity, not the object -- an unrelated user-object change must not
    // tear down and rebuild the listener (that briefly clears the message list).
  }, [matchId, user?.id]);

  // Keep the thread cache warm with the delivered messages (never the
  // session-local optimistic temps) so re-opening this chat paints instantly.
  useEffect(() => {
    const delivered = liveMessages.filter(
      (m) => !(typeof m.id === "string" && m.id.startsWith("temp_"))
    );
    cacheThread(matchId, { live: delivered });
  }, [matchId, liveMessages]);

  // Merge Firestore live messages (authoritative for everything sent since the
  // real-time migration) with Postgres history (older messages Firestore never
  // carried) and optimistic temp placeholders.
  const messages = useMemo(() => {
    // Normalise timezone-less (Postgres) and Z-suffixed (Firestore) strings to
    // the same UTC instant. Firestore/temp strings already carry a zone.
    const tsOf = (msg: Message): number => {
      const iso = msg.created_at || "";
      const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
      return new Date(withZone).getTime() || 0;
    };

    // Identity of a message independent of which store it came from and of any
    // clock skew between them -- so the Postgres copy and the Firestore copy of
    // one message collapse to one row ("mesaj çift oluyor").
    const contentSig = (msg: Message): string => {
      const msgType = msg.message_type || "text";
      const key = msgType === "text" ? (msg.content || "").trim() : (msg.media_url || "").trim();
      return `${msg.sender_id}|${msgType}|${key}`;
    };

    const fulfilledTempIds = new Set<string>();
    for (const msg of liveMessages) {
      if (msg.client_temp_id) fulfilledTempIds.add(msg.client_temp_id);
    }

    const result: Message[] = [];
    const seenIds = new Set<string>();
    const liveSigs = new Set<string>();

    for (const msg of liveMessages) {
      const isTemp = typeof msg.id === "string" && msg.id.startsWith("temp_");
      if (isTemp && fulfilledTempIds.has(msg.id as string)) continue;
      if (seenIds.has(String(msg.id))) continue;
      seenIds.add(String(msg.id));
      if (!isTemp) liveSigs.add(contentSig(msg));
      result.push(msg);
    }

    // Backfill only history the live stream doesn't already carry.
    for (const msg of historicalMessages) {
      if (seenIds.has(String(msg.id)) || liveSigs.has(contentSig(msg))) continue;
      seenIds.add(String(msg.id));
      result.push(msg);
    }

    const tsCache = new Map<Message, number>(result.map((m) => [m, tsOf(m)]));
    return result.sort((a, b) => (tsCache.get(a) ?? 0) - (tsCache.get(b) ?? 0));
  }, [historicalMessages, liveMessages]);

  // The message list renders `inverted`, so it needs newest-first data.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const messageListRef = useRef<FlatList<Message>>(null);

  const currentUserId = user?.id;

  const keyExtractor = useCallback((message: Message) => String(message.id), []);

  const handleToggleTimestamp = useCallback((messageId: Message["id"]) => {
    setVisibleTimestampId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const handleLongPressMessage = useCallback((message: Message) => {
    setSelectedMessageForReaction(message);
  }, []);

  const handlePressMessageImage = useCallback((uri: string) => {
    setLightboxPhoto(uri);
  }, []);

  const handleResolveImageAspect = useCallback((messageId: Message["id"], aspect: number) => {
    setImageAspects((prev) =>
      prev[String(messageId)] ? prev : { ...prev, [String(messageId)]: aspect }
    );
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const rawUri =
        item.media_url ||
        (item.content?.startsWith("http") || item.content?.includes("/media/") ? item.content : null);
      const localUri =
        (typeof item.id === "string" && localUriMapRef.current[item.id]) ||
        (rawUri ? localUriMapRef.current[rawUri] : null) ||
        null;
      return (
        <MessageBubble
          message={item}
          isOwn={item.sender_id === currentUserId}
          language={language}
          showTimestamp={visibleTimestampId === item.id}
          localUri={localUri}
          storedAspect={imageAspects[String(item.id)]}
          onToggleTimestamp={handleToggleTimestamp}
          onLongPress={handleLongPressMessage}
          onPressImage={handlePressMessageImage}
          onResolveAspect={handleResolveImageAspect}
        />
      );
    },
    [
      currentUserId,
      language,
      visibleTimestampId,
      imageAspects,
      handleToggleTimestamp,
      handleLongPressMessage,
      handlePressMessageImage,
      handleResolveImageAspect,
    ]
  );

  function scrollToBottom(animated = true) {
    setTimeout(() => {
      messageListRef.current?.scrollToOffset({ offset: 0, animated });
    }, 100);
  }

  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length === 0) return;
    // The inverted list already sits at the newest message on first fill;
    // only animate the jump when new messages arrive afterwards.
    scrollToBottom(prevCount > 0 && messages.length > prevCount);
  }, [messages.length]);

  // Sync read status to PostgreSQL backend on screen focus
  useFocusEffect(
    useCallback(() => {
      async function syncReadStatus() {
        try {
          await markMessagesAsRead(matchId);
          await refreshUnread();
        } catch {
          // Non-blocking; Postgres sync error
        }
      }
      syncReadStatus();
    }, [matchId, refreshUnread])
  );

  async function handleSend(): Promise<void> {
    const content = draft.trim();
    if ((!content && !selectedImage) || !user || sendLockRef.current) {
      return;
    }
    sendLockRef.current = true;
    setErrorText(null);
    setIsSending(true);

    const activeImage = selectedImage;
    const activeText = content;

    setDraft("");
    setSelectedImage(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    lastTypingWriteRef.current = 0;
    reportTyping(false);

    // Optimistic local update (0ms UI latency)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempMsg: Message = {
      id: tempId,
      client_temp_id: tempId,
      match_id: matchId,
      sender_id: user.id,
      content: activeText || (activeImage ? "[Fotoğraf]" : ""),
      message_type: activeImage ? "image" : "text",
      media_url: activeImage ? activeImage.uri : null,
      media_width: activeImage?.width ?? null,
      media_height: activeImage?.height ?? null,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    if (activeImage) {
      localUriMapRef.current[tempId] = activeImage.uri;
    }
    setLiveMessages((prev) => [...prev, tempMsg]);
    scrollToBottom(true);

    try {
      let finalContent = (activeText && activeText.trim().length > 0) ? activeText.trim() : (activeImage ? "[Fotoğraf]" : "");
      let finalMessageType: "text" | "image" | "gif" = "text";
      let finalMediaUrl: string | undefined = undefined;

      if (activeImage) {
        const fileName = activeImage.name ?? activeImage.uri.split("/").pop() ?? "photo.jpg";
        const uploaded = await uploadChatMedia(activeImage.uri, fileName, activeImage.type);
        let url = uploaded?.url || (uploaded as any)?.photo_url;
        if (!url) {
          throw new Error("Görsel yüklenemedi, sunucudan yanıt alınamadı.");
        }
        if (!url.startsWith("http")) {
          const cleanBase = API_BASE_URL.replace(/\/+$/, "");
          const cleanPath = url.replace(/^\/+/, "");
          url = `${cleanBase}/${cleanPath}`;
        }
        localUriMapRef.current[url] = activeImage.uri;
        finalMediaUrl = url;
        finalMessageType = "image";
        if (!finalContent) finalContent = "[Fotoğraf]";
        // Warm the cache so the swap from the local placeholder to the
        // server URL is seamless instead of a blank re-download.
        Image.prefetch(url).catch(() => {});
      }

      // Firestore rules only let the backend's Admin SDK write messages, so
      // the send goes through the API; the backend relays it to Firestore
      // (echoing client_temp_id + dimensions) and the snapshot listener swaps
      // the placeholder for the delivered message.
      await sendMessage(matchId, {
        content: finalContent,
        message_type: finalMessageType,
        media_url: finalMediaUrl ?? null,
        media_width: activeImage?.width ?? null,
        media_height: activeImage?.height ?? null,
        client_temp_id: tempId,
      });
      // The placeholder is left in place: the snapshot listener replaces it
      // when the relay delivers the message, and if the relay never comes the
      // placeholder keeps showing the local image (no swap, no flicker).
    } catch (error: any) {
      setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (activeText) setDraft(activeText);
      if (activeImage) setSelectedImage(activeImage);
      const errorMsg =
        error?.response?.data?.detail ||
        error?.message ||
        "Mesaj gönderilemedi. Lütfen tekrar dene.";
      Alert.alert(t("sendFailed"), String(errorMsg));
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
      scrollToBottom(true);
    }
  }

  async function handleSendGif(gifUrl: string) {
    if (isSending || sendLockRef.current || !user) return;
    sendLockRef.current = true;
    setGifModalVisible(false);
    setIsSending(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempGifMsg: Message = {
      id: tempId,
      match_id: matchId,
      sender_id: user.id,
      content: "[GIF]",
      message_type: "gif",
      media_url: gifUrl,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setLiveMessages((prev) => [...prev, tempGifMsg]);

    try {
      await sendMessage(matchId, {
        content: "[GIF]",
        message_type: "gif",
        media_url: gifUrl,
        client_temp_id: tempId,
      });
    } catch {
      setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Hata", "GIF gönderilemedi.");
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
      scrollToBottom(true);
    }
  }

  async function handlePickPhoto(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Fotoğraf seçmek için galeri iznini açman gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsEditing: false,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      name: asset.fileName ?? undefined,
      type: asset.mimeType ?? undefined,
      width: asset.width,
      height: asset.height,
    });
  }

  if (!user) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {showFeedbackBanner ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{otherUserName} ile buluştun mu?</Text>
          <View style={styles.feedbackActions}>
            <Pressable
              style={[styles.feedbackButton, styles.feedbackButtonYes]}
              onPress={() => answerFeedback(true)}
            >
              <Text style={styles.feedbackButtonText}>Evet</Text>
            </Pressable>
            <Pressable
              style={[styles.feedbackButton, styles.feedbackButtonNo]}
              onPress={() => answerFeedback(false)}
            >
              <Text style={styles.feedbackButtonTextNo}>Hayır</Text>
            </Pressable>
            <Pressable style={styles.feedbackDismiss} onPress={() => answerFeedback(null)}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.listContainer}>
        <FlatList
          ref={messageListRef}
          inverted
          style={styles.messagesList}
          contentContainerStyle={styles.messageList}
          data={reversedMessages}
          keyExtractor={keyExtractor}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderMessage}
        />
        {isInitialLoading && messages.length === 0 ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : null}
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {otherUserTyping ? (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {otherUserName} {t("typingIndicator")}
          </Text>
        </View>
      ) : null}

      {!isInitialLoading && messages.length === 0 ? (
        <IcebreakerStrip
          icebreakers={aiIcebreakers}
          isLoading={isLoadingIcebreakers}
          onRefresh={() => {
            Alert.alert(
              t("aiIcebreakers"),
              t("refreshingConversationStarters")
            );
            fetchAiIcebreakers();
          }}
          onSelect={(item) => setDraft(item.text)}
          language={language}
        />
      ) : null}

      {selectedImage ? (

        <View style={styles.attachedImagePreviewRow}>
          <Image source={{ uri: selectedImage.uri }} style={styles.attachedImageThumbnail} contentFit="cover" />
          <View style={styles.attachedImageInfo}>
            <Text style={styles.attachedImageTitle}>
              {t("photoAttached")}
            </Text>
            <Text style={styles.attachedImageSubtitle}>
              {t("addAMessageOrTap")}
            </Text>
          </View>
          <Pressable style={styles.removeAttachedBtn} onPress={() => setSelectedImage(null)}>
            <Feather name="x-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {isGroupEvent && user && eventCreatorId && eventCreatorId !== user.id ? (
        <View style={styles.readOnlyBanner}>
          <Feather name="volume-2" size={18} color={colors.primary} />
          <Text style={styles.readOnlyBannerText}>
            {t("thisIsAnAnnouncementChannel")}
          </Text>
        </View>
      ) : (
        <View style={[styles.inputRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.xs }]}>
          <Pressable style={styles.attachButton} onPress={handlePickPhoto} disabled={isSending}>
            <Feather name="plus" size={20} color={accentColor} />
          </Pressable>
          <Pressable style={styles.attachButton} onPress={() => setGifModalVisible(true)} disabled={isSending}>
            <Text style={styles.gifIconText}>GIF</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={
              isGroupEvent && user && eventCreatorId === user.id
                ? (t("writeAnEventAnnouncement"))
                : (t("typeAMessage"))
            }
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={handleDraftChange}
            multiline
          />
          <Pressable style={[styles.sendButton, { backgroundColor: accentColor }]} onPress={handleSend} disabled={isSending}>
            <Feather name="send" size={18} color={colors.surface} />
          </Pressable>
        </View>
      )}

      <GifPickerModal
        visible={gifModalVisible}
        disabled={isSending}
        language={language}
        onClose={() => setGifModalVisible(false)}
        onSelect={handleSendGif}
      />

      {/* Long-Press Emoji Reaction Modal */}
      <Modal
        visible={selectedMessageForReaction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessageForReaction(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMessageForReaction(null)}>
          <View style={styles.reactionCard}>
            <Text style={styles.reactionBarTitle}>
              {t("reactToMessage")}
            </Text>
            <View style={styles.reactionBarRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.reactionEmojiBtn}
                  onPress={() => {
                    if (selectedMessageForReaction) {
                      handleToggleReaction(selectedMessageForReaction.id, emoji);
                    }
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Incoming Call Popup Modal */}
      <Modal
        visible={incomingCall !== null}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineCall}
      >
        <View style={styles.callBackdrop}>
          <View style={styles.callCard}>
            <View style={styles.callHeader}>
              <Avatar name={incomingCall?.callerName ?? ""} photoUrl={incomingCall?.callerPhoto} size={64} />
              <View style={styles.callHeaderTextColumn}>
                <Text style={styles.callerNameText}>{incomingCall?.callerName}</Text>
                <Text style={styles.callTypeText}>
                  {t("incomingP0Call", { p0: incomingCall?.callType === "video" ? "Video" : "Voice" })}
                </Text>
              </View>
            </View>
            <View style={styles.callActions}>
              <Pressable style={[styles.callBtn, styles.declineBtn]} onPress={handleDeclineCall}>
                <Feather name="phone-off" size={20} color={colors.surface} />
                <Text style={styles.callBtnText}>{t("decline")}</Text>
              </Pressable>
              <Pressable style={[styles.callBtn, styles.acceptBtn]} onPress={handleAcceptCall}>
                <Feather name="phone" size={20} color={colors.surface} />
                <Text style={styles.callBtnText}>{t("answer")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Organizer Group Members Modal */}
      <Modal visible={showMembersModal} transparent animationType="slide" onRequestClose={() => setShowMembersModal(false)}>
        <Pressable style={styles.callBackdrop} onPress={() => setShowMembersModal(false)}>
          <Pressable style={[styles.callCard, { width: "90%", maxHeight: "70%" }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 16, color: colors.textPrimary }}>
                Katılımcı Listesi (Organizatör Özel)
              </Text>
              <Pressable onPress={() => setShowMembersModal(false)}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            {isLoadingMembers ? (
              <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />
            ) : groupMembers.length === 0 ? (
              <Text style={{ fontFamily: fontFamily.body, color: colors.textSecondary, textAlign: "center", marginVertical: 20 }}>
                Henüz katılan başka üye bulunmuyor.
              </Text>
            ) : (
              <ScrollView style={{ width: "100%" }}>
                {groupMembers.map((member) => (
                  <Pressable
                    key={member.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    onPress={() => {
                      setShowMembersModal(false);
                      navigation.navigate("CandidateProfile", { candidate: member, eventTitle });
                    }}
                  >
                    <Avatar name={member.display_name} photoUrl={member.photo_url} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.textPrimary }}>{member.display_name}</Text>
                      <Text style={{ fontFamily: fontFamily.body, fontSize: 12, color: colors.textSecondary }}>{member.university || "Üniversite Belirtilmedi"}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <PhotoLightboxModal
        visible={lightboxPhoto !== null}
        photoUrl={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: spacing.sm,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
  },
  feedbackText: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  feedbackActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  feedbackButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  feedbackButtonYes: {
    backgroundColor: colors.primary,
  },
  feedbackButtonNo: {
    backgroundColor: colors.surface,
  },
  feedbackButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.surface,
  },
  feedbackButtonTextNo: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  feedbackDismiss: {
    padding: spacing.xs,
  },
  errorText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.accentRed,
    textAlign: "center",
    paddingBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  gifIconText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: "hidden",
  },
  attachedImagePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  attachedImageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  attachedImageInfo: {
    flex: 1,
  },
  attachedImageTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  attachedImageSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  removeAttachedBtn: {
    padding: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.6)",
    justifyContent: "flex-end",
  },
  callBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  callCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  callHeaderTextColumn: {
    flex: 1,
    gap: 2,
  },
  callerNameText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  callTypeText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  callActions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  callBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.surface,
  },
  declineBtn: {
    backgroundColor: colors.accentRed,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  reactionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card * 1.5,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.card,
  },
  reactionBarTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  reactionBarRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  reactionEmojiBtn: {
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  readOnlyBannerText: {
    flex: 1,
    ...typeScale.caption,
    fontFamily: fontFamily.bodyMedium,
    color: colors.textSecondary,
  },
  typingIndicator: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  typingText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});

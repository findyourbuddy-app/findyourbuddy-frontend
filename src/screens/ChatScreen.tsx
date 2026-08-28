import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { listMessages, markMessagesAsRead, sendMessage, getIcebreakers, uploadChatMedia, type IcebreakerItem } from "../api/messages";
import { fetchTrendingGifs, searchGifs, type GifResult } from "../api/giphy";
import { IcebreakerStrip } from "../components/chat/IcebreakerStrip";
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
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { formatMessageTime, formatRelativeTimestamp } from "../utils/date";
import { PhotoLightboxModal } from "../components/overlays/PhotoLightboxModal";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Message, ReportReason, UserPublic } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

export function ChatScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { matchId, otherUserId, otherUserName, otherUserPhoto, needsFeedback, isGroupEvent, eventCreatorId, eventTitle, eventId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, accentColor, bgGradient } = useAppTheme();
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
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
        language === "en" ? "Event Buddy Matching" : "Kanka Eşleşmesi",
        language === "en"
          ? "You can swipe through candidate cards in the Swipe tab to match 1-on-1 with event participants!"
          : "Etkinlikteki diğer katılımcılarla eşleşmek için 'Eşleş' sekmesindeki kartları sağa/sola kaydırabilirsin!"
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
    { reason: "harassment", label: language === "en" ? "Harassment / Inappropriate Behavior" : "Taciz / Rahatsız Edici Davranış" },
    { reason: "spam", label: language === "en" ? "Spam" : "Spam" },
    { reason: "fake_profile", label: language === "en" ? "Fake Profile" : "Sahte Profil" },
    { reason: "inappropriate_content", label: language === "en" ? "Inappropriate Content" : "Uygunsuz İçerik" },
    { reason: "other", label: language === "en" ? "Other" : "Diğer" },
  ];

  const defaultIcebreakers = useMemo<IcebreakerItem[]>(
    () => [
      { text: language === "en" ? `Hi ${otherUserName}! So excited for our event` : `Selam ${otherUserName}! Katılacağımız etkinlik için heyecanlıyım`, type: "text" },
      { text: language === "en" ? "10-second voice note challenge: say your favorite movie line!" : "10 saniyelik ses kaydıyla en sevdiğin film repliğini söyle!", type: "voice" },
      { text: language === "en" ? "Checked your profile, let's connect!" : "Profilindeki hobilerine baktım, ne zaman buluşuyoruz?", type: "text" },
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



  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifQuery, setGifQuery] = useState("");
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);

  const loadTrendingGifs = useCallback(() => {
    setIsLoadingGifs(true);
    fetchTrendingGifs()
      .then(setGifResults)
      .catch(() => setGifResults([]))
      .finally(() => setIsLoadingGifs(false));
  }, []);

  const gifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGifSearchText = useCallback((text: string) => {
    setGifQuery(text);
    if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current);

    if (!text.trim()) {
      loadTrendingGifs();
      return;
    }

    setIsLoadingGifs(true);
    gifDebounceRef.current = setTimeout(() => {
      searchGifs(text.trim())
        .then(setGifResults)
        .catch(() => setGifResults([]))
        .finally(() => setIsLoadingGifs(false));
    }, 250);
  }, [loadTrendingGifs]);

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

  useEffect(() => {
    if (!gifModalVisible) return;
    setGifQuery("");
    loadTrendingGifs();
  }, [gifModalVisible, loadTrendingGifs]);

  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [matchId, user]);

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
  }, [matchId, otherUserId, user]);

  const reportTyping = useCallback(async (isTyping: boolean) => {
    if (!user) return;
    const typingRef = doc(db, "matches", String(matchId), "typing", String(user.id));
    try {
      await setDoc(typingRef, { is_typing: isTyping, updated_at: serverTimestamp() });
    } catch {}
  }, [matchId, user]);

  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
    reportTyping(text.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => reportTyping(false), 4000);
    }
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
      language === "en" ? "Unmatch" : "Eşleşmeyi Kaldır",
      language === "en"
        ? `Are you sure you want to unmatch with ${otherUserName}? This will delete your chat history.`
        : `${otherUserName} ile olan eşleşmeni kaldırmak istediğine emin misin? Bu sohbet geçmişini silecektir.`,
      [
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
        {
          text: language === "en" ? "Unmatch" : "Eşleşmeyi Kaldır",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/matches/${matchId}`);
              navigation.goBack();
            } catch {
              Alert.alert(
                language === "en" ? "Error" : "Hata",
                language === "en" ? "A problem occurred while removing the match." : "Eşleşme kaldırılırken bir sorun oluştu."
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
      language === "en" ? "Block User" : "Kullanıcıyı Engelle",
      language === "en"
        ? `Are you sure you want to block ${otherUserName}? You will no longer be able to match or message each other.`
        : `${otherUserName} adlı kullanıcıyı engellemek istediğine emin misin? Bir daha eşleşemezsiniz ve mesajlaşamazsınız.`,
      [
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
        {
          text: language === "en" ? "Block" : "Engelle",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(otherUserId);
              navigation.goBack();
            } catch {
              Alert.alert(
                language === "en" ? "Error" : "Bir sorun oluştu",
                language === "en" ? "Could not block user. Please try again." : "Kullanıcı engellenemedi. Lütfen tekrar dene."
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
        language === "en" ? "Thank You" : "Teşekkürler",
        language === "en" ? "Your report has been received and will be reviewed." : "Şikayetin alındı, incelenecek."
      ),
      () => Alert.alert(
        language === "en" ? "Error" : "Bir sorun oluştu",
        language === "en" ? "Report could not be sent. Please try again." : "Şikayet gönderilemedi. Lütfen tekrar dene."
      )
    );
  }

  function openReportReasons(): void {
    Alert.alert(
      language === "en" ? "Report Reason" : "Şikayet Nedeni",
      language === "en" ? "Why are you reporting this user?" : "Bu kullanıcıyı neden şikayet ediyorsun?",
      [
        ...REPORT_REASONS.map(({ reason, label }) => ({
          text: label,
          onPress: () => submitReport(reason),
        })),
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" as const },
      ]
    );
  }

  const openSafetyMenu = useCallback(() => {
    Alert.alert(otherUserName, undefined, [
      { text: language === "en" ? "Did you meet?" : "Buluştun mu?", onPress: () => setShowFeedbackBanner(true) },
      { text: language === "en" ? "Unmatch" : "Eşleşmeyi Kaldır", style: "destructive", onPress: confirmUnmatch },
      { text: language === "en" ? "Report" : "Şikayet Et", onPress: openReportReasons },
      { text: language === "en" ? "Block" : "Engelle", style: "destructive", onPress: confirmBlock },
      { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
    ]);
  }, [user, otherUserId, otherUserName, language]);

  function openTargetUserProfile(): void {
    const initialCandidate: UserPublic = {
      id: otherUserId,
      display_name: otherUserName,
      photo_url: otherUserPhoto,
    } as any;

    navigation.navigate("CandidateProfile", {
      candidate: initialCandidate as any,
      onSwipeLeft: () => {},
      onSwipeRight: () => {},
      onSwipeUp: () => {},
    });
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
                  {eventTitle || (language === "en" ? "Group Event Chat" : "Grup Etkinlik Sohbeti")}
                </Text>
                <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.primary }}>
                  {isOrganizer
                    ? (language === "en" ? "Manage Participants (Organizer)" : "Katılımcıları Yönet (Organizatör)")
                    : (language === "en" ? "Group Announcement Channel" : "📢 Grup Duyuru Kanalı")}
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
  }, [otherUserId, otherUserName, otherUserPhoto, accentColor, initiateCall, openSafetyMenu]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Firestore only carries messages sent after the real-time chat migration --
  // older conversation history lives in Postgres and needs a one-time fetch so
  // it doesn't appear to have "disappeared".
  useEffect(() => {
    listMessages(matchId)
      .then((history) => {
        setHistoricalMessages(history);
        setIsInitialLoading(false);
      })
      .catch(() => {
        setIsInitialLoading(false);
      });
  }, [matchId]);

  // Real-time Firestore message listener
  useEffect(() => {
    if (!user) return;

    setErrorText(null);
    const messagesRef = collection(db, "matches", String(matchId), "messages");
    const q = query(messagesRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data({ serverTimestamps: "estimate" });
          list.push({
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

          // Mark incoming unread messages as read in Firestore
          if (data.sender_id !== user.id && !data.is_read) {
            const docRef = doc(db, "matches", String(matchId), "messages", docSnap.id);
            updateDoc(docRef, { is_read: true }).catch(() => {});
          }
        });
        // Keep optimistic placeholders visible until THEIR OWN Firestore doc
        // lands (matched by client_temp_id) -- an unrelated snapshot (e.g. a
        // read receipt) firing mid-upload must not wipe a pending image.
        setLiveMessages((prev) => {
          const supersededTempIds = new Set(
            list.map((m) => m.client_temp_id).filter((id): id is string => Boolean(id))
          );
          const stillPending = prev.filter(
            (m) =>
              typeof m.id === "string" &&
              m.id.startsWith("temp_") &&
              !supersededTempIds.has(m.id)
          );
          return [...list, ...stillPending];
        });
        setIsInitialLoading(false);
      },
      () => {
        setErrorText("Gerçek zamanlı sohbet bağlantı hatası.");
        setIsInitialLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId, user]);

  // Deduplicate and merge Postgres historical messages + Firestore live messages + Optimistic temp messages
  const messages = useMemo(() => {
    const map = new Map<string | number, Message>();

    for (const msg of historicalMessages) {
      map.set(msg.id, msg);
    }

    for (const msg of liveMessages) {
      map.set(msg.id, msg);
    }

    const merged = Array.from(map.values());
    const uniqueList: Message[] = [];
    const seenSignatures = new Set<string>();

    for (const msg of merged) {
      const timeMin = Math.floor((new Date(msg.created_at).getTime() || 0) / 60000);
      const signature = `${msg.sender_id}_${msg.message_type}_${msg.content}_${timeMin}`;

      if (typeof msg.id === "string" && msg.id.startsWith("temp_")) {
        if (seenSignatures.has(signature)) continue;
      }

      seenSignatures.add(signature);
      uniqueList.push(msg);
    }

    return uniqueList.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      return timeA - timeB;
    });
  }, [historicalMessages, liveMessages]);

  const messageListRef = useRef<FlatList<Message>>(null);

  function scrollToBottom(animated = true) {
    setTimeout(() => {
      messageListRef.current?.scrollToOffset({ offset: 0, animated });
    }, 100);
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
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
    reportTyping(false);

    // Optimistic local update (0ms UI latency)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempMsg: Message = {
      id: tempId,
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
    setLiveMessages((prev) => [...prev, tempMsg]);

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

      // Firestore relay isn't configured (or is down) if nothing replaced the
      // placeholder shortly after the API confirmed the send -- keep it as a
      // permanent local message pointing at the uploaded URL.
      setTimeout(() => {
        setLiveMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, media_url: finalMediaUrl ?? m.media_url, message_type: finalMessageType }
              : m
          )
        );
      }, 4000);
    } catch (error: any) {
      setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (activeText) setDraft(activeText);
      if (activeImage) setSelectedImage(activeImage);
      const errorMsg =
        error?.response?.data?.detail ||
        error?.message ||
        "Mesaj gönderilemedi. Lütfen tekrar dene.";
      Alert.alert(language === "en" ? "Send Failed" : "Mesaj Gönderilemedi", String(errorMsg));
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
      quality: 1,
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

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

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

      <FlatList
        ref={messageListRef}
        inverted
        contentContainerStyle={styles.messageList}
        data={reversedMessages}
        keyExtractor={(message) => String(message.id)}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === user.id;
          const timeText = formatMessageTime(item.created_at, language);
          const isTimeVisible = visibleTimestampId === item.id;
          const reactionsMap = item.reactions || {};
          const reactionEntries = Object.values(reactionsMap) as string[];
          const isMedia = item.message_type === "image" || item.message_type === "gif" || Boolean(item.media_url && item.media_url.length > 0) || Boolean(item.content && (item.content.startsWith("http") || item.content.includes("/media/")));
          const rawUri = item.media_url || (item.content?.startsWith("http") || item.content?.includes("/media/") ? item.content : null);
          const photoUri = resolvePhotoUrl(rawUri);
          const explicitAspect =
            item.media_width && item.media_height ? item.media_width / item.media_height : undefined;
          const mediaAspect = Math.min(
            Math.max(explicitAspect ?? imageAspects[String(item.id)] ?? 4 / 3, 0.6),
            2
          );

          return (
            <View style={{ marginBottom: spacing.xs }}>
              <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
                <Pressable
                  style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
                  onPress={() => setVisibleTimestampId((prev) => (prev === item.id ? null : item.id))}
                  onLongPress={() => setSelectedMessageForReaction(item)}
                >
                  {isMedia && photoUri ? (
                    <View>
                      <Pressable
                        onPress={() => setLightboxPhoto(photoUri)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel="Resmi Büyüt"
                      >
                        <Image
                          source={{ uri: photoUri }}
                          style={[styles.bubbleImage, { height: undefined, aspectRatio: mediaAspect }]}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          autoplay={true}
                          transition={150}
                          onLoad={(e) => {
                            if (explicitAspect) return;
                            const w = e?.source?.width;
                            const h = e?.source?.height;
                            if (w && h) {
                              setImageAspects((prev) =>
                                prev[String(item.id)] ? prev : { ...prev, [String(item.id)]: w / h }
                              );
                            }
                          }}
                        />
                      </Pressable>
                      {item.content && item.content !== "[Fotoğraf]" && item.content !== "[GIF]" && !item.content.startsWith("http") ? (
                        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn, { marginTop: spacing.xs }]}>
                          {item.content}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
                  )}

                  {isTimeVisible ? (
                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{timeText}</Text>
                      {isOwn ? (
                        <Feather
                          name={item.is_read ? "check-circle" : "check"}
                          size={12}
                          color="rgba(255,255,255,0.75)"
                        />
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {reactionEntries.length > 0 ? (
                <View style={[styles.reactionPillsRow, isOwn ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
                  {Array.from(new Set(reactionEntries)).map((emoji) => (
                    <View key={emoji} style={styles.reactionPill}>
                      <Text style={styles.reactionEmojiText}>
                        {emoji} {reactionEntries.filter((e) => e === emoji).length}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {otherUserTyping ? (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {otherUserName} {t("typingIndicator")}
          </Text>
        </View>
      ) : null}

      {isInitialLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : messages.length === 0 ? (
        <IcebreakerStrip
          icebreakers={aiIcebreakers}
          isLoading={isLoadingIcebreakers}
          onRefresh={() => {
            Alert.alert(
              language === "en" ? "AI Icebreakers" : "Yapay Zeka",
              language === "en" ? "Refreshing conversation starters..." : "Yeni tanışma önerileri hazırlanıyor..."
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
              {language === "en" ? "Photo attached" : "Fotoğraf eklendi"}
            </Text>
            <Text style={styles.attachedImageSubtitle}>
              {language === "en" ? "Add a message or tap Send" : "Aşağıya mesajını yazıp Gönder'e basabilirsin"}
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
            {language === "en"
              ? "This is an announcement channel. Only the event organizer can post messages."
              : "📢 Bu bir grup duyuru kanalıdır. Sadece etkinlik sahibi mesaj yazabilir."}
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
                ? (language === "en" ? "Write an event announcement..." : "📢 Etkinlik duyurusu yaz...")
                : (language === "en" ? "Type a message..." : "Bir mesaj yaz...")
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

      {/* GIF Picker Modal */}
      <Modal
        visible={gifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGifModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setGifModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", justifyContent: "flex-end" }}
          >
            <Pressable style={styles.gifModalCard} onPress={(e) => e.stopPropagation()}>
              <Pressable style={styles.dragHandleTouch} onPress={() => setGifModalVisible(false)}>
                <View style={styles.dragHandle} />
              </Pressable>

              <View style={styles.gifModalHeader}>
                <Text style={typeScale.h2}>{language === "en" ? "Send GIF" : "GIF Gönder"}</Text>
                <Pressable
                  onPress={() => setGifModalVisible(false)}
                  style={styles.closeIconBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t("close")}
                >
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.gifSearchBar}>
                <Feather name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.gifSearchInput}
                  placeholder={language === "en" ? "Search GIFs..." : "GIF ara..."}
                  placeholderTextColor={colors.textSecondary}
                  value={gifQuery}
                  onChangeText={handleGifSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.gifGrid} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {isLoadingGifs ? (
                  <ActivityIndicator color={colors.primary} style={{ width: "100%", marginVertical: spacing.lg }} />
                ) : gifResults.length === 0 ? (
                  <Text style={styles.gifEmptyText}>
                    {language === "en" ? "No GIFs found." : "GIF bulunamadı."}
                  </Text>
                ) : (
                  gifResults.map((gif) => (
                    <Pressable key={gif.id} style={styles.gifTile} onPress={() => handleSendGif(gif.url)} disabled={isSending}>
                      <Image
                        source={{ uri: gif.previewUrl }}
                        style={styles.gifImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={gif.id}
                      />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

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
              {language === "en" ? "React to message" : "Mesaja tepki ver"}
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
                  {language === "en"
                    ? `Incoming ${incomingCall?.callType === "video" ? "Video" : "Voice"} Call...`
                    : `Gelen ${incomingCall?.callType === "video" ? "Görüntülü" : "Sesli"} Arama...`}
                </Text>
              </View>
            </View>
            <View style={styles.callActions}>
              <Pressable style={[styles.callBtn, styles.declineBtn]} onPress={handleDeclineCall}>
                <Feather name="phone-off" size={20} color={colors.surface} />
                <Text style={styles.callBtnText}>{language === "en" ? "Decline" : "Reddet"}</Text>
              </Pressable>
              <Pressable style={[styles.callBtn, styles.acceptBtn]} onPress={handleAcceptCall}>
                <Feather name="phone" size={20} color={colors.surface} />
                <Text style={styles.callBtnText}>{language === "en" ? "Answer" : "Yanıtla"}</Text>
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
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bubbleTextOwn: {
    color: colors.surface,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.75)",
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
  bubbleImage: {
    width: 240,
    maxWidth: "100%",
    height: 180,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 40, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  gifModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card * 1.5,
    borderTopRightRadius: radius.card * 1.5,
    padding: spacing.xl,
    paddingTop: spacing.xs,
    height: "75%",
    maxHeight: "85%",
    gap: spacing.md,
    ...shadows.card,
  },
  dragHandleTouch: {
    paddingVertical: 6,
    alignItems: "center",
    width: "100%",
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  gifModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gifGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  gifTile: {
    width: "48%",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  gifImage: {
    width: "100%",
    height: 110,
  },
  gifSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  gifSearchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  gifEmptyText: {
    width: "100%",
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: spacing.lg,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  cancelText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: colors.textSecondary,
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
  reactionPillsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  reactionPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionEmojiText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
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

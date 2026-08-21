import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { listMessages, markMessagesAsRead, sendMessage, getIcebreakers, type IcebreakerItem } from "../api/messages";
import { IcebreakerStrip } from "../components/chat/IcebreakerStrip";
import { uploadGalleryPhoto } from "../api/users";
import { submitMatchFeedback } from "../api/matches";
import { blockUser, reportUser } from "../api/safety";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { apiClient } from "../api/client";
import { colors, fontFamily, radius, spacing, typeScale, shadows } from "../theme";
import { Avatar, resolvePhotoUrl } from "../components/ui/Avatar";
import { formatMessageTime, formatRelativeTimestamp } from "../utils/date";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Message, ReportReason } from "../types";


type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: "harassment", label: "Taciz / Rahatsız Edici Davranış" },
  { reason: "spam", label: "Spam" },
  { reason: "fake_profile", label: "Sahte Profil" },
  { reason: "inappropriate_content", label: "Uygunsuz İçerik" },
  { reason: "other", label: "Diğer" },
];

import { useAppTheme } from "../context/ThemeContext";

export function ChatScreen({ route }: Props) {
  const { matchId, otherUserId, otherUserName, otherUserPhoto, needsFeedback, isGroupEvent } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, accentColor, bgGradient } = useAppTheme();
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64?: string | null } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(Boolean(needsFeedback));

  const defaultIcebreakers = useMemo<IcebreakerItem[]>(
    () => [
      { text: language === "en" ? `Hi ${otherUserName}! So excited for our event ☕` : `Selam ${otherUserName}! Katılacağımız etkinlik için heyecanlıyım ☕`, type: "text" },
      { text: language === "en" ? "10-second voice note challenge: say your favorite movie line! 🎙️" : "10 saniyelik ses kaydıyla en sevdiğin film repliğini söyle! 🎙️", type: "voice" },
      { text: language === "en" ? "Checked your profile, let's connect! 🎨" : "Profilindeki hobilerine baktım, ne zaman buluşuyoruz? 🎨", type: "text" },
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



  const POPULAR_GIFS = useMemo(
    () => [
      { key: "hello", label: language === "en" ? "Hello 👋" : "Merhaba 👋", url: "https://i.giphy.com/VdfD8e415yLte/giphy.gif" },
      { key: "wink", label: language === "en" ? "Wink 😉" : "Göz Kırp 😉", url: "https://i.giphy.com/d1E2VyhFsxRxCLKw/giphy.gif" },
      { key: "laugh", label: language === "en" ? "Laugh 😂" : "Kahkaha 😂", url: "https://i.giphy.com/ltvJF9EQ135t155j6V/giphy.gif" },
      { key: "coffee", label: language === "en" ? "Coffee ☕" : "Kahve ☕", url: "https://i.giphy.com/3oriO0OEd9QIDdllqo/giphy.gif" },
      { key: "celebrate", label: language === "en" ? "Celebration 🎉" : "Kutlama 🎉", url: "https://i.giphy.com/l0MYt5jPR6QX5pnq0/giphy.gif" },
      { key: "applause", label: language === "en" ? "Applause 👏" : "Alkış 👏", url: "https://i.giphy.com/3Gm15eZf29HGVPKl53/giphy.gif" },
      { key: "love", label: language === "en" ? "Love ❤️" : "Sevgi ❤️", url: "https://i.giphy.com/26hpK8sjGn5BLTOAU/giphy.gif" },
      { key: "dance", label: language === "en" ? "Dance 💃" : "Dans 💃", url: "https://i.giphy.com/l3vRlT2k2L35Cvv5C/giphy.gif" },
      { key: "hug", label: language === "en" ? "Hug 🤗" : "Sarıl 🤗", url: "https://i.giphy.com/3oEdv4hwWTzBhWvaU0/giphy.gif" },
      { key: "thumbsup", label: language === "en" ? "Thumbs Up 👍" : "Süper 👍", url: "https://i.giphy.com/111ebonMs92shy/giphy.gif" },
      { key: "party", label: language === "en" ? "Party 🥳" : "Parti 🥳", url: "https://i.giphy.com/artj92V8o75VPL7AeQ/giphy.gif" },
      { key: "mindblown", label: language === "en" ? "Mind Blown 🤯" : "Şok 🤯", url: "https://i.giphy.com/26ufdipQqU2lhNA4g/giphy.gif" },
      { key: "cool", label: language === "en" ? "Cool 😎" : "Harika 😎", url: "https://i.giphy.com/3o7TKMt1VVNkHV2PaE/giphy.gif" },
      { key: "highfive", label: language === "en" ? "High Five 🙌" : "Çak 🙌", url: "https://i.giphy.com/3oEJHV0z8S7WM4MwnK/giphy.gif" },
      { key: "shocked", label: language === "en" ? "OMG 😱" : "İnanılmaz 😱", url: "https://i.giphy.com/xT0xeJpnrWC4XWblEk/giphy.gif" },
      { key: "cheers", label: language === "en" ? "Cheers 🍻" : "Şerefe 🍻", url: "https://i.giphy.com/g9582DNuQppxC/giphy.gif" }
    ],
    [language]
  );

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

  async function initiateCall(type: "voice" | "video") {
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
  }

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
      "Eşleşmeyi Kaldır",
      `${otherUserName} ile olan eşleşmeni kaldırmak istediğine emin misin? Bu sohbet geçmişini silecektir.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Eşleşmeyi Kaldır",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/matches/${matchId}`);
              navigation.goBack();
            } catch {
              Alert.alert("Hata", "Eşleşme kaldırılırken bir sorun oluştu.");
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
      "Kullanıcıyı Engelle",
      `${otherUserName} adlı kullanıcıyı engellemek istediğine emin misin? Bir daha eşleşemezsiniz ve mesajlaşamazsınız.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(otherUserId);
              navigation.goBack();
            } catch {
              Alert.alert("Bir sorun oluştu", "Kullanıcı engellenemedi. Lütfen tekrar dene.");
            }
          },
        },
      ]
    );
  }

  function submitReport(reason: ReportReason): void {
    reportUser({ reported_user_id: otherUserId, reason }).then(
      () => Alert.alert("Teşekkürler", "Şikayetin alındı, incelenecek."),
      () => Alert.alert("Bir sorun oluştu", "Şikayet gönderilemedi. Lütfen tekrar dene.")
    );
  }

  function openReportReasons(): void {
    Alert.alert(
      "Şikayet Nedeni",
      "Bu kullanıcıyı neden şikayet ediyorsun?",
      [
        ...REPORT_REASONS.map(({ reason, label }) => ({
          text: label,
          onPress: () => submitReport(reason),
        })),
        { text: "Vazgeç", style: "cancel" as const },
      ]
    );
  }

  function openSafetyMenu(): void {
    Alert.alert(otherUserName, undefined, [
      { text: "Buluştun mu?", onPress: () => setShowFeedbackBanner(true) },
      { text: "Eşleşmeyi Kaldır", style: "destructive", onPress: confirmUnmatch },
      { text: "Şikayet Et", onPress: openReportReasons },
      { text: "Engelle", style: "destructive", onPress: confirmBlock },
      { text: "Vazgeç", style: "cancel" },
    ]);
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={36} />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 16, color: colors.textPrimary }}>
              {otherUserName}
            </Text>
          </View>
        </View>
      ),
      headerTitle: "",
      headerRight: () => (
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
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, otherUserName, otherUserPhoto, accentColor]);

  // Firestore only carries messages sent after the real-time chat migration --
  // older conversation history lives in Postgres and needs a one-time fetch so
  // it doesn't appear to have "disappeared".
  useEffect(() => {
    listMessages(matchId)
      .then(setHistoricalMessages)
      .catch(() => {
        // Best-effort; the live Firestore feed still works without history.
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
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            match_id: matchId,
            sender_id: data.sender_id,
            content: data.content,
            message_type: data.message_type || "text",
            media_url: data.media_url || null,
            created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
            is_read: data.is_read || false,
            reactions: data.reactions || {},
          });

          // Mark incoming unread messages as read in Firestore
          if (data.sender_id !== user.id && !data.is_read) {
            const docRef = doc(db, "matches", String(matchId), "messages", docSnap.id);
            updateDoc(docRef, { is_read: true }).catch(() => {});
          }
        });
        setLiveMessages(list);
      },
      () => {
        setErrorText("Gerçek zamanlı sohbet bağlantı hatası.");
      }
    );

    return () => unsubscribe();
  }, [matchId, user]);

  // Postgres has the full history; Firestore only has messages sent since the
  // real-time migration. Keep whatever Postgres history predates Firestore's
  // earliest message, then let Firestore drive everything from there on.
  const messages = useMemo(() => {
    if (liveMessages.length === 0) {
      return historicalMessages;
    }
    const earliestLiveTime = new Date(liveMessages[0].created_at).getTime();
    const olderHistory = historicalMessages.filter(
      (message) => new Date(message.created_at).getTime() < earliestLiveTime
    );
    return [...olderHistory, ...liveMessages];
  }, [historicalMessages, liveMessages]);

  const messageListRef = useRef<FlatList<Message>>(null);

  function scrollToBottom(animated = true) {
    setTimeout(() => {
      messageListRef.current?.scrollToEnd({ animated });
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
    if ((!content && !selectedImage) || !user) {
      return;
    }
    setErrorText(null);
    setIsSending(true);

    const activeImage = selectedImage;
    const activeText = content;

    setDraft("");
    setSelectedImage(null);

    try {
      if (activeImage) {
        let imageUrl = activeImage.uri;
        try {
          const fileName = activeImage.uri.split("/").pop() ?? "photo.jpg";
          const uploaded = await uploadGalleryPhoto(activeImage.uri, fileName);
          if (uploaded && uploaded.photo_url) {
            imageUrl = uploaded.photo_url;
          }
        } catch {
          if (activeImage.base64) {
            imageUrl = `data:image/jpeg;base64,${activeImage.base64}`;
          }
        }

        await sendMessage(matchId, {
          content: activeText || "[Fotoğraf]",
          message_type: "image",
          media_url: imageUrl,
        });
      } else {
        await sendMessage(matchId, { content: activeText, message_type: "text", media_url: undefined });
      }
    } catch (error) {
      if (activeText) setDraft(activeText);
      if (activeImage) setSelectedImage(activeImage);
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        setErrorText("Mesajın uygunsuz içerik nedeniyle gönderilemedi.");
      } else {
        setErrorText("Mesaj gönderilemedi. Lütfen tekrar dene.");
      }
    } finally {
      setIsSending(false);
      scrollToBottom(true);
    }
  }

  async function handleSendGif(gifUrl: string) {
    setGifModalVisible(false);
    setIsSending(true);
    try {
      await sendMessage(matchId, {
        content: "[GIF]",
        message_type: "gif",
        media_url: gifUrl,
      });
    } catch {
      Alert.alert("Hata", "GIF gönderilemedi.");
    } finally {
      setIsSending(false);
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
      quality: 0.7,
      allowsEditing: false,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setSelectedImage({ uri: asset.uri, base64: asset.base64 });
  }

  if (!user) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      {showFeedbackBanner ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{otherUserName} ile buluştun mu?</Text>
          <View style={styles.feedbackActions}>
            <Pressable
              style={[styles.feedbackButton, styles.feedbackButtonYes]}
              onPress={() => answerFeedback(true)}
            >
              <Text style={styles.feedbackButtonText}>Evet 👍</Text>
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
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(message) => String(message.id)}
        onContentSizeChange={() => scrollToBottom(true)}
        onLayout={() => scrollToBottom(false)}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === user.id;
          const timeText = formatMessageTime(item.created_at, language);
          const isTimeVisible = visibleTimestampId === item.id;
          const reactionsMap = item.reactions || {};
          const reactionEntries = Object.values(reactionsMap);

          return (
            <View style={{ marginBottom: spacing.xs }}>
              <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
                <Pressable
                  style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
                  onPress={() => setVisibleTimestampId((prev) => (prev === item.id ? null : item.id))}
                  onLongPress={() => setSelectedMessageForReaction(item)}
                >
                  {item.message_type === "image" || item.message_type === "gif" ? (
                    <View>
                      <Image source={{ uri: resolvePhotoUrl(item.media_url) || undefined }} style={styles.bubbleImage} contentFit="cover" />
                      {item.content && item.content !== "[Fotoğraf]" && item.content !== "[GIF]" ? (
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

      <IcebreakerStrip
        icebreakers={aiIcebreakers}
        isLoading={isLoadingIcebreakers}
        onRefresh={fetchAiIcebreakers}
        onSelect={(item) => setDraft(item.text)}
        language={language}
      />

      {selectedImage ? (

        <View style={styles.attachedImagePreviewRow}>
          <Image source={{ uri: selectedImage.uri }} style={styles.attachedImageThumbnail} contentFit="cover" />
          <View style={styles.attachedImageInfo}>
            <Text style={styles.attachedImageTitle}>
              {language === "en" ? "Photo attached 📷" : "Fotoğraf eklendi 📷"}
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

      <View style={styles.inputRow}>
        <Pressable style={styles.attachButton} onPress={handlePickPhoto} disabled={isSending}>
          <Feather name="plus" size={20} color={accentColor} />
        </Pressable>
        <Pressable style={styles.attachButton} onPress={() => setGifModalVisible(true)} disabled={isSending}>
          <Text style={styles.gifIconText}>GIF</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={language === "en" ? "Type a message..." : "Bir mesaj yaz..."}
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={[styles.sendButton, { backgroundColor: accentColor }]} onPress={handleSend} disabled={isSending}>
          <Feather name="send" size={18} color={colors.surface} />
        </Pressable>
      </View>

      {/* GIF Picker Modal */}
      <Modal
        visible={gifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGifModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setGifModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={typeScale.h2}>{language === "en" ? "Send GIF 🎬" : "GIF Gönder 🎬"}</Text>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.gifGrid} showsVerticalScrollIndicator={true}>
              {POPULAR_GIFS.map((gif) => (
                <Pressable key={gif.key} style={styles.gifTile} onPress={() => handleSendGif(gif.url)}>
                  <Image source={{ uri: gif.url }} style={styles.gifImage} contentFit="cover" />
                  <Text style={styles.gifLabel}>{gif.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelButton} onPress={() => setGifModalVisible(false)}>
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </Pressable>
          </Pressable>
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
              <View style={{ gap: 2 }}>
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
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
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
    paddingVertical: spacing.md,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    padding: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  gifIconText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
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
    width: 220,
    height: 160,
    borderRadius: radius.sm,
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
    alignItems: "center",
    paddingBottom: spacing.xs,
  },
  gifImage: {
    width: "100%",
    height: 90,
  },
  gifLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 4,
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
    fontSize: 11,
    color: colors.textPrimary,
  },
});

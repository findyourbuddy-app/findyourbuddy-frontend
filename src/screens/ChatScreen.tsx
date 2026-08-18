import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { Alert } from "../utils/alert";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { listMessages, markMessagesAsRead, sendMessage } from "../api/messages";
import { submitMatchFeedback } from "../api/matches";
import { blockUser, reportUser } from "../api/safety";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { apiClient } from "../api/client";
import { colors, fontFamily, radius, spacing, typeScale, shadows } from "../theme";
import { Avatar } from "../components/ui/Avatar";
import { formatRelativeTimestamp } from "../utils/date";
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
  const { matchId, otherUserId, otherUserName, otherUserPhoto, needsFeedback, eventTitle, isGroupEvent } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const { t, language, accentColor, bgGradient } = useAppTheme();
  const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(Boolean(needsFeedback));

  const POPULAR_GIFS = useMemo(
    () => [
      { key: "hello", label: language === "en" ? "Hello 👋" : "Merhaba 👋", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHB1dzJsczd4MmFudDRid2t4YW1rYzQzajc5NXBhdDFtdzBtNHM2ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VdfD8e415yLte/giphy.gif" },
      { key: "wink", label: language === "en" ? "Wink 😉" : "Göz Kırp 😉", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDY5cTJycGl1YWJldmt1aXZ5aG82Z3E0MTVkcDRpNHExMHVscDdyNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d1E2VyhFsxRxCLKw/giphy.gif" },
      { key: "laugh", label: language === "en" ? "Laugh 😂" : "Kahkaha 😂", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzB2M2xscXZicWc5M3pxZnpxdGlidDR6dGJnbnpvYTJ0MWpsOHZ5dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ltvJF9EQ135t155j6V/giphy.gif" },
      { key: "coffee", label: language === "en" ? "Coffee Meetup ☕" : "Kahve Buluşması ☕", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVqNml4ZmF0NWV1NHkxbjhvYnhkMGFqZjR1N3prOW1obWRtdm1xciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oriO0OEd9QIDdllqo/giphy.gif" },
      { key: "celebrate", label: language === "en" ? "Celebration 🎉" : "Kutlama 🎉", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnRna3ZsbGg3cG94czAydTV1MXJwbzdudDBhb3Z3OHh3c2syeG9xbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnq0/giphy.gif" },
      { key: "applause", label: language === "en" ? "Applause 👏" : "Alkış 👏", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3JpcTZxbGF0MGttOXA1ZnYwaGNnODR0MmY2M3hhazUzMW40dG12ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3Gm15eZf29HGVPKl53/giphy.gif" }
    ],
    [language]
  );

  const ICEBREAKERS = useMemo(
    () => [
      language === "en" ? "Hi! See you at the event 😊" : "Selam! Etkinlikte görüşmek üzere 😊",
      language === "en" ? "Where would you prefer to meet? ☕" : "Buluşma noktası için nereyi tercih edersin? ☕",
      language === "en" ? "Hi! Which event categories do you like most? 🎨" : "Selam, hangi kategori etkinlikleri daha çok seversin? 🎨",
    ],
    [language]
  );

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
      const { setDoc } = require("firebase/firestore");
      await setDoc(docRef, {
        status: "ringing",
        call_type: type,
        caller_id: user.id,
        caller_name: user.display_name,
        caller_photo: user.photo_url,
      });

      navigation.navigate("Call", {
        matchId,
        otherUserName,
        otherUserPhoto: null,
        isCaller: true,
        callType: type,
      });
    } catch {
      Alert.alert("Arama Başlatılamadı", "Bir sorun oluştu.");
    }
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
      headerTitle: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 }}>
          <Avatar name={otherUserName} photoUrl={otherUserPhoto} size={34} />
          <View style={{ justifyContent: "center" }}>
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.textPrimary }}>
              {otherUserName}
            </Text>
            <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.primary }}>
              {isGroupEvent
                ? (language === "en" ? `👥 Group Chat • ${eventTitle || "Event"}` : `👥 Grup Sohbeti • ${eventTitle || "Etkinlik"}`)
                : (language === "en" ? `👤 1-on-1 Buddy ${eventTitle ? `• ${eventTitle}` : ""}` : `👤 1-on-1 Kanka ${eventTitle ? `• ${eventTitle}` : ""}`)}
            </Text>
          </View>
        </View>
      ),
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
  }, [otherUserId, otherUserName, otherUserPhoto, accentColor, eventTitle, isGroupEvent, language]);

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
            id: docSnap.id as any,
            match_id: matchId,
            sender_id: data.sender_id,
            content: data.content,
            message_type: data.message_type || "text",
            media_url: data.media_url || null,
            created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
            is_read: data.is_read || false,
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
    if (!content || !user) {
      return;
    }
    setErrorText(null);
    setIsSending(true);
    setDraft("");

    try {
      // 1. Add to Firestore for real-time delivery
      const messagesRef = collection(db, "matches", String(matchId), "messages");
      await addDoc(messagesRef, {
        sender_id: user.id,
        content: content,
        message_type: "text",
        media_url: null,
        created_at: serverTimestamp(),
        is_read: false,
      });

      // 2. Sync to Postgres and trigger Push Notifications in background
      sendMessage(matchId, { content, message_type: "text", media_url: undefined }).catch(() => {
        // Silently catch sync failures (offline mode support)
      });

    } catch (error) {
      setErrorText("Mesaj gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendGif(gifUrl: string) {
    setGifModalVisible(false);
    setIsSending(true);
    try {
      const messagesRef = collection(db, "matches", String(matchId), "messages");
      await addDoc(messagesRef, {
        sender_id: user!.id,
        content: "[GIF]",
        message_type: "gif",
        media_url: gifUrl,
        created_at: serverTimestamp(),
        is_read: false,
      });

      sendMessage(matchId, {
        content: "[GIF]",
        message_type: "gif",
        media_url: gifUrl,
      }).catch(() => {});
    } catch {
      Alert.alert("Hata", "GIF gönderilemedi.");
    } finally {
      setIsSending(false);
    }
  }

  async function handlePickPhoto(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Galeri izni gerekli", "Fotoğraf göndermek için galeri iznini açman gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      formData.append("file", {
        uri: asset.uri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      const res = await apiClient.post<{ url: string }>("/users/me/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = res.data.url;

      const messagesRef = collection(db, "matches", String(matchId), "messages");
      await addDoc(messagesRef, {
        sender_id: user!.id,
        content: "[Fotoğraf]",
        message_type: "image",
        media_url: imageUrl,
        created_at: serverTimestamp(),
        is_read: false,
      });

      sendMessage(matchId, {
        content: "[Fotoğraf]",
        message_type: "image",
        media_url: imageUrl,
      }).catch(() => {});

    } catch (err) {
      Alert.alert("Hata", "Fotoğraf yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsSending(false);
    }
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
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(message) => String(message.id)}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === user.id;
          return (
            <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {item.message_type === "image" || item.message_type === "gif" ? (
                  <Image source={{ uri: item.media_url || undefined }} style={styles.bubbleImage} />
                ) : (
                  <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
                )}
                <View style={styles.bubbleFooter}>
                  <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                    {formatRelativeTimestamp(item.created_at)}
                  </Text>
                  {isOwn ? (
                    <Feather
                      name={item.is_read ? "check-circle" : "check"}
                      size={12}
                      color="rgba(255,255,255,0.75)"
                    />
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {messages.length === 0 ? (
        <View style={styles.icebreakerContainer}>
          <Text style={styles.icebreakerTitle}>
            {language === "en" ? "💡 Icebreakers (Conversation Starters)" : "💡 Tanışma Önerileri (Buz Kırıcı)"}
          </Text>
          <View style={styles.icebreakerRow}>
            {ICEBREAKERS.map((text) => (
              <Pressable key={text} style={styles.icebreakerPill} onPress={() => setDraft(text)}>
                <Text style={styles.icebreakerText}>{text}</Text>
              </Pressable>
            ))}
          </View>
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
            <Text style={typeScale.h2}>{language === "en" ? "Send GIF" : "GIF Gönder"}</Text>
            <View style={styles.gifGrid}>
              {POPULAR_GIFS.map((gif) => (
                <Pressable key={gif.key} style={styles.gifTile} onPress={() => handleSendGif(gif.url)}>
                  <Image source={{ uri: gif.url }} style={styles.gifImage} />
                  <Text style={styles.gifLabel}>{gif.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.cancelButton} onPress={() => setGifModalVisible(false)}>
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </Pressable>
          </Pressable>
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
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: radius.sm,
  },
  icebreakerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  icebreakerTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  icebreakerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  icebreakerPill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  icebreakerText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.primary,
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
});

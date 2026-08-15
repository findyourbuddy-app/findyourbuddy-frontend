import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listMessages, markMessagesAsRead, sendMessage } from "../api/messages";
import { blockUser, reportUser } from "../api/safety";
import { useAuth } from "../context/AuthContext";
import { useMessagesContext } from "../context/MessagesContext";
import { colors, fontFamily, radius, spacing } from "../theme";
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

export function ChatScreen({ route }: Props) {
  const { matchId, otherUserId, otherUserName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { refreshUnread } = useMessagesContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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
      { text: "Şikayet Et", onPress: openReportReasons },
      { text: "Engelle", style: "destructive", onPress: confirmBlock },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={openSafetyMenu} style={styles.headerButton}>
          <Feather name="more-vertical" size={20} color={colors.textPrimary} />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, otherUserName]);

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await listMessages(matchId));
      await markMessagesAsRead(matchId);
      await refreshUnread();
    } catch {
      setErrorText("Mesajlar yüklenemedi. Lütfen tekrar dene.");
    }
  }, [matchId, refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  async function handleSend(): Promise<void> {
    const content = draft.trim();
    if (!content) {
      return;
    }
    setErrorText(null);
    setIsSending(true);
    try {
      const sent = await sendMessage(matchId, { content });
      setMessages((current) => [...current, sent]);
      setDraft("");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        setErrorText("Bu mesaj gönderilemedi, lütfen farklı bir şekilde ifade et.");
      } else {
        setErrorText("Mesaj gönderilirken bir sorun oluştu. Tekrar dene.");
      }
    } finally {
      setIsSending(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(message) => String(message.id)}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === user.id;
          return (
            <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Bir mesaj yaz..."
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={isSending}>
          <Feather name="send" size={18} color={colors.surface} />
        </Pressable>
      </View>
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
});

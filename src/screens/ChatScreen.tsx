import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listMessages, sendMessage } from "../api/messages";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radius, spacing } from "../theme";
import { formatRelativeTimestamp } from "../utils/date";
import type { MainStackParamList } from "../navigation/RootNavigator";
import type { Message } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

export function ChatScreen({ route }: Props) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setMessages(await listMessages(matchId));
  }, [matchId]);

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
                <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                  {formatRelativeTimestamp(item.created_at)}
                </Text>
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
  bubbleTime: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.textSecondary,
    alignSelf: "flex-end",
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

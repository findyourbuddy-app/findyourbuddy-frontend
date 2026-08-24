import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Alert } from "../../utils/alert";
import { approveAllEventJoinRequests, getEventJoinRequests, handleEventJoinRequest } from "../../api/events";
import { PrimaryButton } from "../ui/PrimaryButton";
import { resolvePhotoUrl } from "../ui/Avatar";
import { useAppTheme } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing, typeScale } from "../../theme";
import type { User } from "../../types";

interface EventOrganizerApprovalModalProps {
  visible: boolean;
  eventId: number;
  eventTitle: string;
  onDismiss: () => void;
  onUpdated?: () => void;
}

export function EventOrganizerApprovalModal({
  visible,
  eventId,
  eventTitle,
  onDismiss,
  onUpdated,
}: EventOrganizerApprovalModalProps) {
  const { language } = useAppTheme();
  const [requests, setRequests] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible && eventId) {
      loadRequests();
    }
  }, [visible, eventId]);

  async function loadRequests() {
    setIsLoading(true);
    try {
      const list = await getEventJoinRequests(eventId);
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSingleAction(userId: number, approved: boolean) {
    setIsProcessing(true);
    try {
      await handleEventJoinRequest(eventId, userId, approved);
      setRequests((prev) => prev.filter((u) => u.id !== userId));
      onUpdated?.();
      Alert.alert(
        "Başarılı",
        approved ? "Katılım isteği onaylandı!" : "Katılım isteği reddedildi."
      );
    } catch {
      Alert.alert("Hata", "İşlem yapılırken bir sorun oluştu.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApproveAll() {
    if (requests.length === 0) return;
    setIsProcessing(true);
    try {
      await approveAllEventJoinRequests(eventId);
      setRequests([]);
      onUpdated?.();
      Alert.alert("Tebrikler!", "Tüm başvuranlar toplu olarak onaylandı 🎉");
    } catch {
      Alert.alert("Hata", "Toplu onaylama esnasında bir sorun oluştu.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={typeScale.h2}>Katılım İstekleri ({requests.length})</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {eventTitle}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onDismiss}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="check-circle" size={48} color="#2ECC71" />
              <Text style={styles.emptyTitle}>Bekleyen İstek Yok</Text>
              <Text style={styles.emptySubtitle}>Bu etkinlik için tüm katılım istekleri işlendi.</Text>
            </View>
          ) : (
            <>
              {/* Bulk Approve All Action Header */}
              <View style={styles.bulkContainer}>
                <Pressable
                  style={[styles.bulkApproveBtn, isProcessing && { opacity: 0.6 }]}
                  onPress={handleApproveAll}
                  disabled={isProcessing}
                >
                  <Feather name="check-square" size={18} color="#FFFFFF" />
                  <Text style={styles.bulkApproveBtnText}>
                    {language === "en" ? "Approve All Requests" : "Tüm İstekleri Toplu Onayla"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {requests.map((user) => {
                  const avatarUrl = user.photo_url ? resolvePhotoUrl(user.photo_url) : null;

                  return (
                    <View key={user.id} style={styles.userRow}>
                      <Image
                        source={avatarUrl ? { uri: avatarUrl } : require("../../../assets/icon.png")}
                        style={styles.avatar}
                      />

                      <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.userName}>{user.display_name}</Text>
                          {user.is_verified && <Feather name="check-circle" size={14} color="#3498DB" />}
                        </View>
                        <Text style={styles.userDetails}>
                          {user.gender === "female" ? "Kadın" : user.gender === "male" ? "Erkek" : ""} 
                          {user.trust_score ? ` • 🛡️ ${user.trust_score} Puan` : ""}
                        </Text>
                      </View>

                      {/* Approve / Reject Buttons */}
                      <View style={styles.actionButtons}>
                        <Pressable
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleSingleAction(user.id, true)}
                          disabled={isProcessing}
                        >
                          <Feather name="check" size={16} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => handleSingleAction(user.id, false)}
                          disabled={isProcessing}
                        >
                          <Feather name="x" size={16} color={colors.accentRed} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.footer}>
            <PrimaryButton label={language === "en" ? "Close" : "Kapat"} onPress={onDismiss} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: "80%",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typeScale.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.lg * 2,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.lg * 2,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typeScale.h2,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typeScale.body,
    color: colors.textSecondary,
  },
  bulkContainer: {
    marginBottom: spacing.md,
  },
  bulkApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ECC71",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  bulkApproveBtnText: {
    ...typeScale.body,
    fontFamily: fontFamily.displayBold,
    color: "#FFFFFF",
  },
  list: {
    maxHeight: 350,
  },
  listContent: {
    gap: spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    ...typeScale.body,
    fontFamily: fontFamily.displayBold,
  },
  userDetails: {
    ...typeScale.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: {
    backgroundColor: "#2ECC71",
  },
  rejectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentRed,
  },
  footer: {
    marginVertical: spacing.md,
  },
});

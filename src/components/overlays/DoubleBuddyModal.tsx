import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing, typeScale, shadows } from "../../theme";
import { Avatar } from "../ui/Avatar";
import { getMyDoubleBuddy, disbandDoubleBuddy, inviteDoubleBuddy, type DoubleBuddyPair } from "../../api/doubleBuddy";
import { listMyMatches } from "../../api/matches";
import type { Match } from "../../types";
import { Alert } from "../../utils/alert";

interface Props {
  visible: boolean;
  onClose: () => void;
  language?: string;
}

export function DoubleBuddyModal({ visible, onClose, language = "tr" }: Props) {
  const [pair, setPair] = useState<DoubleBuddyPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitingId, setInvitingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getMyDoubleBuddy()
        .then((result) => {
          setPair(result);
          if (!result) {
            return listMyMatches().then(setMatches).catch(() => setMatches([]));
          }
        })
        .catch(() => setPair(null))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  async function handleInvite(partnerId: number): Promise<void> {
    setInvitingId(partnerId);
    try {
      const result = await inviteDoubleBuddy(partnerId);
      setPair(result);
    } catch {
      Alert.alert(
        language === "en" ? "Error" : "Hata",
        language === "en" ? "Could not send Double Buddy invite." : "Double Buddy daveti gönderilemedi."
      );
    } finally {
      setInvitingId(null);
    }
  }

  async function handleDisband() {
    Alert.alert(
      language === "en" ? "Disband Double Buddy" : "Çiftli Moddan Ayrıl",
      language === "en"
        ? "Are you sure you want to disband your Double Buddy pair?"
        : "Çiftli kanka modundan ayrılmak istediğine emin misin?",
      [
        { text: language === "en" ? "Cancel" : "Vazgeç", style: "cancel" },
        {
          text: language === "en" ? "Disband" : "Ayrıl",
          style: "destructive",
          onPress: async () => {
            try {
              await disbandDoubleBuddy();
              setPair(null);
              Alert.alert("Başarılı", "Çiftli mod kapatıldı.");
            } catch {
              Alert.alert("Hata", "Çiftli mod kapatılamadı.");
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Feather name="users" size={22} color={colors.primary} />
              <Text style={typeScale.h2}>
                {language === "en" ? "Double Buddy (Pair Mode)" : "Double Buddy (Çiftli Mod)"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : pair ? (
            <View style={styles.activePairBox}>
              <Text style={styles.activePairTitle}>
                {language === "en" ? "Active Double Buddy Pair" : "Aktif Çiftli Kanka Ekibi"}
              </Text>
              <View style={styles.partnerRow}>
                <Avatar name={pair.partner_name} photoUrl={pair.partner_photo} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerName}>{pair.partner_name}</Text>
                  <Text style={styles.partnerStatus}>
                    {language === "en" ? "Paired up for events" : "Etkinlikler için eşleşildi"}
                  </Text>
                </View>
              </View>

              <Pressable style={styles.disbandBtn} onPress={handleDisband}>
                <Feather name="user-x" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.disbandBtnText}>
                  {language === "en" ? "Disband Pair" : "Çiftli Modu Kapat"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {language === "en"
                  ? "Pick a matched buddy below to pair up -- you'll show up together as a Double Buddy duo wherever you attend."
                  : "İkili katılmak için aşağıdan eşleştiğin bir kankanı seç -- birlikte katıldığınız her yerde Double Buddy ekibi olarak görünürsünüz."}
              </Text>

              {matches.length === 0 ? (
                <Text style={styles.emptyMatchesText}>
                  {language === "en"
                    ? "You don't have any matches yet to pair up with."
                    : "Henüz eşleştiğin bir kanka yok, önce birileriyle eşleşmen gerekiyor."}
                </Text>
              ) : (
                <FlatList
                  data={matches}
                  keyExtractor={(match) => String(match.id)}
                  style={{ maxHeight: 260 }}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.matchRow}
                      onPress={() => handleInvite(item.other_user.id)}
                      disabled={invitingId !== null}
                    >
                      <Avatar name={item.other_user.display_name} photoUrl={item.other_user.photo_url} size={40} />
                      <Text style={[styles.partnerName, { flex: 1 }]}>{item.other_user.display_name}</Text>
                      {invitingId === item.other_user.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  activePairBox: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  activePairTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  partnerName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  partnerStatus: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  disbandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentRed,

    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  disbandBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#FFF",
  },
  infoBox: {
    gap: spacing.md,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  emptyMatchesText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

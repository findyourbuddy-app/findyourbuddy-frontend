import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, radius, spacing, typeScale, shadows } from "../../theme";
import { Avatar } from "../ui/Avatar";
import {
  getMyDoubleBuddy,
  disbandDoubleBuddy,
  inviteDoubleBuddy,
  respondToDoubleBuddyInvite,
  type DoubleBuddyPair,
} from "../../api/doubleBuddy";
import { listMyMatches } from "../../api/matches";
import type { Match } from "../../types";
import { Alert } from "../../utils/alert";
import { translate } from "../../constants/translations";

interface Props {
  visible: boolean;
  onClose: () => void;
  language?: string;
  onChange?: () => void;
}

export function DoubleBuddyModal({ visible, onClose, language = "tr", onChange }: Props) {
  const [pair, setPair] = useState<DoubleBuddyPair | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [responding, setResponding] = useState(false);

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

  async function handleRespond(accept: boolean): Promise<void> {
    if (!pair) return;
    setResponding(true);
    try {
      const result = await respondToDoubleBuddyInvite(pair.id, accept);
      setPair(result);
      onChange?.();
      if (!result) {
        listMyMatches().then(setMatches).catch(() => setMatches([]));
      }
    } catch {
      Alert.alert(
        translate("error", language),
        translate("couldNotRespondToThe", language)
      );
    } finally {
      setResponding(false);
    }
  }

  async function handleInvite(partnerId: number): Promise<void> {
    setInvitingId(partnerId);
    try {
      const result = await inviteDoubleBuddy(partnerId);
      setPair(result);
      onChange?.();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert(
        translate("error", language),
        typeof detail === "string" && detail
          ? detail
          : translate("couldNotSendDoubleBuddy", language)
      );
    } finally {
      setInvitingId(null);
    }
  }

  async function handleDisband() {
    Alert.alert(
      translate("disbandDoubleBuddy", language),
      translate("areYouSureYouWant", language),
      [
        { text: translate("cancel", language), style: "cancel" },
        {
          text: translate("disband", language),
          style: "destructive",
          onPress: async () => {
            try {
              await disbandDoubleBuddy();
              setPair(null);
              onChange?.();
              listMyMatches().then(setMatches).catch(() => setMatches([]));
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
                {translate("doubleBuddyPairMode", language)}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : pair && pair.status === "pending" && pair.is_incoming ? (
            <View style={styles.activePairBox}>
              <Text style={styles.activePairTitle}>
                {translate("doubleBuddyInvite", language)}
              </Text>
              <View style={styles.partnerRow}>
                <Avatar name={pair.partner_name} photoUrl={pair.partner_photo} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerName}>{pair.partner_name}</Text>
                  <Text style={styles.partnerStatus}>
                    {translate("wantsToPairUpWith", language)}
                  </Text>
                </View>
              </View>
              <View style={styles.inviteActions}>
                <Pressable
                  style={[styles.inviteBtn, styles.rejectBtn]}
                  onPress={() => handleRespond(false)}
                  disabled={responding}
                >
                  <Text style={styles.rejectBtnText}>{translate("decline", language)}</Text>
                </Pressable>
                <Pressable
                  style={[styles.inviteBtn, styles.acceptBtn]}
                  onPress={() => handleRespond(true)}
                  disabled={responding}
                >
                  {responding ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.acceptBtnText}>{translate("accept", language)}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : pair && pair.status === "pending" ? (
            <View style={styles.activePairBox}>
              <Text style={styles.activePairTitle}>
                {translate("inviteSent", language)}
              </Text>
              <View style={styles.partnerRow}>
                <Avatar name={pair.partner_name} photoUrl={pair.partner_photo} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerName}>{pair.partner_name}</Text>
                  <Text style={styles.partnerStatus}>
                    {translate("waitingForTheirAnswer", language)}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.disbandBtn} onPress={handleDisband}>
                <Feather name="x" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.disbandBtnText}>
                  {translate("cancelInvite", language)}
                </Text>
              </Pressable>
            </View>
          ) : pair ? (
            <View style={styles.activePairBox}>
              <Text style={styles.activePairTitle}>
                {translate("activeDoubleBuddyPair", language)}
              </Text>
              <View style={styles.partnerRow}>
                <Avatar name={pair.partner_name} photoUrl={pair.partner_photo} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerName}>{pair.partner_name}</Text>
                  <Text style={styles.partnerStatus}>
                    {translate("pairedUpForEvents", language)}
                  </Text>
                </View>
              </View>

              <Pressable style={styles.disbandBtn} onPress={handleDisband}>
                <Feather name="user-x" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.disbandBtnText}>
                  {translate("disbandPair", language)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {translate("pickAMatchedBuddyBelow", language)}
              </Text>

              {matches.length === 0 ? (
                <Text style={styles.emptyMatchesText}>
                  {translate("youDontHaveAnyMatches", language)}
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
  inviteActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inviteBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minHeight: 40,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#FFF",
  },
  rejectBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
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

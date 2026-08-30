import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Alert } from "../utils/alert";
import { useFocusEffect } from "@react-navigation/native";
import { Avatar } from "../components/ui/Avatar";
import { listMyBlocks, unblockUser } from "../api/safety";
import { colors, fontFamily, radius, spacing } from "../theme";
import type { BlockedUser } from "../types";

import { useAppTheme } from "../context/ThemeContext";

export function BlockedUsersScreen() {
  const { bgGradient, language, t } = useAppTheme();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlockedUsers = useCallback(async () => {
    if (blockedUsers.length === 0) {
      setIsLoading(true);
    }
    try {
      setBlockedUsers(await listMyBlocks());
    } catch {
      Alert.alert("Bir sorun oluştu", "Engellenen kullanıcılar yüklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  }, [blockedUsers.length]);

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, [loadBlockedUsers])
  );

  function confirmUnblock(item: BlockedUser): void {
    Alert.alert(
      t("unblockUser"),
      t("areYouSureYouWant2", { p0: item.blocked_user.display_name }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("unblock"),
          onPress: async () => {
            try {
              await unblockUser(item.blocked_user.id);
              setBlockedUsers((current) => current.filter((b) => b.id !== item.id));
            } catch {
              Alert.alert("Bir sorun oluştu", "Engel kaldırılamadı. Lütfen tekrar dene.");
            }
          },
        },
      ]
    );
  }

  return (
    <FlatList
      style={[styles.background, { backgroundColor: bgGradient[0] }]}
      contentContainerStyle={styles.list}
      data={blockedUsers}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        !isLoading ? <Text style={styles.emptyText}>{t("noBlockedUsers")}</Text> : null
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar
            name={item.blocked_user.display_name}
            photoUrl={item.blocked_user.photo_url}
            size={48}
          />
          <Text style={styles.name}>{item.blocked_user.display_name}</Text>
          <Pressable style={styles.unblockButton} onPress={() => confirmUnblock(item)}>
            <Text style={styles.unblockText}>Engeli Kaldır</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

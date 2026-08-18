import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessagesContext } from "../../context/MessagesContext";
import { colors, fontFamily, radius, spacing } from "../../theme";
import type { FeatherIconName } from "../../constants/categories";

import { useAppTheme } from "../../context/ThemeContext";

const TAB_ICON: Record<string, FeatherIconName> = {
  Discover: "compass",
  Swipe: "heart",
  Messages: "message-circle",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { hasUnreadMessages } = useMessagesContext();
  const { t, accentColor } = useAppTheme();

  const tabLabels: Record<string, string> = {
    Discover: t("tabDiscover"),
    Swipe: t("tabSwipe"),
    Messages: t("tabMessages"),
  };

  return (
    <View style={[styles.container, { bottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icon = TAB_ICON[route.name] ?? "circle";
        const label = tabLabels[route.name] ?? route.name;

        function handlePress(): void {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
          >
            <View style={[styles.iconWrapper, isFocused && { backgroundColor: accentColor }]}>
              <Feather name={icon} size={20} color={isFocused ? colors.surface : colors.textSecondary} />
              {route.name === "Messages" && hasUnreadMessages ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={[styles.label, isFocused && { color: accentColor, fontFamily: fontFamily.bodySemiBold }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperActive: {
    backgroundColor: colors.primary,
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
});

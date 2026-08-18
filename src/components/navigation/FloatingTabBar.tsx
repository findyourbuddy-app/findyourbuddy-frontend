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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
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
            <View style={[styles.iconWrapper, isFocused && { backgroundColor: `${accentColor}18` }]}>
              <Feather name={icon} size={20} color={isFocused ? accentColor : colors.textSecondary} />
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingTop: 6,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 34,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accentRed,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
});

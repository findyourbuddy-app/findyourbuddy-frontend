import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily } from "../../theme";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  blurRadius?: number;
}

const FALLBACK_COLORS = ["#6C4CF1", "#FF6A6A", "#2FA88B", "#D9427F", "#2E7FC9", "#FF8A3C"];

function colorForName(name: string): string {
  const hash = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function initialsForName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}

export function Avatar({ name, photoUrl, size = 48, blurRadius }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={dimensionStyle}
        contentFit="cover"
        blurRadius={blurRadius}
      />
    );
  }

  return (
    <View style={[styles.fallback, dimensionStyle, { backgroundColor: colorForName(name) }]}>
      {blurRadius && blurRadius > 0 ? (
        <Feather name="lock" size={size * 0.4} color={colors.surface} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initialsForName(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.surface,
  },
});

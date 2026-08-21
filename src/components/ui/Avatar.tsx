import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { API_BASE_URL } from "../../constants/config";
import { colors, fontFamily } from "../../theme";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  blurRadius?: number;
  isVerified?: boolean;
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

export function resolvePhotoUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("file://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes("localhost:") || trimmed.includes("127.0.0.1:") || trimmed.includes("192.168.")) {
      return trimmed.replace(/http:\/\/[^/]+/, base);
    }
    if (trimmed.includes("r2.dev")) {
      const filename = trimmed.split("/").pop();
      if (filename) {
        return `${base}/static/uploads/${filename}`;
      }
    }
    return trimmed;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function Avatar({ name, photoUrl, size = 48, blurRadius, isVerified }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const resolvedUrl = resolvePhotoUrl(photoUrl);

  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };
  const badgeSize = Math.max(14, Math.round(size * 0.32));

  return (
    <View style={{ position: "relative", width: size, height: size }}>
      {resolvedUrl && !imageError ? (
        <>
          <Image
            key={resolvedUrl}
            source={{ uri: resolvedUrl }}
            style={dimensionStyle}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
          {blurRadius && blurRadius > 0 ? (
            // expo-image's own blurRadius prop is unreliable across
            // platforms/caching -- an explicit BlurView overlay always
            // visibly obscures the photo underneath, which matters here
            // since this gates a paid feature (Premium unlock).
            <BlurView
              intensity={80}
              tint="light"
              style={[dimensionStyle, styles.blurOverlay]}
            >
              <Feather name="lock" size={size * 0.4} color={colors.surface} />
            </BlurView>
          ) : null}
        </>
      ) : (
        <View style={[styles.fallback, dimensionStyle, { backgroundColor: colorForName(name) }]}>
          {blurRadius && blurRadius > 0 ? (
            <Feather name="lock" size={size * 0.4} color={colors.surface} />
          ) : (
            <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initialsForName(name)}</Text>
          )}
        </View>
      )}

      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: -2,
              right: -2,
            },
          ]}
        >
          <Feather name="check" size={badgeSize * 0.7} color="#FFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.surface,
  },
  verifiedBadge: {
    position: "absolute",
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});

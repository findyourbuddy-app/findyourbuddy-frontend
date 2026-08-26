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

  // Local mobile device URIs (iOS ph://, Android content://, file://, data:, blob:)
  if (
    trimmed.startsWith("file:") ||
    trimmed.startsWith("content:") ||
    trimmed.startsWith("ph:") ||
    trimmed.startsWith("assets-library:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const base = API_BASE_URL.replace(/\/+$/, "");

  // Absolute HTTP/HTTPS URLs (external services like Giphy, Google, etc.)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes("giphy.com") || trimmed.includes("giphy.org") || trimmed.includes("googleusercontent.com")) {
      return trimmed;
    }
    if (trimmed.includes("r2.dev")) {
      const fileName = trimmed.split("/").pop() || "";
      return `${base}/media/${fileName}`;
    }
    if (
      trimmed.includes("localhost") ||
      trimmed.includes("127.0.0.1") ||
      trimmed.includes("10.0.2.2") ||
      /192\.168\.\d+\.\d+/.test(trimmed)
    ) {
      return trimmed.replace(/^https?:\/\/[^/]+/, base);
    }
    return trimmed;
  }

  // If it contains /media/ or /uploads/ path
  if (trimmed.includes("/media/") || trimmed.includes("/uploads/")) {
    const mediaPath = trimmed.includes("/media/")
      ? trimmed.substring(trimmed.indexOf("/media/"))
      : trimmed.substring(trimmed.indexOf("/uploads/"));
    return `${base}${mediaPath}`;
  }

  // Relative path fallback
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${cleanPath}`;
}

export function Avatar({ name, photoUrl, size = 48, blurRadius, isVerified }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const resolvedUrl = resolvePhotoUrl(photoUrl);

  useEffect(() => {
    setImageError(false);
  }, [resolvedUrl]);

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };
  const badgeSize = Math.max(14, Math.round(size * 0.32));

  return (
    <View style={{ position: "relative", width: size, height: size }}>
      {resolvedUrl && !imageError ? (
        <>
          <Image
            source={{ uri: resolvedUrl }}
            style={dimensionStyle}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
            pointerEvents="none"
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

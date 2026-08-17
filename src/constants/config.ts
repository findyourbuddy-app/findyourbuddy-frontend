import { Platform } from "react-native";
import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  // Allow explicit environment variable override if provided
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  // 1. On Web (PC browser): map 'localhost' to IPv4 '127.0.0.1' to prevent Windows IPv6 (::1) connection refusal
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://127.0.0.1:8000";
      }
      return `http://${hostname}:8000`;
    }
    return "http://127.0.0.1:8000";
  }

  // 2. On native mobile (Expo Go / physical phone): auto-detect developer machine's LAN IP from Expo hostUri
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (
      ip &&
      ip !== "localhost" &&
      ip !== "127.0.0.1" &&
      !ip.startsWith("192.168.56.") &&
      !ip.startsWith("192.168.99.") &&
      !ip.startsWith("10.0.75.") &&
      !ip.startsWith("169.254.")
    ) {
      return `http://${ip}:8000`;
    }
  }

  // 3. Fallback: Default to host machine's Wi-Fi IP (192.168.0.27:8000) so physical Android & iOS devices on LAN can connect seamlessly
  return "http://192.168.0.27:8000";
}

export const API_BASE_URL = getApiBaseUrl();
export const AUTH_TOKEN_STORAGE_KEY = "findyourbuddy_access_token";

import { Platform } from "react-native";
import Constants from "expo-constants";

const __DEV__ = process.env.NODE_ENV !== "production";

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  if (!__DEV__) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL must be set in production builds."
    );
  }

  // Dev: On Web (PC browser)
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://127.0.0.1:8001";
      }
      return `http://${hostname}:8001`;
    }
    return "http://127.0.0.1:8001";
  }

  // Dev: native mobile — auto-detect developer machine's LAN IP from Expo hostUri
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (
      host &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.startsWith("192.168.56.") &&
      !host.startsWith("192.168.99.") &&
      !host.startsWith("10.0.75.") &&
      !host.startsWith("169.254.")
    ) {
      return `http://${host}:8001`;
    }
  }

  return "http://127.0.0.1:8001";
}

export const API_BASE_URL = getApiBaseUrl();
export const AUTH_TOKEN_STORAGE_KEY = "findyourbuddy_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "findyourbuddy_refresh_token";

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store wraps the iOS Keychain / Android Keystore and has no web
// implementation, so web (react-native-web) falls back to localStorage.
const isWeb = Platform.OS === "web";

export async function getToken(key: string): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteToken(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

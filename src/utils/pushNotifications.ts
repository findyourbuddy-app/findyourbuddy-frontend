import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Resolves the device's Expo push token, requesting notification permission
 * if needed. Returns null on simulators, when permission is denied, or when
 * the project has no EAS projectId configured yet (getExpoPushTokenAsync
 * throws in that case) — callers should treat null as "push unavailable"
 * rather than an error.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const response = await Notifications.getExpoPushTokenAsync();
    return response.data;
  } catch {
    return null;
  }
}

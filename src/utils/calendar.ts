import { Alert } from "./alert";
import * as Calendar from "expo-calendar";
import { Linking, Platform } from "react-native";
import type { Event } from "../types";

export function getGoogleCalendarUrl(event: Event): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || "FindYourBuddy etkinliği");
  const location = encodeURIComponent(event.location_name);

  const startTime = new Date(event.starts_at).toISOString().replace(/-|:|\.\d\d\d/g, "");
  const endTime = new Date(new Date(event.starts_at).getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, "");

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}&sf=true&output=xml`;
}

export async function openAddToCalendar(event: Event): Promise<void> {
  if (Platform.OS === "web") {
    const url = getGoogleCalendarUrl(event);
    await Linking.openURL(url);
    return;
  }

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Takvim İzni Gerekli",
        "Etkinliği takvimine ekleyebilmek için takvim iznine ihtiyacımız var."
      );
      return;
    }

    const startDate = new Date(event.starts_at);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    // Launches the native OS calendar dialog screen directly on the device
    await Calendar.createEventInCalendarAsync({
      title: event.title,
      startDate,
      endDate,
      location: event.location_name,
      notes: event.description || "FindYourBuddy etkinliği",
    });
  } catch {
    // Fallback to web link if native dialog fails
    const url = getGoogleCalendarUrl(event);
    await Linking.openURL(url);
  }
}

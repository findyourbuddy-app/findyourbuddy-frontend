import { Alert } from "./alert";
import { Linking } from "react-native";
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
  const url = getGoogleCalendarUrl(event);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(`https://calendar.google.com/`);
    }
  } catch {
    Alert.alert(
      "Takvim Hatası",
      "Takvim uygulaması açılamadı. Lütfen tekrar dene."
    );
  }
}

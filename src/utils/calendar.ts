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

async function openGoogleCalendarFallback(event: Event): Promise<void> {
  const url = getGoogleCalendarUrl(event);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(`https://calendar.google.com/`);
  }
}

async function getWritableCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((cal) => cal.allowsModifications);
  if (writable) return writable.id;

  if (Platform.OS === "ios") {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar?.id ?? null;
  }

  // Android has no single "default" calendar -- create a dedicated one if
  // none of the existing calendars accept new events.
  const sources = await Calendar.getSourcesAsync();
  const localSource = sources.find((source) => source.type === Calendar.SourceType.LOCAL) ?? sources[0];
  if (!localSource) return null;

  return Calendar.createCalendarAsync({
    title: "FindYourBuddy",
    color: "#6C5CE7",
    entityType: Calendar.EntityTypes.EVENT,
    source: localSource,
    sourceId: localSource.id,
    name: "FindYourBuddy",
    ownerAccount: "FindYourBuddy",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

export async function openAddToCalendar(event: Event): Promise<void> {
  // Web has no native calendar to write into -- the Google Calendar link is
  // the correct (only) option there.
  if (Platform.OS === "web") {
    await openGoogleCalendarFallback(event);
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

    const calendarId = await getWritableCalendarId();
    if (!calendarId) {
      await openGoogleCalendarFallback(event);
      return;
    }

    const startDate = new Date(event.starts_at);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.location_name,
      notes: event.description || "FindYourBuddy etkinliği",
    });

    Alert.alert("Eklendi ✓", "Etkinlik takvimine eklendi.");
  } catch {
    // Best-effort fallback if the native calendar write fails for any reason.
    await openGoogleCalendarFallback(event);
  }
}

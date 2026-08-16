import { apiClient } from "./client";
import { toUploadFile } from "./users";
import type { Event, EventCreate, EventCreationQuota, User } from "../types";

export function listEvents(category?: string, upcomingOnly = true, skip = 0, limit = 20): Promise<Event[]> {
  return apiClient
    .get<Event[]>("/events/", { params: { category, upcoming_only: upcomingOnly, skip, limit } })
    .then((res) => res.data);
}

export function getEvent(eventId: number): Promise<Event> {
  return apiClient.get<Event>(`/events/${eventId}`).then((res) => res.data);
}

export function createEvent(data: EventCreate): Promise<Event> {
  return apiClient.post<Event>("/events/", data).then((res) => res.data);
}

export function attendEvent(eventId: number): Promise<Event> {
  return apiClient.post<Event>(`/events/${eventId}/attend`).then((res) => res.data);
}

export function listMyAttendingEvents(upcomingOnly = true): Promise<Event[]> {
  return apiClient
    .get<Event[]>("/events/me/attending", { params: { upcoming_only: upcomingOnly } })
    .then((res) => res.data);
}

export async function uploadEventTicket(eventId: number, uri: string, fileName: string): Promise<Event> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, fileName));

  return apiClient
    .post<Event>(`/events/${eventId}/ticket`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export function checkInToEvent(
  eventId: number,
  coords: { latitude: number; longitude: number }
): Promise<Event> {
  return apiClient
    .post<Event>(`/events/${eventId}/check-in`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
    })
    .then((res) => res.data);
}

export function getEventCreationQuota(): Promise<EventCreationQuota> {
  return apiClient.get<EventCreationQuota>("/events/me/creation-quota").then((res) => res.data);
}

export function createEventCreditsCheckoutSession(): Promise<{ checkout_url: string }> {
  return apiClient
    .post<{ checkout_url: string }>("/events/credits/checkout-session")
    .then((res) => res.data);
}

export function listJoinRequests(eventId: number): Promise<User[]> {
  return apiClient.get<User[]>(`/events/${eventId}/join-requests`).then((res) => res.data);
}

export function respondToJoinRequest(eventId: number, userId: number, approved: boolean): Promise<Event> {
  return apiClient
    .patch<Event>(`/events/${eventId}/join-requests/${userId}`, { approved })
    .then((res) => res.data);
}

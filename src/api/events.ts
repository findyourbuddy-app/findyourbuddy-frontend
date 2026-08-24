import { apiClient } from "./client";
import type { Event, EventCreate, EventCreationQuota, EventPublicSummary, User } from "../types";

export function listEvents(
  category?: string,
  upcomingOnly = true,
  skip = 0,
  limit = 20,
  origin?: "system" | "user"
): Promise<Event[]> {
  return apiClient
    .get<Event[]>("/events/", { params: { category, upcoming_only: upcomingOnly, skip, limit, origin } })
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

export function listMyCreatedEvents(upcomingOnly = true): Promise<Event[]> {
  return apiClient
    .get<Event[]>("/events/me/created", { params: { upcoming_only: upcomingOnly } })
    .then((res) => res.data);
}

export function getUserUpcomingEvents(userId: number): Promise<EventPublicSummary[]> {
  return apiClient
    .get<EventPublicSummary[]>(`/events/user/${userId}/upcoming`)
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

export function getEventJoinRequests(eventId: number): Promise<User[]> {
  return apiClient.get<User[]>(`/events/${eventId}/join-requests`).then((res) => res.data);
}

export function handleEventJoinRequest(
  eventId: number,
  userId: number,
  approved: boolean
): Promise<Event> {
  return apiClient
    .patch<Event>(`/events/${eventId}/join-requests/${userId}`, { approved })
    .then((res) => res.data);
}

export function approveAllEventJoinRequests(eventId: number): Promise<Event> {
  return apiClient
    .post<Event>(`/events/${eventId}/join-requests/approve-all`)
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

export function recordEventImpression(eventId: number): Promise<void> {
  return apiClient.post(`/events/${eventId}/impressions`).then(() => undefined).catch(() => undefined);
}

export function recordBulkEventImpressions(eventIds: number[]): Promise<void> {
  if (!eventIds || eventIds.length === 0) return Promise.resolve();
  return apiClient.post("/events/impressions", eventIds).then(() => undefined).catch(() => undefined);
}

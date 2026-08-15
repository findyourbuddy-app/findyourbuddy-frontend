import { apiClient } from "./client";
import type { Event, EventCreate } from "../types";

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

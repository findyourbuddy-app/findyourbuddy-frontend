import { apiClient } from "./client";
import type { Swipe, SwipeCreate, User } from "../types";

export interface SwipeCandidateFilters {
  minAge?: number;
  maxAge?: number;
  maxDistanceKm?: number;
}

export function getSwipeCandidates(
  eventId: number,
  filters?: SwipeCandidateFilters
): Promise<User[]> {
  return apiClient
    .get<User[]>("/swipes/candidates", {
      params: {
        event_id: eventId,
        min_age: filters?.minAge,
        max_age: filters?.maxAge,
        max_distance_km: filters?.maxDistanceKm,
      },
    })
    .then((res) => res.data);
}

export function createSwipe(data: SwipeCreate): Promise<Swipe> {
  return apiClient.post<Swipe>("/swipes/", data).then((res) => res.data);
}

export function getIncomingLikes(eventId: number): Promise<User[]> {
  return apiClient
    .get<User[]>("/swipes/likes-received", { params: { event_id: eventId } })
    .then((res) => res.data);
}

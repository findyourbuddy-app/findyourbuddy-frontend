import { apiClient } from "./client";
import type { Swipe, SwipeCreate, User } from "../types";

export interface SwipeCandidateFilters {
  minAge?: number;
  maxAge?: number;
  maxDistanceKm?: number;
  genderPreference?: string;
  requirePhoto?: boolean;
  onlyOnline?: boolean;
  zodiacSign?: string;
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
        gender_preference: filters?.genderPreference,
      },
    })
    .then((res) => res.data);
}

export function createSwipe(data: SwipeCreate): Promise<Swipe> {
  return apiClient.post<Swipe>("/swipes/", data).then((res) => res.data);
}

export interface LikerResponse {
  user: User;
  event_id: number;
}

export function getIncomingLikes(eventId?: number): Promise<LikerResponse[]> {
  return apiClient
    .get<LikerResponse[]>("/swipes/likes-received", { params: { event_id: eventId } })
    .then((res) => res.data);
}

export interface SwipeQuota {
  is_premium: boolean;
  swipes_used_today: number;
  swipe_limit: number | null;
  super_likes_used_today: number;
  super_like_limit: number;
}

export function getSwipeQuota(): Promise<SwipeQuota> {
  return apiClient.get<SwipeQuota>("/swipes/quota").then((res) => res.data);
}

import { apiClient } from "./client";
import type { Swipe, SwipeCreate, User } from "../types";

export function getSwipeCandidates(eventId: number): Promise<User[]> {
  return apiClient
    .get<User[]>("/swipes/candidates", { params: { event_id: eventId } })
    .then((res) => res.data);
}

export function createSwipe(data: SwipeCreate): Promise<Swipe> {
  return apiClient.post<Swipe>("/swipes/", data).then((res) => res.data);
}

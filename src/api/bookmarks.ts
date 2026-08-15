import { apiClient } from "./client";
import type { Bookmark } from "../types";

export function listMyBookmarks(): Promise<Bookmark[]> {
  return apiClient.get<Bookmark[]>("/bookmarks/").then((res) => res.data);
}

export function createBookmark(eventId: number): Promise<Bookmark> {
  return apiClient.post<Bookmark>(`/bookmarks/${eventId}`).then((res) => res.data);
}

export function deleteBookmark(eventId: number): Promise<void> {
  return apiClient.delete(`/bookmarks/${eventId}`).then(() => undefined);
}

import axios from "axios";
import { apiClient } from "./client";
import type { Bookmark } from "../types";

export function listMyBookmarks(): Promise<Bookmark[]> {
  return apiClient.get<Bookmark[]>("/bookmarks/").then((res) => res.data);
}

export function createBookmark(eventId: number): Promise<Bookmark | null> {
  return apiClient
    .post<Bookmark>(`/bookmarks/${eventId}`)
    .then((res) => res.data)
    .catch((error) => {
      if (axios.isAxiosError(error) && (error.response?.status === 409 || error.response?.status === 400)) {
        return null;
      }
      throw error;
    });
}

export function deleteBookmark(eventId: number): Promise<void> {
  return apiClient
    .delete(`/bookmarks/${eventId}`)
    .then(() => undefined)
    .catch((error) => {
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 409)) {
        return undefined;
      }
      throw error;
    });
}

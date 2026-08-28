import { apiClient } from "./client";
import { postMultipart, toUploadFile } from "./users";
import type { Message, MessageCreate } from "../types";

export function listMessages(matchId: number): Promise<Message[]> {
  return apiClient.get<Message[]>(`/matches/${matchId}/messages/`).then((res) => res.data);
}

export function sendMessage(matchId: number, data: MessageCreate): Promise<Message> {
  return apiClient
    .post<Message>(`/matches/${matchId}/messages/`, data)
    .then((res) => res.data);
}

export function markMessagesAsRead(matchId: number): Promise<{ count: number }> {
  return apiClient
    .patch<{ count: number }>(`/matches/${matchId}/messages/read`)
    .then((res) => res.data);
}

export interface IcebreakerItem {
  text: string;
  type: "text" | "voice";
}

export function getIcebreakers(matchId: number): Promise<IcebreakerItem[]> {
  return apiClient
    .get<IcebreakerItem[]>(`/matches/${matchId}/messages/icebreakers`)
    .then((res) => res.data);
}

export async function uploadChatMedia(uri: string, fileName: string): Promise<{ url: string }> {
  const formData = new FormData();
  const fileData = await toUploadFile(uri, fileName);
  formData.append("file", fileData as any);
  return postMultipart<{ url: string }>("/users/me/media", formData);
}


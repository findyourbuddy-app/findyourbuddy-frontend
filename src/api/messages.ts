import { apiClient } from "./client";
import type { Message, MessageCreate } from "../types";

export function listMessages(matchId: number): Promise<Message[]> {
  return apiClient.get<Message[]>(`/matches/${matchId}/messages/`).then((res) => res.data);
}

export function sendMessage(matchId: number, data: MessageCreate): Promise<Message> {
  return apiClient
    .post<Message>(`/matches/${matchId}/messages/`, data)
    .then((res) => res.data);
}

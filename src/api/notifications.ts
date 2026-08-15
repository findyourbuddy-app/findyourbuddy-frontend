import { apiClient } from "./client";
import type { Notification } from "../types";

export function listMyNotifications(): Promise<Notification[]> {
  return apiClient.get<Notification[]>("/notifications/").then((res) => res.data);
}

export function markMyNotificationsRead(): Promise<{ count: number }> {
  return apiClient
    .patch<{ count: number }>("/notifications/read")
    .then((res) => res.data);
}

export function registerDeviceToken(token: string): Promise<void> {
  return apiClient.post("/users/me/device-tokens", { token }).then(() => undefined);
}

export function unregisterDeviceToken(token: string): Promise<void> {
  return apiClient.delete(`/users/me/device-tokens/${encodeURIComponent(token)}`).then(() => undefined);
}

import { apiClient } from "./client";
import type { Block, BlockedUser, ReportCreate } from "../types";

export function blockUser(userId: number): Promise<Block> {
  return apiClient.post<Block>(`/users/${userId}/block`).then((res) => res.data);
}

export function listMyBlocks(): Promise<BlockedUser[]> {
  return apiClient.get<BlockedUser[]>("/users/me/blocks").then((res) => res.data);
}

export function unblockUser(userId: number): Promise<void> {
  return apiClient.delete(`/users/${userId}/block`).then(() => undefined);
}

export function reportUser(data: ReportCreate): Promise<void> {
  return apiClient.post("/reports", data).then(() => undefined);
}

import { apiClient } from "./client";

export interface DoubleBuddyPair {
  id: number;
  user_1_id: number;
  user_2_id: number;
  status: "pending" | "accepted";
  partner_name: string;
  partner_photo: string | null;
  is_incoming: boolean;
}

export function getMyDoubleBuddy(): Promise<DoubleBuddyPair | null> {
  return apiClient.get<DoubleBuddyPair | null>("/double-buddy/me").then((res) => res.data);
}

export function inviteDoubleBuddy(partnerId: number): Promise<DoubleBuddyPair> {
  return apiClient
    .post<DoubleBuddyPair>("/double-buddy/invite", { partner_id: partnerId })
    .then((res) => res.data);
}

export function respondToDoubleBuddyInvite(
  pairId: number,
  accept: boolean
): Promise<DoubleBuddyPair | null> {
  return apiClient
    .post<DoubleBuddyPair | null>(`/double-buddy/${pairId}/respond`, { accept })
    .then((res) => res.data);
}

export function disbandDoubleBuddy(): Promise<void> {
  return apiClient.delete("/double-buddy/disband").then(() => undefined);
}

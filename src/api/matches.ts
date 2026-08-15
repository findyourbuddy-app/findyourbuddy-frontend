import { apiClient } from "./client";
import type { Match } from "../types";

export function listMyMatches(): Promise<Match[]> {
  return apiClient.get<Match[]>("/matches/").then((res) => res.data);
}

export function submitMatchFeedback(matchId: number, metInPerson: boolean | null): Promise<void> {
  return apiClient
    .post(`/matches/${matchId}/feedback`, { met_in_person: metInPerson })
    .then(() => undefined);
}

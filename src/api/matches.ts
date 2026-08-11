import { apiClient } from "./client";
import type { Match } from "../types";

export function listMyMatches(): Promise<Match[]> {
  return apiClient.get<Match[]>("/matches/").then((res) => res.data);
}

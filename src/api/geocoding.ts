import { apiClient } from "./client";

export interface GeocodingResult {
  display_name: string;
  latitude: number;
  longitude: number;
}

export function searchLocations(query: string): Promise<GeocodingResult[]> {
  return apiClient
    .get<GeocodingResult[]>("/geocoding/search", { params: { q: query } })
    .then((res) => res.data);
}

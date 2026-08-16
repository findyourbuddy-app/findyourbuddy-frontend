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

export function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
  return apiClient
    .get<GeocodingResult>("/geocoding/reverse", { params: { lat: latitude, lon: longitude } })
    .then((res) => res.data);
}

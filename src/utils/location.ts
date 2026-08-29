import * as Location from "expo-location";

// (0, 0) is "null island" -- open ocean in the Gulf of Guinea. A scraped
// event landing there means geocoding failed, not that the event is
// actually happening there, so treat it as "no usable location" everywhere.
export function hasValidCoordinates(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  if (latitude == null || longitude == null) return false;
  return !(latitude === 0 && longitude === 0);
}

const locationCache = new Map<string, string>();

export async function resolveCityDistrict(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<string | null> {
  if (!latitude || !longitude || (latitude === 0 && longitude === 0)) {
    return null;
  }

  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          "User-Agent": "findyourbuddy-app/0.1",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const district = addr.town || addr.suburb || addr.district || addr.county || addr.city_district;
      const city = addr.province || addr.state || addr.city;
      let label = "";
      if (district && city && district !== city) {
        label = `${district}, ${city}`;
      } else {
        label = district || city || addr.city || "";
      }
      if (label) {
        locationCache.set(cacheKey, label);
        return label;
      }
    }
  } catch {
    // Fallback error handling
  }

  return null;
}

export async function getFastCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return last;
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }
}

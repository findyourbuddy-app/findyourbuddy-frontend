// (0, 0) is "null island" -- open ocean in the Gulf of Guinea. A scraped
// event landing there means geocoding failed, not that the event is
// actually happening there, so treat it as "no usable location" everywhere.
export function hasValidCoordinates(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  if (latitude == null || longitude == null) return false;
  return !(latitude === 0 && longitude === 0);
}

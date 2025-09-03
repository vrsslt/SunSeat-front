export type NearbyItem = {
  id: number | string;
  name: string;
  lat: number;
  lon: number;
  amenity?: string;
  distance_m: number;
  streetWidth: "narrow" | "medium" | "wide";
  orientationDeg: number;
  sunScore: number;
  forecast?: { tmin: number; score: number }[];

  // OSM / terrasse
  hasOutdoor?: boolean; // true si tags OSM forts (ou biergarten)
  terraceConfidence?: number; // 0..1
  terraceEvidence?: string[]; // ["osm:outdoor_seating=yes", ...]
  // extras côté back (pass-through)
  cuisine?: string;
  opening_hours?: string;
  website?: string;
  phone?: string;
  outdoor_seating?: string;
};

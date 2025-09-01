export type NearbyItem = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  orientationDeg: number;
  streetWidth: "narrow" | "medium" | "wide";
  distance_m: number;
  sunScore: number;
  forecast?: { tmin: number; score: number }[];
};

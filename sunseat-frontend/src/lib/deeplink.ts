// src/lib/deeplink.ts
export type DeepLinkState = {
  lat: number;
  lon: number;
  id?: string | number | null;
  t?: number; // minutes (0..120)
  min?: number; // filtre minScore (ex: 60)
};

export function buildDeepLink(state: DeepLinkState): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const p = new URLSearchParams();
  p.set("lat", state.lat.toFixed(6));
  p.set("lon", state.lon.toFixed(6));
  if (state.id != null) p.set("id", String(state.id));
  if (state.t) p.set("t", String(state.t));
  if (state.min) p.set("min", String(state.min));
  return `${origin}${path}?${p.toString()}`;
}

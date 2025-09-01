import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvent,
  Circle,
} from "react-leaflet";
import type { NearbyItem } from "../types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import ForecastBar from "./ForecastBar";

function patchLeafletIcons() {
  // @ts-ignore
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const prev = useRef(center);
  useEffect(() => {
    const [lat, lon] = center;
    const [plat, plon] = prev.current;
    if (lat !== plat || lon !== plon) {
      map.flyTo(center, map.getZoom(), { duration: 0.8 });
      prev.current = center;
    }
  }, [center, map]);
  return null;
}
function SyncMove({
  onMapMove,
}: {
  onMapMove?: (c: [number, number]) => void;
}) {
  useMapEvent("moveend", (e) => {
    const m = e.target as L.Map;
    const c = m.getCenter();
    onMapMove?.([c.lat, c.lng]);
  });
  return null;
}
const toNum = (v: any, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
function scoreAt(t: NearbyItem, offsetMin: number) {
  const s = t.forecast?.find((f) => f.tmin === offsetMin)?.score;
  return clamp(Math.round(toNum(s ?? t.sunScore ?? 0, 0)), 0, 100);
}

export default function MapView({
  center,
  items,
  onMapMove,
  zoom = 14,
  offsetMin,
  onSelectOffset,
  radius, // en mètres
}: {
  center: [number, number];
  items: NearbyItem[];
  onMapMove?: (c: [number, number]) => void;
  zoom?: number;
  offsetMin: number;
  onSelectOffset?: (m: number) => void;
  radius: number;
}) {
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  return (
    <div className="map" style={{ position: "relative" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <Recenter center={center} />
        <SyncMove onMapMove={onMapMove} />

        {/* Cercle de recherche (focus visuel) */}
        <Circle
          center={center}
          radius={radius}
          pathOptions={{ color: "#0ea5e9", weight: 1, fillOpacity: 0.08 }}
        />

        {Array.isArray(items) &&
          items.map((t) => {
            const score = scoreAt(t, offsetMin);
            return (
              <Marker
                key={`${t.id ?? t.name}:${t.lat}:${t.lon}`}
                position={[t.lat, t.lon]}
              >
                <Popup>
                  <strong>{t.name}</strong>
                  <br />
                  Score (+{offsetMin} min): {score}
                  <ForecastBar
                    data={t.forecast}
                    selected={offsetMin}
                    onSelect={onSelectOffset}
                    compact
                  />
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

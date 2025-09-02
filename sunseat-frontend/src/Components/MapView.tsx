import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyItem } from "../types";
import { patchLeafletDefaultIcon } from "../leaflet";

type Bounds = { north: number; south: number; east: number; west: number };

type Props = {
  center: [number, number];
  items: NearbyItem[] | unknown;
  onMapMove?: (newCenter: [number, number]) => void;
  onBoundsChange?: (b: Bounds) => void;
  selectedId?: number | string | null;
};

function colorFor(score: number | undefined) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const hue = Math.round((s / 100) * 120); // 0→rouge, 120→vert
  return `hsl(${hue} 82% 44%)`;
}
function keyFrom(t: any, idx: number) {
  const id = t?.id ?? `${t?.lat}_${t?.lon}_${idx}`;
  return `dot-${id}`;
}
function placeUrl(name: string | undefined, lat: number, lon: number) {
  const query = name ? `${lat},${lon} (${name})` : `${lat},${lon}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
}

function CenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const prev = useRef<[number, number]>(center);

  useEffect(() => {
    patchLeafletDefaultIcon();
  }, []);

  useEffect(() => {
    const [lat, lon] = center;
    const [plat, plon] = prev.current;
    const moved = Math.abs(lat - plat) > 1e-6 || Math.abs(lon - plon) > 1e-6;
    if (moved) {
      map.setView(center, map.getZoom(), { animate: true });
      prev.current = center;
    }
  }, [center, map]);

  return null;
}

function MoveEvents({
  onMapMove,
  onBoundsChange,
}: {
  onMapMove?: (c: [number, number]) => void;
  onBoundsChange?: (b: Bounds) => void;
}) {
  useMapEvents({
    moveend(e) {
      const m = e.target;
      const c = m.getCenter();
      const b = m.getBounds();
      onMapMove?.([c.lat, c.lng]);
      onBoundsChange?.({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
}

export default function MapView({
  center,
  items,
  onMapMove,
  onBoundsChange,
  selectedId,
}: Props) {
  const safeItems: NearbyItem[] = useMemo(() => {
    return Array.isArray(items)
      ? (items as any[]).filter(
          (t) =>
            t &&
            typeof t === "object" &&
            Number.isFinite(Number((t as any).lat)) &&
            Number.isFinite(Number((t as any).lon))
        )
      : [];
  }, [items]);

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <CenterUpdater center={center} />
      <MoveEvents onMapMove={onMapMove} onBoundsChange={onBoundsChange} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {safeItems.map((t, idx) => {
        const color = colorFor((t as any).sunScore);
        const isSel = (t as any).id === selectedId;
        const lat = Number((t as any).lat);
        const lon = Number((t as any).lon);

        return (
          <>
            {isSel && (
              <CircleMarker
                key={`halo-${keyFrom(t, idx)}`}
                center={[lat, lon]}
                radius={12}
                pathOptions={{
                  color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.15,
                }}
              />
            )}

            <CircleMarker
              key={keyFrom(t, idx)}
              center={[lat, lon]}
              radius={isSel ? 9 : 6}
              pathOptions={{
                color,
                weight: isSel ? 3 : 2,
                fillColor: color,
                fillOpacity: isSel ? 0.9 : 0.7,
              }}
              eventHandlers={{
                dblclick: () =>
                  window.open(
                    placeUrl((t as any).name, lat, lon),
                    "_blank",
                    "noopener,noreferrer"
                  ),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontSize: 12 }}>
                  <strong>{(t as any).name || "Sans nom"}</strong>
                  <br />
                  Score: {Math.round(Number((t as any).sunScore ?? 0))}% •{" "}
                  {Math.round(Number((t as any).distance_m ?? 0))} m
                </div>
              </Tooltip>
            </CircleMarker>
          </>
        );
      })}
    </MapContainer>
  );
}

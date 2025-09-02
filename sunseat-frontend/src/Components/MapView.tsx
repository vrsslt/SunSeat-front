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

type Props = {
  center: [number, number];
  items: NearbyItem[] | unknown;
  onMapMove?: (newCenter: [number, number]) => void;
};

function colorFor(score: number | undefined) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const hue = Math.round((s / 100) * 120); // 0 rouge → 120 vert
  return `hsl(${hue} 82% 44%)`;
}

function keyFrom(t: any, idx: number) {
  const id = t?.id ?? `${t?.lat}_${t?.lon}_${idx}`;
  return `dot-${id}`;
}

function CenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const prev = useRef<[number, number]>(center);

  useEffect(() => {
    patchLeafletDefaultIcon(); // au cas où d'autres Markers sont utilisés
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
}: {
  onMapMove?: (c: [number, number]) => void;
}) {
  useMapEvents({
    moveend(e) {
      if (!onMapMove) return;
      const m = e.target;
      const c = m.getCenter();
      onMapMove([c.lat, c.lng]);
    },
  });
  return null;
}

export default function MapView({ center, items, onMapMove }: Props) {
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
      <MoveEvents onMapMove={onMapMove} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {safeItems.map((t, idx) => {
        const color = colorFor((t as any).sunScore);
        return (
          <CircleMarker
            key={keyFrom(t, idx)}
            center={[Number((t as any).lat), Number((t as any).lon)]}
            radius={6}
            pathOptions={{
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.7,
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
        );
      })}
    </MapContainer>
  );
}

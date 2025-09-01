import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

type NearbyItem = {
  id?: number;
  name: string;
  lat: number;
  lon: number;
  sunScore?: number;
};

function patch() {
  // @ts-ignore
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
}

// 🔒 Assure un tableau
function toArray(data: any): NearbyItem[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export default function MapView({
  center,
  items,
  onSelect,
}: {
  center: [number, number];
  items: unknown;
  onSelect?: (t: NearbyItem) => void;
}) {
  useEffect(() => {
    patch();
  }, []);
  const list = toArray(items);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {list.map((t, idx) => (
        <Marker
          key={t.id ?? `${t.lat}:${t.lon}:${idx}`}
          position={[t.lat, t.lon]}
          eventHandlers={{ click: () => onSelect?.(t) }}
        >
          <Popup>
            <strong>{t.name}</strong>
            <br />
            Score: {Math.round(t.sunScore || 0)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

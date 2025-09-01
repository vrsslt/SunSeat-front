import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { patchLeafletDefaultIcon } from "./leaflet";
import { sunScore } from "./lib/sun";
import { demoTerraces } from "./data/terraces";

type Item = ReturnType<typeof makeItem>[number];
function makeItem(now = new Date()) {
  return demoTerraces.map((t) => {
    const { score, label } = sunScore(
      t.lat,
      t.lon,
      t.orientationDeg,
      t.streetWidth,
      now
    );
    return { ...t, score, label };
  });
}

export default function App() {
  useEffect(() => {
    patchLeafletDefaultIcon();
  }, []);
  const [now, setNow] = useState(new Date());
  const items = useMemo(
    () => makeItem(now).sort((a, b) => b.score - a.score),
    [now]
  );

  const center: [number, number] = [48.8566, 2.3522];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        height: "100vh",
      }}
    >
      <aside
        style={{
          padding: "1rem",
          borderRight: "1px solid #eee",
          overflow: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>SunSeat — POC</h2>
        <button
          onClick={() => setNow(new Date())}
          style={{ padding: ".6rem .9rem", borderRadius: 12 }}
        >
          🔄 Recalculer maintenant
        </button>

        <div style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
          {items.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "0.8rem",
                border: "1px solid #eee",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{t.name}</strong>
                <span
                  style={{
                    padding: ".2rem .6rem",
                    borderRadius: 999,
                    background:
                      t.score > 66
                        ? "#FFD54F"
                        : t.score > 33
                        ? "#4FC3F7"
                        : "#e0e0e0",
                    fontWeight: 700,
                  }}
                >
                  {t.score}
                </span>
              </div>
              <small>
                {t.label} • orient. {Math.round(t.orientationDeg)}° •{" "}
                {t.streetWidth}
              </small>
            </div>
          ))}
        </div>
      </aside>

      <main>
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {items.map((t) => (
            <Marker key={t.id} position={[t.lat, t.lon]}>
              <Popup>
                <strong>{t.name}</strong>
                <br />
                Score: {t.score} — {t.label}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { NearbyItem } from "./types";
import MapView from "./Components/MapView";
import TerraceCard from "./Components/TerraceCard";
import "leaflet/dist/leaflet.css";

// ---------- Utils ----------
// Parse robuste → nombre (gère null, undefined, NaN, etc.)
function toNum(v: any, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null) return fallback;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (!m) return fallback;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Clamp
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Normalise un item pour éviter les NaN
function normalizeItem(item: any): NearbyItem {
  return {
    ...item,
    id: item.id || Math.random(), // fallback si pas d'ID
    name: item.name || "Sans nom",
    lat: toNum(item.lat, 48.8566), // fallback Paris
    lon: toNum(item.lon, 2.3522),
    orientationDeg: clamp(toNum(item.orientationDeg, 0), 0, 360),
    streetWidth: ["narrow", "medium", "wide"].includes(item.streetWidth)
      ? item.streetWidth
      : "medium",
    distance_m: toNum(item.distance_m, 0),
    sunScore: clamp(toNum(item.sunScore, 0), 0, 100),
    forecast: Array.isArray(item.forecast)
      ? item.forecast.map((f: any) => ({
          tmin: toNum(f?.tmin, 0),
          score: clamp(toNum(f?.score, 0), 0, 100),
        }))
      : undefined,
  };
}

// Villes de test
const TEST_CITIES = [
  { name: "🇫🇷 Paris", coords: [48.8566, 2.3522] as [number, number] },
  { name: "🦁 Lyon", coords: [45.764, 4.8357] as [number, number] },
  { name: "⚓ Marseille", coords: [43.2965, 5.3698] as [number, number] },
  { name: "🌴 Nice", coords: [43.7102, 7.262] as [number, number] },
  { name: "🏔️ Grenoble", coords: [45.1885, 5.7245] as [number, number] },
  { name: "🍷 Bordeaux", coords: [44.8378, -0.5792] as [number, number] },
];

export default function App() {
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [center, setCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string>("Ma position");

  const load = async (lat: number, lon: number, cityName?: string) => {
    setLoading(true);
    setError(null);

    if (cityName) {
      setCurrentCity(cityName);
    }

    try {
      const { data } = await api.get<NearbyItem[]>("/terraces/nearby", {
        params: { lat, lon, radius: 1500, forecast: true },
      });

      console.log("Raw API response:", data);

      // Normalise les données pour éviter les NaN
      const normalizedData = Array.isArray(data) ? data.map(normalizeItem) : [];

      console.log("Normalized data:", normalizedData);
      setItems(normalizedData);
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err?.message || "Erreur lors du chargement");
      // Données de démo en cas d'erreur
      setItems([
        {
          id: 1,
          name: "Le Rayon Vert",
          lat: 48.8566,
          lon: 2.3522,
          orientationDeg: 180,
          streetWidth: "medium",
          distance_m: 120,
          sunScore: 78,
        },
        {
          id: 2,
          name: "Chez Azur",
          lat: 48.8581,
          lon: 2.3479,
          orientationDeg: 220,
          streetWidth: "narrow",
          distance_m: 340,
          sunScore: 42,
        },
        {
          id: 3,
          name: "Au Pin Soleil",
          lat: 48.8532,
          lon: 2.3499,
          orientationDeg: 140,
          streetWidth: "wide",
          distance_m: 510,
          sunScore: 66,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          setCenter(c);
          setCurrentCity("Ma position");
          load(...c);
        },
        (_) => {
          load(center[0], center[1]);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      load(center[0], center[1]);
    }
  }, []);

  // Tri sécurisé
  const sorted = useMemo(() => {
    const validItems = items.filter((item) => item && typeof item === "object");
    return [...validItems].sort((a, b) => {
      const scoreA = toNum(a.sunScore, 0);
      const scoreB = toNum(b.sunScore, 0);
      return scoreB - scoreA; // tri décroissant
    });
  }, [items]);

  // Actions
  const recenterToMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const c: [number, number] = [p.coords.latitude, p.coords.longitude];
        setCenter(c);
        setCurrentCity("Ma position");
        load(...c);
      });
    }
  };

  const refreshHere = () => load(center[0], center[1], currentCity);

  const testCity = (city: (typeof TEST_CITIES)[0]) => {
    setCenter(city.coords);
    load(...city.coords, city.name);
  };

  console.log("Final sorted items:", sorted);

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
        <h2 style={{ margin: 0 }}>SunSeat</h2>

        {/* Ville actuelle */}
        <div
          style={{
            margin: ".75rem 0",
            padding: ".5rem",
            background: "#f0f8ff",
            borderRadius: 8,
            fontSize: "0.9rem",
            fontWeight: "bold",
          }}
        >
          📍 {currentCity}
        </div>

        {/* Boutons de contrôle */}
        <div style={{ display: "flex", gap: ".5rem", marginBottom: ".75rem" }}>
          <button
            onClick={recenterToMe}
            style={{
              padding: ".6rem .9rem",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid #ddd",
              background: "#e8f5e8",
              fontSize: "0.85rem",
            }}
          >
            📍 Ma position
          </button>
          <button
            onClick={refreshHere}
            style={{
              padding: ".6rem .9rem",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid #ddd",
              background: "#f5f5f5",
              fontSize: "0.85rem",
            }}
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Boutons villes de test */}
        <div style={{ marginBottom: "1rem" }}>
          <h3
            style={{ margin: "0 0 .5rem 0", fontSize: "0.9rem", color: "#666" }}
          >
            🧪 Tester d'autres villes :
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: ".4rem",
            }}
          >
            {TEST_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => testCity(city)}
                style={{
                  padding: ".5rem .7rem",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  background: currentCity === city.name ? "#ffeaa7" : "#fff",
                  fontSize: "0.75rem",
                  fontWeight: currentCity === city.name ? "bold" : "normal",
                }}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* États de chargement */}
        {loading && (
          <p style={{ marginTop: "1rem", color: "#666" }}>
            🔍 Recherche des terrasses...
          </p>
        )}

        {error && (
          <p
            style={{ marginTop: "1rem", color: "#d32f2f", fontSize: "0.9rem" }}
          >
            ⚠️ {error}
          </p>
        )}

        {/* Statistiques */}
        <div
          style={{
            margin: "1rem 0",
            padding: ".5rem",
            background: "#f9f9f9",
            borderRadius: 6,
            fontSize: "0.85rem",
          }}
        >
          📊 {sorted.length} terrasse{sorted.length !== 1 ? "s" : ""} trouvée
          {sorted.length !== 1 ? "s" : ""}
          {sorted.length > 0 && (
            <>
              <br />
              ☀️ Meilleur score: {Math.round(sorted[0]?.sunScore || 0)}
            </>
          )}
        </div>

        {/* Liste des terrasses */}
        <div style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
          {sorted.length === 0 && !loading && (
            <div
              style={{
                color: "#666",
                fontStyle: "italic",
                textAlign: "center",
                padding: "2rem",
                background: "#f9f9f9",
                borderRadius: 8,
              }}
            >
              😔 Aucune terrasse trouvée
              <br />
              <small>Essayez une autre ville ou augmentez le rayon</small>
            </div>
          )}

          {sorted.map((t) => (
            <TerraceCard key={t.id} t={t} />
          ))}
        </div>
      </aside>

      <main>
        <MapView center={center} items={sorted} />
      </main>
    </div>
  );
}

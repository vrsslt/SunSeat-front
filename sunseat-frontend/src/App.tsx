import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { NearbyItem } from "./types";
import MapView from "./Components/MapView";
import TerraceCard from "./Components/TerraceCard";
import ScoreLegend from "./Components/ScoreLegend";
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
    id: item.id ?? Math.random(),
    name: item.name || "Sans nom",
    lat: toNum(item.lat, 48.8566),
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

// Service de géocodage (Nominatim - OpenStreetMap)
async function searchLocation(
  query: string
): Promise<{ lat: number; lon: number; display_name: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
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
  console.log("APP VERSION: 2024-01-15-v2"); // Change la date/version
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [center, setCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string>("Ma position");

  // Recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Filtre soleil (>60%)
  const [minScore, setMinScore] = useState<number>(0);

  const load = async (lat: number, lon: number, cityName?: string) => {
    setLoading(true);
    setError(null);

    if (cityName) setCurrentCity(cityName);

    try {
      const { data } = await api.get<NearbyItem[]>("/terraces/nearby", {
        params: { lat, lon, radius: 1500, forecast: true },
      });

      console.log("Raw API response:", data);
      const normalizedData = Array.isArray(data) ? data.map(normalizeItem) : [];
      console.log("Normalized data:", normalizedData);
      setItems(normalizedData);
      setLastUpdate(new Date());
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

  // Recherche textuelle
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);

    try {
      const result = await searchLocation(searchQuery);
      if (result) {
        const newCoords: [number, number] = [result.lat, result.lon];
        setCenter(newCoords);
        setCurrentCity(searchQuery);
        await load(result.lat, result.lon, searchQuery);
      } else {
        setSearchError("Lieu non trouvé");
      }
    } catch {
      setSearchError("Erreur de recherche");
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-refresh toutes les 2 minutes si activé
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        console.log("🔄 Auto-refresh triggered");
        load(center[0], center[1], currentCity);
      }, 2 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, center, currentCity]);

  // Init : géoloc sinon Paris par défaut
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          setCenter(c);
          setCurrentCity("Ma position");
          load(...c);
        },
        () => {
          load(center[0], center[1]);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      load(center[0], center[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tri puis filtrage
  const sorted = useMemo(() => {
    const validItems = items.filter((item) => item && typeof item === "object");
    return [...validItems].sort((a, b) => {
      const scoreA = toNum(a.sunScore, 0);
      const scoreB = toNum(b.sunScore, 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return toNum(a.distance_m, Infinity) - toNum(b.distance_m, Infinity);
    });
  }, [items]);

  const displayed = useMemo(() => {
    const thr = minScore || 0;
    return sorted.filter((t) => toNum(t.sunScore, 0) >= thr);
  }, [sorted, minScore]);

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
  const handleMapMove = (newCenter: [number, number]) => {
    setCenter(newCenter);
    // Optionnel: charger auto les données du nouveau centre
    // load(...newCenter, "Position carte");
  };

  console.log("Final displayed items:", displayed);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "380px 1fr",
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

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} style={{ margin: ".75rem 0" }}>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une ville..."
              style={{
                flex: 1,
                padding: ".7rem",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: "0.9rem",
              }}
              disabled={searchLoading}
            />
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              style={{
                padding: ".7rem 1rem",
                border: "1px solid #ddd",
                borderRadius: 6,
                cursor: searchLoading ? "wait" : "pointer",
                background: searchLoading ? "#f5f5f5" : "#4CAF50",
                color: searchLoading ? "#999" : "white",
                fontSize: "0.9rem",
              }}
              aria-label="Rechercher"
              title="Rechercher"
            >
              🔍
            </button>
          </div>
          {searchError && (
            <p
              style={{
                margin: ".5rem 0 0 0",
                color: "#d32f2f",
                fontSize: "0.8rem",
              }}
            >
              ⚠️ {searchError}
            </p>
          )}
        </form>

        {/* Ville actuelle */}
        <div
          style={{
            margin: ".75rem 0",
            padding: ".7rem",
            background: "#f0f8ff",
            borderRadius: 8,
            fontSize: "0.9rem",
            fontWeight: "bold",
          }}
        >
          📍 {currentCity}
          {lastUpdate && (
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: "normal",
                color: "#666",
                marginTop: ".3rem",
              }}
            >
              Dernière maj: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Boutons de contrôle */}
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            marginBottom: ".75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={recenterToMe}
            style={{
              padding: ".6rem .9rem",
              borderRadius: 6,
              cursor: "pointer",
              border: "1px solid #ddd",
              background: "#e8f5e8",
              fontSize: "0.8rem",
            }}
          >
            📍 Ma position
          </button>
          <button
            onClick={refreshHere}
            style={{
              padding: ".6rem .9rem",
              borderRadius: 6,
              cursor: "pointer",
              border: "1px solid #ddd",
              background: loading ? "#f5f5f5" : "#f0f0f0",
              fontSize: "0.8rem",
            }}
            disabled={loading}
          >
            {loading ? "⏳" : "🔄"} Actualiser
          </button>
        </div>

        {/* Auto-refresh toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".5rem",
            marginBottom: "0.75rem",
            padding: ".5rem",
            background: "#f9f9f9",
            borderRadius: 6,
          }}
        >
          <input
            type="checkbox"
            id="auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="auto-refresh"
            style={{
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "#666",
            }}
          >
            🔄 Actualisation automatique (2min)
          </label>
        </div>

        {/* Filtres soleil + légende */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: ".5rem",
            marginBottom: "0.75rem",
            padding: ".6rem",
            background: "#f9f9f9",
            borderRadius: 6,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={minScore >= 60}
              onChange={(e) => setMinScore(e.target.checked ? 60 : 0)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: ".85rem", color: "#444" }}>
              ☀️ Afficher seulement &gt; 60%
            </span>
          </label>
          <ScoreLegend />
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

        {/* États de chargement / erreurs */}
        {loading && (
          <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
            🔍 Recherche des terrasses...
          </p>
        )}
        {error && (
          <p
            style={{
              marginTop: "0.5rem",
              color: "#d32f2f",
              fontSize: "0.9rem",
            }}
          >
            ⚠️ {error}
          </p>
        )}

        {/* Statistiques */}
        <div
          style={{
            margin: "1rem 0",
            padding: ".7rem",
            background: "#f9f9f9",
            borderRadius: 6,
            fontSize: "0.85rem",
          }}
        >
          📊 {displayed.length} terrasse
          {displayed.length !== 1 ? "s" : ""} visible
          {displayed.length !== 1 ? "s" : ""}{" "}
          {minScore >= 60 && "(filtre >60%)"}
          {displayed.length > 0 && (
            <>
              <br />
              ☀️ Meilleur score: {Math.round(displayed[0]?.sunScore || 0)}%
              <br />
              📏 Rayon: 1.5km
            </>
          )}
        </div>

        {/* Liste des terrasses */}
        <div style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
          {displayed.length === 0 && !loading && (
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
              <small>
                {minScore >= 60
                  ? "Essayez en désactivant le filtre >60% ou élargissez la zone."
                  : "Essayez une autre ville ou recherche"}
              </small>
            </div>
          )}

          {displayed.map((t) => (
            <TerraceCard key={t.id} t={t} />
          ))}
        </div>
      </aside>

      <main>
        <MapView center={center} items={displayed} onMapMove={handleMapMove} />
      </main>
    </div>
  );
}

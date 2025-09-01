import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { NearbyItem } from "./types";
import MapView from "./Components/MapView";
import TerraceCard from "./Components/TerraceCard";
import "leaflet/dist/leaflet.css";
import "./styles.css";

/* Utils */
const toNum = (v: any, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const OFFSETS = [0, 15, 30, 45, 60, 90, 120] as const;

/* Distance Haversine (mètres) */
function distMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const a = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* Normalisation */
function normalizeItem(item: any): NearbyItem {
  const ori = toNum(item.orientationDeg ?? item.orientation_deg, 0);
  const mod = ori % 360;
  return {
    ...item,
    id: Number.isFinite(toNum(item.id, NaN)) ? toNum(item.id) : undefined,
    name: String(item.name ?? "Sans nom").trim() || "Sans nom",
    lat: toNum(item.lat, 48.8566),
    lon: toNum(item.lon, 2.3522),
    orientationDeg: clamp(mod < 0 ? mod + 360 : mod, 0, 360),
    streetWidth: ["narrow", "medium", "wide"].includes(item.streetWidth)
      ? item.streetWidth
      : item.street_width === "narrow" ||
        item.street_width === "medium" ||
        item.street_width === "wide"
      ? item.street_width
      : "medium",
    distance_m: toNum(
      item.distance_m ?? item.distance ?? item.distanceMeters,
      0
    ),
    sunScore: clamp(toNum(item.sunScore ?? item.score, 0), 0, 100),
    forecast: Array.isArray(item.forecast)
      ? item.forecast.map((f: any) => ({
          tmin: toNum(f?.tmin, 0),
          score: clamp(toNum(f?.score, 0), 0, 100),
        }))
      : undefined,
  };
}
function keyFrom(t: NearbyItem) {
  const idPart = t.id
    ? `id${t.id}`
    : `nm${(t.name || "").toLowerCase().replace(/\s+/g, "-")}`;
  const lat = toNum(t.lat, 0).toFixed(6);
  const lon = toNum(t.lon, 0).toFixed(6);
  const ori = Math.round(toNum(t.orientationDeg, 0));
  return `${idPart}:${lat}:${lon}:${ori}`;
}
function dedupe<T>(arr: T[], getKey: (x: any) => string) {
  const seen = new Set<string>();
  return arr.filter((x: any) => {
    const k = getKey(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function scoreAt(t: NearbyItem, offsetMin: number) {
  const s = t.forecast?.find((f) => f.tmin === offsetMin)?.score;
  return clamp(Math.round(toNum(s ?? t.sunScore ?? 0, 0)), 0, 100);
}

/* Geocoding */
async function searchLocation(query: string) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const r = data[0];
      return {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        display_name: r.display_name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/* Villes test */
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [offsetMin, setOffsetMin] = useState<number>(0);

  /* 🎯 NOUVEAU : rayon + “rechercher ici” */
  const [radius, setRadius] = useState<number>(800);
  const [pendingCenter, setPendingCenter] = useState<[number, number] | null>(
    null
  );
  const [dirty, setDirty] = useState<boolean>(false);

  const load = async (
    lat: number,
    lon: number,
    cityName?: string,
    r: number = radius
  ) => {
    setLoading(true);
    setError(null);
    if (cityName) setCurrentCity(cityName);
    try {
      const { data } = await api.get<unknown>("/terraces/nearby", {
        params: { lat, lon, radius: r, forecast: true },
      });
      const raw = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : [];
      const norm = dedupe(raw.map(normalizeItem), keyFrom)
        .map((t) => {
          // calcule/écrase distance côté client pour être sûr
          const d = distMeters(lat, lon, t.lat, t.lon);
          return { ...t, distance_m: d };
        })
        .filter((t) => t.distance_m! <= r); // filtre strict par rayon
      setItems(norm);
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    const result = await searchLocation(searchQuery);
    if (result) {
      const c: [number, number] = [result.lat, result.lon];
      setCenter(c);
      setCurrentCity(searchQuery);
      await load(...c, searchQuery, radius);
    } else setSearchError("Lieu non trouvé");
    setSearchLoading(false);
  };

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      id = setInterval(
        () => load(center[0], center[1], currentCity, radius),
        2 * 60 * 1000
      );
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [autoRefresh, center[0], center[1], currentCity, radius]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          setCenter(c);
          setCurrentCity("Ma position");
          load(...c, undefined, radius);
        },
        () => load(center[0], center[1], undefined, radius),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      load(center[0], center[1], undefined, radius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const uniq = dedupe(items, keyFrom);
    return [...uniq].sort(
      (a, b) => scoreAt(b, offsetMin) - scoreAt(a, offsetMin)
    );
  }, [items, offsetMin]);

  /* Actions */
  const recenterToMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const c: [number, number] = [p.coords.latitude, p.coords.longitude];
      setCenter(c);
      setCurrentCity("Ma position");
      load(...c, undefined, radius);
    });
  };
  const refreshHere = () => load(center[0], center[1], currentCity, radius);
  const testCity = (city: (typeof TEST_CITIES)[number]) => {
    setCenter(city.coords);
    load(...city.coords, city.name, radius);
  };
  const handleMapMove = (c: [number, number]) => {
    setPendingCenter(c);
    setDirty(true);
  };

  const applySearchHere = () => {
    if (!pendingCenter) return;
    setCenter(pendingCenter);
    setDirty(false);
    load(pendingCenter[0], pendingCenter[1], currentCity, radius);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 style={{ margin: 0 }}>SunSeat</h2>

        {/* Recherche */}
        <form onSubmit={handleSearch} style={{ margin: ".75rem 0" }}>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <input
              className="input"
              placeholder="Rechercher une ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={searchLoading}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
            >
              🔍
            </button>
          </div>
          {searchError && (
            <p
              style={{
                margin: ".5rem 0 0 0",
                color: "#d32f2f",
                fontSize: ".8rem",
              }}
            >
              ⚠️ {searchError}
            </p>
          )}
        </form>

        {/* Ville + MAJ */}
        <div className="card" style={{ marginBottom: ".75rem" }}>
          <div>
            <strong>📍 {currentCity}</strong>
          </div>
          {lastUpdate && (
            <div
              style={{ fontSize: ".8rem", color: "#666", marginTop: ".3rem" }}
            >
              Dernière maj: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="toolbar" style={{ marginBottom: ".75rem" }}>
          <button className="btn" onClick={recenterToMe}>
            📍 Ma position
          </button>
          <button
            className="btn btn-ghost"
            onClick={refreshHere}
            disabled={loading}
          >
            {loading ? "⏳" : "🔄"} Actualiser
          </button>
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span style={{ fontSize: ".85rem", color: "#666" }}>
              Auto (2 min)
            </span>
          </label>
        </div>

        {/* 🎯 Rayon */}
        <div className="section-title">Rayon de recherche</div>
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          />
          <div style={{ fontSize: ".85rem", color: "#666" }}>
            Rayon : <strong>{radius} m</strong>
            <button
              className="btn btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={() => load(center[0], center[1], currentCity, radius)}
            >
              Appliquer
            </button>
          </div>
        </div>

        {/* Horizon */}
        <div className="section-title">Horizon</div>
        <div className="chips" style={{ marginBottom: ".75rem" }}>
          {OFFSETS.map((m) => (
            <button
              key={m}
              className={`chip ${m === offsetMin ? "chip--active" : ""}`}
              onClick={() => setOffsetMin(m)}
            >
              +{m}
            </button>
          ))}
        </div>

        {/* Villes test */}
        <div className="section-title">Tester d'autres villes</div>
        <div className="chips" style={{ marginBottom: ".75rem" }}>
          {TEST_CITIES.map((c) => (
            <button
              key={c.name}
              className={`chip ${currentCity === c.name ? "chip--active" : ""}`}
              onClick={() => testCity(c)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="stat">
          📊 {sorted.length} terrasse{sorted.length !== 1 ? "s" : ""} trouvée
          {sorted.length !== 1 ? "s" : ""}
          {sorted.length > 0 && (
            <>
              {" "}
              <br />
              ☀️ Meilleur score (+{offsetMin} min):{" "}
              {scoreAt(sorted[0], offsetMin)} <br />
              📏 Rayon: {radius} m{" "}
            </>
          )}
        </div>

        {/* Liste */}
        <div style={{ marginTop: "1rem" }}>
          {sorted.length === 0 && !loading ? (
            <div
              className="card"
              style={{ textAlign: "center", color: "#666" }}
            >
              😔 Aucune terrasse trouvée
              <br />
              <small>Augmentez le rayon ou déplacez la carte</small>
            </div>
          ) : null}
          {sorted.map((t) => (
            <TerraceCard
              key={keyFrom(t)}
              t={t}
              offsetMin={offsetMin}
              onSelectOffset={setOffsetMin}
            />
          ))}
        </div>
      </aside>

      <main style={{ position: "relative" }}>
        <MapView
          center={center}
          items={sorted}
          onMapMove={handleMapMove}
          offsetMin={offsetMin}
          onSelectOffset={setOffsetMin}
          radius={radius}
        />
        {dirty && (
          <button className="btn map-overlay" onClick={applySearchHere}>
            🔎 Rechercher dans cette zone
          </button>
        )}
      </main>
    </div>
  );
}

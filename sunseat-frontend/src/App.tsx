import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { NearbyItem } from "./types";
import MapView from "./Components/MapView";
import TerraceCard from "./Components/TerraceCard";
import ScoreLegend from "./Components/ScoreLegend";
import SunSlider from "./Components/SunSlider";
import GoldenHourToggle from "./Components/GoldenHourToggle";
import { computeGoldenWindow, fmtHM, minutesBucketTo } from "./lib/goldenHour";
import "leaflet/dist/leaflet.css";

// ---------- Utils ----------
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
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
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

// Haversine / bounds
function toRad(v: number) {
  return (v * Math.PI) / 180;
}
function distMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
type Bounds = { north: number; south: number; east: number; west: number };
function radiusFromBounds(bounds: Bounds, center: [number, number]): number {
  const corners: [number, number][] = [
    [bounds.north, bounds.east],
    [bounds.north, bounds.west],
    [bounds.south, bounds.east],
    [bounds.south, bounds.west],
  ];
  const r = Math.max(
    ...corners.map(([lat, lon]) => distMeters(center[0], center[1], lat, lon))
  );
  return Math.round(r * 1.05); // petit padding
}

// Score à t + minutes (interpolation linéaire sur forecast)
function scoreAt(item: NearbyItem, minutes: number): number {
  const now = clamp(toNum(item.sunScore, 0), 0, 100);
  if (!Array.isArray(item.forecast) || minutes <= 0) return now;

  const pts = [...item.forecast]
    .map((f) => ({ t: toNum(f.tmin, 0), s: clamp(toNum(f.score, 0), 0, 100) }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  if (pts.length === 0) return now;

  const exact = pts.find((p) => p.t === minutes);
  if (exact) return exact.s;

  let prev = { t: 0, s: now };
  for (const p of pts) {
    if (p.t > minutes) {
      const ratio = (minutes - prev.t) / (p.t - prev.t);
      return clamp(prev.s + (p.s - prev.s) * ratio, 0, 100);
    }
    prev = p;
  }
  return prev.s; // au-delà du dernier point
}

// Geocoding Nominatim
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

  // Zone précise (bounds → radius)
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [radius, setRadius] = useState<number>(1500);

  // Sélection carte
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  // Sun slider (0..120 minutes)
  const [tOffset, setTOffset] = useState<number>(0);

  // Golden Hour
  const [goldenEnabled, setGoldenEnabled] = useState(false);
  const [goldenStart, setGoldenStart] = useState<Date | null>(null);
  const [goldenEnd, setGoldenEnd] = useState<Date | null>(null);

  // Météo légère pour le badge Confort
  const [weather, setWeather] = useState<{
    temp_c: number | null;
    wind_ms: number | null;
  } | null>(null);

  // Boot depuis URL (deep link)
  const [bootFromURL, setBootFromURL] = useState(false);

  const load = async (
    lat: number,
    lon: number,
    cityName?: string,
    rOverride?: number
  ) => {
    setLoading(true);
    setError(null);
    if (cityName) setCurrentCity(cityName);

    const r = rOverride ?? radius ?? 1500;

    try {
      const { data } = await api.get<NearbyItem[]>("/terraces/nearby", {
        params: { lat, lon, radius: r, forecast: true }, // slider & golden
      });

      const normalizedData = Array.isArray(data) ? data.map(normalizeItem) : [];
      setItems(normalizedData);
      setRadius(r);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err?.message || "Erreur lors du chargement");
      // fallback démo
      setItems([
        {
          id: 1,
          name: "Le Rayon Vert",
          lat,
          lon,
          orientationDeg: 180,
          streetWidth: "medium",
          distance_m: 120,
          sunScore: 78,
          forecast: [0, 15, 30, 45, 60, 90, 120].map((m) => ({
            tmin: m,
            score: Math.max(0, 78 - Math.floor(m / 15) * 5),
          })),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Lecture des query params au boot (deep link)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const plat = parseFloat(p.get("lat") || "");
      const plon = parseFloat(p.get("lon") || "");
      const pid = p.get("id");
      const pt = parseInt(p.get("t") || "0", 10);
      const pmin = parseInt(p.get("min") || "0", 10);

      let booted = false;

      if (Number.isFinite(plat) && Number.isFinite(plon)) {
        setCenter([plat, plon]);
        load(plat, plon);
        booted = true;
      }
      if (!Number.isNaN(pt)) setTOffset(Math.max(0, Math.min(120, pt)));
      if (!Number.isNaN(pmin)) setMinScore(Math.max(0, Math.min(100, pmin)));

      if (pid != null) {
        const parsed = /^\d+$/.test(pid) ? Number(pid) : pid;
        setSelectedId(parsed);
      }

      setBootFromURL(booted);
    } catch {
      setBootFromURL(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh 2 min
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        load(center[0], center[1], currentCity);
      }, 2 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, center, currentCity]);

  // Init géoloc (skip si boot depuis URL)
  useEffect(() => {
    if (bootFromURL) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c: [number, number] = [p.coords.latitude, p.coords.longitude];
          setCenter(c);
          setCurrentCity("Ma position");
          load(...c);
        },
        () => load(center[0], center[1]),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      load(center[0], center[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootFromURL]);

  // Golden Hour (recalc à chaque déplacement + aligne le slider si activé)
  useEffect(() => {
    const { start, end } = computeGoldenWindow(
      new Date(),
      center[0],
      center[1]
    );
    setGoldenStart(start);
    setGoldenEnd(end);
    if (goldenEnabled) {
      const target =
        start && end ? new Date((start.getTime() + end.getTime()) / 2) : start;
      const bucket = minutesBucketTo(target);
      setTOffset(bucket);
    }
  }, [center, goldenEnabled]);

  // Météo Open-Meteo (temp + vent) pour ComfortChip
  useEffect(() => {
    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${center[0]}&longitude=${center[1]}&current=temperature_2m,wind_speed_10m`;
        const res = await fetch(url);
        const json = await res.json();
        const temp = Number(json?.current?.temperature_2m);
        const wind = Number(json?.current?.wind_speed_10m);
        setWeather({
          temp_c: Number.isFinite(temp) ? temp : null,
          wind_ms: Number.isFinite(wind) ? wind : null,
        });
      } catch {
        setWeather(null);
      }
    })();
  }, [center]);

  // Applique le temps sélectionné → override sunScore (propagé partout)
  const timeAdjusted = useMemo(() => {
    return items.map((it) => ({
      ...it,
      sunScore: scoreAt(it, tOffset),
    }));
  }, [items, tOffset]);

  // Tri + filtrage (sur scores ajustés)
  const sorted = useMemo(() => {
    const validItems = timeAdjusted.filter(
      (item) => item && typeof item === "object"
    );
    return [...validItems].sort((a, b) => {
      const scoreA = toNum(a.sunScore, 0);
      const scoreB = toNum(b.sunScore, 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return toNum(a.distance_m, Infinity) - toNum(b.distance_m, Infinity);
    });
  }, [timeAdjusted]);

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
        setSelectedId(null);
        load(...c);
      });
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
        setSelectedId(null);
        await load(result.lat, result.lon, searchQuery, 1500); // reset radius
      } else {
        setSearchError("Lieu non trouvé");
      }
    } catch {
      setSearchError("Erreur de recherche");
    } finally {
      setSearchLoading(false);
    }
  };

  const refreshHere = () => load(center[0], center[1], currentCity);
  const testCity = (city: (typeof TEST_CITIES)[0]) => {
    setCenter(city.coords);
    setSelectedId(null);
    load(...city.coords, city.name, 1500);
  };
  const handleMapMove = (newCenter: [number, number]) => {
    setCenter(newCenter);
  };
  const handleBoundsChange = (b: Bounds) => {
    setMapBounds(b);
  };
  const refreshWithinBounds = () => {
    if (!mapBounds) return refreshHere();
    const r = radiusFromBounds(mapBounds, center);
    setRadius(r);
    load(center[0], center[1], currentCity, r);
  };
  const handleSelect = (t: NearbyItem) => {
    setSelectedId(t.id ?? null);
    setCenter([t.lat, t.lon]);
  };

  // Notifications (rappel -45 min)
  async function requestNotifPermission(): Promise<boolean> {
    try {
      const res = await Notification.requestPermission();
      return res === "granted";
    } catch {
      return false;
    }
  }
  function scheduleGoldenReminder(start: Date | null, leadMin = 45) {
    if (!start) return;
    const when = start.getTime() - leadMin * 60000 - Date.now();
    if (when <= 0) return; // trop tard
    setTimeout(() => {
      if (document.visibilityState === "visible" && "Notification" in window) {
        new Notification("Golden Hour ☀️", {
          body: "C’est presque l’heure parfaite pour chiller en terrasse.",
          icon: "/logo.png",
        });
      }
    }, when);
    alert("Rappel programmé : 45 min avant la Golden Hour ✨");
  }

  // Écriture live dans l’URL (deep link shareable)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      p.set("lat", center[0].toFixed(6));
      p.set("lon", center[1].toFixed(6));
      if (selectedId != null) p.set("id", String(selectedId));
      else p.delete("id");
      if (tOffset) p.set("t", String(tOffset));
      else p.delete("t");
      if (minScore) p.set("min", String(minScore));
      else p.delete("min");
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, "", url);
    } catch {
      // ignore
    }
  }, [center, selectedId, tOffset, minScore]);

  const radiusLabel =
    radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`;
  const timeLabel = goldenEnabled
    ? "Golden Hour"
    : tOffset === 0
    ? "Maintenant"
    : `+${tOffset} min`;

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

        {/* Auto-refresh */}
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

        {/* Golden Hour toggle */}
        <GoldenHourToggle
          enabled={goldenEnabled}
          onToggle={(v) => {
            setGoldenEnabled(v);
            if (v) {
              const target =
                goldenStart && goldenEnd
                  ? new Date((goldenStart.getTime() + goldenEnd.getTime()) / 2)
                  : goldenStart;
              setTOffset(minutesBucketTo(target));
            }
          }}
          startLabel={fmtHM(goldenStart)}
          endLabel={fmtHM(goldenEnd)}
          onNotify={async () => {
            if (!("Notification" in window))
              return alert("Notifications non supportées sur ce navigateur.");
            const ok = await requestNotifPermission();
            if (!ok)
              return alert("Active les notifications pour recevoir un rappel.");
            scheduleGoldenReminder(goldenStart, 45);
          }}
        />

        {/* Sun slider */}
        <SunSlider minutes={tOffset} onChange={setTOffset} />

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

        {/* Villes de test */}
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

        {/* États */}
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
          <br />
          🕒 Vue: <strong>{timeLabel}</strong>
          {displayed.length > 0 && (
            <>
              <br />
              ☀️ Meilleur score: {Math.round(displayed[0]?.sunScore || 0)}%
              <br />
              📏 Rayon: {radiusLabel}
            </>
          )}
        </div>

        {/* Liste (cards cliquables) */}
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
                  ? "Désactivez le filtre >60% ou élargissez la zone."
                  : "Essayez une autre ville ou ‘Rechercher dans cette zone’"}
              </small>
            </div>
          )}

          {displayed.map((t) => (
            <TerraceCard
              key={t.id}
              t={t}
              onSelect={() => handleSelect(t)}
              selected={t.id === selectedId}
              metaWeather={weather || undefined}
              shareContext={{ center, t: tOffset, min: minScore }}
            />
          ))}
        </div>
      </aside>

      {/* Carte + bouton Rechercher dans cette zone */}
      <main style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000 }}>
          <button
            onClick={refreshWithinBounds}
            style={{
              padding: ".55rem .8rem",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
              fontSize: ".85rem",
            }}
            title="Rechercher dans cette zone"
          >
            🗺️ Rechercher dans cette zone
          </button>
        </div>

        <MapView
          center={center}
          items={displayed}
          onMapMove={handleMapMove}
          onBoundsChange={handleBoundsChange}
          selectedId={selectedId}
        />
      </main>
    </div>
  );
}

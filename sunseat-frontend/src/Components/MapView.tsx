// src/Components/MapView.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { NearbyItem } from "../types";
import { createHeatmapLayer } from "./HeatmapLayer";
import HeatLegend from "./HeatLegend";
import "../leaflet";

type Bounds = { north: number; south: number; east: number; west: number };

type Props = {
  center: [number, number];
  items: NearbyItem[];
  selectedId?: number | string | null;
  onMapMove?: (newCenter: [number, number]) => void;
  onBoundsChange?: (b: Bounds) => void;

  // Heatmap options
  mode?: "heat" | "bubbles";
  showHeatmap?: boolean; // compat: si fourni, priorise mode
  heatRadius?: number; // m
  heatOpacity?: number; // 0..1

  // Sonde
  probe?: boolean;
};

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function colorForScore(p: number): string {
  // p: 0..100
  const t = Math.pow(clamp(p / 100), 0.85);
  // Interpolation simple HSL (jaune → rouge)
  const h = 48 - t * 36; // 48° (jaune) → 12° (rouge)
  const s = 90;
  const l = 55 - t * 10;
  return `hsl(${h}deg ${s}% ${l}%)`;
}

export default function MapView({
  center,
  items,
  selectedId = null,
  onMapMove,
  onBoundsChange,
  mode = "bubbles",
  showHeatmap, // compat
  heatRadius = 160,
  heatOpacity = 0.7,
  probe = true,
}: Props) {
  // rétrocompat: si showHeatmap explicitement donné, écrase "mode"
  const effectiveMode = useMemo(() => {
    if (typeof showHeatmap === "boolean")
      return showHeatmap ? "heat" : "bubbles";
    return mode;
  }, [showHeatmap, mode]);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const heatLayerRef = useRef<L.GridLayer | null>(null);
  const bubblesRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sampler pour la sonde (recalcule si items/heatRadius changent)
  const sampler = useMemo(() => {
    if (!items.length) return null;

    const projected = items.map((it) => {
      const p = L.CRS.EPSG3857.project(L.latLng(it.lat, it.lon));
      const v = clamp((it.sunScore ?? 0) / 100, 0, 1);
      return { x: p.x, y: p.y, v };
    });
    const sigma = heatRadius;
    const sigma2 = sigma * sigma;
    const maxD2 = sigma * 3 * (sigma * 3);

    return (lat: number, lon: number) => {
      if (!projected.length) return 0;
      const P = L.CRS.EPSG3857.project(L.latLng(lat, lon));
      let wSum = 0;
      let sSum = 0;
      for (let k = 0; k < projected.length; k++) {
        const dx = P.x - projected[k].x;
        const dy = P.y - projected[k].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;
        const w = Math.exp(-d2 / (2 * sigma2));
        wSum += w;
        sSum += w * projected[k].v;
      }
      const val = wSum > 0 ? sSum / wSum : 0;
      return Math.round(val * 100);
    };
  }, [items, heatRadius]);

  const [probeVal, setProbeVal] = useState<number | null>(null);

  // init carte
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("moveend", () => {
      const c = map.getCenter();
      onMapMove?.([c.lat, c.lng]);
      const b = map.getBounds();
      onBoundsChange?.({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    });

    mapRef.current = map;
  }, [center, onMapMove, onBoundsChange]);

  // recentrer si props.center change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    if (
      Math.abs(c.lat - center[0]) > 1e-6 ||
      Math.abs(c.lng - center[1]) > 1e-6
    ) {
      map.panTo(center, { animate: true });
    }
  }, [center]);

  // markers (pin de base)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(items.map((it) => String(it.id)));
    for (const id of Object.keys(markersRef.current)) {
      if (!nextIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }
    items.forEach((it) => {
      const id = String(it.id);
      let m = markersRef.current[id];
      if (!m) {
        m = L.marker([it.lat, it.lon], { title: it.name || "Terrasse" });
        m.addTo(map);
        markersRef.current[id] = m;
      } else {
        m.setLatLng([it.lat, it.lon]);
      }
      // style sélection
      const isSelected = selectedId != null && String(selectedId) === id;
      m.setZIndexOffset(isSelected ? 2000 : 0);
      m.setOpacity(isSelected ? 1 : 0.9);
      if (it.name) m.bindTooltip(it.name, { direction: "top" });
    });
  }, [items, selectedId]);

  // heatmap layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (effectiveMode !== "heat" || items.length === 0) return;

    const layer = createHeatmapLayer({
      items,
      sigmaMeters: heatRadius,
      maxDistanceMeters: heatRadius * 3,
      opacity: heatOpacity,
      sampleStep: 2,
      valueAccessor: (it) => it.sunScore ?? 0,
    });
    layer.addTo(map);
    heatLayerRef.current = layer;

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [items, effectiveMode, heatRadius, heatOpacity]);

  // bubbles layer (cercles en mètres + label %)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear
    if (bubblesRef.current) {
      map.removeLayer(bubblesRef.current);
      bubblesRef.current = null;
    }
    if (effectiveMode !== "bubbles" || items.length === 0) return;

    const group = L.layerGroup();
    items.forEach((it) => {
      const score = Math.round(it.sunScore ?? 0);
      const radius = Math.max(25, Math.min(140, 30 + score * 1.1)); // m

      const circle = L.circle([it.lat, it.lon], {
        radius,
        color: colorForScore(score),
        fillColor: colorForScore(score),
        fillOpacity: 0.25,
        weight: 1.5,
      });

      // petit label flottant
      const label = L.divIcon({
        className: "sunseat-label",
        html: `<div style="
          background: white;
          border:1px solid #e5e7eb;
          border-radius: 999px;
          padding: 2px 6px;
          font-size: 11px;
          color: #1f2937;
          box-shadow: 0 1px 6px rgba(0,0,0,.08);
        ">${score}%</div>`,
        iconSize: [0, 0],
        iconAnchor: [-8, -10],
      });
      const lblMarker = L.marker([it.lat, it.lon], {
        icon: label,
        interactive: false,
      });

      group.addLayer(circle);
      group.addLayer(lblMarker);
    });

    group.addTo(map);
    bubblesRef.current = group;

    return () => {
      if (bubblesRef.current) {
        map.removeLayer(bubblesRef.current);
        bubblesRef.current = null;
      }
    };
  }, [items, effectiveMode]);

  // Sonde (mousemove / touchmove)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !probe) return;

    const handler = (e: L.LeafletMouseEvent) => {
      if (!sampler) return setProbeVal(null);
      const v = sampler(e.latlng.lat, e.latlng.lng);
      setProbeVal(v);
    };
    const clear = () => setProbeVal(null);

    map.on("mousemove", handler);
    map.on("mouseout", clear);
    map.on("dragstart", clear);

    return () => {
      map.off("mousemove", handler);
      map.off("mouseout", clear);
      map.off("dragstart", clear);
    };
  }, [probe, sampler]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#f3f4f6",
          position: "relative",
        }}
      />
      {/* Légende visible en mode heat */}
      {effectiveMode === "heat" && <HeatLegend />}

      {/* Sonde */}
      {probe && probeVal != null && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1000,
            background: "rgba(255,255,255,.95)",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "6px 8px",
            boxShadow: "0 2px 10px rgba(0,0,0,.08)",
            fontSize: 12,
            color: "#334155",
          }}
        >
          📍 Score ici : <strong>{probeVal}%</strong>
        </div>
      )}
    </>
  );
}

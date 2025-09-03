// src/Components/HeatmapLayer.ts
import L from "leaflet";
import type { NearbyItem } from "../types";

type HeatmapOptions = {
  items: NearbyItem[];
  sigmaMeters?: number; // "rayon" d'influence (écart-type gaussien)
  maxDistanceMeters?: number; // coupe le calcul loin (3x sigma par défaut)
  opacity?: number; // opacité globale 0..1
  sampleStep?: number; // sous-échantillonnage pixels (2 ou 3 = plus rapide)
  valueAccessor?: (it: NearbyItem) => number; // 0..100
};

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

// Petite rampe de couleur (0..1 -> rgba)
function colorRamp(v: number): [number, number, number, number] {
  // soft non-linéaire
  const t = Math.pow(clamp(v), 0.85);

  // stops: 0 → transparent, 0.2 jaune pâle, 0.5 orange, 0.7 orange foncé, 0.9 rouge
  if (t <= 0.01) return [0, 0, 0, 0];

  const stops = [
    { p: 0.0, c: [255, 255, 255] },
    { p: 0.2, c: [255, 243, 176] }, // #fff3b0
    { p: 0.5, c: [253, 204, 78] }, // #fdcc4e
    { p: 0.7, c: [251, 140, 0] }, // #fb8c00
    { p: 0.9, c: [229, 57, 53] }, // #e53935
    { p: 1.0, c: [183, 28, 28] }, // #b71c1c
  ];

  let i = 0;
  while (i < stops.length - 1 && t > stops[i + 1].p) i++;
  const a = stops[i],
    b = stops[i + 1] || stops[i];
  const span = Math.max(1e-6, b.p - a.p);
  const u = clamp((t - a.p) / span);

  const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * u);
  const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * u);
  const bch = Math.round(a.c[2] + (b.c[2] - a.c[2]) * u);
  return [r, g, bch, 255];
}

export function createHeatmapLayer(opts: HeatmapOptions): L.GridLayer {
  const {
    items,
    sigmaMeters = 140,
    maxDistanceMeters = sigmaMeters * 3,
    opacity = 0.7,
    sampleStep = 2,
    valueAccessor = (it) => it.sunScore ?? 0,
  } = opts;

  // Pré-projection des items en WebMercator (mètres)
  const projected = items.map((it) => {
    const p = L.CRS.EPSG3857.project(L.latLng(it.lat, it.lon));
    const v = clamp((valueAccessor(it) || 0) / 100, 0, 1);
    return { x: p.x, y: p.y, v };
  });

  const sigma2 = sigmaMeters * sigmaMeters;
  const maxD2 = maxDistanceMeters * maxDistanceMeters;

  const HeatLayer = (L.GridLayer as any).extend({
    createTile: function (coords: L.Coords) {
      const tileSize: L.Point = this.getTileSize();
      const canvas: HTMLCanvasElement = document.createElement("canvas");
      canvas.width = tileSize.x;
      canvas.height = tileSize.y;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.globalAlpha = opacity;

      // NW pixel (coord monde en pixels) → point NW
      const nwPoint = coords.scaleBy(tileSize); // (x*256, y*256)
      const z = coords.z;

      // On dessine par blocs (sampleStep x sampleStep)
      for (let py = 0; py < tileSize.y; py += sampleStep) {
        for (let px = 0; px < tileSize.x; px += sampleStep) {
          const worldPoint = L.point(nwPoint.x + px, nwPoint.y + py);
          // latlng -> project in meters
          const latlng = (this._map as L.Map).unproject(worldPoint, z);
          const P = L.CRS.EPSG3857.project(latlng); // meters

          // KDE gaussienne
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
          if (val <= 0.01) continue;

          const [r, g, b, a] = colorRamp(val);
          ctx.fillStyle = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
          ctx.fillRect(px, py, sampleStep, sampleStep);
        }
      }

      return canvas;
    },
  });

  return new HeatLayer({ tileSize: 256 }) as L.GridLayer;
}

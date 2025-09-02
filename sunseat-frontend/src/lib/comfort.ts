// src/lib/comfort.ts
export function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

// Score température (1 = idéal). Idéal ~ 18–27°C, décroît progressivement au-delà.
function tempScore(tempC: number | null | undefined) {
  if (tempC == null || Number.isNaN(tempC)) return 0.7; // neutre par défaut
  const idealMin = 18,
    idealMax = 27;
  const center = (idealMin + idealMax) / 2; // 22.5
  const range = (idealMax - idealMin) / 2; // 4.5
  const diff = Math.abs(tempC - center);
  // tolérance douce ±9°C
  const sc = 1 - diff / (range * 2);
  return clamp(sc, 0, 1);
}

// Pénalité vent (0 = ok, 1 = très gênant). Abri selon la rue.
function windPenalty(wind_ms: number | null | undefined, streetWidth?: string) {
  if (wind_ms == null || Number.isNaN(wind_ms)) return 0.1; // petite pénalité par défaut
  // 0–3 m/s ok, 3–8 m/s moyen, >8 m/s pas ouf
  let pen = (wind_ms - 2) / 8; // 2 m/s → 0 ; 10 m/s → 1
  pen = clamp(pen, 0, 1);
  const shelter =
    streetWidth === "narrow" ? 0.5 : streetWidth === "medium" ? 0.75 : 1; // narrow = plus abrité
  return pen * shelter;
}

/**
 * comfortScore 0..100
 * sunScore : 0..100 (existant)
 * tempC    : °C (optionnel)
 * wind_ms  : m/s (optionnel)
 * streetWidth : 'narrow' | 'medium' | 'wide' (optionnel)
 */
export function comfortScore(
  sunScore: number | null | undefined,
  tempC?: number | null,
  wind_ms?: number | null,
  streetWidth?: string
): number {
  const sun = clamp((Number(sunScore ?? 0) || 0) / 100, 0, 1);
  const t = tempScore(tempC ?? null);
  const w = windPenalty(wind_ms ?? null, streetWidth);

  // Pondérations simples et intuitives
  const base = 0.6 * sun + 0.35 * t - 0.25 * w;
  return Math.round(clamp(base, 0, 1) * 100);
}

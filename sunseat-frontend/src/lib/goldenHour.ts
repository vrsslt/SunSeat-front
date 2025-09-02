// src/lib/goldenHour.ts
import SunCalc from "suncalc";

export type GoldenWindow = {
  start: Date | null;
  end: Date | null;
};

export function computeGoldenWindow(
  date: Date,
  lat: number,
  lon: number
): GoldenWindow {
  try {
    const t = SunCalc.getTimes(date, lat, lon);
    // Par défaut, on prend la golden hour du soir (avant le coucher)
    // Fallback sans stress si la lib ne renvoie pas certaines clés.
    const start =
      (t as any).goldenHour ?? new Date(t.sunset.getTime() - 60 * 60000);
    const end = t.sunset ?? new Date(start.getTime() + 60 * 60000);
    return { start, end };
  } catch {
    return { start: null, end: null };
  }
}

// Aide: format HH:MM local
export function fmtHM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Mappe une Date future en minutes à partir de "maintenant", clamp 0..120 et round 15
export function minutesBucketTo(date: Date | null, step = 15): number {
  if (!date) return 0;
  const diff = Math.round((date.getTime() - Date.now()) / 60000);
  const clamped = Math.max(0, Math.min(120, diff));
  return Math.round(clamped / step) * step;
}

// src/lib/api.ts
import axios from "axios";

// 🔒 Toujours éviter localhost en prod.
// 1) On lit VITE_API_URL si présent (build-time)
// 2) Sinon, si on est sur un domaine vercel.app → fallback Render
// 3) Sinon (dev) → localhost
function pickApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Prod Vercel (ou autre domaine public)
    if (host.endsWith("vercel.app") || host.includes(".")) {
      return "https://sunseat-back.onrender.com/api"; // ⬅️ remplace par ton URL Render
    }
  }

  // Dev local
  return "http://localhost:5000/api";
}

const baseURL = pickApiBase();
export const api = axios.create({ baseURL, timeout: 12000 });

// Petit log utile
if (typeof window !== "undefined") {
  console.log("API configured with baseURL:", baseURL);
}

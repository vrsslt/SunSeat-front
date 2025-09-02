// src/lib/api.js (ou où se trouve ton fichier)
import axios from "axios";

function pickApiBase() {
  // 1) Prend la variable d'env au build si présente
  const envUrl = (import.meta?.env?.VITE_API_URL || "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 2) Garde-fou : si on est en prod (vercel.app), fallback vers ton API Render
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.endsWith("vercel.app")) {
      return "https://sunseat-back.onrender.com/api"; // ← remplace par ton URL Render
    }
  }

  // 3) Dev local
  return "http://localhost:5000/api";
}

const baseURL = pickApiBase();
export const api = axios.create({ baseURL, timeout: 10000 });

console.log("API configured with baseURL:", baseURL);

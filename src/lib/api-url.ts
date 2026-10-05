const DEVELOPMENT_API_URL = "http://localhost:3005";
const DEPLOYED_API_URL = "https://helper-api-eight.vercel.app";

function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function isLocalApiUrl(url: string): boolean {
  try {
    return /^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

const configuredApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
const fallbackApiUrl = process.env.NODE_ENV === "development" ? DEVELOPMENT_API_URL : DEPLOYED_API_URL;

export const API_BASE_URL =
  configuredApiUrl && !(process.env.NODE_ENV === "production" && isLocalApiUrl(configuredApiUrl))
    ? normalizeApiUrl(configuredApiUrl)
    : fallbackApiUrl;

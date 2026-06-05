import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// apiRequest throws Error("<status>: <body>"). Pull a human message out of it,
// preferring the server's JSON { message } when present.
export function parseApiError(err: unknown, fallback = "Action failed"): string {
  const raw = String((err as any)?.message || "").replace(/^\d+:\s*/, "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw).message || fallback;
  } catch {
    return raw;
  }
}

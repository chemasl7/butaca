/** Streaming services we support in Mexico. `match` recognizes TMDB/JustWatch provider names. */
export const SERVICES: Record<string, { label: string; match: (name: string) => boolean }> = {
  netflix: { label: "Netflix", match: (n) => n.startsWith("netflix") },
  prime: { label: "Prime Video", match: (n) => n.startsWith("amazon prime video") || n === "prime video" },
  disney: { label: "Disney+", match: (n) => n.startsWith("disney plus") || n.startsWith("disney+") },
  max: { label: "HBO Max", match: (n) => n === "max" || n.startsWith("hbo max") },
  apple: { label: "Apple TV+", match: (n) => n.startsWith("apple tv plus") || n.startsWith("apple tv+") },
  mubi: { label: "MUBI", match: (n) => n.startsWith("mubi") },
  paramount: { label: "Paramount+", match: (n) => n.startsWith("paramount plus") || n.startsWith("paramount+") },
  vix: { label: "ViX", match: (n) => n.startsWith("vix") },
  crunchyroll: { label: "Crunchyroll", match: (n) => n.startsWith("crunchyroll") },
};

export const SERVICE_KEYS = Object.keys(SERVICES);

export function serviceKeyFor(providerName: string): string | null {
  const n = providerName.trim().toLowerCase();
  for (const [key, s] of Object.entries(SERVICES)) if (s.match(n)) return key;
  return null;
}

export const serviceLabel = (key: string) => SERVICES[key]?.label ?? key;

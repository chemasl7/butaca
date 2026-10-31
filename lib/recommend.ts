import type { Rating, RatingEntry, Title, TitleType } from "./types";

/**
 * The recommender. Every title becomes a small "feature vector" (genres, mood tags,
 * format). Your ratings add up into a taste vector, and a title's match is how
 * closely its vector points the same way as yours (cosine similarity), blended
 * with its score, popularity and a discovery bonus.
 */

export type Vec = Record<string, number>;

const RATING_WEIGHT: Record<Rating, number> = { loved: 2, liked: 1, disliked: -1.5, unseen: 0 };

export function features(t: { genres: string[]; tags: string[]; type: TitleType }): Vec {
  const v: Vec = {};
  for (const g of t.genres) v["g:" + g] = 1;
  for (const tag of t.tags) v["t:" + tag] = 1.2;
  v["type:" + t.type] = 0.5;
  return v;
}

export function cosine(a: Vec, b: Vec): number {
  let dot = 0, na = 0, nb = 0;
  for (const k in a) {
    na += a[k] * a[k];
    if (b[k]) dot += a[k] * b[k];
  }
  for (const k in b) nb += b[k] * b[k];
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function tasteVector(ratings: Record<string, RatingEntry>, vibes: string[]): Vec {
  const v: Vec = {};
  for (const e of Object.values(ratings)) {
    const w = RATING_WEIGHT[e.r];
    if (!w) continue;
    for (const [k, x] of Object.entries(features(e))) v[k] = (v[k] ?? 0) + w * x;
  }
  for (const vibe of vibes) v["t:" + vibe] = (v["t:" + vibe] ?? 0) + 1.5;
  return v;
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export interface Scored {
  title: Title;
  total: number;
  why: string;
  /** Rated title this one most resembles */
  because?: string;
}

export function rank(
  titles: Title[],
  ratings: Record<string, RatingEntry>,
  vibes: string[],
  opts: { services: string[]; type: "all" | TitleType }
): Scored[] {
  const taste = tasteVector(ratings, vibes);
  const hasTaste = Object.values(taste).some((x) => x > 0);
  const liked = Object.entries(ratings).filter(([, e]) => e.r === "loved" || e.r === "liked");
  const likedVecs = liked.map(([id, e]) => ({ id, e, v: features(e) }));
  const out: Scored[] = [];
  for (const t of titles) {
    if (ratings[t.id]) continue;
    if (opts.type !== "all" && t.type !== opts.type) continue;
    if (opts.services.length && !t.providers.some((p) => opts.services.includes(p))) continue;
    const fv = features(t);
    const sim = hasTaste ? clamp(cosine(taste, fv) + 0.15) : 0.5;
    const quality = t.score / 100;
    const gem = t.score >= 75 && t.pop < 0.5 ? 1 : 0.3;
    const total = 0.5 * sim + 0.25 * quality + 0.15 * (t.trending ? 1 : t.pop * 0.5) + 0.1 * gem;

    let best: (typeof likedVecs)[number] | null = null, bestSim = 0;
    for (const l of likedVecs) {
      const s = cosine(l.v, fv);
      if (s > bestSim) { bestSim = s; best = l; }
    }
    let why: string;
    const vibe = vibes.find((v) => t.tags.includes(v));
    if (best && bestSim > 0.38) why = `Because you ${best.e.r} ${best.e.title}`;
    else if (vibe) why = `Right in your “${vibe}” mood`;
    else if (t.trending) why = "Popular this week";
    else if (t.score >= 80) why = `Rated ${t.score}% by TMDB users`;
    else why = t.tags.slice(0, 2).join(", ") || t.genres.slice(0, 2).join(", ");
    out.push({ title: t, total, why, because: best && bestSim > 0.38 ? best.id : undefined });
  }
  return out.sort((a, b) => b.total - a.total);
}

export const matchPct = (total: number) => Math.min(99, Math.round(55 + total * 48));

export function tasteSummary(ratings: Record<string, RatingEntry>, vibes: string[]) {
  const v = tasteVector(ratings, vibes);
  const tags = Object.entries(v)
    .filter(([k, x]) => k.startsWith("t:") && x > 0)
    .map(([k, x]) => [k.slice(2), x] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const sum = tags.reduce((s, t) => s + t[1], 0);
  return tags.map(([t, x]) => ({ tag: t, pct: Math.round((x / sum) * 100) }));
}

export const runtimeLabel = (t: Title) =>
  t.type === "series" ? `${t.runtime} min episodes` : `${Math.floor(t.runtime / 60)} h ${t.runtime % 60} min`;

export const TYPE_LABEL: Record<TitleType, string> = { movie: "Movie", series: "Series", doc: "Documentary" };

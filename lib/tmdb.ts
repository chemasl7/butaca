import type { Catalog, Title, TitleType } from "./types";
import { SERVICES, serviceKeyFor } from "./services";
import { deriveTags, normalizeGenres } from "./tags";
import { SAMPLE_DECK, SAMPLE_TITLES } from "./sample";

/**
 * Builds the catalog from TMDB (titles, posters, keywords and Mexico streaming
 * availability, which TMDB gets from JustWatch). Responses are cached for a day,
 * so TMDB is called roughly once a day, not on every visit.
 */

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const REGION = "MX";
const LANGUAGE = "en-US"; // change to "es-MX" for Spanish titles and synopses
const DAY = 60 * 60 * 24;
const MAX_TITLES = 260;

type Json = Record<string, any>;

async function tmdb(path: string, params: Record<string, string | number> = {}): Promise<Json> {
  const token = process.env.TMDB_READ_TOKEN;
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    next: { revalidate: DAY },
  });
  if (!res.ok) throw new Error(`TMDB ${path} answered ${res.status}`);
  return res.json();
}

/** Runs async jobs with a small concurrency limit, to stay well under TMDB's rate limit */
async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function providerIds(kind: "movie" | "tv"): Promise<string> {
  const data = await tmdb(`/watch/providers/${kind}`, { watch_region: REGION, language: LANGUAGE });
  const ids = (data.results ?? [])
    .filter((p: Json) => serviceKeyFor(p.provider_name))
    .map((p: Json) => p.provider_id);
  return ids.join("|");
}

type Ref = { kind: "movie" | "tv"; id: number };

async function discover(kind: "movie" | "tv", providers: string, extra: Record<string, string | number>, pages: number[]): Promise<Ref[]> {
  const refs: Ref[] = [];
  for (const page of pages) {
    const data = await tmdb(`/discover/${kind}`, {
      watch_region: REGION,
      with_watch_monetization_types: "flatrate",
      with_watch_providers: providers,
      language: LANGUAGE,
      include_adult: "false",
      page,
      ...extra,
    });
    for (const r of data.results ?? []) refs.push({ kind, id: r.id });
  }
  return refs;
}

async function details(ref: Ref): Promise<Title | null> {
  try {
    const d = await tmdb(`/${ref.kind}/${ref.id}`, { language: LANGUAGE, append_to_response: "keywords,watch/providers" });
    const mx = d["watch/providers"]?.results?.[REGION];
    const providers = [...new Set<string>((mx?.flatrate ?? []).map((p: Json) => serviceKeyFor(p.provider_name)).filter(Boolean))];
    if (!providers.length) return null;
    const genres = normalizeGenres((d.genres ?? []).map((g: Json) => g.name));
    const keywords: string[] = (d.keywords?.keywords ?? d.keywords?.results ?? []).map((k: Json) => k.name);
    const origin: string[] = d.origin_country ?? (d.production_countries ?? []).map((c: Json) => c.iso_3166_1);
    const isDoc = genres.includes("documentary");
    const type: TitleType = isDoc ? "doc" : ref.kind === "tv" ? "series" : "movie";
    const date: string = d.release_date || d.first_air_date || "";
    const runtime = ref.kind === "movie" ? d.runtime || 100 : d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || 45;
    return {
      id: `${ref.kind}-${ref.id}`,
      type,
      title: d.title || d.name,
      year: Number(date.slice(0, 4)) || 0,
      runtime,
      genres,
      tags: deriveTags(genres, keywords, origin),
      score: Math.round((d.vote_average ?? 0) * 10),
      votes: d.vote_count ?? 0,
      pop: d.popularity ?? 0, // turned into a percentile below
      trending: false,
      providers,
      poster: d.poster_path ? `${IMG}/w342${d.poster_path}` : undefined,
      backdrop: d.backdrop_path ? `${IMG}/w1280${d.backdrop_path}` : undefined,
      overview: d.overview || undefined,
      watchLink: mx?.link,
    };
  } catch {
    return null;
  }
}

/** Picks recognizable, varied titles for the onboarding "rate a few" deck */
function buildDeck(titles: Title[]): string[] {
  const byVotes = [...titles].sort((a, b) => b.votes - a.votes);
  const deck: string[] = [];
  const genreCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  for (const t of byVotes) {
    const g = t.genres[0] ?? "other";
    if ((genreCount[g] ?? 0) >= 2) continue;
    if (t.type === "series" && (typeCount.series ?? 0) >= 5) continue;
    if (t.type === "doc" && (typeCount.doc ?? 0) >= 1) continue;
    deck.push(t.id);
    genreCount[g] = (genreCount[g] ?? 0) + 1;
    typeCount[t.type] = (typeCount[t.type] ?? 0) + 1;
    if (deck.length === 16) break;
  }
  // If the variety rules left gaps, fill them with the next most-voted titles
  for (const t of byVotes) {
    if (deck.length >= 16) break;
    if (!deck.includes(t.id)) deck.push(t.id);
  }
  return deck;
}

function sample(note?: string): Catalog {
  return { source: "sample", note, updatedAt: new Date().toISOString(), titles: SAMPLE_TITLES, deck: SAMPLE_DECK };
}

export async function getCatalog(): Promise<Catalog> {
  if (!process.env.TMDB_READ_TOKEN) return sample("No TMDB token is set yet, so you're seeing the built-in sample catalog.");
  try {
    const [movieProviders, tvProviders] = await Promise.all([providerIds("movie"), providerIds("tv")]);
    const lists = await Promise.all([
      discover("movie", movieProviders, { sort_by: "popularity.desc", "vote_count.gte": 300 }, [1, 2, 3, 4, 5]),
      discover("movie", movieProviders, { sort_by: "vote_average.desc", "vote_count.gte": 1500 }, [1, 2]),
      discover("tv", tvProviders, { sort_by: "popularity.desc", "vote_count.gte": 200 }, [1, 2, 3]),
      discover("tv", tvProviders, { sort_by: "vote_average.desc", "vote_count.gte": 800 }, [1]),
      discover("movie", movieProviders, { sort_by: "popularity.desc", with_genres: 99, "vote_count.gte": 50 }, [1]),
      discover("tv", tvProviders, { sort_by: "popularity.desc", with_genres: 99, "vote_count.gte": 30 }, [1]),
      discover("movie", movieProviders, { sort_by: "popularity.desc", with_origin_country: "MX", "vote_count.gte": 50 }, [1]),
      discover("tv", tvProviders, { sort_by: "popularity.desc", with_origin_country: "MX", "vote_count.gte": 20 }, [1]),
    ]);
    const seen = new Set<string>();
    const refs = lists.flat().filter((r) => {
      const k = `${r.kind}-${r.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, MAX_TITLES);

    const [loaded, trending] = await Promise.all([
      pool(refs, 8, details),
      tmdb("/trending/all/week", { language: LANGUAGE }).catch(() => ({ results: [] })),
    ]);
    const titles = loaded.filter((t): t is Title => t !== null);
    if (titles.length < 20) return sample("TMDB returned too few titles, so you're seeing the sample catalog.");

    const trend = new Set<string>((trending.results ?? []).map((r: Json) => `${r.media_type === "tv" ? "tv" : "movie"}-${r.id}`));
    const byPop = [...titles].sort((a, b) => a.pop - b.pop);
    byPop.forEach((t, i) => (t.pop = +(i / Math.max(1, byPop.length - 1)).toFixed(3)));
    titles.forEach((t) => (t.trending = trend.has(t.id)));

    return { source: "tmdb", updatedAt: new Date().toISOString(), titles, deck: buildDeck(titles) };
  } catch (e) {
    console.error("TMDB catalog failed:", e);
    return sample("TMDB couldn't be reached, so you're seeing the sample catalog. Check that the token is correct.");
  }
}

export const supportedServices = Object.keys(SERVICES);

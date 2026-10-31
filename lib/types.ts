export type TitleType = "movie" | "series" | "doc";

export interface Title {
  /** Stable id, e.g. "movie-27205" or "tv-1396" (sample titles use their own ids) */
  id: string;
  type: TitleType;
  title: string;
  year: number;
  /** Minutes. For series this is the typical episode length. */
  runtime: number;
  genres: string[];
  /** Mood tags such as "mind-bending" or "cozy", derived from genres and keywords */
  tags: string[];
  /** TMDB user score, 0–100 */
  score: number;
  votes: number;
  /** Popularity percentile within the catalog, 0 (least) to 1 (most) */
  pop: number;
  /** In TMDB's weekly trending list */
  trending: boolean;
  /** Streaming services (keys from SERVICES) where it's included with a subscription in Mexico */
  providers: string[];
  poster?: string;
  backdrop?: string;
  overview?: string;
  /** TMDB "where to watch" page for Mexico */
  watchLink?: string;
}

export interface Catalog {
  source: "tmdb" | "sample";
  /** Why we're on sample data, if we are */
  note?: string;
  updatedAt: string;
  titles: Title[];
  /** Title ids for the "rate a few" onboarding deck */
  deck: string[];
}

export type Rating = "loved" | "liked" | "disliked" | "unseen";

/** A rating keeps a small snapshot of the title so taste survives catalog refreshes */
export interface RatingEntry {
  r: Rating;
  title: string;
  type: TitleType;
  genres: string[];
  tags: string[];
}

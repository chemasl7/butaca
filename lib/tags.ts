/**
 * Turns TMDB genres and keywords into the mood tags the recommender understands.
 * Tweak these lists to change how titles are grouped.
 */

const GENRE_MAP: Record<string, string[]> = {
  action: ["action"],
  "action & adventure": ["action", "adventure"],
  adventure: ["adventure"],
  animation: ["animation"],
  comedy: ["comedy"],
  crime: ["crime"],
  documentary: ["documentary"],
  drama: ["drama"],
  family: ["family"],
  kids: ["family"],
  fantasy: ["fantasy"],
  history: ["history"],
  horror: ["horror"],
  music: ["music"],
  mystery: ["mystery"],
  romance: ["romance"],
  "science fiction": ["scifi"],
  "sci-fi & fantasy": ["scifi", "fantasy"],
  thriller: ["thriller"],
  war: ["war"],
  "war & politics": ["war"],
  western: ["western"],
};

export function normalizeGenres(names: string[]): string[] {
  const out = new Set<string>();
  for (const n of names) for (const g of GENRE_MAP[n.toLowerCase()] ?? []) out.add(g);
  return [...out];
}

const GENRE_TAGS: Record<string, string[]> = {
  comedy: ["feel-good"],
  family: ["cozy", "feel-good"],
  horror: ["dark", "intense"],
  thriller: ["twisty", "intense"],
  crime: ["dark crime"],
  mystery: ["twisty"],
  scifi: ["mind-bending"],
  romance: ["romantic"],
  drama: ["emotional"],
  war: ["epic", "intense"],
  history: ["epic"],
  action: ["intense"],
  adventure: ["epic"],
  documentary: ["true story"],
  music: ["music"],
};

// Keyword fragments (lowercase) that point to a mood tag.
const KEYWORD_TAGS: Record<string, string[]> = {
  "mind-bending": ["time travel", "time loop", "parallel world", "alternate reality", "multiverse", "dream", "simulation", "memory loss", "artificial intelligence", "dystopia", "surreal", "psychological", "mind-bending", "nonlinear"],
  "dark crime": ["serial killer", "detective", "investigation", "murder", "cartel", "mafia", "organized crime", "drug trafficking", "police", "gangster", "heist"],
  "true story": ["based on true story", "based on a true story", "biography", "true crime", "biographical"],
  cozy: ["friendship", "small town", "christmas", "holiday", "sitcom", "found family", "workplace comedy", "heartwarming"],
  bittersweet: ["coming of age", "grief", "loss", "first love", "nostalgia", "loneliness", "unrequited love", "melancholy"],
  epic: ["epic", "space opera", "kingdom", "battle", "empire", "desert planet"],
  "slow-burn": ["slow burn", "character study", "arthouse", "minimalism"],
  anime: ["anime", "based on manga"],
  mexican: ["mexico", "mexican", "oaxaca", "guadalajara", "tijuana", "cdmx", "day of the dead"],
  nature: ["nature", "wildlife", "ocean", "animals", "planet earth"],
  sports: ["sports", "boxing", "football", "soccer", "basketball", "climbing", "racing", "olympics"],
  food: ["food", "cooking", "chef", "restaurant", "cuisine"],
  stylish: ["neo-noir", "stylized", "visually stunning"],
  intense: ["survival", "revenge", "hostage", "chase"],
  twisty: ["plot twist", "twist ending", "whodunit", "conspiracy"],
  whimsical: ["fairy tale", "magic", "talking animal"],
  workplace: ["workplace", "office"],
  dark: ["dark comedy", "nihilism", "psychological horror"],
};

export function deriveTags(genres: string[], keywords: string[], originCountries: string[]): string[] {
  const tags = new Set<string>();
  for (const g of genres) for (const t of GENRE_TAGS[g] ?? []) tags.add(t);
  const kw = keywords.map((k) => k.toLowerCase());
  for (const [tag, frags] of Object.entries(KEYWORD_TAGS)) {
    if (kw.some((k) => frags.some((f) => k.includes(f)))) tags.add(tag);
  }
  if (originCountries.includes("MX")) tags.add("mexican");
  if (genres.includes("animation") && originCountries.includes("JP")) tags.add("anime");
  if (genres.includes("animation") && genres.includes("family")) tags.add("whimsical");
  return [...tags];
}

/** Vibes people can pick, in display order */
export const VIBES = ["mind-bending", "cozy", "dark crime", "feel-good", "mexican", "anime", "true story", "intense", "bittersweet", "romantic", "twisty", "epic"];

/**
 * Thin TMDB v3 client (server-side only). Set TMDB_API_KEY (v3 key) or
 * TMDB_READ_TOKEN (v4 read access token) to switch the app to live data.
 */
import type { Kind, Title } from "./types";

export type MediaType = "movie" | "tv";

const API = () => process.env.TMDB_API_BASE || "https://api.themoviedb.org/3";
const IMG = () => process.env.TMDB_IMAGE_BASE || "https://image.tmdb.org/t/p";
const DAY = 86400;

export const liveEnabled = () =>
  Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);

export class TMDBError extends Error {}

const memo = new Map<string, { at: number; value: Promise<unknown> }>();

/** GET a TMDB endpoint. Responses are cached in memory and in Next's data cache. */
export async function tmdb<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  ttl = DAY / 4,
): Promise<T> {
  const q = new URLSearchParams({ language: "en-US" });
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "") q.set(k, String(v));
  const key = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_READ_TOKEN;
  const cacheKey = `${API()}${path}?${q}`;
  if (key && !token) q.set("api_key", key);

  const hit = memo.get(cacheKey);
  if (hit && Date.now() - hit.at < ttl * 1000) return hit.value as Promise<T>;

  const value = (async () => {
    const res = await fetch(`${API()}${path}?${q}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: ttl },
    } as RequestInit);
    if (!res.ok) throw new TMDBError(`TMDB ${path} returned ${res.status}`);
    return (await res.json()) as T;
  })();
  memo.set(cacheKey, { at: Date.now(), value });
  value.catch(() => memo.delete(cacheKey));
  if (memo.size > 2000) memo.delete(memo.keys().next().value!);
  return value;
}

export const image = (
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "w780" | "w1280",
) => (path ? `${IMG()}/${size}${path}` : undefined);

/* ───────────── Genres ───────────── */

const MOVIE_GENRES: Record<number, string[]> = {
  28: ["Action"],
  12: ["Adventure"],
  16: ["Animation"],
  35: ["Comedy"],
  80: ["Crime"],
  99: ["Documentary"],
  18: ["Drama"],
  10751: ["Family"],
  14: ["Fantasy"],
  36: ["History"],
  27: ["Horror"],
  10402: ["Music"],
  9648: ["Mystery"],
  10749: ["Romance"],
  878: ["Sci-Fi"],
  10770: ["TV Movie"],
  53: ["Thriller"],
  10752: ["War"],
  37: ["Western"],
};

const TV_GENRES: Record<number, string[]> = {
  10759: ["Action", "Adventure"],
  16: ["Animation"],
  35: ["Comedy"],
  80: ["Crime"],
  99: ["Documentary"],
  18: ["Drama"],
  10751: ["Family"],
  10762: ["Family"],
  9648: ["Mystery"],
  10763: ["News"],
  10764: ["Reality"],
  10765: ["Sci-Fi", "Fantasy"],
  10766: ["Drama"],
  10767: ["Talk"],
  10768: ["War"],
  37: ["Western"],
};

/** Genre names as the engine uses them -> TMDB genre ids, per media type. */
export const GENRE_IDS: Record<MediaType, Record<string, number>> = {
  movie: {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Sci-Fi": 878,
    Thriller: 53,
    War: 10752,
    Western: 37,
  },
  tv: {
    Action: 10759,
    Adventure: 10759,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Drama: 18,
    Family: 10751,
    Fantasy: 10765,
    "Sci-Fi": 10765,
    Mystery: 9648,
    War: 10768,
    Western: 37,
  },
};

/** Genres TMDB has no id for (on that media type) are matched by keyword instead. */
export const GENRE_KEYWORDS: Record<string, string> = {
  Romance: "romance",
  Horror: "horror",
  Thriller: "suspense",
  Music: "music",
  History: "historical",
  Biography: "biography",
  Sport: "sports",
};

/** Genres that are never what someone looking for a story wants. */
export const SKIP_GENRE_IDS = [10763, 10764, 10767, 10770];

const GENRE_TAGS: Record<string, string[]> = {
  Comedy: ["funny"],
  Romance: ["romantic"],
  Horror: ["scary"],
  Thriller: ["tense"],
  Mystery: ["twisty"],
  Action: ["actionpacked"],
  Adventure: ["epic"],
  Family: ["family", "feelgood"],
  Animation: ["family"],
  "Sci-Fi": ["mindbending"],
  Fantasy: ["epic"],
  Drama: ["thoughtful"],
  Crime: ["dark"],
  War: ["tense"],
  History: ["thoughtful"],
  Music: ["feelgood"],
};

/* ───────────── Mapping ───────────── */

export interface TMDBItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  origin_country?: string[];
  original_language?: string;
  known_for_department?: string;
  known_for?: TMDBItem[];
  job?: string;
  character?: string;
}

const LANG_COUNTRY: Record<string, string> = {
  ko: "KR",
  zh: "CN",
  cn: "HK",
  ja: "JP",
  hi: "IN",
  ta: "IN",
  te: "IN",
  ml: "IN",
  kn: "IN",
  bn: "IN",
  mr: "IN",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "BR",
  da: "DK",
  fa: "IR",
  sv: "SE",
  no: "NO",
  th: "TH",
  tr: "TR",
};

export const typeOf = (r: TMDBItem, fallback?: MediaType): MediaType | null => {
  if (r.media_type === "movie" || r.media_type === "tv") return r.media_type;
  if (r.media_type) return null;
  return (
    fallback ??
    (r.title !== undefined ? "movie" : r.name !== undefined ? "tv" : null)
  );
};

export function toTitle(r: TMDBItem, type: MediaType): Title | null {
  const name = (type === "movie" ? r.title : r.name) ?? r.title ?? r.name;
  const date = (type === "movie" ? r.release_date : r.first_air_date) ?? "";
  const year = Number(date.slice(0, 4));
  if (!name || !year) return null;
  const ids = r.genre_ids ?? r.genres?.map((g) => g.id) ?? [];
  const map = type === "movie" ? MOVIE_GENRES : TV_GENRES;
  const genres = [...new Set(ids.flatMap((id) => map[id] ?? []))];
  const tags = [...new Set(genres.flatMap((g) => GENRE_TAGS[g] ?? []))];
  const country = (
    r.origin_country?.[0] ??
    LANG_COUNTRY[r.original_language ?? ""] ??
    ""
  ).replace("GB", "UK");
  const overview = (r.overview ?? "").trim();
  return {
    id: `${type}-${r.id}`,
    title: name,
    year,
    rating: Math.round((r.vote_average ?? 0) * 10) / 10,
    votes: Math.round(((r.vote_count ?? 0) / 1000) * 10) / 10,
    kind: (type === "movie" ? "movie" : "series") as Kind,
    genres: genres.length ? genres : ["Drama"],
    country: country || "US",
    director: "",
    cast: [],
    tags: tags.length ? tags : ["thoughtful"],
    blurb:
      overview.length > 240
        ? overview.slice(0, 237).replace(/\s+\S*$/, "") + "…"
        : overview || "No synopsis yet.",
    poster: image(r.poster_path, "w342"),
    backdrop: image(r.backdrop_path, "w780"),
    ratingSource: "TMDB",
  };
}

export function parseId(id: string): { type: MediaType; id: number } | null {
  const m = /^(movie|tv)-(\d+)$/.exec(id);
  return m ? { type: m[1] as MediaType, id: Number(m[2]) } : null;
}

export const isUsable = (r: TMDBItem) =>
  !(r.genre_ids ?? []).some((g) => SKIP_GENRE_IDS.includes(g));

import { titleById } from "./catalog";
import type { Title } from "./types";

/**
 * Finds poster artwork for catalog titles.
 *
 * 1. TMDB, when TMDB_API_KEY (v3 key) or TMDB_READ_TOKEN is set. Recommended for production.
 * 2. Wikipedia's lead image for the title's article (keyless).
 *
 * Results are cached in memory for the life of the server process, and the API
 * route adds long CDN cache headers on top.
 */

const UA = "DramaMatch/1.0 (https://github.com/Dibyajyotikabi/DramaMatch)";
const TIMEOUT = 6000;
const cache = new Map<string, Promise<string | null>>();

export { titleById };

export function posterFor(t: Title): Promise<string | null> {
  let hit = cache.get(t.id);
  if (!hit) {
    hit = lookup(t).catch(() => null);
    cache.set(t.id, hit);
    // Forget failures after a while so a flaky network doesn't stick forever.
    hit.then((url) => {
      if (!url) setTimeout(() => cache.delete(t.id), 30 * 60 * 1000);
    });
  }
  return hit;
}

async function lookup(t: Title) {
  if (process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN) {
    const url = await fromTMDB(t).catch(() => null);
    if (url) return url;
  }
  return fromWikipedia(t);
}

async function getJSON(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* ───────────── TMDB ───────────── */

interface TMDBResult {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
}

export async function fromTMDB(t: Title): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_READ_TOKEN;
  const type = t.kind === "movie" ? "movie" : "tv";
  const params = new URLSearchParams({
    query: t.title,
    include_adult: "false",
  });
  params.set(type === "movie" ? "year" : "first_air_date_year", String(t.year));
  if (key) params.set("api_key", key);
  const data = await getJSON(
    `https://api.themoviedb.org/3/search/${type}?${params}`,
    token ? { Authorization: `Bearer ${token}` } : {},
  );
  return pickTMDB(t, data?.results ?? []);
}

export function pickTMDB(t: Title, results: TMDBResult[]): string | null {
  const want = norm(t.title);
  const scored = results
    .filter((r) => r.poster_path)
    .map((r) => {
      const name = norm(r.title ?? r.name ?? "");
      const original = norm(r.original_title ?? r.original_name ?? "");
      const year = Number(
        (r.release_date ?? r.first_air_date ?? "").slice(0, 4),
      );
      let score = 0;
      if (name === want || original === want) score += 3;
      else if (name.includes(want) || want.includes(name)) score += 1;
      if (year && Math.abs(year - t.year) <= 1) score += 2;
      score += Math.min(1, (r.popularity ?? 0) / 100);
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 2) return null;
  return `https://image.tmdb.org/t/p/w500${best.r.poster_path}`;
}

/* ───────────── Wikipedia ───────────── */

interface WikiPage {
  title: string;
  index?: number;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
}

export async function fromWikipedia(t: Title): Promise<string | null> {
  const what = t.kind === "movie" ? "film" : "television series";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${t.title} ${t.year} ${what}`,
    gsrlimit: "5",
    prop: "pageimages|description",
    piprop: "thumbnail",
    pithumbsize: "500",
    pilicense: "any",
    redirects: "1",
  });
  const data = await getJSON(`https://en.wikipedia.org/w/api.php?${params}`);
  return pickWikipedia(t, data?.query?.pages ?? []);
}

export function pickWikipedia(t: Title, pages: WikiPage[]): string | null {
  const want = norm(t.title);
  const scored = pages
    .filter((p) => p.thumbnail?.source)
    .map((p) => {
      const title = norm(p.title.replace(/\s*\(.*\)$/, ""));
      const desc = (p.description ?? "").toLowerCase();
      let score = 0;
      if (title === want) score += 3;
      else if (title.includes(want) || want.includes(title)) score += 1;
      if (
        desc.includes(String(t.year)) ||
        desc.includes(String(t.year - 1)) ||
        desc.includes(String(t.year + 1))
      )
        score += 2;
      if (
        /\b(film|movie|series|drama|anime|sitcom|miniseries|show)\b/.test(desc)
      )
        score += 1;
      score -= (p.index ?? 1) * 0.1;
      // Posters are portrait; logos and photos of people usually aren't what we want.
      const { width, height } = p.thumbnail!;
      if (height < width) score -= 1.5;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 3) return null;
  return best.p.thumbnail!.source;
}

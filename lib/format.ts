import type { Title } from "./types";

const GENRE_HUES: [string, number][] = [
  ["Horror", 352],
  ["Romance", 340],
  ["Animation", 24],
  ["Sci-Fi", 192],
  ["Fantasy", 270],
  ["Comedy", 38],
  ["Thriller", 222],
  ["Mystery", 250],
  ["Crime", 210],
  ["War", 84],
  ["Music", 310],
  ["Sport", 150],
  ["Action", 8],
  ["Adventure", 168],
  ["Biography", 28],
  ["History", 34],
  ["Family", 46],
  ["Western", 30],
  ["Drama", 200],
];

export function hueFor(t: Title) {
  const base = GENRE_HUES.find(([g]) => t.genres.includes(g))?.[1] ?? 200;
  let h = 0;
  for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return base + (h % 26) - 13;
}

/** Emoji flag from a two-letter country code ("UK" is stored for Britain). */
export function flag(code: string) {
  const c = code === "UK" ? "GB" : code;
  if (!/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(
    ...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string) {
  const c = code === "UK" ? "GB" : code;
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    const n = regionNames.of(c) ?? code;
    return n === "United States" ? "USA" : n === "United Kingdom" ? "UK" : n;
  } catch {
    return code;
  }
}

export const trailerURL = (t: Title) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${t.year} official trailer`)}`;

export const imdbURL = (t: Title) =>
  `https://www.imdb.com/find/?q=${encodeURIComponent(`${t.title} ${t.year}`)}`;

export const kindLabel = (t: Title) =>
  t.kind === "movie" ? "Movie" : "Series";

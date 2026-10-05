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

export const FLAGS: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  IE: "🇮🇪",
  KR: "🇰🇷",
  CN: "🇨🇳",
  TW: "🇹🇼",
  HK: "🇭🇰",
  JP: "🇯🇵",
  IN: "🇮🇳",
  FR: "🇫🇷",
  ES: "🇪🇸",
  DE: "🇩🇪",
  IT: "🇮🇹",
  MX: "🇲🇽",
  BR: "🇧🇷",
  DK: "🇩🇰",
  IR: "🇮🇷",
  AU: "🇦🇺",
};

export const COUNTRY_SHORT: Record<string, string> = {
  US: "USA",
  UK: "UK",
  IE: "Ireland",
  KR: "South Korea",
  CN: "China",
  TW: "Taiwan",
  HK: "Hong Kong",
  JP: "Japan",
  IN: "India",
  FR: "France",
  ES: "Spain",
  DE: "Germany",
  IT: "Italy",
  MX: "Mexico",
  BR: "Brazil",
  DK: "Denmark",
  IR: "Iran",
  AU: "Australia",
};

export const trailerURL = (t: Title) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${t.year} official trailer`)}`;

export const imdbURL = (t: Title) =>
  `https://www.imdb.com/find/?q=${encodeURIComponent(`${t.title} ${t.year}`)}`;

export const kindLabel = (t: Title) =>
  t.kind === "movie" ? "Movie" : "Series";

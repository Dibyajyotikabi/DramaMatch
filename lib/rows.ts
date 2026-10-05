import { catalog } from "./catalog";
import { defaultFilters, interpret, recommend } from "./engine";
import type { Filters, Title } from "./types";

export interface Row {
  id: string;
  title: string;
  /** Query that "See all" runs. */
  query: string;
  filters?: Partial<Filters>;
  items: Title[];
}

const fromQuery = (query: string, filters: Partial<Filters> = {}, n = 16) => {
  const intent = interpret(query);
  return recommend(intent, { ...defaultFilters(intent), ...filters })
    .slice(0, n)
    .map((p) => p.title);
};

/** Highest rated with enough votes to be a safe bet. */
export const TOP10: Title[] = [...catalog]
  .sort(
    (a, b) =>
      b.rating * Math.log10(b.votes + 10) - a.rating * Math.log10(a.votes + 10),
  )
  .filter(
    (t, i, all) =>
      all.findIndex((x) => x.title.split(":")[0] === t.title.split(":")[0]) ===
      i,
  )
  .slice(0, 10);

const DEFS: [string, string, string, Partial<Filters>?][] = [
  ["comfort", "Feel-good comfort", "cozy feel good"],
  ["kdrama", "K-drama favourites", "k-drama"],
  ["thrill", "Edge-of-your-seat thrillers", "suspense thriller"],
  ["india", "Made in India", "bollywood"],
  ["mind", "Mind-benders", "mind-bending twists"],
  ["love", "Fall in love", "romantic"],
  [
    "fresh",
    "Fresh from the 2020s",
    "great movies and series",
    { era: "2020s" },
  ],
  ["anime", "Anime & animation", "animation"],
  ["cry", "Have a good cry", "tearjerker"],
  ["scare", "Lights off, volume up", "scary horror"],
];

export const ROWS: Row[] = DEFS.map(([id, title, query, filters]) => ({
  id,
  title,
  query,
  filters,
  items: fromQuery(query, filters),
}));

/** Titles for the drifting poster wall behind the hero. */
export const WALL: Title[][] = (() => {
  const pool = [...catalog].sort((a, b) => b.votes - a.votes);
  const pick = (n: number, offset: number) =>
    Array.from({ length: n }, (_, i) => pool[(offset + i * 3) % pool.length]);
  return [pick(12, 0), pick(12, 1), pick(12, 2)];
})();

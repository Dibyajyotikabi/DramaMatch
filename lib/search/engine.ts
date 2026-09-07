import type { Drama, SearchResult } from "../types";
import { slugify } from "../data/catalog";
const normalize = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function searchCatalog(catalog: Drama[], query: string): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const d of catalog) {
    if (normalize(d.title + " " + d.originalTitle).includes(q))
      results.push({
        id: d.id,
        label: d.title,
        group: d.type === "movie" ? "Movies" : "Dramas",
        slug: d.slug,
        subtitle: `${d.country === "KR" ? "Korea" : "China"} · ${d.year} · ${d.type === "movie" ? "Film" : `${d.episodeCount} episodes`}`,
        poster: d.poster,
      });
    for (const a of d.actors)
      if (normalize(a.name).includes(q) && !seen.has(a.slug)) {
        seen.add(a.slug);
        results.push({
          id: a.slug,
          label: a.name,
          group: a.kind === "actor" ? "Actors" : "Actresses",
          slug: a.slug,
          subtitle: `Explore ${a.name}’s stories`,
        });
      }
    for (const [group, values] of [
      ["Genres", d.genres],
      ["Tropes", d.dna.tropes],
    ] as const)
      for (const t of values)
        if (normalize(t).includes(q) && !seen.has(t)) {
          seen.add(t);
          results.push({
            id: slugify(t),
            label: t,
            group,
            slug: slugify(t),
            subtitle:
              group === "Genres"
                ? "Find your kind of story"
                : "A familiar feeling, a new story",
          });
        }
  }
  return results
    .sort(
      (a, b) =>
        Number(normalize(b.label) === q) - Number(normalize(a.label) === q),
    )
    .slice(0, 16);
}

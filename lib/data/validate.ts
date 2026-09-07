import type { Drama } from "../types";
export function validateCatalog(catalog: Drama[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const d of catalog) {
    if (ids.has(d.id) || slugs.has(d.slug))
      throw new Error(`Duplicate title identity: ${d.slug}`);
    ids.add(d.id);
    slugs.add(d.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug))
      throw new Error(`Invalid slug: ${d.slug}`);
    if (
      !d.title ||
      !d.synopsis ||
      !d.poster ||
      !d.actors.length ||
      d.episodeCount < 1
    )
      throw new Error(`Incomplete title: ${d.slug}`);
    for (const axis of [
      "romance",
      "chemistry",
      "comedy",
      "angst",
      "action",
      "mystery",
      "toxicity",
    ] as const)
      if (!Number.isInteger(d.dna[axis]) || d.dna[axis] < 0 || d.dna[axis] > 10)
        throw new Error(`Invalid ${axis}: ${d.slug}`);
    if (d.rating < 0 || d.rating > 10 || d.popularity < 0 || d.popularity > 100)
      throw new Error(`Invalid rating: ${d.slug}`);
  }
}

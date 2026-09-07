import type { Drama } from "../types";
import { slugify } from "../data/catalog";
export const curatedCollections = [
  {
    category: "kdrama",
    slug: "happy-ending",
    title: "K-dramas with a happy ending",
    intro:
      "The journey can be complicated. The destination doesn’t have to be. These Korean stories are selected for a reassuring conclusion, with different levels of tension along the way.",
    note: "An ending label is a spoiler by nature. Inclusion in this collection signals a happy ending; individual story details stay hidden.",
    kind: "happy",
  },
  {
    category: "kdrama",
    slug: "no-love-triangle",
    title: "K-dramas without a love triangle",
    intro:
      "Make room for the story, not a romantic competition. These Korean titles keep sustained rival love interests out of the central relationship, so you can focus on the connection itself.",
    note: "No love triangle does not mean no conflict. Compare angst, pacing, and lead behavior before choosing your next watch.",
    kind: "triangle",
  },
  {
    category: "kdrama",
    slug: "green-flag-male-lead",
    title: "K-dramas with green-flag leads",
    intro:
      "Kindness is compelling. These Korean stories center supportive romantic leads: people who show up, make space for growth, and learn to communicate.",
    note: "Our green-flag tag describes the central romantic dynamic, not every character’s behavior. The angst meter and spoiler-safe notes add context.",
    kind: "green",
  },
  {
    category: "cdrama",
    slug: "happy-ending",
    title: "C-dramas with a happy ending",
    intro:
      "Settle into a Chinese romance or adventure with a little more peace of mind. These titles arrive at a happy conclusion, whether the road there is gentle or full of high-stakes fantasy.",
    note: "Being in this collection reveals the broad ending type. It does not reveal how the characters reach it. Look at angst if you want a gentle journey, too.",
    kind: "happy",
  },
  {
    category: "cdrama",
    slug: "no-love-triangle",
    title: "C-dramas without a love triangle",
    intro:
      "From everyday first love to a shared race against time, these Chinese stories give the central pair room to connect without a competing romantic lead.",
    note: "Our strict filter excludes even mild triangles. A story can still contain misunderstandings or other relationship challenges.",
    kind: "triangle",
  },
];
export const moodDescriptions: Record<string, string> = {
  "Comfort me":
    "Gentle connections, small acts of care, and stories that leave a little warmth behind. Start with lower angst if you want the softest landing.",
  "Give me butterflies":
    "For charged glances, memorable chemistry, and the giddy anticipation of falling in love. These stories put emotional connection near the center.",
  "Make me cry":
    "Stories that make space for grief, longing, and catharsis. High angst can be rewarding, but check the spoiler-safe content notes before pressing play.",
  "Keep me hooked":
    "A question you need answered, a deadline that keeps moving, or a mystery with another layer. Pacing and suspense guide these selections.",
  "Make me laugh":
    "Playful misunderstandings, sharp timing, and characters who bring out each other’s sillier side. Comedy is the common thread.",
  "Make me think":
    "Stories about justice, identity, and the choices people make under pressure. Expect themes that linger after the credits.",
};
export function collectionFor(
  category: string,
  slug: string,
  catalog: Drama[],
) {
  const curated = curatedCollections.find(
    (c) => c.category === category && c.slug === slug,
  );
  if (curated) {
    const items = catalog.filter(
      (d) =>
        d.country === (category === "kdrama" ? "KR" : "CN") &&
        d.type === "tv" &&
        (curated.kind === "happy"
          ? d.dna.ending === "happy"
          : curated.kind === "triangle"
            ? d.dna.loveTriangle === "none"
            : d.dna.leadType.includes("Green flag") && d.dna.toxicity <= 3),
    );
    return { ...curated, items };
  }
  if (category === "actor" || category === "actress") {
    const person = catalog
      .flatMap((d) => d.actors)
      .find((a) => a.slug === slug && a.kind === category);
    if (!person) return null;
    const items = catalog.filter((d) => d.actors.some((a) => a.slug === slug));
    return {
      category,
      slug,
      title: `${person.name}: dramas & films`,
      intro: `Explore ${person.name}’s appearances in our curated starter catalog. Compare each story’s emotional tone, tropes, and pacing, then find something with a similar feeling.`,
      note: "This is a curated selection, not a complete filmography. Credits and story descriptions are provided with each title.",
      items,
    };
  }
  if (!["genre", "trope", "mood"].includes(category)) return null;
  const values = catalog.flatMap((d) =>
    category === "genre"
      ? d.genres
      : category === "trope"
        ? d.dna.tropes
        : d.dna.moods,
  );
  const label = values.find((v) => slugify(v) === slug);
  if (!label) return null;
  const items = catalog.filter((d) =>
    (category === "genre"
      ? d.genres
      : category === "trope"
        ? d.dna.tropes
        : d.dna.moods
    ).includes(label),
  );
  return {
    category,
    slug,
    title:
      category === "mood"
        ? `Dramas to ${label.toLowerCase()}`
        : `${label} K-dramas & C-dramas`,
    intro:
      category === "mood"
        ? moodDescriptions[label]
        : category === "trope"
          ? `${label} is the thread, but every story wears it differently. Explore Korean and Chinese takes on this familiar dynamic, from quiet character moments to sweeping emotional turns.`
          : `Discover ${label.toLowerCase()} across Korean and Chinese storytelling. These curated picks share a genre, but their emotional intensity, relationship dynamics, and rhythm can be very different.`,
    note: "Compare the individual Drama DNA notes below. A shared genre or trope is only the starting point; refine your preferences to find the right emotional fit.",
    items,
  };
}
export function collectionPaths(catalog: Drama[]) {
  return [
    ...curatedCollections.map(({ category, slug }) => ({ category, slug })),
    ...catalog.flatMap((d) => [
      ...d.actors.map((a) => ({ category: a.kind, slug: a.slug })),
      ...d.genres.map((t) => ({ category: "genre", slug: slugify(t) })),
      ...d.dna.tropes.map((t) => ({ category: "trope", slug: slugify(t) })),
      ...d.dna.moods.map((t) => ({ category: "mood", slug: slugify(t) })),
    ]),
  ].filter(
    (p, i, all) =>
      all.findIndex((a) => a.category === p.category && a.slug === p.slug) ===
      i,
  );
}

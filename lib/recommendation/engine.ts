import type { Drama, Match, Preferences } from "../types";
export function tagStrength(d: Drama, tag: string): number {
  const n = d.dna;
  switch (tag.toLowerCase()) {
    case "romance":
      return n.romance / 10;
    case "chemistry":
      return n.chemistry / 10;
    case "comedy":
      return n.comedy / 10;
    case "action":
      return n.action / 10;
    case "mystery":
      return n.mystery / 10;
    case "green flag":
      return n.leadType.includes("Green flag") ? 1 : 0;
    default:
      return [
        ...d.genres,
        ...n.tropes,
        ...n.setting,
        ...n.themes,
        ...n.leadType,
      ].some((t) => t.toLowerCase() === tag.toLowerCase())
        ? 1
        : 0;
  }
}
export function excluded(d: Drama, avoid: string[]): boolean {
  const n = d.dna;
  return avoid.some((v) =>
    v === "Sad ending"
      ? n.ending !== "happy"
      : v === "Love triangle"
        ? n.loveTriangle !== "none"
        : v === "Toxic leads"
          ? n.toxicity > 3
          : v === "Slow pacing"
            ? n.pace === "slow"
            : v === "Breakups"
              ? n.themes.includes("Separation") ||
                n.tropes.includes("Second chance")
              : v === "Fantasy"
                ? d.genres.includes("Fantasy")
                : false,
  );
}
const overlap = (a: string[], b: string[]) =>
  a.length ? a.filter((x) => b.includes(x)).length / a.length : 0;
export function similarity(a: Drama, b: Drama): number {
  const axes = [
    "romance",
    "chemistry",
    "comedy",
    "angst",
    "action",
    "mystery",
    "toxicity",
  ] as const;
  const numeric =
    1 - axes.reduce((n, k) => n + Math.abs(a.dna[k] - b.dna[k]), 0) / 70;
  return (
    numeric * 0.55 +
    overlap(a.genres, b.genres) * 0.25 +
    overlap(a.dna.tropes, b.dna.tropes) * 0.15 +
    (a.dna.pace === b.dna.pace ? 0.05 : 0)
  );
}
function moodStrength(d: Drama, mood: string) {
  const n = d.dna;
  if (n.moods.includes(mood)) return 1;
  switch (mood) {
    case "Comfort me":
      return ((10 - n.angst) / 10) * 0.7 + ((10 - n.toxicity) / 10) * 0.3;
    case "Give me butterflies":
      return (n.romance + n.chemistry) / 20;
    case "Make me cry":
      return n.angst / 10;
    case "Keep me hooked":
      return Math.max(n.action, n.mystery) / 10;
    case "Make me laugh":
      return n.comedy / 10;
    case "Make me think":
      return n.themes.some((t) =>
        ["Justice", "Identity", "Empathy"].includes(t),
      )
        ? 0.9
        : 0.2;
    default:
      return 0.5;
  }
}
export function recommend(
  catalog: Drama[],
  p: Preferences,
  limit = 8,
): Match[] {
  const q = (p.query ?? "").toLowerCase();
  const seed =
    catalog.find((d) => d.slug === p.seed) ||
    catalog.find((d) => q.includes(d.title.toLowerCase()));
  const person = catalog
    .flatMap((d) => d.actors)
    .find((a) => a.name.toLowerCase() === q);
  const queryTags = [
    ...new Set(catalog.flatMap((d) => [...d.genres, ...d.dna.tropes])),
  ].filter((t) => q === t.toLowerCase());
  return catalog
    .filter(
      (d) =>
        d.id !== seed?.id &&
        (!p.country || d.country === p.country) &&
        !excluded(d, p.avoid),
    )
    .map((drama) => {
      const reasons: string[] = [];
      const tags: string[] = [];
      const checks: boolean[] = [];
      const base = seed
        ? similarity(seed, drama)
        : person
          ? drama.actors.some((a) => a.slug === person.slug)
            ? 1
            : 0.1
          : queryTags.length
            ? Math.max(...queryTags.map((t) => tagStrength(drama, t)))
            : 0.65;
      if (seed) {
        const shared = seed.dna.tropes.filter((t) =>
          drama.dna.tropes.includes(t),
        );
        reasons.push(
          shared.length
            ? `Shares ${shared.map((t) => t.toLowerCase()).join(" and ")} with ${seed.title}.`
            : `Compared with ${seed.title}: ${drama.dna.romance}/10 romance, ${drama.dna.angst}/10 angst, and ${drama.dna.pace} pacing.`,
        );
      }
      if (person && drama.actors.some((a) => a.slug === person.slug))
        reasons.push(`Stars ${person.name}, the performer you searched for.`);
      for (const t of p.wanted) {
        const yes = tagStrength(drama, t) >= 0.7;
        checks.push(yes);
        if (yes) {
          tags.push(t);
          reasons.push(
            `${t === "Green flag" ? "Supportive lead behavior" : t} fits what you’re looking for.`,
          );
        }
      }
      if (p.mood) {
        const yes = moodStrength(drama, p.mood) >= 0.7;
        checks.push(yes);
        if (yes)
          reasons.push(`Its emotional tone fits “${p.mood.toLowerCase()}”.`);
      }
      for (const v of p.avoid) {
        checks.push(true);
        reasons.push(
          v === "Sad ending"
            ? "Meets your ending preference (details hidden)."
            : `Respects your “avoid ${v.toLowerCase()}” preference.`,
        );
      }
      const wanted = p.wanted.length
        ? p.wanted.reduce((n, t) => n + tagStrength(drama, t), 0) /
          p.wanted.length
        : base;
      const genre = seed
        ? overlap(seed.genres, drama.genres)
        : queryTags.length
          ? Math.max(...queryTags.map((t) => tagStrength(drama, t)))
          : p.wanted.some((t) => drama.genres.includes(t))
            ? 1
            : base;
      const breakdown = [
        { label: "Story similarity", score: base, weight: 30 },
        { label: "What you want", score: wanted, weight: 30 },
        {
          label: "Your mood",
          score: p.mood ? moodStrength(drama, p.mood) : base,
          weight: 15,
        },
        { label: "Genre fit", score: genre, weight: 10 },
        {
          label: "Ending preference",
          score: p.avoid.includes("Sad ending")
            ? 1
            : seed
              ? seed.dna.ending === drama.dna.ending
                ? 1
                : 0.5
              : base,
          weight: 10,
        },
        {
          label: "Editorial quality",
          score: (drama.rating / 10) * 0.8 + (drama.popularity / 100) * 0.2,
          weight: 5,
        },
      ];
      const score = Math.round(
        breakdown.reduce((n, b) => n + b.score * b.weight, 0),
      );
      if (!reasons.length) reasons.push(drama.dna.spoilerSafeNotes);
      return {
        drama,
        score,
        reasons,
        tags: tags.length ? tags : drama.dna.tropes.slice(0, 3),
        breakdown,
        matched: checks.filter(Boolean).length,
        total: checks.length,
      };
    })
    .filter((match) => match.score >= 50)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.drama.rating - a.drama.rating ||
        a.drama.slug.localeCompare(b.drama.slug),
    )
    .slice(0, Math.max(1, Math.min(limit, 10)));
}

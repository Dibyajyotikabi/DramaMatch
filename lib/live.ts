/**
 * Live recommendations from TMDB: every movie and series, searched and ranked
 * on the server. The local engine still reads the query (moods, typos,
 * countries, eras); this module turns that reading into TMDB calls.
 */
import { similarity, normalize, eraOf, moodLabels, TAG_LABELS } from "./engine";
import {
  GENRE_IDS,
  GENRE_KEYWORDS,
  SKIP_GENRE_IDS,
  image,
  isUsable,
  parseId,
  tmdb,
  toTitle,
  typeOf,
  type MediaType,
  type TMDBItem,
} from "./tmdb";
import type { Filters, Intent, Pick, Title, TitleDetails } from "./types";

interface Page<T = TMDBItem> {
  results: T[];
}

const LANGS: Record<string, string[]> = {
  KR: ["ko"],
  CN: ["zh"],
  TW: ["zh"],
  HK: ["cn"],
  JP: ["ja"],
  IN: ["hi", "ta", "te", "ml"],
  FR: ["fr"],
  ES: ["es"],
  MX: ["es"],
  DE: ["de"],
  IT: ["it"],
};
const ORIGINS: Record<string, string> = { US: "US", UK: "GB", IE: "IE" };

const today = () => new Date().toISOString().slice(0, 10);
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/* ───────────── Entity lookups ───────────── */

const keywordCache = new Map<string, Promise<number | null>>();
function keywordId(name: string) {
  let hit = keywordCache.get(name);
  if (!hit) {
    hit = tmdb<Page<{ id: number; name: string }>>(
      "/search/keyword",
      { query: name },
      7 * 86400,
    )
      .then(
        (d) =>
          (d.results.find((k) => k.name.toLowerCase() === name) ?? d.results[0])
            ?.id ?? null,
      )
      .catch(() => null);
    keywordCache.set(name, hit);
  }
  return hit;
}

interface Entity {
  kind: "person" | "title";
  id: number;
  name: string;
  type?: MediaType;
  item?: TMDBItem;
}

async function findTitle(t: Title): Promise<Entity | null> {
  const type: MediaType = t.kind === "movie" ? "movie" : "tv";
  const d = await tmdb<Page>(`/search/${type}`, {
    query: t.title,
    [type === "movie" ? "year" : "first_air_date_year"]: t.year,
  });
  const r = d.results[0];
  return r ? { kind: "title", id: r.id, name: t.title, type, item: r } : null;
}

async function findPerson(name: string): Promise<Entity | null> {
  const d = await tmdb<Page>("/search/person", { query: name });
  const r = d.results[0];
  return r ? { kind: "person", id: r.id, name: r.name ?? name } : null;
}

/** Best guess for free text that might be a title or a person ("naruto", "dhoom 3", "zendya"). */
async function resolveText(
  text: string,
): Promise<{ entity: Entity | null; results: TMDBItem[] }> {
  const want = normalize(text);
  const d = await tmdb<Page>("/search/multi", {
    query: text,
    include_adult: "false",
  });
  const results = d.results.filter(
    (r) => r.media_type === "person" || (typeOf(r) && isUsable(r)),
  );
  let best: { score: number; r?: TMDBItem } = { score: 0 };
  results.slice(0, 8).forEach((r, i) => {
    const name = normalize(r.title ?? r.name ?? "");
    const words = want.split(" ");
    let s = similarity(want, name);
    if (name === want) s += 0.5;
    else if (
      name.startsWith(want) ||
      words.every((w) => name.split(" ").includes(w))
    )
      s += 0.3;
    s += Math.min(0.15, Math.log10((r.popularity ?? 0) + 1) / 20) - i * 0.03;
    if (s > best.score) best = { score: s, r };
  });
  const r = best.r;
  if (!r || best.score < 0.6) return { entity: null, results };
  if (r.media_type === "person")
    return {
      entity: { kind: "person", id: r.id, name: r.name ?? text },
      results,
    };
  const type = typeOf(r)!;
  return {
    entity: {
      kind: "title",
      id: r.id,
      name: (r.title ?? r.name)!,
      type,
      item: r,
    },
    results,
  };
}

/* ───────────── Candidate sources ───────────── */

interface Candidate {
  item: TMDBItem;
  type: MediaType;
  boost: number;
  reason?: string;
}

async function personCredits(p: Entity): Promise<Candidate[]> {
  const d = await tmdb<{ cast: TMDBItem[]; crew: TMDBItem[] }>(
    `/person/${p.id}/combined_credits`,
  );
  const out: Candidate[] = [];
  for (const r of d.cast ?? []) {
    const type = typeOf(r);
    if (
      !type ||
      !isUsable(r) ||
      /\b(self|himself|herself|narrator)\b/i.test(r.character ?? "")
    )
      continue;
    out.push({ item: r, type, boost: 2.2, reason: `Stars ${p.name}` });
  }
  for (const r of d.crew ?? []) {
    const type = typeOf(r);
    if (!type || !isUsable(r) || !/^(Director|Creator)$/.test(r.job ?? ""))
      continue;
    out.push({
      item: r,
      type,
      boost: 2.3,
      reason: `${r.job === "Creator" ? "Created" : "Directed"} by ${p.name}`,
    });
  }
  return out;
}

async function relatedTo(e: Entity): Promise<Candidate[]> {
  const [rec, sim] = await Promise.all([
    tmdb<Page>(`/${e.type}/${e.id}/recommendations`).catch(() => ({
      results: [],
    })),
    tmdb<Page>(`/${e.type}/${e.id}/similar`).catch(() => ({ results: [] })),
  ]);
  const out: Candidate[] = [];
  rec.results.forEach((r, i) =>
    out.push({
      item: r,
      type: typeOf(r, e.type)!,
      boost: 2 - i * 0.04,
      reason: `Because you liked ${e.name}`,
    }),
  );
  sim.results.forEach((r, i) =>
    out.push({
      item: r,
      type: typeOf(r, e.type)!,
      boost: 1.4 - i * 0.04,
      reason: `Similar to ${e.name}`,
    }),
  );
  return out.filter((c) => c.type && isUsable(c.item));
}

async function discover(
  intent: Intent,
  filters: Filters,
  kinds: MediaType[],
): Promise<Candidate[]> {
  const era = eraOf(filters.era);
  const wanted = Object.entries(intent.genres)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)
    .slice(0, 3);
  if (intent.tags.inspiring) wanted.push("Biography", "Sport");
  const nostalgic = intent.tags.nostalgic && filters.era === "any";
  const regions: Record<string, string>[] = intent.countries.length
    ? [...new Set(intent.countries)].flatMap((c): Record<string, string>[] =>
        LANGS[c]
          ? LANGS[c].map((l) => ({ with_original_language: l }))
          : ORIGINS[c]
            ? [{ with_origin_country: ORIGINS[c] }]
            : [],
      )
    : [{}];
  const foreign = intent.countries.some((c) => LANGS[c]);

  const jobs: Promise<Candidate[]>[] = [];
  for (const type of kinds) {
    const ids = [
      ...new Set(wanted.map((g) => GENRE_IDS[type][g]).filter(Boolean)),
    ];
    const keywordNames = wanted
      .filter((g) => !GENRE_IDS[type][g] && GENRE_KEYWORDS[g])
      .map((g) => GENRE_KEYWORDS[g]);
    const exclude = [
      ...intent.excludeGenres.map((g) => GENRE_IDS[type][g]).filter(Boolean),
      ...(type === "tv" ? SKIP_GENRE_IDS : []),
    ];
    const dateKey =
      type === "movie" ? "primary_release_date" : "first_air_date";
    const base = {
      include_adult: "false",
      without_genres: exclude.join(",") || undefined,
      "vote_average.gte": filters.minRating || undefined,
      [`${dateKey}.gte`]: era.from > 0 ? `${era.from}-01-01` : undefined,
      [`${dateKey}.lte`]:
        era.to < 9999
          ? `${Math.min(era.to, new Date().getFullYear())}-12-31`
          : nostalgic
            ? "2005-12-31"
            : today(),
    };
    const minVotes = (sort: string) =>
      (type === "movie" ? 1 : 0.35) *
      (foreign ? 0.15 : 1) *
      (sort === "popularity.desc" ? 150 : 1200);
    const sorts =
      regions.length > 2
        ? ["popularity.desc"]
        : ["popularity.desc", "vote_average.desc"];
    const splits: Record<string, string | undefined>[] = [];
    if (ids.length) splits.push({ with_genres: ids.join("|") });
    if (keywordNames.length) splits.push({ keywords: keywordNames.join(",") });
    if (
      !splits.length &&
      (wanted.length === 0 || !ids.length) &&
      !keywordNames.length
    )
      splits.push({});

    for (const split of splits)
      for (const region of regions)
        for (const sort_by of sorts)
          jobs.push(
            (async () => {
              let with_keywords: string | undefined;
              if (split.keywords) {
                const kw = (
                  await Promise.all(split.keywords.split(",").map(keywordId))
                ).filter(Boolean);
                if (!kw.length) return [];
                with_keywords = kw.join("|");
              }
              const d = await tmdb<Page>(`/discover/${type}`, {
                ...base,
                ...region,
                with_genres: split.with_genres,
                with_keywords,
                sort_by,
                "vote_count.gte": Math.round(minVotes(sort_by)),
              });
              return d.results
                .filter(isUsable)
                .map((r) => ({ item: r, type, boost: 0 }));
            })().catch(() => []),
          );
  }
  return (await Promise.all(jobs)).flat();
}

/* ───────────── Ranking ───────────── */

function reasonFor(t: Title, intent: Intent): string {
  const hits = t.tags
    .filter((x) => intent.tags[x])
    .sort((a, b) => intent.tags[b] - intent.tags[a]);
  if (hits.length) {
    const label = hits
      .slice(0, 2)
      .map((x, i) => (i ? TAG_LABELS[x].toLowerCase() : TAG_LABELS[x]))
      .join(" & ");
    const genre = t.genres.find(
      (g) => !label.toLowerCase().includes(g.toLowerCase()),
    );
    return `${label}${genre ? ` ${genre.toLowerCase()}` : ""}`;
  }
  const genres = t.genres.filter((g) => intent.genres[g]);
  if (genres.length) return genres.slice(0, 2).join(" · ");
  if (t.rating >= 8) return "Highly rated";
  return "Popular right now";
}

function rank(
  cands: Candidate[],
  intent: Intent,
  filters: Filters,
  exclude: Set<string>,
): Pick[] {
  const era = eraOf(filters.era);
  const genreTotal = Object.values(intent.genres).reduce((a, b) => a + b, 0);
  const seen = new Map<string, Pick>();
  for (const c of cands) {
    const t = toTitle(c.item, c.type);
    if (!t || exclude.has(t.id)) continue;
    if (t.rating < filters.minRating || t.year < era.from || t.year > era.to)
      continue;
    if (filters.kind !== "any" && t.kind !== filters.kind) continue;
    if (intent.excludeGenres.some((g) => t.genres.includes(g))) continue;
    if (t.year > new Date().getFullYear() || (t.votes === 0 && t.rating === 0))
      continue;
    const rel = genreTotal
      ? t.genres.reduce((a, g) => a + (intent.genres[g] ?? 0), 0) / genreTotal
      : 0;
    const quality =
      clamp((t.rating - 5) / 4) * 0.7 +
      clamp(Math.log10(t.votes * 1000 + 1) / 4.3) * 0.3;
    const pop = clamp(Math.log10((c.item.popularity ?? 0) + 1) / 3) * 0.25;
    const score =
      c.boost + clamp(rel) * 1.3 + quality + pop - (t.poster ? 0 : 0.4);
    const prev = seen.get(t.id);
    if (prev) {
      prev.score = Math.max(prev.score, score) + 0.15; // found by several routes: likely a strong match
      continue;
    }
    seen.set(t.id, {
      title: t,
      score,
      reason: c.reason ?? reasonFor(t, intent),
    });
  }
  return [...seen.values()].sort(
    (a, b) => b.score - a.score || b.title.rating - a.title.rating,
  );
}

/* ───────────── Public API ───────────── */

export interface LiveSearch {
  picks: Pick[];
  summary: string;
  corrected?: string;
  understood: boolean;
}

export async function liveSearch(
  intent: Intent,
  filters: Filters,
): Promise<LiveSearch> {
  const kinds: MediaType[] =
    filters.kind === "movie"
      ? ["movie"]
      : filters.kind === "series"
        ? ["tv"]
        : ["movie", "tv"];
  const labels = moodLabels(intent).filter(
    (l) => !/ (picks|shows|films)$|only$/.test(l),
  );
  let corrected = intent.corrected;

  // Who or what is this about?
  const seeds = (
    await Promise.all(
      intent.seeds.slice(0, 2).map((t) => findTitle(t).catch(() => null)),
    )
  ).filter(Boolean) as Entity[];
  const people = (
    await Promise.all(
      intent.people.slice(0, 2).map((p) => findPerson(p).catch(() => null)),
    )
  ).filter(Boolean) as Entity[];
  let looseResults: TMDBItem[] = [];
  if (
    !seeds.length &&
    !people.length &&
    intent.rest.replace(/\d/g, "").trim().length >= 3
  ) {
    const { entity, results } = await resolveText(intent.rest).catch(() => ({
      entity: null,
      results: [],
    }));
    looseResults = results;
    if (entity?.kind === "person") people.push(entity);
    if (entity?.kind === "title") seeds.push(entity);
    if (
      entity &&
      similarity(normalize(entity.name), normalize(intent.rest)) < 0.95
    ) {
      const pattern = intent.rest.split(" ").join("[^a-z0-9]+");
      const base = corrected ?? intent.query;
      const next = base.replace(new RegExp(pattern, "i"), entity.name);
      corrected = next !== base ? next : entity.name;
    }
  }

  const hasMood =
    Object.keys(intent.genres).length > 0 ||
    Object.keys(intent.tags).length > 0;
  const sources: Promise<Candidate[]>[] = [];
  for (const p of people) sources.push(personCredits(p).catch(() => []));
  for (const s of seeds) sources.push(relatedTo(s).catch(() => []));
  if (
    hasMood ||
    intent.countries.length ||
    (!people.length && !seeds.length && !looseResults.length)
  )
    sources.push(discover(intent, filters, kinds));
  if (!people.length && !seeds.length && looseResults.length)
    sources.push(
      Promise.resolve(
        looseResults
          .filter((r) => typeOf(r))
          .map((r, i) => ({
            item: r,
            type: typeOf(r)!,
            boost: 1.6 - i * 0.05,
            reason: `Matches “${intent.rest}”`,
          })),
      ),
    );

  let cands = (await Promise.all(sources)).flat();
  // A person or title plus a mood ("funny Shah Rukh Khan"): keep their work, favour the mood.
  if (hasMood && (people.length || seeds.length)) {
    const wanted = new Set(Object.keys(intent.genres));
    cands = cands.map((c) => {
      const t = toTitle(c.item, c.type);
      const fit = t ? t.genres.some((g) => wanted.has(g)) : false;
      return { ...c, boost: c.boost + (c.reason ? (fit ? 0.6 : -0.6) : -1.2) };
    });
  }
  if (intent.countries.length && (people.length || seeds.length)) {
    const langs = new Set(intent.countries.flatMap((c) => LANGS[c] ?? []));
    const origins = new Set(
      intent.countries.map((c) => ORIGINS[c]).filter(Boolean),
    );
    cands = cands.filter(
      (c) =>
        langs.has(c.item.original_language ?? "") ||
        (c.item.origin_country ?? []).some((o) => origins.has(o)),
    );
  }

  const exclude = new Set(seeds.map((s) => `${s.type}-${s.id}`));
  const picks = rank(cands, intent, filters, exclude);

  const parts = [...labels];
  if (seeds.length) parts.push(`like ${seeds.map((s) => s.name).join(" & ")}`);
  if (people.length)
    parts.push(`with ${people.map((p) => p.name).join(" & ")}`);
  const place = intent.summary
    .split(" · ")
    .find((p) => / (picks|shows|films)$/.test(p));
  if (place) parts.push(place);
  return {
    picks,
    summary: parts.join(" · "),
    corrected,
    understood: Boolean(parts.length || intent.understood),
  };
}

/* ───────────── Details ───────────── */

interface DetailsResponse extends TMDBItem {
  runtime?: number;
  number_of_seasons?: number;
  imdb_id?: string;
  created_by?: { name: string }[];
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
  videos?: {
    results: { key: string; site: string; type: string; official?: boolean }[];
  };
  external_ids?: { imdb_id?: string | null };
  recommendations?: Page;
}

export async function liveDetails(id: string): Promise<TitleDetails | null> {
  const p = parseId(id);
  if (!p) return null;
  const d = await tmdb<DetailsResponse>(`/${p.type}/${p.id}`, {
    append_to_response: "credits,videos,external_ids,recommendations",
  });
  const t = toTitle(d, p.type);
  if (!t) return null;
  const directors =
    p.type === "movie"
      ? (d.credits?.crew ?? [])
          .filter((c) => c.job === "Director")
          .map((c) => c.name)
      : (d.created_by ?? []).map((c) => c.name);
  const videos = d.videos?.results ?? [];
  const trailer =
    videos.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
    ) ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");
  const imdbId = d.external_ids?.imdb_id || d.imdb_id || undefined;
  const runtime =
    p.type === "movie" && d.runtime
      ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
      : d.number_of_seasons
        ? `${d.number_of_seasons} season${d.number_of_seasons === 1 ? "" : "s"}`
        : undefined;
  const overview = (d.overview ?? "").trim();
  return {
    ...t,
    blurb: overview || t.blurb,
    poster: image(d.poster_path, "w500") ?? t.poster,
    backdrop: image(d.backdrop_path, "w1280") ?? t.backdrop,
    director: directors.slice(0, 2).join(", "),
    cast: (d.credits?.cast ?? []).slice(0, 8).map((c) => c.name),
    trailer: trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : undefined,
    imdbId,
    imdbRating: imdbId ? await imdbRating(imdbId) : undefined,
    runtime,
    similar: (d.recommendations?.results ?? [])
      .filter(isUsable)
      .map((r) => toTitle(r, typeOf(r, p.type)!))
      .filter((x): x is Title => Boolean(x))
      .slice(0, 12),
  };
}

/** Optional: real IMDb ratings via OMDb when OMDB_API_KEY is set. */
async function imdbRating(imdbId: string): Promise<number | undefined> {
  const key = process.env.OMDB_API_KEY;
  if (!key) return undefined;
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`,
      {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 7 * 86400 },
      } as RequestInit,
    );
    const j = (await res.json()) as { imdbRating?: string };
    const n = Number(j.imdbRating);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

/* ───────────── Suggestions ───────────── */

export interface LiveSuggestion {
  type: "title" | "person";
  label: string;
  detail: string;
  value: string;
  image?: string;
  id?: string;
}

export async function liveSuggest(q: string): Promise<LiveSuggestion[]> {
  const d = await tmdb<Page>(
    "/search/multi",
    { query: q, include_adult: "false" },
    3600,
  );
  const out: LiveSuggestion[] = [];
  for (const r of d.results.slice(0, 12)) {
    if (r.media_type === "person") {
      if (!r.profile_path && (r.popularity ?? 0) < 5) continue;
      const known = (r.known_for ?? [])
        .map((k) => k.title ?? k.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      out.push({
        type: "person",
        label: r.name ?? "",
        detail: known
          ? `${r.known_for_department ?? "Star"} · ${known}`
          : (r.known_for_department ?? "Star"),
        value: r.name ?? "",
        image: image(r.profile_path, "w92"),
      });
      continue;
    }
    const type = typeOf(r);
    if (!type || !isUsable(r)) continue;
    const t = toTitle(r, type);
    if (!t) continue;
    out.push({
      type: "title",
      label: t.title,
      detail: `${t.kind === "movie" ? "Movie" : "Series"} · ${t.year}${t.rating ? ` · ★ ${t.rating.toFixed(1)}` : ""}`,
      value: t.title,
      image: image(r.poster_path, "w92"),
      id: t.id,
    });
  }
  return out.slice(0, 7);
}

/* ───────────── Home rows ───────────── */

export interface HomeRow {
  id: string;
  title: string;
  query?: string;
  filters?: Partial<Filters>;
  items: Title[];
}

export interface Home {
  live: boolean;
  top10: Title[];
  rows: HomeRow[];
  wall: Title[][];
}

const titles = (results: TMDBItem[], fallback?: MediaType) =>
  results
    .filter(isUsable)
    .map((r) => {
      const type = typeOf(r, fallback);
      return type ? toTitle(r, type) : null;
    })
    .filter((t): t is Title => Boolean(t && t.poster));

export async function liveHome(): Promise<Home> {
  const disc = (type: MediaType, params: Record<string, string | number>) =>
    tmdb<Page>(`/discover/${type}`, {
      include_adult: "false",
      sort_by: "popularity.desc",
      ...params,
    }).then((d) => titles(d.results, type));
  const trend = (path: string, type?: MediaType) =>
    tmdb<Page>(path).then((d) => titles(d.results, type));
  const recent = `${new Date().getFullYear() - 6}-01-01`;

  const [
    day,
    week,
    kdrama,
    hindi,
    south,
    anime,
    comfort,
    thrill,
    love,
    scare,
    series,
    mind,
  ] = await Promise.all([
    trend("/trending/all/day"),
    trend("/trending/all/week"),
    disc("tv", { with_original_language: "ko", "vote_count.gte": 40 }),
    disc("movie", {
      with_original_language: "hi",
      "vote_count.gte": 40,
      "primary_release_date.gte": recent,
    }),
    disc("movie", {
      with_original_language: "te",
      "vote_count.gte": 30,
      "primary_release_date.gte": recent,
    }),
    disc("tv", {
      with_genres: 16,
      with_original_language: "ja",
      "vote_count.gte": 100,
    }),
    disc("movie", {
      with_genres: "35|10751",
      "vote_average.gte": 7,
      "vote_count.gte": 800,
    }),
    disc("movie", {
      with_genres: 53,
      "vote_average.gte": 6.8,
      "vote_count.gte": 800,
    }),
    disc("movie", {
      with_genres: 10749,
      "vote_average.gte": 7,
      "vote_count.gte": 600,
    }),
    disc("movie", {
      with_genres: 27,
      "vote_count.gte": 400,
      "primary_release_date.gte": recent,
    }),
    trend("/trending/tv/week", "tv"),
    disc("movie", {
      with_genres: 878,
      "vote_average.gte": 7.2,
      "vote_count.gte": 2000,
      sort_by: "vote_average.desc",
    }),
  ]);

  const india = [...hindi, ...south].sort((a, b) => b.votes - a.votes);
  const rows: HomeRow[] = [
    { id: "trending", title: "Trending this week", items: week },
    { id: "series", title: "Binge-worthy series", items: series },
    {
      id: "kdrama",
      title: "K-drama favourites",
      query: "k-drama",
      items: kdrama,
    },
    {
      id: "comfort",
      title: "Feel-good comfort",
      query: "cozy feel good",
      items: comfort,
    },
    { id: "india", title: "Made in India", query: "bollywood", items: india },
    {
      id: "thrill",
      title: "Edge-of-your-seat thrillers",
      query: "suspense thriller",
      items: thrill,
    },
    {
      id: "mind",
      title: "Mind-benders",
      query: "mind-bending sci-fi",
      items: mind,
    },
    { id: "love", title: "Fall in love", query: "romantic", items: love },
    { id: "anime", title: "Anime", query: "anime", items: anime },
    {
      id: "scare",
      title: "Lights off, volume up",
      query: "scary horror",
      items: scare,
    },
  ].filter((r) => r.items.length >= 4);

  const pool = [...week, ...day, ...series].filter(
    (t, i, a) => a.findIndex((x) => x.id === t.id) === i,
  );
  const wall = [0, 1, 2].map((k) =>
    pool.filter((_, i) => i % 3 === k).slice(0, 12),
  );
  if (!day.length || rows.length < 4)
    throw new Error("TMDB home rows came back empty");
  return { live: true, top10: day.slice(0, 10), rows, wall };
}

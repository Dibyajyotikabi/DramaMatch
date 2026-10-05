/**
 * A small stand-in for the TMDB v3 API, built from the local catalog plus a few
 * titles the catalog doesn't have. Used by tests (and for local UI testing:
 * `npx tsx tests/mock-tmdb.ts`, then run the app with TMDB_API_BASE pointing at it).
 */
import { createServer, type Server } from "node:http";
import { catalog } from "../lib/catalog";
import { GENRE_IDS } from "../lib/tmdb";

const LANG: Record<string, string> = {
  KR: "ko",
  CN: "zh",
  TW: "zh",
  HK: "cn",
  JP: "ja",
  IN: "hi",
  FR: "fr",
  ES: "es",
  DE: "de",
  IT: "it",
};
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface Item {
  id: number;
  type: "movie" | "tv";
  name: string;
  date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  origin_country: string[];
  overview: string;
  cast: string[];
  director: string;
}

const items: Item[] = catalog.map((t, i) => {
  const type = t.kind === "movie" ? "movie" : "tv";
  return {
    id: (type === "movie" ? 1000 : 5000) + i,
    type,
    name: t.title,
    date: `${t.year}-06-01`,
    vote_average: t.rating,
    vote_count: Math.round(t.votes * 1000),
    popularity: t.votes / 5,
    genre_ids: [
      ...new Set(t.genres.map((g) => GENRE_IDS[type][g]).filter(Boolean)),
    ],
    original_language: LANG[t.country] ?? "en",
    origin_country: [t.country === "UK" ? "GB" : t.country],
    overview: t.blurb,
    cast: t.cast,
    director: t.director,
  };
});
items.push(
  {
    id: 9001,
    type: "tv",
    name: "Naruto",
    date: "2002-10-03",
    vote_average: 8.4,
    vote_count: 6000,
    popularity: 120,
    genre_ids: [16, 10759],
    original_language: "ja",
    origin_country: ["JP"],
    overview:
      "A young ninja dreams of becoming the strongest leader of his village.",
    cast: ["Junko Takeuchi"],
    director: "Masashi Kishimoto",
  },
  {
    id: 9002,
    type: "movie",
    name: "Dhoom 3",
    date: "2013-12-20",
    vote_average: 5.9,
    vote_count: 400,
    popularity: 30,
    genre_ids: [28, 80],
    original_language: "hi",
    origin_country: ["IN"],
    overview:
      "A circus magician takes revenge on the bank that ruined his father.",
    cast: ["Aamir Khan", "Abhishek Bachchan"],
    director: "Vijay Krishna Acharya",
  },
  {
    id: 9003,
    type: "movie",
    name: "Kabhi Haan Kabhi Naa",
    date: "1994-02-25",
    vote_average: 7.6,
    vote_count: 300,
    popularity: 12,
    genre_ids: [35, 10749],
    original_language: "hi",
    origin_country: ["IN"],
    overview:
      "A lovable slacker tries to win over the girl who loves someone else.",
    cast: ["Shah Rukh Khan", "Suchitra Krishnamoorthi"],
    director: "Kundan Shah",
  },
  {
    id: 9004,
    type: "tv",
    name: "Upcoming Show",
    date: "2099-01-01",
    vote_average: 0,
    vote_count: 0,
    popularity: 5,
    genre_ids: [18],
    original_language: "en",
    origin_country: ["US"],
    overview: "Not out yet.",
    cast: [],
    director: "",
  },
);

const people = new Map<string, number>();
for (const it of items)
  for (const n of [it.director, ...it.cast].filter(Boolean))
    if (!people.has(n)) people.set(n, 20000 + people.size);
const personName = new Map([...people].map(([n, id]) => [id, n]));

const out = (it: Item, withType = false) => ({
  id: it.id,
  ...(withType ? { media_type: it.type } : {}),
  [it.type === "movie" ? "title" : "name"]: it.name,
  [it.type === "movie" ? "release_date" : "first_air_date"]: it.date,
  overview: it.overview,
  poster_path: `/p${it.id}.svg`,
  backdrop_path: `/b${it.id}.svg`,
  vote_average: it.vote_average,
  vote_count: it.vote_count,
  popularity: it.popularity,
  genre_ids: it.genre_ids,
  original_language: it.original_language,
  origin_country: it.origin_country,
});

const matches = (text: string, q: string) => {
  const n = norm(text);
  const w = norm(q);
  return n.includes(w) || w.split(" ").every((x) => n.split(" ").includes(x));
};

function discover(type: "movie" | "tv", p: URLSearchParams) {
  const dateKey = type === "movie" ? "primary_release_date" : "first_air_date";
  let list = items.filter((i) => i.type === type);
  const g = p.get("with_genres");
  if (g) {
    const ids = g.split(/[|,]/).map(Number);
    list = list.filter((i) =>
      g.includes(",")
        ? ids.every((x) => i.genre_ids.includes(x))
        : ids.some((x) => i.genre_ids.includes(x)),
    );
  }
  const wg = p.get("without_genres");
  if (wg)
    list = list.filter(
      (i) =>
        !wg
          .split(",")
          .map(Number)
          .some((x) => i.genre_ids.includes(x)),
    );
  const lang = p.get("with_original_language");
  if (lang) list = list.filter((i) => i.original_language === lang);
  const origin = p.get("with_origin_country");
  if (origin) list = list.filter((i) => i.origin_country.includes(origin));
  const kw = p.get("with_keywords");
  if (kw)
    list = list.filter((i) =>
      kw
        .split("|")
        .some((k) =>
          (KEYWORD_GENRE[Number(k)] ?? []).some((x) => i.genre_ids.includes(x)),
        ),
    );
  const va = Number(p.get("vote_average.gte") ?? 0);
  const vc = Number(p.get("vote_count.gte") ?? 0);
  list = list.filter((i) => i.vote_average >= va && i.vote_count >= vc);
  const gte = p.get(`${dateKey}.gte`);
  const lte = p.get(`${dateKey}.lte`);
  if (gte) list = list.filter((i) => i.date >= gte);
  if (lte) list = list.filter((i) => i.date <= lte);
  const sort = p.get("sort_by") ?? "popularity.desc";
  list.sort((a, b) =>
    sort.startsWith("vote_average")
      ? b.vote_average - a.vote_average
      : b.popularity - a.popularity,
  );
  return list.slice(0, 20).map((i) => out(i));
}

// Keyword ids for genres TMDB TV lacks: romance, horror, suspense, music, historical, biography, sports.
const KEYWORDS: Record<string, number> = {
  romance: 9840,
  horror: 315058,
  suspense: 12570,
  music: 4344,
  historical: 15126,
  biography: 5565,
  sports: 6075,
};
const KEYWORD_GENRE: Record<number, number[]> = {
  9840: [10749, 35],
  315058: [27],
  12570: [53, 9648],
  4344: [10402],
  15126: [36],
  5565: [36, 18],
  6075: [18],
};

function related(it: Item) {
  return items
    .filter(
      (x) => x !== it && x.genre_ids.some((g) => it.genre_ids.includes(g)),
    )
    .sort(
      (a, b) =>
        b.genre_ids.filter((g) => it.genre_ids.includes(g)).length -
          a.genre_ids.filter((g) => it.genre_ids.includes(g)).length ||
        b.popularity - a.popularity,
    )
    .slice(0, 20)
    .map((x) => out(x, true));
}

function handle(path: string, p: URLSearchParams): unknown {
  let m: RegExpExecArray | null;
  if (path === "/search/multi") {
    const q = p.get("query") ?? "";
    const titles = items
      .filter((i) => matches(i.name, q))
      .map((i) => ({ ...out(i, true), _pop: i.popularity }));
    const ppl = [...people.keys()]
      .filter((n) => matches(n, q))
      .map((n) => ({
        id: people.get(n),
        media_type: "person",
        name: n,
        profile_path: `/h${people.get(n)}.svg`,
        popularity: 40,
        known_for_department: "Acting",
        known_for: items
          .filter((i) => i.cast.includes(n))
          .slice(0, 2)
          .map((i) => out(i, true)),
        _pop: 40,
      }));
    return {
      results: [...titles, ...ppl].sort((a, b) => b._pop - a._pop).slice(0, 20),
    };
  }
  if ((m = /^\/search\/(movie|tv)$/.exec(path))) {
    const q = p.get("query") ?? "";
    return {
      results: items
        .filter((i) => i.type === m![1] && matches(i.name, q))
        .map((i) => out(i)),
    };
  }
  if (path === "/search/person") {
    const q = p.get("query") ?? "";
    return {
      results: [...people.keys()]
        .filter((n) => matches(n, q))
        .map((n) => ({ id: people.get(n), name: n, popularity: 40 })),
    };
  }
  if (path === "/search/keyword") {
    const q = (p.get("query") ?? "").toLowerCase();
    return { results: KEYWORDS[q] ? [{ id: KEYWORDS[q], name: q }] : [] };
  }
  if ((m = /^\/discover\/(movie|tv)$/.exec(path)))
    return { results: discover(m[1] as "movie" | "tv", p) };
  if ((m = /^\/(movie|tv)\/(\d+)\/(recommendations|similar)$/.exec(path))) {
    const it = items.find((i) => i.id === Number(m![2]));
    return { results: it ? related(it) : [] };
  }
  if ((m = /^\/person\/(\d+)\/combined_credits$/.exec(path))) {
    const name = personName.get(Number(m[1])) ?? "";
    return {
      cast: items
        .filter((i) => i.cast.includes(name))
        .map((i) => ({ ...out(i, true), character: "Lead" })),
      crew: items
        .filter((i) => i.director === name)
        .map((i) => ({
          ...out(i, true),
          job: i.type === "movie" ? "Director" : "Creator",
        })),
    };
  }
  if ((m = /^\/(movie|tv)\/(\d+)$/.exec(path))) {
    const it = items.find((i) => i.id === Number(m![2]) && i.type === m![1]);
    if (!it) return null;
    return {
      ...out(it),
      genres: it.genre_ids.map((id) => ({ id, name: String(id) })),
      runtime: it.type === "movie" ? 128 : undefined,
      number_of_seasons: it.type === "tv" ? 3 : undefined,
      created_by:
        it.type === "tv" && it.director ? [{ name: it.director }] : [],
      credits: {
        cast: it.cast.map((name) => ({ name })),
        crew:
          it.type === "movie" ? [{ name: it.director, job: "Director" }] : [],
      },
      videos: {
        results: [
          {
            key: `trailer${it.id}`,
            site: "YouTube",
            type: "Trailer",
            official: true,
          },
        ],
      },
      external_ids: { imdb_id: `tt${String(it.id).padStart(7, "0")}` },
      recommendations: { results: related(it) },
    };
  }
  if (path === "/trending/all/day" || path === "/trending/all/week")
    return {
      results: [...items]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(path.endsWith("day") ? 0 : 5, path.endsWith("day") ? 20 : 25)
        .map((i) => out(i, true)),
    };
  if (path === "/trending/tv/week")
    return {
      results: items
        .filter((i) => i.type === "tv")
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20)
        .map((i) => out(i)),
    };
  return null;
}

function svg(label: string, hue: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 45%)"/><stop offset="1" stop-color="hsl(${hue + 40} 60% 12%)"/></linearGradient></defs><rect width="342" height="513" fill="url(#g)"/><circle cx="250" cy="150" r="90" fill="hsl(${hue + 20} 90% 70% / .35)"/><text x="24" y="470" fill="#fff" font-family="Georgia, serif" font-size="30" font-style="italic">${label.replace(/[<&>]/g, "")}</text></svg>`;
}

export function startMock(port = 4010): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const img = /^\/img\/w\d+\/([pbh])(\d+)\.svg$/.exec(url.pathname);
    if (img) {
      const id = Number(img[2]);
      const it = items.find((i) => i.id === id);
      res.writeHead(200, {
        "Content-Type": "image/svg+xml",
        "Access-Control-Allow-Origin": "*",
      });
      return res.end(
        svg(it?.name ?? personName.get(id) ?? "", (id * 47) % 360),
      );
    }
    const key = url.searchParams.get("api_key") ?? req.headers.authorization;
    if (!key) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status_message: "Invalid API key" }));
    }
    const body = handle(url.pathname.replace(/^\/3/, ""), url.searchParams);
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body ?? { status_message: "Not found" }));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1]?.endsWith("mock-tmdb.ts")) {
  const port = Number(process.env.PORT ?? 4010);
  startMock(port).then(() =>
    console.log(`Mock TMDB on http://localhost:${port}/3 (images at /img)`),
  );
}

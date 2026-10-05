import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { startMock } from "./mock-tmdb";

const PORT = 4311;
let server: Server;
let service: typeof import("../lib/service");

before(async () => {
  server = await startMock(PORT);
  process.env.TMDB_API_KEY = "test-key";
  process.env.TMDB_API_BASE = `http://localhost:${PORT}/3`;
  process.env.TMDB_IMAGE_BASE = `http://localhost:${PORT}/img`;
  service = await import("../lib/service");
});

after(() => server.close());

test("moods become live discover results with posters and TMDB ratings", async () => {
  const r = await service.search("something scary");
  assert.equal(r.source, "live");
  assert.ok(r.picks.length >= 5);
  assert.ok(
    r.picks.slice(0, 5).every((p) => p.title.genres.includes("Horror")),
  );
  assert.ok(
    r.picks.every((p) =>
      p.title.poster?.startsWith(`http://localhost:${PORT}/img/w342/`),
    ),
  );
  assert.ok(r.picks.every((p) => p.title.ratingSource === "TMDB"));
});

test("titles outside the built-in catalog are found live", async () => {
  const r = await service.search("something like naruto");
  assert.equal(r.source, "live");
  assert.match(r.summary, /like Naruto/);
  assert.ok(r.picks.length > 0);
  assert.ok(!r.picks.some((p) => p.title.title === "Naruto"));
  assert.match(r.picks[0].reason, /Naruto/);
});

test("people bring their whole filmography, including titles the catalog lacks", async () => {
  const r = await service.search("Shah Rukh Khan");
  assert.match(r.summary, /with Shah Rukh Khan/);
  const titles = r.picks.map((p) => p.title.title);
  assert.ok(titles.includes("Kabhi Haan Kabhi Naa"));
  assert.ok(r.picks.slice(0, 5).every((p) => /Shah Rukh Khan/.test(p.reason)));
});

test("typos are corrected before going live", async () => {
  const r = await service.search("sharukh khan");
  assert.match(r.summary, /Shah Rukh Khan/);
  assert.equal(r.corrected, "Shah Rukh Khan");
});

test("filters apply to live results, and unreleased titles are skipped", async () => {
  const r = await service.search("korean drama", {
    minRating: 8,
    era: "2010s",
    kind: "series",
  });
  assert.ok(r.picks.length > 0);
  for (const p of r.picks) {
    assert.equal(p.title.kind, "series");
    assert.equal(p.title.country, "KR");
    assert.ok(
      p.title.rating >= 8 && p.title.year >= 2010 && p.title.year <= 2019,
    );
  }
  const all = await service.search("great series", { kind: "series" });
  assert.ok(!all.picks.some((p) => p.title.title === "Upcoming Show"));
});

test("probe returns hints and a count without the list", async () => {
  const r = await service.search("funny 90s movies 8+", {}, true);
  assert.equal(r.picks.length, 0);
  assert.ok(r.total > 0);
  assert.equal(r.hints.era, "1990s");
  assert.equal(r.hints.minRating, 8);
  assert.equal(r.hints.kind, "movie");
});

test("details include cast, director, trailer, IMDb id and recommendations", async () => {
  const r = await service.search("like naruto");
  const d = await service.details(r.picks[0].title.id);
  assert.ok(d);
  assert.ok(d.trailer?.startsWith("https://www.youtube.com/watch?v="));
  assert.match(d.imdbId ?? "", /^tt\d+$/);
  assert.ok(d.similar.length > 0);
  assert.ok(d.runtime);
});

test("live suggestions return titles and people with images", async () => {
  const s = await service.suggestLive("naru");
  assert.equal(s[0].label, "Naruto");
  assert.ok(s[0].image);
  const p = await service.suggestLive("zendaya");
  assert.ok(p.some((x) => x.type === "person" && x.label === "Zendaya"));
});

test("home rows come from live trending and discover", async () => {
  const h = await service.home();
  assert.equal(h.live, true);
  assert.equal(h.top10.length, 10);
  assert.ok(h.rows.length >= 4);
  assert.ok(h.wall.every((row) => row.length > 0));
});

test("falls back to the built-in catalog when TMDB is down", async () => {
  process.env.TMDB_API_BASE = "http://localhost:1/3";
  try {
    const r = await service.search("feel good comedy zzunique");
    assert.equal(r.source, "catalog");
    const h = await service.home();
    assert.equal(h.live, false);
  } finally {
    process.env.TMDB_API_BASE = `http://localhost:${PORT}/3`;
  }
});

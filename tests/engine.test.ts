import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dramas } from "../lib/data/catalog";
import { validateCatalog } from "../lib/data/validate";
import { excluded, recommend } from "../lib/recommendation/engine";
import {
  parseQuery,
  preferencesURL,
  readPreferences,
  avoidOptions,
} from "../lib/search/parse";
import { searchCatalog } from "../lib/search/engine";
import { collectionFor, collectionPaths } from "../lib/seo/collections";
import type { Preferences } from "../lib/types";
const base: Preferences = { wanted: [], avoid: [] };
test("catalog has complete, unique, valid records and local posters", () => {
  validateCatalog(dramas);
  assert.ok(dramas.length >= 8);
  for (const d of dramas)
    assert.ok(existsSync(`public${d.poster}`), `Missing poster: ${d.slug}`);
});
test("recommendations are deterministic, bounded, unique and exclude the seed", () => {
  const p = { ...base, seed: "hidden-love" };
  const a = recommend(dramas, p);
  assert.deepEqual(a, recommend([...dramas].reverse(), p));
  assert.ok(a.length >= 5 && a.length <= 10);
  assert.ok(
    a.every(
      (m) => m.drama.slug !== "hidden-love" && m.score >= 0 && m.score <= 100,
    ),
  );
  assert.equal(new Set(a.map((m) => m.drama.id)).size, a.length);
});
test("gentle youth romances outrank revenge thrillers for Hidden Love", () => {
  const all = recommend(
    dramas,
    {
      seed: "hidden-love",
      wanted: ["Romance", "Youth", "Green flag"],
      mood: "Comfort me",
      avoid: [],
    },
    10,
  );
  assert.ok(
    all.slice(0, 3).some((m) => m.drama.slug === "when-i-fly-towards-you"),
  );
  assert.ok(!all.slice(0, 3).some((m) => m.drama.slug === "the-glory"));
});
test("every hard exclusion holds, including in combination", () => {
  for (const avoid of [...avoidOptions.map((v) => [v]), avoidOptions]) {
    const results = recommend(dramas, { ...base, avoid }, 10);
    assert.ok(results.every((m) => !excluded(m.drama, avoid)));
  }
});
test("sad ending exclusion requires confirmed happy endings", () => {
  const d = dramas[0];
  for (const ending of ["sad", "open", "unknown", "bittersweet"] as const)
    assert.equal(
      excluded({ ...d, dna: { ...d.dna, ending } }, ["Sad ending"]),
      true,
    );
});
test("country filters never leak titles from another country", () => {
  for (const country of ["KR", "CN"] as const)
    assert.ok(
      recommend(dramas, { ...base, country }, 10).every(
        (m) => m.drama.country === country,
      ),
    );
});
test("no eligible titles produces empty state instead of relaxing exclusions", () => {
  assert.deepEqual(
    recommend([dramas.find((d) => d.slug === "the-glory")!], {
      ...base,
      avoid: ["Toxic leads"],
    }),
    [],
  );
});
test("free text extracts seed-compatible preferences and negative constraints", () => {
  const p = parseQuery(
    "something like Business Proposal without a love triangle",
  );
  assert.ok(p.avoid?.includes("Love triangle"));
  const results = recommend(dramas, { ...base, ...p } as Preferences);
  assert.ok(
    results.every(
      (m) =>
        m.drama.slug !== "business-proposal" &&
        m.drama.dna.loveTriangle === "none",
    ),
  );
  assert.equal(parseQuery("romantic K-drama with happy ending").country, "KR");
  assert.ok(parseQuery("no fantasy").avoid?.includes("Fantasy"));
  assert.ok(!parseQuery("no fantasy").wanted?.includes("Fantasy"));
});
test("parameter validation rejects unknown preference values", () => {
  const p = readPreferences(
    new URLSearchParams(
      "country=XX&wanted=Romance,evil&avoid=Fantasy,other&mood=wrong",
    ),
  );
  assert.deepEqual(p.wanted, ["Romance"]);
  assert.deepEqual(p.avoid, ["Fantasy"]);
  assert.equal(p.country, undefined);
  assert.equal(p.mood, undefined);
});
test("refinement round-trips selections, including explicit cleared filters", () => {
  const p: Preferences = {
    query: "happy ending",
    wanted: [],
    avoid: [],
    mood: "Comfort me",
    country: "CN",
    seed: "hidden-love",
  };
  assert.deepEqual(readPreferences(new URLSearchParams(preferencesURL(p))), p);
});
test("search covers titles, movies, people, genres, tropes and original titles", () => {
  for (const [q, group] of [
    ["Hidden Love", "Dramas"],
    ["Zhao Lusi", "Actresses"],
    ["Chen Zheyuan", "Actors"],
    ["romance", "Genres"],
    ["xianxia", "Tropes"],
    ["20th Century Girl", "Movies"],
    ["偷偷藏不住", "Dramas"],
  ])
    assert.ok(searchCatalog(dramas, q).some((r) => r.group === group));
  assert.deepEqual(searchCatalog(dramas, "nonesuch"), []);
});
test("performer searches favor their actual credits", () => {
  assert.equal(
    recommend(dramas, { ...base, query: "Zhao Lusi" })[0].drama.slug,
    "hidden-love",
  );
});
test("scores reconcile with the public weighted explanation", () => {
  for (const m of recommend(dramas, {
    ...base,
    seed: "hidden-love",
    wanted: ["Romance"],
    mood: "Comfort me",
  })) {
    assert.equal(
      m.breakdown.reduce((sum, b) => sum + b.weight, 0),
      100,
    );
    assert.equal(
      m.score,
      Math.round(m.breakdown.reduce((sum, b) => sum + b.score * b.weight, 0)),
    );
    assert.ok(m.matched <= m.total);
    assert.ok(m.reasons.length > 0);
  }
});
test("all generated collection paths resolve and unknown categories 404", () => {
  for (const p of collectionPaths(dramas))
    assert.ok(collectionFor(p.category, p.slug, dramas));
  assert.equal(collectionFor("unrecognized", "romance", dramas), null);
});
test("weak alternatives are not added just to reach a quota", () => {
  const result = recommend(
    dramas,
    {
      seed: "hidden-love",
      wanted: ["Romance", "Green flag", "Youth"],
      mood: "Comfort me",
      avoid: ["Sad ending", "Love triangle"],
    },
    9,
  );
  assert.ok(result.every((m) => m.score >= 50));
  assert.ok(!result.some((m) => m.drama.slug === "reset"));
});

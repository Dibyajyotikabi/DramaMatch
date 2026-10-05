import assert from "node:assert/strict";
import { test } from "node:test";
import { catalog } from "../lib/catalog";
import { defaultFilters, interpret, recommend, suggest } from "../lib/engine";

const run = (q: string) => {
  const intent = interpret(q);
  return { intent, picks: recommend(intent, defaultFilters(intent)) };
};

test("catalog rows are well-formed and unique", () => {
  const ids = new Set<string>();
  for (const t of catalog) {
    assert.ok(!ids.has(t.id), `duplicate ${t.id}`);
    ids.add(t.id);
    assert.ok(t.rating > 0 && t.rating <= 10, t.title);
    assert.ok(t.year > 1900 && t.year < 2030, t.title);
    assert.ok(t.genres.length && t.tags.length && t.blurb, t.title);
  }
  assert.ok(catalog.length >= 400);
});

test("moods map to fitting titles", () => {
  const { intent, picks } = run("I'm feeling sad");
  assert.equal(intent.summary, "something comforting");
  assert.ok(
    picks
      .slice(0, 10)
      .every((p) => p.title.tags.some((t) => ["feelgood", "cozy"].includes(t))),
  );

  const scary = run("something scary").picks.slice(0, 8);
  assert.ok(
    scary.every(
      (p) =>
        p.title.tags.includes("scary") || p.title.genres.includes("Horror"),
    ),
  );
});

test("star names rank their own titles first", () => {
  const { intent, picks } = run("Shah Rukh Khan");
  assert.deepEqual(intent.people, ["Shah Rukh Khan"]);
  assert.ok(
    picks.slice(0, 5).every((p) => p.title.cast.includes("Shah Rukh Khan")),
  );
  assert.deepEqual(interpret("srk").people, ["Shah Rukh Khan"]);
  assert.deepEqual(interpret("nolan").people, ["Christopher Nolan"]);
});

test("titles become seeds and are excluded from results", () => {
  const { intent, picks } = run("movies like Inception");
  assert.equal(intent.seeds[0].title, "Inception");
  assert.equal(intent.kind, "movie");
  assert.ok(!picks.some((p) => p.title.title === "Inception"));
  assert.ok(
    picks.slice(0, 5).some((p) => p.title.director === "Christopher Nolan"),
  );
});

test("typos still find the title", () => {
  assert.equal(interpret("intersteller").seeds[0]?.title, "Interstellar");
  assert.equal(
    interpret("shawshank").seeds[0]?.title,
    "The Shawshank Redemption",
  );
});

test("country, era, rating and kind hints become filters", () => {
  const { intent, picks } = run("best korean thriller series from the 2010s");
  assert.deepEqual(intent.countries, ["KR"]);
  assert.equal(intent.kind, "series");
  assert.equal(intent.era, "2010s");
  assert.equal(intent.minRating, 8);
  for (const p of picks) {
    assert.equal(p.title.country, "KR");
    assert.equal(p.title.kind, "series");
    assert.ok(p.title.year >= 2010 && p.title.year <= 2019);
    assert.ok(p.title.rating >= 8);
  }
});

test("negations exclude genres", () => {
  const { intent, picks } = run("something cozy, no romance");
  assert.deepEqual(intent.excludeGenres, ["Romance"]);
  assert.ok(picks.length > 0);
  assert.ok(!picks.some((p) => p.title.genres.includes("Romance")));
});

test("common-word titles only match when typed alone", () => {
  assert.equal(interpret("her").seeds[0]?.title, "Her");
  assert.equal(interpret("I want to watch with friends").seeds.length, 0);
});

test("filters are honoured", () => {
  const intent = interpret("funny");
  const picks = recommend(intent, {
    minRating: 8,
    era: "1990s",
    kind: "movie",
  });
  assert.ok(picks.length > 0);
  for (const p of picks) {
    assert.ok(
      p.title.rating >= 8 && p.title.year >= 1990 && p.title.year <= 1999,
    );
    assert.equal(p.title.kind, "movie");
  }
});

test("gibberish yields no results instead of random filler", () => {
  assert.equal(run("zxqvw").picks.length, 0);
});

test("autocomplete returns titles and people", () => {
  const labels = suggest("shah").map((s) => s.label);
  assert.ok(labels.includes("Shah Rukh Khan"));
  assert.equal(suggest("incep")[0].label, "Inception");
});

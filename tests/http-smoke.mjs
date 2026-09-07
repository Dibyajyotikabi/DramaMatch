import test from "node:test";
import assert from "node:assert/strict";
const origin = process.env.TEST_BASE_URL || "http://localhost:3100";
const get = (path) =>
  fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });

test("editorial routes render HTML, unique headings, canonicals and OG metadata", async () => {
  for (const path of [
    "/",
    "/collections",
    "/drama/hidden-love",
    "/dramas-like/hidden-love",
    "/actor/chen-zheyuan",
    "/actress/zhao-lusi",
    "/kdrama/happy-ending",
    "/kdrama/no-love-triangle",
    "/kdrama/green-flag-male-lead",
    "/cdrama/happy-ending",
    "/cdrama/no-love-triangle",
    "/genre/romance",
    "/trope/slow-burn",
    "/mood/comfort-me",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
    assert.match(html, /rel="canonical"/, path);
    assert.match(html, /property="og:title"/, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});
test("personalized and sparse routes are noindex, useful collections are indexable", async () => {
  for (const path of [
    "/discover",
    "/results",
    "/saved",
    "/actress/zhao-lusi",
  ]) {
    const html = await (await get(path)).text();
    assert.match(html, /name="robots" content="noindex, follow"/, path);
  }
  const html = await (await get("/genre/romance")).text();
  assert.doesNotMatch(html, /name="robots" content="noindex/);
});
test("search API groups exact results, caches, and bounds input", async () => {
  const response = await get("/api/search?q=Zhao%20Lusi");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /s-maxage=300/);
  const { results } = await response.json();
  assert.equal(results[0].label, "Zhao Lusi");
  assert.equal(results[0].group, "Actresses");
  assert.equal((await get("/api/search?q=" + "a".repeat(201))).status, 400);
});
test("recommend API returns relevant scores and respects all requested constraints", async () => {
  const response = await get(
    "/api/recommend?seed=hidden-love&wanted=Romance,Green%20flag,Youth&mood=Comfort%20me&avoid=Sad%20ending,Love%20triangle",
  );
  assert.equal(response.status, 200);
  const { matches } = await response.json();
  assert.equal(matches[0].drama.slug, "when-i-fly-towards-you");
  assert.ok(
    matches.every(
      (m) =>
        m.score >= 50 &&
        m.drama.dna.ending === "happy" &&
        m.drama.dna.loveTriangle === "none",
    ),
  );
  assert.ok(matches.every((m) => m.reasons.length > 0));
});
test("sitemap excludes query states and sparse performers; invalid titles return 404", async () => {
  const sitemap = await (await get("/sitemap.xml")).text();
  assert.match(sitemap, /dramas-like\/hidden-love/);
  assert.doesNotMatch(sitemap, /\/results|\/discover|actress\/zhao-lusi/);
  assert.equal((await get("/drama/this-title-does-not-exist")).status, 404);
});
test("Open Graph image and responsive poster optimization respond successfully", async () => {
  for (const path of [
    "/opengraph-image",
    "/_next/image?url=%2Fposters%2Fhidden-love.jpg&w=384&q=75",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /^image\//);
    assert.ok((await response.arrayBuffer()).byteLength > 1000);
  }
});

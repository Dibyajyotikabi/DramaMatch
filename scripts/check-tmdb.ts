/**
 * Checks that your TMDB key works: `npm run check:tmdb`
 * Reads TMDB_API_KEY / TMDB_READ_TOKEN from the environment or .env.local.
 */
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const { liveEnabled, tmdb } = await import("../lib/tmdb");
  if (!liveEnabled()) {
    console.log(
      "No TMDB key found. Add TMDB_API_KEY=... to .env.local (see README), then run this again.",
    );
    process.exit(1);
  }
  try {
    const d = await tmdb<{ results: { title?: string; name?: string }[] }>(
      "/trending/all/day",
    );
    console.log("✓ TMDB is working. Trending today:");
    for (const r of d.results.slice(0, 5))
      console.log("  •", r.title ?? r.name);
  } catch (e) {
    const msg = (e as Error).message;
    console.log("✗ TMDB request failed:", msg);
    console.log(
      / 401$/.test(msg)
        ? "  TMDB rejected the key. A v3 key goes in TMDB_API_KEY; a long read token goes in TMDB_READ_TOKEN."
        : "  This usually means a network, firewall or proxy is blocking api.themoviedb.org, not a bad key.",
    );
    process.exit(1);
  }
  if (process.env.OMDB_API_KEY) {
    const res = await fetch(
      `https://www.omdbapi.com/?i=tt1375666&apikey=${process.env.OMDB_API_KEY}`,
    );
    const j = (await res.json()) as { imdbRating?: string; Error?: string };
    console.log(
      j.imdbRating
        ? `✓ OMDb is working (Inception: ${j.imdbRating} on IMDb).`
        : `✗ OMDb: ${j.Error}`,
    );
  }
}

main();

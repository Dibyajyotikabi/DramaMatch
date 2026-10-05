import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isLocalRequest, saveEnv, tmdbVar } from "../lib/setup";

test("TMDB keys and read tokens go to the right variable", () => {
  assert.equal(tmdbVar("3f9c1d2e4b5a6978"), "TMDB_API_KEY");
  assert.equal(tmdbVar("eyJhbGciOiJIUzI1NiJ9.payload.sig"), "TMDB_READ_TOKEN");
});

test("saveEnv replaces keys, keeps other lines, and disables the other TMDB credential", () => {
  const dir = mkdtempSync(join(tmpdir(), "dm-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    writeFileSync(
      ".env.local",
      "NEXT_PUBLIC_SITE_URL=https://x.test\nTMDB_READ_TOKEN=eyJold\n",
    );
    saveEnv({ TMDB_API_KEY: "abc123" });
    const text = readFileSync(".env.local", "utf8");
    assert.match(text, /^NEXT_PUBLIC_SITE_URL=https:\/\/x\.test$/m);
    assert.match(text, /^TMDB_API_KEY=abc123$/m);
    assert.match(text, /^# TMDB_READ_TOKEN=eyJold$/m);
    assert.equal(process.env.TMDB_API_KEY, "abc123");
    saveEnv({ TMDB_API_KEY: "def456" });
    assert.equal(
      readFileSync(".env.local", "utf8").match(/TMDB_API_KEY=/g)?.length,
      1,
    );
  } finally {
    process.chdir(cwd);
    delete process.env.TMDB_API_KEY;
  }
});

test("only same-machine requests may change keys", () => {
  const req = (host: string, origin?: string) =>
    new Request(`http://${host}/api/setup`, {
      headers: { host, ...(origin ? { origin } : {}) },
    });
  assert.equal(isLocalRequest(req("localhost:3000")), true);
  assert.equal(
    isLocalRequest(req("127.0.0.1:3000", "http://localhost:3000")),
    true,
  );
  assert.equal(isLocalRequest(req("dramamatch.app")), false);
  assert.equal(
    isLocalRequest(req("localhost:3000", "https://evil.example")),
    false,
  );
});

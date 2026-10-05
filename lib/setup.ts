/**
 * In-app API key setup, for running DramaMatch on your own machine.
 * Keys are tested, written to .env.local and applied immediately. Setup is
 * only available in development (or when ALLOW_SETUP=1) and only from localhost.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { liveEnabled } from "./tmdb";

export const setupAllowed = () =>
  process.env.NODE_ENV !== "production" || process.env.ALLOW_SETUP === "1";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Same-origin request from the machine running the app. */
export function isLocalRequest(req: Request) {
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (!LOCAL_HOSTS.has(host)) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (!LOCAL_HOSTS.has(new URL(origin).hostname)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export interface SetupStatus {
  allowed: boolean;
  live: boolean;
  omdb: boolean;
}

export const status = (): SetupStatus => ({
  allowed: setupAllowed(),
  live: liveEnabled(),
  omdb: Boolean(process.env.OMDB_API_KEY),
});

const API = () => process.env.TMDB_API_BASE || "https://api.themoviedb.org/3";

/** Which variable a pasted TMDB credential belongs in. Read tokens are long JWTs. */
export const tmdbVar = (key: string) =>
  key.startsWith("eyJ") ? "TMDB_READ_TOKEN" : "TMDB_API_KEY";

export async function testTMDB(key: string): Promise<string | null> {
  const token = tmdbVar(key) === "TMDB_READ_TOKEN";
  try {
    const res = await fetch(
      `${API()}/trending/all/day${token ? "" : `?api_key=${encodeURIComponent(key)}`}`,
      {
        headers: token
          ? { Authorization: `Bearer ${key}`, Accept: "application/json" }
          : { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    if (res.status === 401)
      return "TMDB rejected this key. Copy the “API Key” (or the long “API Read Access Token”) from themoviedb.org → Settings → API.";
    if (!res.ok)
      return `TMDB answered with an error (${res.status}). Try again in a minute.`;
    return null;
  } catch {
    return "Couldn't reach TMDB from this computer. Check your internet connection and try again.";
  }
}

export async function testOMDb(key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=tt1375666&apikey=${encodeURIComponent(key)}`,
      {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    const j = (await res.json()) as { Response?: string; Error?: string };
    return j.Response === "True"
      ? null
      : `OMDb: ${j.Error ?? "the key didn't work"}. Did you click the activation link in their email?`;
  } catch {
    return "Couldn't reach OMDb. Check your internet connection and try again.";
  }
}

/** Set (or replace) variables in .env.local, keeping everything else. */
export function saveEnv(vars: Record<string, string>) {
  const file = join(process.cwd(), ".env.local");
  const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  for (const [name, value] of Object.entries(vars)) {
    const line = `${name}=${value}`;
    const i = lines.findIndex((l) =>
      new RegExp(`^\\s*#?\\s*${name}\\s*=`).test(l),
    );
    if (i >= 0) lines[i] = line;
    else lines.push(line);
    process.env[name] = value;
  }
  // Only one kind of TMDB credential should be active.
  const other = vars.TMDB_API_KEY
    ? "TMDB_READ_TOKEN"
    : vars.TMDB_READ_TOKEN
      ? "TMDB_API_KEY"
      : null;
  if (other) {
    delete process.env[other];
    const i = lines.findIndex((l) => new RegExp(`^\\s*${other}\\s*=`).test(l));
    if (i >= 0) lines[i] = `# ${lines[i]}`;
  }
  writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"));
}

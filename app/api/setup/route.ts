import { revalidatePath } from "next/cache";
import {
  isLocalRequest,
  saveEnv,
  setupAllowed,
  status,
  testOMDb,
  testTMDB,
  tmdbVar,
} from "@/lib/setup";

export const dynamic = "force-dynamic";

/** GET /api/setup → whether live data is on and whether this machine may change keys. */
export async function GET(request: Request) {
  return Response.json({
    ...status(),
    allowed: setupAllowed() && isLocalRequest(request),
  });
}

/** POST /api/setup { tmdb?, omdb? } → test the keys, save them to .env.local, go live. */
export async function POST(request: Request) {
  if (!setupAllowed() || !isLocalRequest(request))
    return Response.json(
      {
        error:
          "Keys can only be added on the computer running the app. On a hosted site, add them in your host's environment variables.",
      },
      { status: 403 },
    );
  if (!(request.headers.get("content-type") ?? "").includes("application/json"))
    return Response.json({ error: "Expected JSON." }, { status: 415 });

  let body: { tmdb?: string; omdb?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }
  const tmdb = (body.tmdb ?? "").trim();
  const omdb = (body.omdb ?? "").trim();
  if (!tmdb && !omdb)
    return Response.json(
      { error: "Paste a TMDB key to turn on live data." },
      { status: 400 },
    );
  if (
    /\s/.test(tmdb) ||
    /\s/.test(omdb) ||
    tmdb.length > 600 ||
    omdb.length > 100
  )
    return Response.json(
      { error: "That doesn't look like a key. Paste it without spaces." },
      { status: 400 },
    );

  const errors: Record<string, string> = {};
  if (tmdb) {
    const e = await testTMDB(tmdb);
    if (e) errors.tmdb = e;
  }
  if (omdb) {
    const e = await testOMDb(omdb);
    if (e) errors.omdb = e;
  }
  if (Object.keys(errors).length)
    return Response.json({ errors }, { status: 422 });

  try {
    saveEnv({
      ...(tmdb ? { [tmdbVar(tmdb)]: tmdb } : {}),
      ...(omdb ? { OMDB_API_KEY: omdb } : {}),
    });
  } catch {
    return Response.json(
      {
        error:
          "The keys work, but this server can't write .env.local. Add them to your host's environment variables instead.",
      },
      { status: 500 },
    );
  }
  revalidatePath("/");
  return Response.json({ ok: true, ...status() });
}

import { posterFor, titleById } from "@/lib/posters";

const MAX = 40;

/** GET /api/posters?ids=a,b,c → { posters: { [id]: url | null } } */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MAX);
  const titles = ids.map(titleById).filter((t) => t !== undefined);
  if (!titles.length) return Response.json({ posters: {} }, { status: 400 });

  // Look up a few at a time so a cold cache doesn't fire 40 requests at once.
  const posters: Record<string, string | null> = {};
  const queue = [...titles];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let t = queue.shift(); t; t = queue.shift())
        posters[t.id] = await posterFor(t);
    }),
  );

  const complete = Object.values(posters).every(Boolean);
  return Response.json(
    { posters },
    {
      headers: {
        "Cache-Control": complete
          ? "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800"
          : "public, max-age=600, s-maxage=3600",
      },
    },
  );
}

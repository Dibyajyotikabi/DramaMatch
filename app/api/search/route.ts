import { ERAS } from "@/lib/engine";
import { search } from "@/lib/service";
import type { Filters, Kind } from "@/lib/types";

/** GET /api/search?q=&r=&y=&t=&probe=1 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const q = (p.get("q") ?? "").trim();
  if (!q)
    return Response.json(
      { error: "Tell me a mood, a star or a movie." },
      { status: 400 },
    );
  if (q.length > 200)
    return Response.json(
      { error: "Please keep it under 200 characters." },
      { status: 400 },
    );

  const filters: Partial<Filters> = {};
  if (p.has("r"))
    filters.minRating = Math.max(0, Math.min(10, Number(p.get("r")) || 0));
  if (p.has("y") && ERAS.some((e) => e.id === p.get("y")))
    filters.era = p.get("y")!;
  const t = p.get("t");
  if (t === "movie" || t === "series" || t === "any")
    filters.kind = t as Kind | "any";

  try {
    const result = await search(q, filters, p.get("probe") === "1");
    return Response.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Search is unavailable right now. Please try again." },
      { status: 503 },
    );
  }
}

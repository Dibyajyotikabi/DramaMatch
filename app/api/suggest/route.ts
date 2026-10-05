import { suggestLive } from "@/lib/service";

/** GET /api/suggest?q= → live title and people suggestions (empty without TMDB). */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 80);
  const suggestions = await suggestLive(q);
  return Response.json(
    { suggestions },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

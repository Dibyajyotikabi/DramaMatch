import { getCatalog } from "@/lib/providers";
import { recommend } from "@/lib/recommendation/engine";
import { readPreferences } from "@/lib/search/parse";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.toString().length > 2000)
    return Response.json({ error: "Too many preferences." }, { status: 400 });
  try {
    return Response.json(
      { matches: recommend(await getCatalog(), readPreferences(p)) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Matching is temporarily unavailable." },
      { status: 503 },
    );
  }
}

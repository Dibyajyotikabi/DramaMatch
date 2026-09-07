import { provider } from "@/lib/providers";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.length > 200)
    return Response.json(
      { error: "Please keep your search under 200 characters." },
      { status: 400 },
    );
  try {
    return Response.json(
      { results: await provider.search(q) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}

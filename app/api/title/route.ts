import { details } from "@/lib/service";

/** GET /api/title?id= → full details, cast, trailer and similar titles. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id || id.length > 120)
    return Response.json({ error: "Missing title id." }, { status: 400 });
  const t = await details(id);
  if (!t)
    return Response.json(
      { error: "We couldn't find that title." },
      { status: 404 },
    );
  return Response.json(t, {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

import "server-only";
/** Optional import boundary only. TMDB does not supply DramaDNA; imported records need editorial enrichment before publication. */
export async function fetchTMDBMetadata(id: number, type: "tv" | "movie") {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Error("Invalid metadata ID");
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token) throw new Error("TMDB provider is not configured");
  const response = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?language=en-US`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok)
    throw new Error(`Metadata provider returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

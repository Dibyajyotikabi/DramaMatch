import { Quiz } from "@/components/quiz";
import { getCatalog } from "@/lib/providers";
import { readPreferences } from "@/lib/search/parse";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Find your next drama",
  "Three short questions to find your kind of story.",
  "/discover",
  true,
);
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw))
    if (typeof v === "string") params.set(k, v);
  const initial = readPreferences(params);
  const catalog = await getCatalog();
  const seed = catalog.find(
    (d) =>
      d.slug === initial.seed ||
      d.title.toLowerCase() === (initial.query ?? "").toLowerCase(),
  );
  return (
    <div className="quiz-page page-width">
      <Quiz
        key={params.toString()}
        initial={initial}
        seedTitle={seed?.title}
        suggestions={
          seed
            ? [...seed.genres, ...seed.dna.tropes, ...seed.dna.leadType]
            : initial.wanted
        }
      />
    </div>
  );
}

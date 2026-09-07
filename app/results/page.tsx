import { getCatalog } from "@/lib/providers";
import { recommend } from "@/lib/recommendation/engine";
import { readPreferences } from "@/lib/search/parse";
import { Results } from "@/components/results";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Your drama matches",
  "Your personalized, explainable drama recommendations.",
  "/results",
  true,
);
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw))
    if (typeof v === "string") params.set(k, v);
  const p = readPreferences(params);
  return (
    <div className="page-width results-page">
      <Results
        key={params.toString()}
        preferences={p}
        matches={recommend(await getCatalog(), p, 9)}
      />
    </div>
  );
}

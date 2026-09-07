import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/providers";
import { collectionFor, collectionPaths } from "@/lib/seo/collections";
import { metadata } from "@/lib/seo";
import { DramaCard } from "@/components/drama-card";
import { Icon } from "@/components/icons";
// The seed catalog is a closed set; unknown URLs must return an HTTP 404 before streaming.
export const dynamicParams = false;

export async function generateStaticParams() {
  return collectionPaths(await getCatalog());
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const c = collectionFor(category, slug, await getCatalog());
  return c
    ? metadata(c.title, c.intro, `/${category}/${slug}`, c.items.length < 3)
    : { title: "Collection not found" };
}
export default async function Collection({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const c = collectionFor(category, slug, await getCatalog());
  if (!c) notFound();
  const query =
    category === "actor" || category === "actress"
      ? c.items[0].actors.find((a) => a.slug === slug)?.name
      : slug.replaceAll("-", " ");
  return (
    <div className="page-width collection-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/collections">Collections</Link>
        <Icon name="chevron" size={12} />
        <span>{c.title}</span>
      </nav>
      <header className="collection-header">
        <span className="eyebrow">A THOUGHTFULLY CURATED LITTLE CORNER</span>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
        <span className="pill">
          {c.items.length} {c.items.length === 1 ? "story" : "stories"} in this
          collection
        </span>
      </header>
      <div className="collection-note">
        <Icon name="flower" size={22} />
        <p>{c.note}</p>
      </div>
      <div className="drama-grid">
        {c.items.map((d) => (
          <DramaCard
            key={d.id}
            drama={d}
            reason={`${d.dna.romance}/10 romance · ${d.dna.angst}/10 angst · ${d.dna.pace} pacing. ${d.dna.spoilerSafeNotes}`}
          />
        ))}
      </div>
      <section className="collection-guide">
        <span className="eyebrow">MAKE THE COLLECTION YOUR OWN</span>
        <h2>The right story depends on the day.</h2>
        <p>
          Want comfort? Look for lower angst and supportive leads. In the mood
          for a bigger emotional journey? Try stronger tension or a fantasy
          setting. Episode count helps when you’re choosing between a weekend
          watch and a longer commitment.
        </p>
        <p>
          Open any story to explore its Drama DNA and spoiler-safe notes. Then
          use three quick questions to tell us which details matter to you. Your
          exclusions are applied before we rank the remaining stories.
        </p>
        <Link
          className="button primary"
          href={`/discover?q=${encodeURIComponent(query ?? "")}${category === "kdrama" ? "&country=KR" : category === "cdrama" ? "&country=CN" : ""}`}
        >
          Find my personal match
          <Icon name="arrow" size={17} />
        </Link>
      </section>
      <Link className="text-link" href="/collections">
        Explore more collections
        <Icon name="arrow" size={17} />
      </Link>
    </div>
  );
}

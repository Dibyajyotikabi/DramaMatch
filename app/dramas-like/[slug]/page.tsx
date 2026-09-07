import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getDrama } from "@/lib/providers";
import { metadata, safeJson, siteURL } from "@/lib/seo";
import { recommend } from "@/lib/recommendation/engine";
import { DramaCard } from "@/components/drama-card";
import { Icon } from "@/components/icons";
import { slugify } from "@/lib/data/catalog";
// The seed catalog is a closed set; unknown URLs must return an HTTP 404 before streaming.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCatalog()).map((d) => ({ slug: d.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await getDrama(slug);
  return d
    ? metadata(
        `Dramas like ${d.title}`,
        `What to watch after ${d.title}: thoughtful recommendations, specific similarities, and a Drama DNA comparison.`,
        `/dramas-like/${slug}`,
      )
    : { title: "Not found" };
}
export default async function SimilarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await getDrama(slug);
  if (!d) notFound();
  const matches = recommend(
    await getCatalog(),
    { seed: slug, wanted: [], avoid: [] },
    8,
  );
  return (
    <div className="page-width collection-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href={`/drama/${slug}`}>{d.title}</Link>
        <Icon name="chevron" size={12} />
        <span>What to watch next</span>
      </nav>
      <header className="collection-header">
        <span className="eyebrow">THE CREDITS ROLLED. THE FEELING DIDN’T.</span>
        <h1>
          Dramas like <em>{d.title}.</em>
        </h1>
        <p>
          If {d.title} stayed with you, start here. Its{" "}
          {d.dna.tropes
            .slice(0, 2)
            .map((t) => t.toLowerCase())
            .join(" and ")}{" "}
          threads, {d.dna.pace} pace, and{" "}
          {d.dna.angst <= 3
            ? "gentle emotional tone"
            : "emotionally charged storytelling"}{" "}
          guide these picks. Each story has its own personality; the
          similarities below explain the connection.
        </p>
        <Link
          className="button primary"
          href={`/discover?seed=${slug}&q=${encodeURIComponent(d.title)}`}
        >
          Refine these recommendations <Icon name="sliders" size={17} />
        </Link>
      </header>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Dramas like ${d.title}`,
            itemListElement: matches.map((m, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: m.drama.title,
              url: `${siteURL}/drama/${m.drama.slug}`,
            })),
          }),
        }}
      />
      <div className="drama-grid">
        {matches.map((m, i) => (
          <DramaCard
            key={m.drama.slug}
            drama={m.drama}
            score={m.score}
            reason={m.reasons[0]}
            rank={i + 1}
          />
        ))}
      </div>
      <section className="comparison">
        <span className="eyebrow">SIMILAR DOESN’T MEAN THE SAME</span>
        <h2>Compare their Drama DNA.</h2>
        <p className="muted">
          Scores run from 0–10. Higher angst means a more emotionally intense
          ride. Ending details are deliberately left out.
        </p>
        <div
          className="table-scroll"
          role="region"
          aria-label="Drama DNA comparison"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Drama DNA comparison with {d.title}
            </caption>
            <thead>
              <tr>
                <th>Story</th>
                <th>Romance</th>
                <th>Chemistry</th>
                <th>Angst</th>
                <th>Pacing</th>
                <th>Love triangle</th>
              </tr>
            </thead>
            <tbody>
              {[d, ...matches.slice(0, 4).map((m) => m.drama)].map((v, i) => (
                <tr key={v.id} className={i === 0 ? "seed-row" : ""}>
                  <th>
                    <Link href={`/drama/${v.slug}`}>{v.title}</Link>
                    {i === 0 && <small>Your starting story</small>}
                  </th>
                  <td>{v.dna.romance}/10</td>
                  <td>{v.dna.chemistry}/10</td>
                  <td>{v.dna.angst}/10</td>
                  <td>{v.dna.pace}</td>
                  <td>{v.dna.loveTriangle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="related-collections">
        <h2>Follow the thread.</h2>
        <div className="tag-row">
          {d.dna.tropes.map((t) => (
            <Link className="pill" href={`/trope/${slugify(t)}`} key={t}>
              {t}
              <Icon name="arrow" size={14} />
            </Link>
          ))}
          <Link
            className="pill"
            href={`/${d.country === "KR" ? "kdrama" : "cdrama"}/no-love-triangle`}
          >
            No love triangle
            <Icon name="arrow" size={14} />
          </Link>
          <Link className="pill" href="/collections">
            All collections
            <Icon name="arrow" size={14} />
          </Link>
        </div>
      </section>
      <p className="catalog-disclosure">
        Scores compare story DNA using fixed weights. They are not audience
        ratings or guarantees of enjoyment.
      </p>
    </div>
  );
}

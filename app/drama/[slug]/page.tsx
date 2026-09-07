import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getDrama } from "@/lib/providers";
import { metadata, safeJson, siteURL } from "@/lib/seo";
import { slugify } from "@/lib/data/catalog";
import { recommend } from "@/lib/recommendation/engine";
import { SafeToWatch } from "@/components/dna";
import { SaveButton } from "@/components/save-button";
import { DramaCard } from "@/components/drama-card";
import { Icon } from "@/components/icons";
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
        `${d.title}: Drama DNA & what to watch next`,
        d.synopsis,
        `/drama/${slug}`,
      )
    : { title: "Drama not found" };
}
export default async function DramaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = await getDrama(slug);
  if (!d) notFound();
  const similar = recommend(
    await getCatalog(),
    { seed: slug, wanted: [], avoid: [] },
    4,
  );
  return (
    <div className="page-width detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson({
            "@context": "https://schema.org",
            "@type": d.type === "tv" ? "TVSeries" : "Movie",
            name: d.title,
            alternateName: d.originalTitle,
            description: d.synopsis,
            image: `${siteURL}${d.poster}`,
            url: `${siteURL}/drama/${d.slug}`,
            countryOfOrigin: d.country === "KR" ? "South Korea" : "China",
            genre: d.genres,
            actor: d.actors.map((a) => ({
              "@type": "Person",
              name: a.name,
              url: `${siteURL}/${a.kind}/${a.slug}`,
            })),
          }),
        }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Discover</Link>
        <Icon name="chevron" size={12} />
        <span>{d.title}</span>
      </nav>
      <section className="detail-hero">
        <div className="detail-poster">
          <Image
            src={d.poster}
            alt={`${d.title} poster`}
            fill
            sizes="(max-width: 650px) 65vw, 320px"
            priority
          />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {d.country === "KR"
              ? "A STORY FROM SOUTH KOREA"
              : "A STORY FROM CHINA"}{" "}
            · {d.year}
          </span>
          <h1>{d.title}</h1>
          <p className="original-title">{d.originalTitle}</p>
          <div className="tag-row">
            {d.genres.map((g) => (
              <Link className="pill" key={g} href={`/genre/${slugify(g)}`}>
                {g}
              </Link>
            ))}
            <span className="pill">
              {d.type === "movie"
                ? "Feature film"
                : `${d.episodeCount} episodes`}
            </span>
          </div>
          <p className="synopsis">{d.synopsis}</p>
          <div className="cast-list">
            <span className="eyebrow">STARRING</span>
            {d.actors.map((a) => (
              <Link key={a.slug} href={`/${a.kind}/${a.slug}`}>
                {a.name}
                <Icon name="arrow" size={13} />
              </Link>
            ))}
          </div>
          <div className="detail-actions">
            <Link className="button primary" href={`/dramas-like/${d.slug}`}>
              Find dramas like this <Icon name="sparkles" size={18} />
            </Link>
            <SaveButton slug={d.slug} />
          </div>
        </div>
      </section>
      <SafeToWatch drama={d} />
      <section className="story-tags">
        <div>
          <span className="eyebrow">THE FAMILIAR LITTLE THINGS</span>
          <h2>Tropes & themes</h2>
          <div className="tag-row">
            {d.dna.tropes.map((t) => (
              <Link className="pill" key={t} href={`/trope/${slugify(t)}`}>
                {t}
                <Icon name="arrow" size={13} />
              </Link>
            ))}
            {d.dna.themes.map((t) => (
              <span className="pill" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="eyebrow">WATCH IT WHEN YOU WANT TO…</span>
          <h2>Find your feeling</h2>
          <div className="tag-row">
            {d.dna.moods.map((t) => (
              <Link className="pill" key={t} href={`/mood/${slugify(t)}`}>
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="similar-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">IF THIS IS YOUR KIND OF STORY</span>
            <h2>Stay with the feeling.</h2>
          </div>
          <Link className="text-link" href={`/dramas-like/${d.slug}`}>
            All similar dramas
            <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="drama-grid">
          {similar.map((m) => (
            <DramaCard
              drama={m.drama}
              score={m.score}
              reason={m.reasons[0]}
              key={m.drama.slug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

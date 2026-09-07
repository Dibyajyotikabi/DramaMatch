import Link from "next/link";
import { curatedCollections } from "@/lib/seo/collections";
import { getCatalog } from "@/lib/providers";
import { DramaCard } from "@/components/drama-card";
import { Icon } from "@/components/icons";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Drama collections for a very specific mood",
  "Curated K-drama and C-drama collections: happy endings, green-flag leads, no love triangles, and more.",
  "/collections",
);
export default async function Collections() {
  const catalog = await getCatalog();
  return (
    <div className="page-width collection-page">
      <header className="collection-header">
        <span className="eyebrow">LESS BROWSING. MORE BELONGING.</span>
        <h1>
          A very specific
          <br />
          <em>kind of good.</em>
        </h1>
        <p>
          Little collections for the things you love in a story. Follow a
          feeling, find a familiar trope, or give your heart a well-deserved
          break.
        </p>
      </header>
      <div className="collection-grid">
        {curatedCollections.map((c, i) => (
          <Link
            className={`collection-tile ${["sage", "pink", "sand", "lavender"][i % 4]}`}
            href={`/${c.category}/${c.slug}`}
            key={c.category + c.slug}
          >
            <span>
              {c.category === "kdrama" ? "FROM SOUTH KOREA" : "FROM CHINA"}
            </span>
            <h3>{c.title}</h3>
            <p>{c.intro}</p>
            <Icon name="arrow" />
          </Link>
        ))}
        <Link className="collection-tile sand" href="/trope/slow-burn">
          <span>TAKE YOUR TIME</span>
          <h3>Slow burn, big feelings</h3>
          <p>Small gestures and a connection that takes its time.</p>
          <Icon name="arrow" />
        </Link>
      </div>
      <section className="all-stories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">OUR STARTER LIBRARY</span>
            <h2>Every story, a different feeling.</h2>
          </div>
          <span className="section-aside">
            {catalog.length} thoughtfully selected titles
          </span>
        </div>
        <div className="drama-grid">
          {catalog.map((d) => (
            <DramaCard key={d.id} drama={d} />
          ))}
        </div>
      </section>
    </div>
  );
}

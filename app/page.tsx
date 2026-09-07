import Link from "next/link";
import { Search } from "@/components/search";
import { Icon } from "@/components/icons";
import { DramaCard } from "@/components/drama-card";
import { getCatalog } from "@/lib/providers";
import { popular } from "@/lib/data/catalog";
export default async function Home() {
  const catalog = await getCatalog();
  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow">
          <span /> GOOD STORIES. YOUR KIND OF FEELING.
        </div>
        <h1>
          Find a drama you’ll
          <br />
          actually <em>love.</em>
          <span className="hero-spark">✳</span>
        </h1>
        <p className="hero-subtitle">
          K-dramas + C-dramas matched to your mood.
          <br className="mobile-break" /> Less scrolling, more butterflies.
        </p>
        <Search />
        <div className="quick-filters">
          <Link href="/discover?country=KR">
            <span className="flag-dot korea" />
            K-Drama
          </Link>
          <Link href="/discover?country=CN">
            <span className="flag-dot china" />
            C-Drama
          </Link>
          <span className="quick-divider" />
          <Link className="surprise" href="/discover?q=Surprise+me">
            Surprise me <Icon name="sparkles" size={16} />
          </Link>
        </div>
        <div className="popular-searches">
          <span>A little inspiration:</span>
          {[
            "Hidden Love",
            "Zhao Lusi",
            "Green flag leads",
            "No love triangle",
          ].map((t) => (
            <Link key={t} href={`/discover?q=${encodeURIComponent(t)}`}>
              {t}
            </Link>
          ))}
        </div>
        <div className="hero-note">
          <span>
            <Icon name="check" size={13} />3 quick questions
          </span>
          <span>
            <Icon name="check" size={13} />
            Matches that make sense
          </span>
          <span>
            <Icon name="check" size={13} />
            No sign-up, ever
          </span>
        </div>
      </section>
      <section className="mood-section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">START WITH A FEELING</span>
            <h2>What’s your mood today?</h2>
          </div>
          <span className="section-aside">There’s a story for that.</span>
        </div>
        <div className="mood-grid">
          {[
            {
              icon: "☁",
              label: "Comfort me",
              note: "A warm hug in drama form",
              color: "sage",
            },
            {
              icon: "♡",
              label: "Give me butterflies",
              note: "For the hopeless romantic",
              color: "pink",
            },
            {
              icon: "☂",
              label: "Make me cry",
              note: "Sometimes you need a good cry",
              color: "lavender",
            },
            {
              icon: "✧",
              label: "Keep me hooked",
              note: "One more episode. Promise.",
              color: "sand",
            },
          ].map((m) => (
            <Link
              className={`mood-tile ${m.color}`}
              key={m.label}
              href={`/discover?mood=${encodeURIComponent(m.label)}`}
            >
              <span className="mood-tile-icon">{m.icon}</span>
              <span>
                <strong>{m.label}</strong>
                <small>{m.note}</small>
              </span>
              <Icon name="arrow" size={17} />
            </Link>
          ))}
        </div>
      </section>
      <section className="popular-section page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE STORIES WE KEEP COMING BACK TO</span>
            <h2>Easy to start. Hard to forget.</h2>
          </div>
          <Link className="text-link" href="/collections">
            Explore all stories <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="drama-grid">
          {popular.map((slug) => (
            <DramaCard
              key={slug}
              drama={catalog.find((d) => d.slug === slug)!}
            />
          ))}
        </div>
        <p className="catalog-disclosure">
          A thoughtfully curated starter collection · Ratings & Drama DNA are
          editorial sample scores.
        </p>
      </section>
      <section className="dna-banner page-width">
        <div className="dna-banner-art">
          <span>♡</span>
          <div>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <small>YOUR STORY, DECODED</small>
        </div>
        <div>
          <span className="eyebrow">MORE THAN A GENRE</span>
          <h2>
            Same romance.
            <br />A completely different feeling.
          </h2>
          <p>
            Slow-burn or sparks from the start? A little angst or a soft place
            to land? Drama DNA looks at the details that make a story feel like
            you.
          </p>
          <Link className="text-link" href="/drama/hidden-love">
            Meet Drama DNA <Icon name="arrow" size={17} />
          </Link>
        </div>
        <span className="banner-flower">
          <Icon name="flower" size={90} />
        </span>
      </section>
      <section className="collections-preview page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A SHORTCUT TO YOUR NEXT OBSESSION</span>
            <h2>A very specific kind of good.</h2>
          </div>
          <Link className="text-link" href="/collections">
            All collections <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="collection-grid">
          <Link
            className="collection-tile sage"
            href="/kdrama/green-flag-male-lead"
          >
            <span>01 / THE STANDARD-RAISERS</span>
            <h3>Green flags only.</h3>
            <p>Kind hearts. Clear communication. Yes, please.</p>
            <Icon name="arrow" />
          </Link>
          <Link
            className="collection-tile pink"
            href="/cdrama/no-love-triangle"
          >
            <span>02 / JUST THE TWO OF US</span>
            <h3>Love, without the triangle.</h3>
            <p>All the butterflies. A little less complication.</p>
            <Icon name="arrow" />
          </Link>
          <Link className="collection-tile sand" href="/trope/slow-burn">
            <span>03 / WORTH THE WAIT</span>
            <h3>The art of the slow burn.</h3>
            <p>For every almost-touch and lingering look.</p>
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}

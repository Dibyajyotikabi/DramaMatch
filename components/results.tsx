"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Match, Preferences } from "@/lib/types";
import { preferencesURL } from "@/lib/search/parse";
import { DramaCard } from "./drama-card";
import { DNAMeters } from "./dna";
import { SaveButton } from "./save-button";
import { Icon } from "./icons";
export function Results({
  matches,
  preferences,
}: {
  matches: Match[];
  preferences: Preferences;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const visible = matches.filter((m) => !hidden.includes(m.drama.slug));
  const top = visible[0];
  const refine = `/discover?${preferencesURL(preferences)}`;
  function dismiss(slug: string) {
    setHidden([...hidden, slug]);
    setMessage("Removed from these results. Your next match is ready.");
  }
  return (
    <>
      <div className="results-heading">
        <span className="eyebrow">
          A LITTLE MORE YOU. A LOT LESS SCROLLING.
        </span>
        <h1>
          Your next <em>“just one more.”</em>
        </h1>
        <p>
          {visible.length
            ? `${visible.length} stories that fit your kind of feeling.`
            : "Let’s give your next story a little more room."}{" "}
          Selected by Drama DNA, explained in plain language.
        </p>
        {visible.length > 0 && visible.length < 5 && (
          <p className="limited-results">
            A small catalog, a careful shortlist. We kept only stories scoring
            at least 50% that respect your dealbreakers.
          </p>
        )}
        <div className="result-preferences">
          {[
            ...preferences.wanted,
            preferences.mood,
            ...preferences.avoid.map((v) => `No ${v.toLowerCase()}`),
          ]
            .filter(Boolean)
            .map((t) => (
              <span className="pill" key={t}>
                {t}
              </span>
            ))}
          <Link className="text-link" href={refine}>
            <Icon name="sliders" size={15} />
            Refine
          </Link>
        </div>
      </div>
      {message && (
        <div className="status-note" role="status">
          {message}
          <button
            className="text-button"
            onClick={() => {
              setHidden([]);
              setMessage("All matches restored.");
            }}
          >
            Undo
          </button>
        </div>
      )}
      {!top ? (
        <div className="empty-state">
          <Icon name="flower" size={42} />
          <h2>No close fits this time.</h2>
          <p>
            {hidden.length
              ? "You’ve passed on these matches. Restore them or try a different mood."
              : "Your dealbreakers are respected. With 16 titles in our starter catalog, a less restrictive combination may find more stories."}
          </p>
          <Link className="button primary" href={refine}>
            Refine my preferences <Icon name="arrow" size={17} />
          </Link>
        </div>
      ) : (
        <>
          <article className="feature-match">
            <div className="feature-poster">
              <Image
                src={top.drama.poster}
                alt={`${top.drama.title} poster`}
                fill
                sizes="(max-width: 700px) 85vw, 350px"
                priority
              />
              <span className="feature-badge">
                <Icon name="sparkles" size={15} />
                YOUR CLOSEST MATCH
              </span>
            </div>
            <div className="feature-content">
              <div className="feature-topline">
                <span className="eyebrow">
                  {top.drama.country === "KR" ? "SOUTH KOREA" : "CHINA"}{" "}
                  <span className="dot">·</span> {top.drama.year}{" "}
                  <span className="dot">·</span>{" "}
                  {top.drama.type === "movie"
                    ? "FILM"
                    : `${top.drama.episodeCount} EPISODES`}
                </span>
                <span className="match-number">
                  {top.score}
                  <small>
                    %<span>Match</span>
                  </small>
                </span>
              </div>
              <h2>
                <Link href={`/drama/${top.drama.slug}`}>{top.drama.title}</Link>
              </h2>
              <p className="feature-reason">{top.drama.dna.spoilerSafeNotes}</p>
              <div className="tag-row">
                {top.tags.map((t) => (
                  <span className="pill" key={t}>
                    <Icon name="check" size={12} />
                    {t}
                  </span>
                ))}
              </div>
              <DNAMeters drama={top.drama} compact />
              <details className="why-match">
                <summary>
                  <Icon name="sparkles" size={16} />
                  Why it matches<span>+</span>
                </summary>
                <div>
                  {top.total > 0 && (
                    <p>
                      This story meets{" "}
                      <strong>
                        {top.matched} of your {top.total}
                      </strong>{" "}
                      expressed preferences.
                    </p>
                  )}
                  <ul>
                    {top.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <div className="score-breakdown">
                    {top.breakdown.map((b) => (
                      <div key={b.label}>
                        <span>
                          {b.label} <small>({b.weight}% weight)</small>
                        </span>
                        <strong>{Math.round(b.score * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                  <p className="fine-print">
                    A deterministic preference score, not a probability that
                    you’ll enjoy a title. DNA is an editorial assessment. Ending
                    values remain hidden.
                  </p>
                </div>
              </details>
              <div className="feature-actions">
                <Link
                  className="button primary"
                  href={`/drama/${top.drama.slug}`}
                >
                  Explore this story
                  <Icon name="arrow" size={17} />
                </Link>
                <SaveButton slug={top.drama.slug} />
              </div>
              <div className="secondary-actions">
                <Link
                  href={`/discover?seed=${top.drama.slug}&q=${encodeURIComponent(top.drama.title)}`}
                >
                  More like this
                </Link>
                <button onClick={() => dismiss(top.drama.slug)}>
                  Not for me
                </button>
              </div>
            </div>
          </article>
          {visible.length > 1 && (
            <section className="alternatives">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">YOUR WATCHLIST HAS OPTIONS</span>
                  <h2>These could be your thing, too.</h2>
                </div>
                <span className="section-aside">
                  A different story. A familiar feeling.
                </span>
              </div>
              <div className="drama-grid">
                {visible.slice(1).map((m) => (
                  <div key={m.drama.slug}>
                    <DramaCard
                      drama={m.drama}
                      score={m.score}
                      reason={m.reasons[0]}
                    />
                    <button
                      className="not-for-me"
                      onClick={() => dismiss(m.drama.slug)}
                    >
                      Not for me
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <p className="catalog-disclosure">
        Your preferences, respected · A thoughtfully curated starter collection
      </p>
    </>
  );
}

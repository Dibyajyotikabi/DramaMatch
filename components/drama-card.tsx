import Image from "next/image";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { SaveButton } from "./save-button";
import { Icon } from "./icons";
export function DramaCard({
  drama,
  score,
  reason,
  rank,
}: {
  drama: Drama;
  score?: number;
  reason?: string;
  rank?: number;
}) {
  return (
    <article className="drama-card">
      <div className="poster-wrap" style={{ background: drama.color }}>
        <Link
          href={`/drama/${drama.slug}`}
          aria-label={`Explore ${drama.title}`}
        >
          <Image
            src={drama.poster}
            alt={`${drama.title} poster`}
            fill
            sizes="(max-width: 600px) 44vw, (max-width: 950px) 30vw, 260px"
          />
        </Link>
        <span className="poster-country">
          {drama.country === "KR" ? "K-DRAMA" : "C-DRAMA"}
          {drama.type === "movie" ? " · FILM" : ""}
        </span>
        <SaveButton slug={drama.slug} small />
        {score !== undefined && (
          <span className="poster-match">
            <Icon name="sparkles" size={13} />
            {score}% match
          </span>
        )}
      </div>
      <div className="card-meta">
        <span>
          {drama.year} <span className="dot">·</span>{" "}
          {drama.type === "movie" ? "Film" : `${drama.episodeCount} episodes`}
        </span>
        <span>
          <Icon name="star" size={12} />
          {drama.rating.toFixed(1)}
        </span>
      </div>
      <h3>
        <Link href={`/drama/${drama.slug}`}>
          {rank && <span className="rank">0{rank}.</span>}
          {drama.title}
        </Link>
      </h3>
      <p>{reason ?? drama.dna.spoilerSafeNotes}</p>
      <div className="card-tags">
        {drama.dna.tropes.slice(0, 2).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}

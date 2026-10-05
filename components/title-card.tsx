"use client";

import { IconCheck, IconPlus, IconStar } from "./icons";
import { Poster } from "./poster";
import { kindLabel } from "@/lib/format";
import type { Title } from "@/lib/types";

interface Props {
  title: Title;
  reason?: string;
  rank?: number;
  saved: boolean;
  onOpen: (t: Title) => void;
  onToggle: (id: string) => void;
}

export function TitleCard({
  title,
  reason,
  rank,
  saved,
  onOpen,
  onToggle,
}: Props) {
  return (
    <article className={`tcard ${rank ? "ranked" : ""}`}>
      {rank && (
        <span className="rank" aria-hidden>
          {rank}
        </span>
      )}
      <button
        type="button"
        className="tcard-hit"
        onClick={() => onOpen(title)}
        aria-label={`${title.title}, ${title.year}. Open details`}
      >
        <Poster title={title} />
        <span className="tcard-rating">
          <IconStar /> {title.rating.toFixed(1)}
        </span>
        <span className="tcard-hover" aria-hidden>
          <span className="tcard-blurb">{title.blurb}</span>
        </span>
      </button>
      <button
        type="button"
        className={`save-fab ${saved ? "on" : ""}`}
        aria-pressed={saved}
        aria-label={
          saved
            ? `Remove ${title.title} from My List`
            : `Add ${title.title} to My List`
        }
        onClick={() => onToggle(title.id)}
      >
        {saved ? <IconCheck size={16} /> : <IconPlus size={16} />}
      </button>
      <div className="tcard-caption">
        {reason && <p className="tcard-reason">{reason}</p>}
        <h3>{title.title}</h3>
        <p className="tcard-meta">
          {title.year} · {kindLabel(title)} ·{" "}
          {title.genres.slice(0, 2).join(", ")}
        </p>
      </div>
    </article>
  );
}

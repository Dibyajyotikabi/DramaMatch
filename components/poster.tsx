"use client";

import { useState } from "react";
import { usePoster } from "@/lib/client/posters";
import { hueFor } from "@/lib/format";
import type { Title } from "@/lib/types";

/**
 * Poster art. Shows a designed typographic poster immediately, then fades the
 * real artwork in on top once it has loaded.
 */
export function Poster({
  title,
  className = "",
}: {
  title: Title;
  className?: string;
}) {
  const url = usePoster(title.id);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const length = title.title.length;
  return (
    <div
      className={`poster ${loaded ? "has-art" : ""} ${className}`}
      style={{ "--h": hueFor(title) } as React.CSSProperties}
    >
      <div className="poster-fallback" aria-hidden={loaded}>
        <span
          className={`pf-title ${length > 30 ? "xl" : length > 16 ? "lg" : ""}`}
        >
          {title.title}
        </span>
        <span className="pf-meta">
          {title.year} · {title.genres[0]}
        </span>
        {(title.cast[0] ?? title.director) && (
          <span className="pf-credit">{title.cast[0] ?? title.director}</span>
        )}
      </div>
      {url && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${title.title} poster`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={loaded ? "in" : ""}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

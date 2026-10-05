"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconClose,
  IconExternal,
  IconPlay,
  IconPlus,
  IconShare,
  IconStar,
} from "./icons";
import { Poster } from "./poster";
import { TitleCard } from "./title-card";
import { titleById } from "@/lib/catalog";
import { similarTo, TAG_LABELS } from "@/lib/engine";
import {
  countryName,
  flag,
  hueFor,
  imdbURL,
  kindLabel,
  trailerURL,
} from "@/lib/format";
import { usePoster } from "@/lib/client/posters";
import type { Title, TitleDetails } from "@/lib/types";

const cache = new Map<string, TitleDetails>();

/** Full details: computed locally for catalog titles, fetched for live ones. */
function useDetails(t: Title): TitleDetails | null {
  const local = titleById(t.id);
  const [live, setLive] = useState<TitleDetails | null>(
    () => cache.get(t.id) ?? null,
  );
  useEffect(() => {
    if (local) return;
    const hit = cache.get(t.id);
    if (hit) {
      setLive(hit);
      return;
    }
    setLive(null);
    let alive = true;
    fetch(`/api/title?id=${encodeURIComponent(t.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TitleDetails | null) => {
        if (d) cache.set(t.id, d);
        if (alive) setLive(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [t.id, local]);
  if (local)
    return { ...local, ratingSource: "IMDb", similar: similarTo(local, 12) };
  return live;
}

const formatVotes = (k: number) =>
  k >= 1000
    ? `${(k / 1000).toFixed(1)}M`
    : k >= 1
      ? `${Math.round(k)}K`
      : `${Math.round(k * 1000)}`;

interface Props {
  title: Title;
  reason?: string;
  saved: (id: string) => boolean;
  onToggle: (t: Title) => void;
  onOpen: (t: Title) => void;
  onPerson: (name: string) => void;
  onShare: (t: Title) => void;
  onClose: () => void;
}

export function TitleModal({
  title: base,
  reason,
  saved,
  onToggle,
  onOpen,
  onPerson,
  onShare,
  onClose,
}: Props) {
  const d = useDetails(base);
  const t: Title = d ?? base;
  const looked = usePoster(t.id, !t.poster);
  const art = t.backdrop ?? t.poster ?? looked;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("no-scroll");
      prev?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [t.id]);

  const isSaved = saved(t.id);
  const source = t.ratingSource ?? "IMDb";
  const people = [...(t.director ? t.director.split(", ") : []), ...t.cast];

  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={panel}
        style={{ "--h": hueFor(t) } as React.CSSProperties}
      >
        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <IconClose />
        </button>
        <div className="modal-hero">
          <div className="modal-backdrop" aria-hidden>
            {art && <img src={art} alt="" referrerPolicy="no-referrer" />}
          </div>
          <div className="modal-hero-inner">
            <Poster title={t} className="modal-poster" />
            <div className="modal-info">
              <p className="eyebrow">
                {kindLabel(t)} · {t.year}
                {d?.runtime ? ` · ${d.runtime}` : ""} · {flag(t.country)}{" "}
                {countryName(t.country)}
              </p>
              <h2 id="modal-title">{t.title}</h2>
              <div className="modal-stats">
                {d?.imdbRating !== undefined && source !== "IMDb" && (
                  <span className="imdb">
                    <IconStar size={14} /> {d.imdbRating.toFixed(1)}{" "}
                    <small>IMDb</small>
                  </span>
                )}
                {t.rating > 0 && (
                  <span className={source === "IMDb" ? "imdb" : "score"}>
                    <IconStar size={14} /> {t.rating.toFixed(1)}{" "}
                    <small>{source}</small>
                  </span>
                )}
                {t.votes > 0 && <span>{formatVotes(t.votes)} ratings</span>}
              </div>
              {reason && <p className="modal-reason">{reason}</p>}
              <p className="modal-blurb">{t.blurb}</p>
              <div className="modal-actions">
                <a
                  className="btn btn-primary"
                  href={d?.trailer ?? trailerURL(t)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconPlay /> Watch trailer
                </a>
                <button
                  type="button"
                  className={`btn btn-glass ${isSaved ? "on" : ""}`}
                  aria-pressed={isSaved}
                  onClick={() => onToggle(t)}
                >
                  {isSaved ? <IconCheck size={18} /> : <IconPlus size={18} />}{" "}
                  {isSaved ? "In My List" : "My List"}
                </button>
                <a
                  className="btn btn-glass"
                  href={
                    d?.imdbId
                      ? `https://www.imdb.com/title/${d.imdbId}/`
                      : imdbURL(t)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IMDb <IconExternal />
                </a>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label="Share"
                  onClick={() => onShare(t)}
                >
                  <IconShare size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <dl className="modal-facts">
            <div>
              <dt>{t.kind === "movie" ? "Director" : "Created by"}</dt>
              <dd>{t.director || (d ? "—" : "…")}</dd>
            </div>
            <div>
              <dt>Genres</dt>
              <dd>{t.genres.join(", ")}</dd>
            </div>
            {source === "IMDb" && (
              <div>
                <dt>Feels</dt>
                <dd>{t.tags.map((x) => TAG_LABELS[x] ?? x).join(", ")}</dd>
              </div>
            )}
          </dl>
          {people.length > 0 ? (
            <div className="people">
              <h3>Cast &amp; crew</h3>
              <div className="people-list">
                {people.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="person-chip"
                    onClick={() => onPerson(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            !d && <div className="skeleton line" aria-hidden />
          )}
          <h3 className="more-title">More like this</h3>
          {d ? (
            d.similar.length ? (
              <div className="grid compact">
                {d.similar.map((s) => (
                  <TitleCard
                    key={s.id}
                    title={s}
                    saved={saved(s.id)}
                    onOpen={onOpen}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">No recommendations for this one yet.</p>
            )
          ) : (
            <div className="grid compact" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

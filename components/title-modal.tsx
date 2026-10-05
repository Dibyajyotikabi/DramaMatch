"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { similarTo, TAG_LABELS } from "@/lib/engine";
import {
  COUNTRY_SHORT,
  FLAGS,
  hueFor,
  imdbURL,
  kindLabel,
  trailerURL,
} from "@/lib/format";
import { usePoster } from "@/lib/client/posters";
import type { Title } from "@/lib/types";

interface Props {
  title: Title;
  reason?: string;
  saved: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (t: Title) => void;
  onPerson: (name: string) => void;
  onShare: (t: Title) => void;
  onClose: () => void;
}

export function TitleModal({
  title: t,
  reason,
  saved,
  onToggle,
  onOpen,
  onPerson,
  onShare,
  onClose,
}: Props) {
  const art = usePoster(t.id);
  const similar = useMemo(() => similarTo(t, 12), [t]);
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
  const people = [...(t.director ? [t.director] : []), ...t.cast];

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
                {kindLabel(t)} · {t.year} · {FLAGS[t.country]}{" "}
                {COUNTRY_SHORT[t.country] ?? t.country}
              </p>
              <h2 id="modal-title">{t.title}</h2>
              <div className="modal-stats">
                <span className="imdb">
                  <IconStar size={14} /> {t.rating.toFixed(1)}{" "}
                  <small>IMDb</small>
                </span>
                <span>
                  {t.votes >= 1000
                    ? `${(t.votes / 1000).toFixed(1)}M`
                    : `${t.votes}K`}{" "}
                  ratings
                </span>
              </div>
              {reason && <p className="modal-reason">{reason}</p>}
              <p className="modal-blurb">{t.blurb}</p>
              <div className="modal-actions">
                <a
                  className="btn btn-primary"
                  href={trailerURL(t)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconPlay /> Watch trailer
                </a>
                <button
                  type="button"
                  className={`btn btn-glass ${isSaved ? "on" : ""}`}
                  aria-pressed={isSaved}
                  onClick={() => onToggle(t.id)}
                >
                  {isSaved ? <IconCheck size={18} /> : <IconPlus size={18} />}{" "}
                  {isSaved ? "In My List" : "My List"}
                </button>
                <a
                  className="btn btn-glass"
                  href={imdbURL(t)}
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
              <dd>{t.director || "—"}</dd>
            </div>
            <div>
              <dt>Genres</dt>
              <dd>{t.genres.join(", ")}</dd>
            </div>
            <div>
              <dt>Feels</dt>
              <dd>{t.tags.map((x) => TAG_LABELS[x] ?? x).join(", ")}</dd>
            </div>
          </dl>
          {people.length > 0 && (
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
          )}
          <h3 className="more-title">More like this</h3>
          <div className="grid compact">
            {similar.map((s) => (
              <TitleCard
                key={s.id}
                title={s}
                saved={saved(s.id)}
                onOpen={onOpen}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";
import { IconChevron } from "./icons";
import { TitleCard } from "./title-card";
import type { Title } from "@/lib/types";

interface Props {
  title: string;
  items: Title[];
  ranked?: boolean;
  onSeeAll?: () => void;
  saved: (id: string) => boolean;
  onOpen: (t: Title) => void;
  onToggle: (id: string) => void;
}

export function Row({
  title,
  items,
  ranked,
  onSeeAll,
  saved,
  onOpen,
  onToggle,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = track.current;
    if (el)
      el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  if (!items.length) return null;
  return (
    <section className={`row ${ranked ? "row-ranked" : ""}`} aria-label={title}>
      <header className="row-head">
        <h2>{title}</h2>
        {onSeeAll && (
          <button type="button" className="see-all" onClick={onSeeAll}>
            See all <IconChevron size={14} />
          </button>
        )}
      </header>
      <div className="row-viewport">
        <button
          type="button"
          className="row-arrow left"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
        >
          <IconChevron dir="left" />
        </button>
        <div className="row-track" ref={track}>
          {items.map((t, i) => (
            <TitleCard
              key={t.id}
              title={t}
              rank={ranked ? i + 1 : undefined}
              saved={saved(t.id)}
              onOpen={onOpen}
              onToggle={onToggle}
            />
          ))}
        </div>
        <button
          type="button"
          className="row-arrow right"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
        >
          <IconChevron />
        </button>
      </div>
    </section>
  );
}

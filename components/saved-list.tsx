"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { DramaCard } from "./drama-card";
import { Icon } from "./icons";
export function SavedList({ catalog }: { catalog: Drama[] }) {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    function sync() {
      try {
        const value = JSON.parse(
          localStorage.getItem("dramamatch-saved") ?? "[]",
        );
        setIds(
          Array.isArray(value)
            ? value.filter((v) => typeof v === "string")
            : [],
        );
      } catch {
        setIds([]);
      }
    }
    sync();
    window.addEventListener("dramamatch-saved", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dramamatch-saved", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (ids === null) return <p role="status">Opening your list…</p>;
  const saved = catalog.filter((d) => ids.includes(d.slug));
  return saved.length ? (
    <div className="drama-grid">
      {saved.map((d) => (
        <DramaCard key={d.id} drama={d} />
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <Icon name="bookmark" size={35} />
      <h2>Your next favorites belong here.</h2>
      <p>
        Tap the bookmark on a drama to keep it close. Your list is saved in this
        browser, with no account needed.
      </p>
      <Link className="button primary" href="/collections">
        Find a story to save <Icon name="arrow" size={17} />
      </Link>
    </div>
  );
}

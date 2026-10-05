"use client";

import { useCallback, useEffect, useState } from "react";
import { titleById } from "@/lib/catalog";
import type { Title } from "@/lib/types";

const KEY = "dm:list:v2";
const OLD_KEY = "dm:list:v1";

function read(): Title[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(v))
      return v.filter(
        (t) => t && typeof t.id === "string" && typeof t.title === "string",
      );
    // Earlier versions stored catalog ids only.
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || "[]");
    return Array.isArray(old)
      ? old
          .map((id: string) => titleById(id))
          .filter((t): t is Title => Boolean(t))
      : [];
  } catch {
    return [];
  }
}

function write(items: Title[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode or full storage: the list lasts for this visit */
  }
}

/** "My List": saved titles, kept on this device and synced across tabs. */
export function useList() {
  const [items, setItems] = useState<Title[]>([]);

  useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => e.key === KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((t: Title) => {
    setItems((prev) => {
      const next = prev.some((x) => x.id === t.id)
        ? prev.filter((x) => x.id !== t.id)
        : [
            { ...t, cast: t.cast.slice(0, 3), blurb: t.blurb.slice(0, 240) },
            ...prev,
          ].slice(0, 500);
      write(next);
      return next;
    });
  }, []);

  const has = useCallback(
    (id: string) => items.some((x) => x.id === id),
    [items],
  );
  return { items, has, toggle };
}

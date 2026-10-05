"use client";

import { useEffect, useState } from "react";

/**
 * Poster URLs, fetched in batches from /api/posters and remembered in
 * localStorage so repeat visits paint instantly.
 */

const KEY = "dm:posters:v1";
const TTL = 7 * 24 * 3600 * 1000;
const MISS_TTL = 3600 * 1000;
const BATCH = 40;

type Entry = { u: string | null; t: number };
let store: Record<string, Entry> | null = null;
const waiting = new Map<string, ((url: string | null) => void)[]>();
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (store) return store;
  try {
    store = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    store = {};
  }
  return store!;
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* storage full or blocked: posters just refetch next time */
    }
  }, 500);
}

function peek(id: string): string | null | undefined {
  const e = load()[id];
  if (!e) return undefined;
  const age = Date.now() - e.t;
  if (age > (e.u ? TTL : MISS_TTL)) return undefined;
  return e.u;
}

async function flush() {
  timer = null;
  const ids = [...queue];
  queue.clear();
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    let found: Record<string, string | null> = {};
    try {
      const res = await fetch(
        `/api/posters?ids=${chunk.map(encodeURIComponent).join(",")}`,
      );
      if (res.ok) found = (await res.json()).posters ?? {};
    } catch {
      /* offline: fall back to the designed poster */
    }
    for (const id of chunk) {
      const url = found[id] ?? null;
      load()[id] = { u: url, t: Date.now() };
      for (const done of waiting.get(id) ?? []) done(url);
      waiting.delete(id);
    }
    save();
  }
}

export function getPoster(id: string): Promise<string | null> {
  const known = peek(id);
  if (known !== undefined) return Promise.resolve(known);
  return new Promise((resolve) => {
    const list = waiting.get(id);
    if (list) list.push(resolve);
    else {
      waiting.set(id, [resolve]);
      queue.add(id);
      if (!timer) timer = setTimeout(flush, 30);
    }
  });
}

export function usePoster(id: string) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getPoster(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

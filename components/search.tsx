"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/lib/types";
import { Icon } from "./icons";
const cache = new Map<string, SearchResult[]>();
export function Search({ initial = "" }: { initial?: string }) {
  const [query, setQuery] = useState(initial),
    [results, setResults] = useState<SearchResult[]>([]),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [status, setStatus] = useState("");
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const grouped = [
    "Dramas",
    "Movies",
    "Actors",
    "Actresses",
    "Genres",
    "Tropes",
  ].flatMap((g) => results.filter((r) => r.group === g));
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    setActive(-1);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setStatus("");
      return;
    }
    if (cache.has(q)) {
      setResults(cache.get(q)!);
      setStatus("");
      return;
    }
    setResults([]);
    setStatus("Searching…");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        cache.set(q, data.results);
        if (cache.size > 50) cache.delete(cache.keys().next().value!);
        setResults(data.results);
        setStatus("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setStatus("Search is unavailable. You can still match by mood.");
        }
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  function select(result?: SearchResult) {
    const p = new URLSearchParams();
    p.set("q", result?.label ?? query.trim());
    if (result && (result.group === "Dramas" || result.group === "Movies"))
      p.set("seed", result.slug);
    router.push(`/discover?${p}`);
    setOpen(false);
  }
  return (
    <div className="search-wrap" ref={root}>
      <form
        className={`search-box ${open ? "focused" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) select(active >= 0 ? grouped[active] : undefined);
        }}
        role="search"
      >
        <Icon name="search" size={23} />
        <input
          aria-label="Search dramas, performers, genres or a mood"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!query.trim()}
          aria-controls="search-results"
          aria-activedescendant={
            active >= 0 ? `search-option-${active}` : undefined
          }
          placeholder="Search Hidden Love, Zhao Lusi, xianxia…"
          value={query}
          maxLength={200}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, grouped.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <span className="search-key" aria-hidden="true">
          ↵
        </span>
        <button
          className="search-submit"
          aria-label="Find my drama"
          type="submit"
          disabled={!query.trim()}
        >
          <Icon name="arrow" />
        </button>
      </form>
      {open && query.trim() && (
        <div className="search-results">
          <div
            id="search-results"
            role="listbox"
            aria-label="Search suggestions"
          >
            {grouped.map((r, i) => (
              <div key={`${r.group}-${r.id}`}>
                {(i === 0 || grouped[i - 1].group !== r.group) && (
                  <div className="result-group">{r.group}</div>
                )}
                <button
                  type="button"
                  id={`search-option-${i}`}
                  role="option"
                  aria-selected={active === i}
                  className={`search-result ${active === i ? "active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(r)}
                >
                  <span className="result-icon">
                    <Icon
                      name={
                        r.group === "Actors" || r.group === "Actresses"
                          ? "star"
                          : "flower"
                      }
                      size={19}
                    />
                  </span>
                  <span>
                    <strong>{r.label}</strong>
                    <small>{r.subtitle}</small>
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            ))}
          </div>
          <div role="status" className="search-status">
            {status ||
              (!results.length
                ? "No exact title? Describe your mood and we’ll match it."
                : "Choose a result, or match your whole request.")}
          </div>
          <button className="natural-result" onClick={() => select()}>
            <Icon name="sparkles" size={17} /> Match “{query}”{" "}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

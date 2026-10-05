"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconBookmark,
  IconShare,
  IconShuffle,
  IconSpark,
  IconWand,
  Logo,
  MoodIcon,
} from "./icons";
import { Poster } from "./poster";
import { Row } from "./row";
import { SetupBox } from "./setup-box";
import { SearchBox, type SearchBoxHandle } from "./search-box";
import { TitleCard } from "./title-card";
import { TitleModal } from "./title-modal";
import { catalog, titleById } from "@/lib/catalog";
import { useList } from "@/lib/client/use-list";
import {
  ERAS,
  MOOD_SUGGESTIONS,
  RATING_OPTIONS,
  similarTo,
} from "@/lib/engine";
import type { Home } from "@/lib/live";
import type { SearchResponse } from "@/lib/service";
import type { Filters, Kind, Pick, Title } from "@/lib/types";

type Step = "idle" | "thinking" | "rating" | "era" | "done";
type View = "home" | "list";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  note?: string;
  ask?: "rating" | "era";
  answered?: string;
  retry?: boolean;
  typing?: boolean;
}

interface Session {
  query: string;
  summary: string;
  source: SearchResponse["source"];
}

interface Results {
  key: string;
  picks: Pick[];
  loading: boolean;
  error?: string;
}

const PAGE = 18;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
let nextId = 1;
const msg = (m: Omit<Message, "id">): Message => ({ ...m, id: nextId++ });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function searchURL(q: string, f: Partial<Filters>, probe = false) {
  const p = new URLSearchParams({ q });
  if (f.minRating !== undefined) p.set("r", String(f.minRating));
  if (f.era) p.set("y", f.era);
  if (f.kind) p.set("t", f.kind);
  if (probe) p.set("probe", "1");
  return `/api/search?${p}`;
}

export function App({ home }: { home: Home }) {
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minRating: 0,
    era: "any",
    kind: "any",
  });
  const [step, setStep] = useState<Step>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [results, setResults] = useState<Results>({
    key: "",
    picks: [],
    loading: false,
  });
  const [visible, setVisible] = useState(PAGE);
  const [view, setView] = useState<View>("home");
  const [open, setOpen] = useState<{ title: Title; reason?: string } | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [setup, setSetup] = useState<{ allowed: boolean; open: boolean }>({
    allowed: false,
    open: false,
  });
  const [scrolled, setScrolled] = useState(false);
  const list = useList();
  const search = useRef<SearchBoxHandle>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  const engaged = messages.length > 0;
  const compact = engaged || view === "list";

  /* ───────── URL state (shareable searches and titles) ───────── */

  const writeURL = useCallback(
    (params: Record<string, string | undefined>, push = false) => {
      const u = new URL(window.location.href);
      u.search = "";
      for (const [k, v] of Object.entries(params))
        if (v) u.searchParams.set(k, v);
      const next = u.pathname + u.search;
      if (next === window.location.pathname + window.location.search) return;
      if (push) window.history.pushState(null, "", next);
      else window.history.replaceState(null, "", next);
    },
    [],
  );

  useEffect(() => {
    if (step !== "done" || !session) return;
    writeURL({
      q: session.query,
      r: filters.minRating ? String(filters.minRating) : undefined,
      y: filters.era !== "any" ? filters.era : undefined,
      t: filters.kind !== "any" ? filters.kind : undefined,
    });
  }, [step, session, filters, writeURL]);

  /* ───────── Results ───────── */

  useEffect(() => {
    if (step !== "done" || !session) return;
    const key = searchURL(session.query, filters);
    const ctrl = new AbortController();
    setResults((r) => ({
      key,
      picks: r.key === key ? r.picks : [],
      loading: true,
    }));
    fetch(key, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResults({
          key,
          picks: (data as SearchResponse).picks,
          loading: false,
        });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setResults({
          key,
          picks: [],
          loading: false,
          error: e.message || "Search failed",
        });
      });
    return () => ctrl.abort();
  }, [step, session, filters]);

  /* ───────── Conversation ───────── */

  const ask = (s: Step): Message | null => {
    if (s === "rating")
      return msg({
        role: "bot",
        text: "What's the lowest rating you'd enjoy?",
        ask: "rating",
      });
    if (s === "era")
      return msg({
        role: "bot",
        text: "And which era are you in the mood for?",
        ask: "era",
      });
    return null;
  };

  const start = useCallback(
    async (
      raw: string,
      preset?: Partial<Filters>,
      skipQuestions = false,
      push = true,
    ) => {
      const q = raw.trim();
      if (!q) {
        search.current?.focus();
        return;
      }
      const id = ++run.current;
      setView("home");
      setOpen(null);
      setQuery(q);
      setVisible(PAGE);
      setStep("thinking");
      const user = msg({ role: "user", text: q });
      setMessages([user, msg({ role: "bot", text: "", typing: true })]);

      let data: SearchResponse;
      try {
        const res = await fetch(
          searchURL(q, preset?.kind ? { kind: preset.kind } : {}, true),
        );
        data = await res.json();
        if (!res.ok)
          throw new Error((data as unknown as { error: string }).error);
      } catch {
        if (id !== run.current) return;
        setMessages([
          user,
          msg({
            role: "bot",
            text: "I couldn't reach the movie library just now. Check your connection and try again.",
            retry: true,
          }),
        ]);
        setStep("idle");
        return;
      }
      if (id !== run.current) return;

      const thread: Message[] = [user];
      if (!data.total) {
        thread.push(
          msg({
            role: "bot",
            text: `I couldn't find a match for “${q}”. Try a feeling like “cozy”, a star like “Tom Hanks”, or a film like “Parasite”.`,
            note: data.corrected
              ? `I also tried “${data.corrected}”.`
              : undefined,
            retry: true,
          }),
        );
        setMessages(thread);
        setStep("idle");
        return;
      }

      const f: Filters = {
        minRating: preset?.minRating ?? data.hints.minRating ?? 0,
        era: preset?.era ?? data.hints.era ?? "any",
        kind: (preset?.kind ?? data.hints.kind ?? "any") as Kind | "any",
      };
      setFilters(f);
      setSession({ query: q, summary: data.summary, source: data.source });

      const needRating =
        !skipQuestions &&
        preset?.minRating === undefined &&
        data.hints.minRating === undefined;
      const needEra =
        !skipQuestions &&
        preset?.era === undefined &&
        data.hints.era === undefined;
      const lead = data.understood
        ? `Got it: ${data.summary || "let's find your next favourite"}.`
        : `Let's find you something for “${q}”.`;
      const follow =
        needRating && needEra
          ? " Two quick questions."
          : needRating || needEra
            ? " One quick question."
            : "";
      thread.push(
        msg({
          role: "bot",
          text: lead + follow,
          note: data.corrected
            ? `Did you mean “${data.corrected}”? I went with that.`
            : undefined,
        }),
      );
      const s: Step = needRating ? "rating" : needEra ? "era" : "done";
      thread.push(
        ask(s) ?? msg({ role: "bot", text: "Here's what I'd watch tonight." }),
      );
      setMessages(thread);
      setStep(s);
      if (s === "done" && push) writeURL({ q }, true);
    },
    [writeURL],
  );

  const answer = (kind: "rating" | "era", value: string, label: string) => {
    if (!session) return;
    const nf = {
      ...filters,
      ...(kind === "rating" ? { minRating: Number(value) } : { era: value }),
    };
    setFilters(nf);
    const s: Step =
      kind === "rating" &&
      messages.every((m) => m.ask !== "era") &&
      nf.era === "any"
        ? "era"
        : "done";
    setMessages((m) => {
      const out = m.map((x) =>
        x.ask === kind && !x.answered ? { ...x, answered: value } : x,
      );
      out.push(msg({ role: "user", text: label }));
      out.push(
        ask(s) ??
          msg({ role: "bot", text: "Perfect. Here are your best matches." }),
      );
      return out;
    });
    setStep(s);
    if (s === "done") writeURL({ q: session.query }, true);
  };

  const reset = useCallback(() => {
    run.current++;
    setQuery("");
    setSession(null);
    setMessages([]);
    setStep("idle");
    setView("home");
    writeURL({}, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => search.current?.focus(), 300);
  }, [writeURL]);

  /* ───────── Load state from the URL, and follow back/forward ───────── */

  useEffect(() => {
    const load = () => {
      const p = new URLSearchParams(window.location.search);
      const q = p.get("q");
      if (q) {
        const kind = p.get("t");
        start(
          q,
          {
            minRating: Number(p.get("r") ?? 0) || 0,
            era: ERAS.some((e) => e.id === p.get("y")) ? p.get("y")! : "any",
            kind:
              kind === "movie" || kind === "series" ? (kind as Kind) : "any",
          },
          true,
          false,
        );
      } else {
        run.current++;
        setMessages([]);
        setSession(null);
        setStep("idle");
        setQuery("");
      }
      const id = p.get("title");
      if (!id) return setOpen(null);
      const local = titleById(id);
      if (local) return setOpen({ title: local });
      fetch(`/api/title?id=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((t: Title | null) => t && setOpen({ title: t }))
        .catch(() => {});
    };
    load();
    window.addEventListener("popstate", load);
    return () => window.removeEventListener("popstate", load);
  }, [start]);

  /* ───────── Effects ───────── */

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.allowed) return;
        const ask = new URLSearchParams(window.location.search).has("setup");
        setSetup({ allowed: true, open: ask });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const target = step === "done" ? resultsRef.current : chatEnd.current;
    target?.scrollIntoView({
      behavior: "smooth",
      block: step === "done" ? "start" : "nearest",
    });
  }, [messages.length, step]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* ───────── Actions ───────── */

  const openTitle = useCallback(
    (t: Title, reason?: string) => setOpen({ title: t, reason }),
    [],
  );
  const closeTitle = useCallback(() => {
    setOpen(null);
    const u = new URL(window.location.href);
    if (u.searchParams.has("title")) {
      u.searchParams.delete("title");
      window.history.replaceState(null, "", u.pathname + u.search);
    }
  }, []);

  const toggleSave = useCallback(
    (t: Title) => {
      setToast(
        list.has(t.id)
          ? `Removed ${t.title} from My List`
          : `Added ${t.title} to My List`,
      );
      list.toggle(t);
    },
    [list],
  );

  const share = async (url: string, text: string) => {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ title: "DramaMatch", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  const shareTitle = (t: Title) => {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set("title", t.id);
    share(u.toString(), `${t.title} (${t.year}) on DramaMatch`);
  };

  const surprise = () => {
    const pool = (
      home.live ? home.rows.flatMap((r) => r.items) : catalog
    ).filter((t) => t.rating >= 7.5 && !list.has(t.id));
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (t) openTitle(t, "A surprise pick, highly rated");
  };

  const picks = results.key ? results.picks : [];
  const becauseYouSaved = useMemo(() => {
    const seed = list.items.map((t) => titleById(t.id)).find(Boolean);
    return seed
      ? { seed, items: similarTo(seed, 16).filter((t) => !list.has(t.id)) }
      : null;
  }, [list]);

  /* ───────── Render ───────── */

  return (
    <div className="shell">
      <a className="skip" href="#search">
        Skip to search
      </a>
      <nav
        className={`nav ${scrolled || compact ? "solid" : ""}`}
        aria-label="Main"
      >
        <button
          type="button"
          className="brand"
          onClick={reset}
          aria-label="DramaMatch home"
        >
          <Logo size={30} />
          <span>
            drama<b>match</b>
          </span>
        </button>
        <div className="nav-links">
          <button
            type="button"
            className={`nav-home ${view === "home" && !engaged ? "active" : ""}`}
            onClick={reset}
          >
            Home
          </button>
          <button
            type="button"
            className={view === "list" ? "active" : ""}
            onClick={() => {
              setView("list");
              setOpen(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <IconBookmark size={16} /> My List
            {list.items.length ? (
              <span className="count">{list.items.length}</span>
            ) : null}
          </button>
          <button type="button" onClick={surprise}>
            <IconShuffle size={16} />{" "}
            <span className="hide-sm">Surprise me</span>
          </button>
          {setup.allowed && (
            <button
              type="button"
              className={`api-pill ${home.live ? "on" : ""}`}
              onClick={() => setSetup({ allowed: true, open: true })}
            >
              <span className="api-dot" aria-hidden />
              {home.live ? "Live" : "Connect API"}
            </button>
          )}
        </div>
      </nav>

      <header className={`hero ${compact ? "compact" : ""}`}>
        <div className="wall" aria-hidden>
          {home.wall.map((row, i) => (
            <div className={`wall-row r${i}`} key={i}>
              <div className="wall-track">
                {[...row, ...row].map((t, j) => (
                  <Poster
                    key={`${t.id}-${j}`}
                    title={t}
                    className="wall-poster"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hero-shade" aria-hidden />
        <div className="hero-inner">
          <h1>
            How are you <em>feeling</em> tonight?
          </h1>
          {!compact && (
            <p className="lede">
              Type a mood, a star or any movie or show. Typos are fine,
              I&apos;ll work out what you mean.
            </p>
          )}
          <SearchBox
            ref={search}
            live={home.live}
            value={query}
            onChange={setQuery}
            onSubmit={(v) => start(v)}
          />
          {!compact && (
            <div className="chips" aria-label="Pick a mood">
              {MOOD_SUGGESTIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="chip"
                  onClick={() => start(m.value)}
                >
                  <MoodIcon name={m.icon} /> {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {view === "list" && (
          <section className="section list-view" aria-labelledby="list-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">Saved on this device</p>
                <h2 id="list-title">My List</h2>
              </div>
            </div>
            {list.items.length ? (
              <div className="grid">
                {list.items.map((t) => (
                  <TitleCard
                    key={t.id}
                    title={t}
                    saved
                    onOpen={openTitle}
                    onToggle={toggleSave}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <IconBookmark size={28} />
                <p>Nothing saved yet. Tap + on any poster to keep it here.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={reset}
                >
                  Find something to watch
                </button>
              </div>
            )}
          </section>
        )}

        {view === "home" && engaged && (
          <section
            className="chat"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.map((m) => (
              <div key={m.id} className={`bubble-row ${m.role}`}>
                {m.role === "bot" && (
                  <span className="avatar" aria-hidden>
                    <Logo size={22} />
                  </span>
                )}
                {m.typing ? (
                  <div className="bubble typing" aria-label="Searching">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <div className="bubble">
                    {m.note && (
                      <p className="bubble-note">
                        <IconWand size={14} /> {m.note}
                      </p>
                    )}
                    <p>{m.text}</p>
                    {m.ask && (
                      <div className="options" role="group" aria-label={m.text}>
                        {(m.ask === "rating"
                          ? RATING_OPTIONS.map((o) => ({
                              value: String(o.value),
                              label: o.value ? `★ ${o.label}` : o.label,
                            }))
                          : ERAS.map((e) => ({ value: e.id, label: e.label }))
                        ).map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            className={`option ${m.answered === o.value ? "picked" : ""}`}
                            disabled={Boolean(m.answered)}
                            aria-pressed={m.answered === o.value}
                            onClick={() => answer(m.ask!, o.value, o.label)}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.retry && (
                      <div className="options">
                        {MOOD_SUGGESTIONS.slice(0, 6).map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            className="option"
                            onClick={() => start(s.value)}
                          >
                            <MoodIcon name={s.icon} size={16} /> {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEnd} />
          </section>
        )}

        {view === "home" && step === "done" && session && (
          <section
            className="section results"
            ref={resultsRef}
            aria-labelledby="results-title"
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">
                  <IconSpark size={12} />{" "}
                  {session.summary
                    ? capitalize(session.summary)
                    : `For “${session.query}”`}
                </p>
                <h2 id="results-title">
                  Your matches
                  {!results.loading && picks.length ? (
                    <span className="tally">{picks.length}</span>
                  ) : null}
                </h2>
              </div>
              <div className="filters">
                <label className="select">
                  <span>Rating</span>
                  <select
                    id="filter-rating"
                    value={filters.minRating}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        minRating: Number(e.target.value),
                      });
                      setVisible(PAGE);
                    }}
                  >
                    {RATING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="select">
                  <span>Year</span>
                  <select
                    id="filter-era"
                    value={filters.era}
                    onChange={(e) => {
                      setFilters({ ...filters, era: e.target.value });
                      setVisible(PAGE);
                    }}
                  >
                    {ERAS.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="segmented" role="group" aria-label="Type">
                  {(["any", "movie", "series"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={filters.kind === k}
                      onClick={() => {
                        setFilters({ ...filters, kind: k });
                        setVisible(PAGE);
                      }}
                    >
                      {k === "any"
                        ? "All"
                        : k === "movie"
                          ? "Movies"
                          : "Series"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label="Share these results"
                  onClick={() =>
                    share(
                      window.location.href,
                      `My DramaMatch picks for “${session.query}”`,
                    )
                  }
                >
                  <IconShare size={18} />
                </button>
              </div>
            </div>

            {results.loading && !picks.length ? (
              <div
                className="grid"
                aria-busy="true"
                aria-label="Loading matches"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="skeleton" />
                ))}
              </div>
            ) : results.error ? (
              <div className="empty">
                <p>{results.error}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setFilters({ ...filters })}
                >
                  Try again
                </button>
              </div>
            ) : picks.length ? (
              <>
                <div className={`grid ${results.loading ? "is-loading" : ""}`}>
                  {picks.slice(0, visible).map((p) => (
                    <TitleCard
                      key={p.title.id}
                      title={p.title}
                      reason={p.reason}
                      saved={list.has(p.title.id)}
                      onOpen={(t) => openTitle(t, p.reason)}
                      onToggle={toggleSave}
                    />
                  ))}
                </div>
                <div className="more">
                  {visible < picks.length && (
                    <button
                      type="button"
                      className="btn btn-glass"
                      onClick={() => setVisible((v) => v + PAGE)}
                    >
                      Show more ({picks.length - visible} left)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={reset}
                  >
                    Try another mood
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">
                <p>Nothing matches all of that.</p>
                <div className="options center">
                  {filters.minRating > 0 && (
                    <button
                      type="button"
                      className="option"
                      onClick={() => setFilters({ ...filters, minRating: 0 })}
                    >
                      Any rating
                    </button>
                  )}
                  {filters.era !== "any" && (
                    <button
                      type="button"
                      className="option"
                      onClick={() => setFilters({ ...filters, era: "any" })}
                    >
                      Any year
                    </button>
                  )}
                  {filters.kind !== "any" && (
                    <button
                      type="button"
                      className="option"
                      onClick={() => setFilters({ ...filters, kind: "any" })}
                    >
                      Movies &amp; series
                    </button>
                  )}
                  <button type="button" className="option" onClick={reset}>
                    Start over
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === "home" && !engaged && (
          <div className="rows">
            {list.items.length > 0 && (
              <Row
                title="My List"
                items={list.items}
                saved={list.has}
                onOpen={openTitle}
                onToggle={toggleSave}
              />
            )}
            <Row
              title={home.live ? "Top 10 today" : "Top 10 tonight"}
              items={home.top10}
              ranked
              saved={list.has}
              onOpen={openTitle}
              onToggle={toggleSave}
            />
            {becauseYouSaved && (
              <Row
                title={`Because you saved ${becauseYouSaved.seed.title}`}
                items={becauseYouSaved.items}
                saved={list.has}
                onOpen={openTitle}
                onToggle={toggleSave}
              />
            )}
            {home.rows.map((r) => (
              <Row
                key={r.id}
                title={r.title}
                items={r.items}
                onSeeAll={
                  r.query
                    ? () =>
                        start(
                          r.query!,
                          { minRating: 0, era: "any", ...r.filters },
                          true,
                        )
                    : undefined
                }
                saved={list.has}
                onOpen={openTitle}
                onToggle={toggleSave}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="brand small">
          <Logo size={22} />
          <span>
            drama<b>match</b>
          </span>
        </div>
        {home.live ? (
          <p>
            Every movie and series, matched to your mood. No sign-up, no
            tracking.
          </p>
        ) : (
          <p>
            {Math.floor(catalog.length / 50) * 50}+ hand-picked movies &amp;
            series · IMDb ratings are a periodic snapshot · No sign-up, no
            tracking.
          </p>
        )}
        {home.live && (
          <p className="tmdb">
            <TMDBLogo /> This product uses the TMDB API but is not endorsed or
            certified by TMDB.
          </p>
        )}
        <p className="fine">
          Poster art and trailers belong to their owners. Not affiliated with
          IMDb.
        </p>
        <p className="fine version">v{APP_VERSION}</p>
      </footer>

      {open && (
        <TitleModal
          title={open.title}
          reason={open.reason}
          saved={list.has}
          onToggle={toggleSave}
          onOpen={(t) => setOpen({ title: t })}
          onPerson={(name) => {
            setOpen(null);
            start(name, { minRating: 0, era: "any" }, true);
          }}
          onShare={shareTitle}
          onClose={closeTitle}
        />
      )}

      {setup.open && (
        <SetupBox
          live={home.live}
          onClose={() => setSetup({ allowed: true, open: false })}
        />
      )}

      <div
        className={`toast ${toast ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}

/** TMDB attribution mark (required by TMDB's API terms when using live data). */
function TMDBLogo() {
  return (
    <svg
      width="44"
      height="14"
      viewBox="0 0 88 28"
      aria-label="TMDB"
      role="img"
    >
      <defs>
        <linearGradient id="tmdb-g" x1="0" x2="1">
          <stop offset="0" stopColor="#90cea1" />
          <stop offset="1" stopColor="#01b4e4" />
        </linearGradient>
      </defs>
      <rect width="88" height="28" rx="14" fill="url(#tmdb-g)" />
      <text
        x="44"
        y="19"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="#0d253f"
        fontFamily="system-ui, sans-serif"
      >
        TMDB
      </text>
    </svg>
  );
}

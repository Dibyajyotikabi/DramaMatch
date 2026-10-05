"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconBookmark,
  IconShare,
  IconShuffle,
  IconSpark,
  IconWand,
  Logo,
} from "./icons";
import { Poster } from "./poster";
import { Row } from "./row";
import { SearchBox, type SearchBoxHandle } from "./search-box";
import { TitleCard } from "./title-card";
import { TitleModal } from "./title-modal";
import { catalog, titleById } from "@/lib/catalog";
import { useList } from "@/lib/client/use-list";
import {
  ERAS,
  MOOD_SUGGESTIONS,
  RATING_OPTIONS,
  defaultFilters,
  interpret,
  recommend,
  similarTo,
} from "@/lib/engine";
import { ROWS, TOP10, WALL } from "@/lib/rows";
import type { Filters, Intent, Kind, Pick, Title } from "@/lib/types";

type Step = "idle" | "rating" | "era" | "done";
type View = "home" | "list";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  note?: string;
  ask?: "rating" | "era";
  answered?: string;
  retry?: boolean;
}

const PAGE = 18;
let nextId = 1;
const msg = (m: Omit<Message, "id">): Message => ({ ...m, id: nextId++ });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function App() {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minRating: 0,
    era: "any",
    kind: "any",
  });
  const [step, setStep] = useState<Step>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visible, setVisible] = useState(PAGE);
  const [view, setView] = useState<View>("home");
  const [open, setOpen] = useState<{ title: Title; reason?: string } | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const list = useList();
  const search = useRef<SearchBoxHandle>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const picks = useMemo<Pick[]>(
    () => (intent && step === "done" ? recommend(intent, filters) : []),
    [intent, filters, step],
  );
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
    if (step !== "done" || !intent) return;
    writeURL({
      q: intent.query,
      r: filters.minRating ? String(filters.minRating) : undefined,
      y: filters.era !== "any" ? filters.era : undefined,
      t: filters.kind !== "any" ? filters.kind : undefined,
    });
  }, [step, intent, filters, writeURL]);

  /* ───────── Conversation ───────── */

  const ask = (s: Step): Message | null => {
    if (s === "rating")
      return msg({
        role: "bot",
        text: "What's the lowest IMDb rating you'd enjoy?",
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
    (
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
      setView("home");
      setOpen(null);
      setQuery(q);
      const i = interpret(q);
      const f = { ...defaultFilters(i), ...preset };
      setIntent(i);
      setFilters(f);
      setVisible(PAGE);

      const thread: Message[] = [msg({ role: "user", text: q })];
      const probe = recommend(i, { minRating: 0, era: "any", kind: f.kind });
      if (!probe.length) {
        thread.push(
          msg({
            role: "bot",
            text: `I couldn't find a match for “${q}”. Try a feeling like “cozy”, a star like “Tom Hanks”, or a film like “Parasite”.`,
            retry: true,
          }),
        );
        setMessages(thread);
        setStep("idle");
        return;
      }
      const note = i.corrected
        ? `Did you mean “${i.corrected}”? I went with that.`
        : undefined;
      const needRating =
        !skipQuestions &&
        preset?.minRating === undefined &&
        i.minRating === undefined;
      const needEra =
        !skipQuestions && preset?.era === undefined && i.era === undefined;
      const lead = i.understood
        ? `Got it: ${i.summary || "let's find your next favourite"}.`
        : `Let's find you something for “${q}”.`;
      const followUp =
        needRating && needEra
          ? " Two quick questions."
          : needRating || needEra
            ? " One quick question."
            : "";
      thread.push(msg({ role: "bot", text: lead + followUp, note }));
      const s: Step = needRating ? "rating" : needEra ? "era" : "done";
      const question = ask(s);
      if (question) thread.push(question);
      else
        thread.push(
          msg({ role: "bot", text: "Here's what I'd watch tonight." }),
        );
      setMessages(thread);
      setStep(s);
      if (s === "done" && push) writeURL({ q }, true);
    },
    [writeURL],
  );

  const answer = (kind: "rating" | "era", value: string, label: string) => {
    if (!intent) return;
    const nf = {
      ...filters,
      ...(kind === "rating" ? { minRating: Number(value) } : { era: value }),
    };
    setFilters(nf);
    const s: Step =
      kind === "rating" && intent.era === undefined ? "era" : "done";
    setMessages((m) => {
      const out = m.map((x) =>
        x.ask === kind && !x.answered ? { ...x, answered: value } : x,
      );
      out.push(msg({ role: "user", text: label }));
      const next = ask(s);
      if (next) out.push(next);
      else {
        const n = recommend(intent, nf).length;
        out.push(
          msg({
            role: "bot",
            text: n
              ? `I found ${n} ${n === 1 ? "match" : "matches"}. Here are the best ones.`
              : "Nothing fits all of that yet. Loosen the rating or year below.",
          }),
        );
      }
      return out;
    });
    setStep(s);
    if (s === "done") writeURL({ q: intent.query }, true);
  };

  const reset = useCallback(() => {
    setQuery("");
    setIntent(null);
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
      const title = p.get("title");
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
        setMessages([]);
        setIntent(null);
        setStep("idle");
        setQuery("");
      }
      const t = title ? titleById(title) : undefined;
      setOpen(t ? { title: t } : null);
    };
    load();
    window.addEventListener("popstate", load);
    return () => window.removeEventListener("popstate", load);
  }, [start]);

  /* ───────── Effects ───────── */

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
    (id: string) => {
      const t = titleById(id);
      setToast(
        list.has(id)
          ? `Removed ${t?.title} from My List`
          : `Added ${t?.title} to My List`,
      );
      list.toggle(id);
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
    const pool = catalog.filter((t) => t.rating >= 8 && !list.has(t.id));
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (t) openTitle(t, "A surprise pick, rated 8+ on IMDb");
  };

  const savedTitles = list.ids
    .map(titleById)
    .filter((t): t is Title => Boolean(t));
  const becauseYouSaved = useMemo(() => {
    const first = list.ids.map(titleById).find(Boolean);
    return first
      ? {
          seed: first,
          items: similarTo(first, 16).filter((t) => !list.ids.includes(t.id)),
        }
      : null;
  }, [list.ids]);

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
            className={view === "home" && !engaged ? "active" : ""}
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
            {savedTitles.length ? (
              <span className="count">{savedTitles.length}</span>
            ) : null}
          </button>
          <button type="button" onClick={surprise}>
            <IconShuffle size={16} />{" "}
            <span className="hide-sm">Surprise me</span>
          </button>
        </div>
      </nav>

      <header className={`hero ${compact ? "compact" : ""}`}>
        <div className="wall" aria-hidden>
          {WALL.map((row, i) => (
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
          {!compact && (
            <p className="eyebrow hero-eyebrow">
              <span className="dot" /> Mood in. Movie out.
            </p>
          )}
          <h1>
            How are you <em>feeling</em> tonight?
          </h1>
          {!compact && (
            <p className="lede">
              Type a mood, a star or a film you love. Typos are fine, I&apos;ll
              work out what you mean.
            </p>
          )}
          <SearchBox
            ref={search}
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
                  <span aria-hidden>{m.emoji}</span> {m.label}
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
            {savedTitles.length ? (
              <div className="grid">
                {savedTitles.map((t) => (
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
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </section>
        )}

        {view === "home" && step === "done" && intent && (
          <section
            className="section results"
            ref={resultsRef}
            aria-labelledby="results-title"
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">
                  <IconSpark size={12} />{" "}
                  {intent.summary
                    ? capitalize(intent.summary)
                    : `For “${intent.query}”`}
                </p>
                <h2 id="results-title">Your matches</h2>
              </div>
              <div className="filters">
                <label className="select">
                  <span>IMDb</span>
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
                      `My DramaMatch picks for “${intent.query}”`,
                    )
                  }
                >
                  <IconShare size={18} />
                </button>
              </div>
            </div>

            {picks.length ? (
              <>
                <div className="grid">
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
            {savedTitles.length > 0 && (
              <Row
                title="My List"
                items={savedTitles}
                saved={list.has}
                onOpen={openTitle}
                onToggle={toggleSave}
              />
            )}
            <Row
              title="Top 10 tonight"
              items={TOP10}
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
            {ROWS.map((r) => (
              <Row
                key={r.id}
                title={r.title}
                items={r.items}
                onSeeAll={() => {
                  start(
                    r.query,
                    { minRating: 0, era: "any", ...r.filters },
                    true,
                  );
                }}
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
        <p>
          {Math.floor(catalog.length / 50) * 50}+ hand-picked movies &amp;
          series · IMDb ratings are a periodic snapshot · No sign-up, no
          tracking.
        </p>
        <p className="fine">
          Not affiliated with IMDb. Trailer and IMDb buttons open a search on
          those sites. Poster art belongs to its owners.
        </p>
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

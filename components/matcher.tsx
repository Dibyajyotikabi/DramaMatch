"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COUNTRY_NAMES,
  ERAS,
  MOOD_SUGGESTIONS,
  RATING_OPTIONS,
  defaultFilters,
  eraOf,
  interpret,
  recommend,
  suggest,
  type Suggestion,
} from "@/lib/engine";
import { catalog } from "@/lib/catalog";
import type { Filters, Intent, Pick, Title } from "@/lib/types";

type Step = "idle" | "rating" | "era" | "done";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  ask?: "rating" | "era";
  answered?: string;
}

const PLACEHOLDERS = [
  "I'm feeling a little nostalgic…",
  "Shah Rukh Khan",
  "Something like Interstellar",
  "A cozy K-drama to unwind",
  "Mind-bending thrillers, 8+",
  "Zendaya",
  "I need a good laugh",
];

const PAGE = 12;
const CATALOG_SIZE = Math.floor(catalog.length / 50) * 50;

let nextId = 1;
const msg = (m: Omit<Message, "id">): Message => ({ ...m, id: nextId++ });

export function Matcher() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [placeholder, setPlaceholder] = useState(0);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minRating: 0,
    era: "any",
    kind: "any",
  });
  const [step, setStep] = useState<Step>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visible, setVisible] = useState(PAGE);
  const [listening, setListening] = useState(false);
  const [speech, setSpeech] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => (focused ? suggest(query) : []),
    [query, focused],
  );
  const picks = useMemo<Pick[]>(
    () => (intent && step === "done" ? recommend(intent, filters) : []),
    [intent, filters, step],
  );

  useEffect(() => {
    const t = setInterval(
      () => setPlaceholder((p) => (p + 1) % PLACEHOLDERS.length),
      3200,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSpeech(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const target = step === "done" ? resultsRef.current : endRef.current;
    target?.scrollIntoView({
      behavior: "smooth",
      block: step === "done" ? "start" : "nearest",
    });
  }, [messages.length, step]);

  useEffect(() => setActive(-1), [query]);

  const nextQuestion = useCallback(
    (i: Intent, answered: "rating" | "era" | null): Step => {
      if (
        answered !== "rating" &&
        answered !== "era" &&
        i.minRating === undefined
      )
        return "rating";
      if (answered !== "era" && i.era === undefined) return "era";
      return "done";
    },
    [],
  );

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

  const start = (raw: string) => {
    const q = raw.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    inputRef.current?.blur();
    setFocused(false);
    setQuery(q);
    const i = interpret(q);
    const f = defaultFilters(i);
    setIntent(i);
    setFilters(f);
    setVisible(PAGE);

    const thread: Message[] = [msg({ role: "user", text: q })];
    const probe = recommend(i, { minRating: 0, era: "any", kind: f.kind });
    if (!probe.length) {
      thread.push(
        msg({
          role: "bot",
          text: `Hmm, I couldn't find anything for “${q}”. Try a feeling like “cozy”, a star like “Tom Hanks”, or a title like “Parasite”.`,
        }),
      );
      setMessages(thread);
      setStep("idle");
      return;
    }
    thread.push(
      msg({
        role: "bot",
        text: i.understood
          ? `Got it — ${i.summary || "let's find your next favourite"}. ${hint(i)}`
          : `Let's find you something great for “${q}”.`,
      }),
    );
    const s = nextQuestion(i, null);
    const question = ask(s);
    if (question) thread.push(question);
    else
      thread.push(
        msg({ role: "bot", text: "Here's what I'd watch tonight 👇" }),
      );
    setMessages(thread);
    setStep(s);
  };

  const answer = (kind: "rating" | "era", value: string, label: string) => {
    if (!intent) return;
    const nf = {
      ...filters,
      ...(kind === "rating" ? { minRating: Number(value) } : { era: value }),
    };
    setFilters(nf);
    const s =
      kind === "rating"
        ? nextQuestion({ ...intent, minRating: nf.minRating }, "rating")
        : "done";
    setMessages((m) => {
      const out = m.map((x) =>
        x.ask === kind && !x.answered ? { ...x, answered: value } : x,
      );
      out.push(msg({ role: "user", text: label }));
      const q = ask(s);
      if (q) out.push(q);
      else {
        const n = recommend(intent, nf).length;
        out.push(
          msg({
            role: "bot",
            text: n
              ? `Perfect. I found ${n} ${n === 1 ? "match" : "matches"} — here are the best ones 👇`
              : "Nothing fits all of that just yet — try loosening the rating or era below.",
          }),
        );
      }
      return out;
    });
    setStep(s);
  };

  const reset = () => {
    setQuery("");
    setIntent(null);
    setMessages([]);
    setStep("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const listen = () => {
    const w = window as unknown as Record<
      string,
      new () => SpeechRecognitionLike
    >;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setQuery(text);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        start(text);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  const choose = (s: Suggestion) => {
    setQuery(s.value);
    start(s.value);
  };

  const engaged = messages.length > 0;
  const showDropdown = focused && suggestions.length > 0;

  return (
    <div className={`app ${engaged ? "is-engaged" : ""}`}>
      <div className="aurora" aria-hidden />
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={reset}
          aria-label="DramaMatch — start over"
        >
          <Logo />
          <span>DramaMatch</span>
        </button>
        {engaged && (
          <button type="button" className="ghost-btn" onClick={reset}>
            <IconRefresh /> New search
          </button>
        )}
      </header>

      <main className="stage">
        <section className="hero" aria-labelledby="ask">
          {!engaged && (
            <div className="wordmark" aria-hidden>
              <Logo size={46} />
              <span>
                Drama<b>Match</b>
              </span>
            </div>
          )}
          <h1 id="ask">How are you feeling tonight?</h1>
          <p className="lede">
            Tell me a mood, a star, or a movie you love — I&apos;ll find your
            next favourite.
          </p>

          <form
            className={`searchbox ${showDropdown ? "open" : ""}`}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (active >= 0 && suggestions[active])
                choose(suggestions[active]);
              else start(query);
            }}
          >
            <span className="search-icon" aria-hidden>
              <IconSearch />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onKeyDown={onKeyDown}
              placeholder={PLACEHOLDERS[placeholder]}
              aria-label="Mood, star or movie"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="suggestions"
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `sg-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                className="icon-btn subtle"
                aria-label="Clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <IconClose />
              </button>
            )}
            {speech && (
              <button
                type="button"
                className={`icon-btn mic ${listening ? "listening" : ""}`}
                aria-label={listening ? "Listening…" : "Search by voice"}
                onClick={listen}
              >
                <IconMic />
              </button>
            )}
            <button type="submit" className="go" aria-label="Find matches">
              <IconArrow />
            </button>

            {showDropdown && (
              <ul id="suggestions" className="dropdown" role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.type}-${s.label}`}
                    id={`sg-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? "active" : ""}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className={`sg-icon ${s.type}`} aria-hidden>
                      {s.type === "title" ? (
                        <IconFilm />
                      ) : s.type === "person" ? (
                        <IconPerson />
                      ) : (
                        <IconSpark />
                      )}
                    </span>
                    <span className="sg-label">{s.label}</span>
                    <span className="sg-detail">{s.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {!engaged && (
            <div className="chips" aria-label="Try a mood">
              {MOOD_SUGGESTIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setQuery(m.value);
                    start(m.value);
                  }}
                >
                  <span aria-hidden>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {engaged && (
          <section className="thread" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`bubble-row ${m.role}`}>
                {m.role === "bot" && (
                  <span className="avatar" aria-hidden>
                    <Logo size={18} />
                  </span>
                )}
                <div className="bubble">
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
                  {m.role === "bot" &&
                    !m.ask &&
                    step === "idle" &&
                    m === messages[messages.length - 1] && (
                      <div className="options">
                        {MOOD_SUGGESTIONS.slice(0, 6).map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            className="option"
                            onClick={() => {
                              setQuery(s.value);
                              start(s.value);
                            }}
                          >
                            {s.emoji} {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </section>
        )}

        {step === "done" && intent && (
          <section
            className="results"
            ref={resultsRef}
            aria-labelledby="results-title"
          >
            <div className="results-head">
              <div>
                <h2 id="results-title">Your matches</h2>
                <p>
                  {intent.summary
                    ? capitalize(intent.summary)
                    : `For “${intent.query}”`}
                </p>
              </div>
              <div className="filters">
                <label className="select">
                  <span>IMDb</span>
                  <select
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
              </div>
            </div>

            {picks.length ? (
              <>
                <div className="grid">
                  {picks.slice(0, visible).map((p, i) => (
                    <Card key={p.title.id} pick={p} index={i} />
                  ))}
                </div>
                <div className="more">
                  {visible < picks.length && (
                    <button
                      type="button"
                      className="pill-btn"
                      onClick={() => setVisible((v) => v + PAGE)}
                    >
                      Show more ({picks.length - visible} left)
                    </button>
                  )}
                  <button
                    type="button"
                    className="pill-btn ghost"
                    onClick={reset}
                  >
                    Try another mood
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">
                <p>Nothing matches all of that.</p>
                <div className="options">
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
                      Movies & series
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
      </main>

      <footer className="footer">
        <span>
          {CATALOG_SIZE}+ hand-picked movies &amp; series · IMDb ratings
          snapshot · No sign-up, no tracking
        </span>
      </footer>
    </div>
  );
}

function hint(i: Intent) {
  if (i.minRating !== undefined && i.era !== undefined) return "";
  if (i.minRating !== undefined) return `Keeping it to ★ ${i.minRating}+.`;
  if (i.era !== undefined) return `Sticking to ${eraOf(i.era).label}.`;
  return "Two quick questions.";
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ───────────────────────────── Card ───────────────────────────── */

const GENRE_HUES: [string, number][] = [
  ["Horror", 350],
  ["Romance", 338],
  ["Animation", 22],
  ["Sci-Fi", 196],
  ["Fantasy", 268],
  ["Comedy", 36],
  ["Thriller", 232],
  ["Mystery", 252],
  ["Crime", 214],
  ["War", 90],
  ["Music", 312],
  ["Sport", 140],
  ["Action", 8],
  ["Adventure", 160],
  ["Biography", 28],
  ["History", 34],
  ["Family", 48],
  ["Western", 30],
  ["Drama", 178],
];

const FLAGS: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  IE: "🇮🇪",
  KR: "🇰🇷",
  CN: "🇨🇳",
  TW: "🇹🇼",
  HK: "🇭🇰",
  JP: "🇯🇵",
  IN: "🇮🇳",
  FR: "🇫🇷",
  ES: "🇪🇸",
  DE: "🇩🇪",
  IT: "🇮🇹",
  MX: "🇲🇽",
  BR: "🇧🇷",
  DK: "🇩🇰",
  IR: "🇮🇷",
  AU: "🇦🇺",
};

const SHORT_COUNTRY: Record<string, string> = {
  US: "USA",
  UK: "UK",
  IE: "Ireland",
  KR: "Korea",
  CN: "China",
  TW: "Taiwan",
  HK: "HK",
  JP: "Japan",
  IN: "India",
  FR: "France",
  ES: "Spain",
  DE: "Germany",
  IT: "Italy",
  MX: "Mexico",
  BR: "Brazil",
  DK: "Denmark",
  IR: "Iran",
  AU: "Australia",
};

function hueFor(t: Title) {
  const base = GENRE_HUES.find(([g]) => t.genres.includes(g))?.[1] ?? 200;
  let h = 0;
  for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return base + (h % 24) - 12;
}

function Card({ pick, index }: { pick: Pick; index: number }) {
  const t = pick.title;
  const q = encodeURIComponent(`${t.title} ${t.year}`);
  return (
    <article
      className="card"
      style={
        {
          "--h": hueFor(t),
          animationDelay: `${Math.min(index % PAGE, 11) * 40}ms`,
        } as React.CSSProperties
      }
    >
      <div className="poster">
        <div className="poster-top">
          <span className="badge">
            {t.kind === "movie" ? "Movie" : "Series"} · {t.year}
          </span>
          <span
            className="rating"
            aria-label={`IMDb rating ${t.rating} out of 10`}
          >
            <IconStar /> {t.rating.toFixed(1)}
          </span>
        </div>
        <h3>{t.title}</h3>
        <span className="poster-genres">
          {t.genres.slice(0, 3).join(" · ")}
        </span>
      </div>
      <div className="card-body">
        <p className="reason">
          <IconSpark /> {pick.reason}
        </p>
        <p className="blurb">{t.blurb}</p>
        <dl className="facts">
          {t.cast.length > 0 && (
            <div>
              <dt>Starring</dt>
              <dd>{t.cast.slice(0, 3).join(", ")}</dd>
            </div>
          )}
          {t.director && (
            <div>
              <dt>{t.kind === "movie" ? "Director" : "Creator"}</dt>
              <dd>{t.director}</dd>
            </div>
          )}
        </dl>
        <div className="card-foot">
          <span className="origin" title={COUNTRY_NAMES[t.country]}>
            {FLAGS[t.country] ?? "🌐"} {SHORT_COUNTRY[t.country] ?? t.country}
          </span>
          <span className="links">
            <a
              href={`https://www.youtube.com/results?search_query=${q}%20trailer`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconPlay /> Trailer
            </a>
            <a
              href={`https://www.imdb.com/find/?q=${q}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              IMDb <IconExternal />
            </a>
          </span>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────────── Icons ───────────────────────────── */

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: {
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

const svg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6a88" />
          <stop offset=".5" stopColor="#a259ff" />
          <stop offset="1" stopColor="#3d8bff" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#lg)" />
      <path d="M16 15.5v17l14.5-8.5z" fill="#fff" />
      <path
        d="M33 13.5l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"
        fill="#fff"
        opacity=".9"
      />
    </svg>
  );
}
const IconSearch = () => (
  <svg {...svg}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
const IconArrow = () => (
  <svg {...svg}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconClose = () => (
  <svg {...svg} width={18} height={18}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconMic = () => (
  <svg {...svg}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const IconFilm = () => (
  <svg {...svg} width={16} height={16}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
  </svg>
);
const IconPerson = () => (
  <svg {...svg} width={16} height={16}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
const IconSpark = () => (
  <svg {...svg} width={14} height={14}>
    <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
  </svg>
);
const IconStar = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
);
const IconPlay = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M7 4.5v15l12.5-7.5z" />
  </svg>
);
const IconExternal = () => (
  <svg {...svg} width={12} height={12}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
const IconRefresh = () => (
  <svg {...svg} width={16} height={16}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
  </svg>
);

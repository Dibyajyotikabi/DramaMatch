"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IconArrow,
  IconClose,
  IconMic,
  IconPerson,
  IconSearch,
  IconSpark,
} from "./icons";
import { Poster } from "./poster";
import { titleById } from "@/lib/catalog";
import { suggest, type Suggestion } from "@/lib/engine";

const PLACEHOLDERS = [
  "I'm feeling a little nostalgic…",
  "Shah Rukh Khan",
  "Something like Interstellar",
  "A cozy K-drama to unwind",
  "Mind-bending thrillers, 8+",
  "Zendaya",
  "I need a good laugh",
];

interface Props {
  live?: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export interface SearchBoxHandle {
  focus: () => void;
}

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

type Item = Suggestion & { image?: string };

/** Live title/person suggestions from the server, debounced. */
function useRemote(q: string, enabled: boolean) {
  const [state, setState] = useState<{ q: string; list: Item[] }>({
    q: "",
    list: [],
  });
  useEffect(() => {
    const text = q.trim();
    if (!enabled || text.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(text)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((d) => setState({ q: text, list: d.suggestions ?? [] }))
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, enabled]);
  return state.q === q.trim() ? state.list : [];
}

export const SearchBox = forwardRef<SearchBoxHandle, Props>(function SearchBox(
  { live = false, value, onChange, onSubmit },
  ref,
) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [placeholder, setPlaceholder] = useState(0);
  const [speech, setSpeech] = useState(false);
  const [listening, setListening] = useState(false);

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const remote = useRemote(value, live && focused);
  const items = useMemo<Item[]>(() => {
    if (!focused) return [];
    const local: Item[] = suggest(value, undefined, 7);
    if (!remote.length) return local;
    // Literal local hits first, then live results, then typo guesses and moods.
    const order = [
      ...local.filter((x) => !x.fuzzy && x.type !== "mood"),
      ...remote,
      ...local.filter((x) => x.fuzzy),
      ...local.filter((x) => x.type === "mood"),
    ];
    const seen = new Set<string>();
    return order
      .filter((s) => {
        const k = `${s.type}:${s.label.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }, [value, focused, remote]);
  const open = focused && items.length > 0;
  const onlyGuesses =
    items.length > 0 && items.every((s) => s.fuzzy || s.type === "mood");

  useEffect(() => setActive(-1), [value]);
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

  const choose = (s: Item) => {
    onChange(s.value);
    setFocused(false);
    input.current?.blur();
    onSubmit(s.value);
  };

  const submit = () => {
    if (active >= 0 && items[active]) return choose(items[active]);
    setFocused(false);
    input.current?.blur();
    onSubmit(value);
  };

  const listen = () => {
    const w = window as unknown as Record<
      string,
      new () => SpeechRecognitionLike
    >;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.lang = navigator.language || "en-US";
      rec.interimResults = true;
      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join("");
        onChange(text);
        if (e.results[e.results.length - 1].isFinal) {
          setListening(false);
          onSubmit(text);
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <form
      className={`search ${open ? "open" : ""}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <span className="search-icon" aria-hidden>
        <IconSearch size={22} />
      </span>
      <input
        ref={input}
        id="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (!items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Escape") setFocused(false);
        }}
        placeholder={PLACEHOLDERS[placeholder]}
        aria-label="A mood, a star or a movie"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `sg-${active}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={200}
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className="sq-btn ghost"
          aria-label="Clear"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <IconClose size={18} />
        </button>
      )}
      {speech && (
        <button
          type="button"
          className={`sq-btn mic ${listening ? "listening" : ""}`}
          aria-label={listening ? "Listening…" : "Search by voice"}
          onClick={listen}
        >
          <IconMic />
        </button>
      )}
      <button type="submit" className="search-go" aria-label="Find matches">
        <IconArrow size={22} />
      </button>

      {open && (
        <div className="suggest" id="search-suggestions" role="listbox">
          {onlyGuesses && <p className="suggest-hint">Did you mean…</p>}
          {items.map((s, i) => {
            const t = s.id ? titleById(s.id) : undefined;
            return (
              <div
                key={`${s.type}-${s.label}-${i}`}
                id={`sg-${i}`}
                role="option"
                aria-selected={i === active}
                className={`suggest-item ${i === active ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={`suggest-img ${s.type}`}
                    src={s.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : t ? (
                  <Poster title={t} className="thumb" />
                ) : (
                  <span className={`suggest-icon ${s.type}`} aria-hidden>
                    {s.type === "person" ? (
                      <IconPerson size={18} />
                    ) : (
                      <IconSpark size={16} />
                    )}
                  </span>
                )}
                <span className="suggest-text">
                  <span className="suggest-label">{s.label}</span>
                  <span className="suggest-detail">
                    {s.type === "person" && !s.image
                      ? `Star · ${s.detail}`
                      : s.detail}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </form>
  );
});

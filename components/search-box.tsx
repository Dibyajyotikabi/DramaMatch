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

export const SearchBox = forwardRef<SearchBoxHandle, Props>(function SearchBox(
  { value, onChange, onSubmit },
  ref,
) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [placeholder, setPlaceholder] = useState(0);
  const [speech, setSpeech] = useState(false);
  const [listening, setListening] = useState(false);

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const items = useMemo(
    () => (focused ? suggest(value, undefined, 7) : []),
    [value, focused],
  );
  const open = focused && items.length > 0;
  const anyFuzzy =
    items.some((s) => s.fuzzy) &&
    !items.some((s) => !s.fuzzy && s.type !== "mood");

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

  const choose = (s: Suggestion) => {
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
          {anyFuzzy && <p className="suggest-hint">Did you mean…</p>}
          {items.map((s, i) => {
            const t = s.id ? titleById(s.id) : undefined;
            return (
              <div
                key={`${s.type}-${s.label}`}
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
                {t ? (
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
                    {s.type === "person" ? `Star · ${s.detail}` : s.detail}
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

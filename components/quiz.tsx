"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Preferences } from "@/lib/types";
import {
  avoidOptions,
  moodOptions,
  preferencesURL,
  wantedOptions,
} from "@/lib/search/parse";
import { Icon } from "./icons";
const moodIcons = ["☁", "♡", "☂", "↗", "☺", "✧"];
const moodNotes = [
  "Something soft to land on",
  "The can’t-stop-smiling kind",
  "Let it all out",
  "Just one more episode",
  "Lighten things up",
  "Stay with me afterward",
];
export function Quiz({
  initial,
  seedTitle,
  suggestions = [],
}: {
  initial: Preferences;
  seedTitle?: string;
  suggestions?: string[];
}) {
  const [step, setStep] = useState(0),
    [p, setP] = useState(initial),
    [pending, setPending] = useState(false);
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const options = [
    ...new Set([
      ...suggestions.filter((t) => wantedOptions.includes(t)),
      ...wantedOptions,
    ]),
  ];
  function move(n: number) {
    setStep(n);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function toggle(key: "wanted" | "avoid", v: string) {
    setP((old) => ({
      ...old,
      [key]: old[key].includes(v)
        ? old[key].filter((t) => t !== v)
        : [...old[key], v],
    }));
  }
  function next() {
    if (step < 2) move(step + 1);
    else {
      setPending(true);
      router.push(`/results?${preferencesURL(p)}`);
    }
  }
  return (
    <div className="quiz-panel">
      <div className="quiz-context">
        <Icon name="sparkles" size={16} />
        {seedTitle
          ? `Your next watch after ${seedTitle}`
          : p.query
            ? `Inspired by “${p.query}”`
            : p.country
              ? `Finding your next ${p.country === "KR" ? "K-drama" : "C-drama"}`
              : "A little about you. A better next watch."}
      </div>
      <div className="progress-row">
        <span>YOUR TASTE, IN THREE LITTLE STEPS</span>
        <span>{step + 1} / 3</span>
      </div>
      <div className="progress" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((n) => (
          <span className={n <= step ? "filled" : ""} key={n} />
        ))}
      </div>
      <h1 ref={heading} tabIndex={-1}>
        {
          [
            "What are you looking for?",
            "What’s your mood?",
            "Anything you want to avoid?",
          ][step]
        }
      </h1>
      <p className="muted quiz-description">
        {
          [
            "Pick the things that make a story your kind of story. Choose a few, or leave it open.",
            "Choose the feeling you want to take away.",
            "Your comfort comes first. Pick any dealbreakers, or keep an open mind.",
          ][step]
        }
      </p>
      {step === 0 && (
        <div className="quiz-tags">
          {options.map((v) => (
            <button
              aria-pressed={p.wanted.includes(v)}
              className={`choice ${p.wanted.includes(v) ? "selected" : ""}`}
              key={v}
              onClick={() => toggle("wanted", v)}
            >
              <span>
                {
                  ["♡", "✧", "⚑", "☺", "◷", "↗", "⌕", "☀", "⌂", "☾"][
                    wantedOptions.indexOf(v)
                  ]
                }
              </span>
              {v}
              {p.wanted.includes(v) && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="mood-choices">
          {moodOptions.map((v, i) => (
            <button
              aria-pressed={p.mood === v}
              className={`mood-choice ${p.mood === v ? "selected" : ""}`}
              key={v}
              onClick={() => setP({ ...p, mood: v })}
            >
              <span className="mood-symbol">{moodIcons[i]}</span>
              <strong>{v}</strong>
              <small>{moodNotes[i]}</small>
              {p.mood === v && (
                <span className="choice-check">
                  <Icon name="check" size={16} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <>
          <div className="quiz-tags">
            {[...avoidOptions, "None"].map((v) => (
              <button
                key={v}
                aria-pressed={
                  v === "None" ? p.avoid.length === 0 : p.avoid.includes(v)
                }
                className={`choice ${(v === "None" ? p.avoid.length === 0 : p.avoid.includes(v)) ? "selected" : ""}`}
                onClick={() =>
                  v === "None" ? setP({ ...p, avoid: [] }) : toggle("avoid", v)
                }
              >
                <Icon name={v === "None" ? "sparkles" : "close"} size={17} />
                {v}
              </button>
            ))}
          </div>
          <p className="fine-print">
            “Sad ending” keeps confirmed happy endings only. “Breakups” removes
            stories tagged with separation or a second-chance relationship. Our
            small catalog may return fewer matches.
          </p>
        </>
      )}
      <div className="quiz-bottom">
        <button
          className="text-button"
          onClick={() => (step ? move(step - 1) : router.push("/"))}
        >
          <Icon name="back" size={17} /> Back
        </button>
        <button className="button primary" disabled={pending} onClick={next}>
          {pending
            ? "Finding your stories…"
            : step === 2
              ? "Find my next drama"
              : "Continue"}
          <Icon name={step === 2 ? "sparkles" : "arrow"} size={18} />
        </button>
      </div>
      <p className="quiz-footnote">
        No account. No overthinking. Just a story that fits.
      </p>
    </div>
  );
}

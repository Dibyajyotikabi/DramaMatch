"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClose, IconExternal } from "./icons";

interface Props {
  live: boolean;
  onClose: () => void;
}

type State =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done" }
  | { kind: "error"; message: string; field?: string };

/** "Connect live data": paste API keys, test them, save them on this computer. */
export function SetupBox({ live, onClose }: Props) {
  const [tmdb, setTmdb] = useState("");
  const [omdb, setOmdb] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdb.trim() && !omdb.trim()) {
      setState({
        kind: "error",
        field: "tmdb",
        message: "Paste your TMDB API key first.",
      });
      return;
    }
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb: tmdb.trim(), omdb: omdb.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const [field, message] = data.errors
          ? (Object.entries(data.errors)[0] as [string, string])
          : ["", data.error];
        setState({
          kind: "error",
          field,
          message: message ?? "Something went wrong. Try again.",
        });
        return;
      }
      setState({ kind: "done" });
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setState({
        kind: "error",
        message:
          "Couldn't reach the app's server. Is `npm run dev` still running?",
      });
    }
  };

  const busy = state.kind === "saving" || state.kind === "done";

  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="setup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        onSubmit={save}
      >
        <button
          type="button"
          className="modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <IconClose />
        </button>
        <p className="eyebrow">
          {live ? "Live data is on" : "Live data is off"}
        </p>
        <h2 id="setup-title">Connect your movie API</h2>
        <p className="setup-lede">
          Paste your TMDB key to unlock every movie and series, real posters,
          cast and trailers. Keys are tested, then saved to{" "}
          <code>.env.local</code> on this computer only.
        </p>

        <label className="field" htmlFor="setup-tmdb">
          <span className="field-label">
            TMDB API key <em>required</em>
          </span>
          <span
            className={`field-box ${state.kind === "error" && state.field === "tmdb" ? "bad" : ""}`}
          >
            <input
              ref={first}
              id="setup-tmdb"
              type={show ? "text" : "password"}
              value={tmdb}
              onChange={(e) => setTmdb(e.target.value)}
              placeholder={
                live
                  ? "Already connected. Paste a new key to replace it"
                  : "e.g. 3f9c1d…  or the long eyJ… token"
              }
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            <button
              type="button"
              className="field-toggle"
              onClick={() => setShow((s) => !s)}
            >
              {show ? "Hide" : "Show"}
            </button>
          </span>
          <a
            className="field-help"
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get a free key: themoviedb.org → Settings → API{" "}
            <IconExternal size={12} />
          </a>
        </label>

        <label className="field" htmlFor="setup-omdb">
          <span className="field-label">
            OMDb API key <em>optional, adds real IMDb ratings</em>
          </span>
          <span
            className={`field-box ${state.kind === "error" && state.field === "omdb" ? "bad" : ""}`}
          >
            <input
              id="setup-omdb"
              type={show ? "text" : "password"}
              value={omdb}
              onChange={(e) => setOmdb(e.target.value)}
              placeholder="e.g. a1b2c3d4"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </span>
          <a
            className="field-help"
            href="https://www.omdbapi.com/apikey.aspx"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get a free key at omdbapi.com <IconExternal size={12} />
          </a>
        </label>

        {state.kind === "error" && (
          <p className="setup-msg bad" role="alert">
            {state.message}
          </p>
        )}
        {state.kind === "done" && (
          <p className="setup-msg good" role="status">
            <IconCheck size={16} /> Connected. Loading live data…
          </p>
        )}

        <div className="setup-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {state.kind === "saving"
              ? "Testing key…"
              : state.kind === "done"
                ? "Connected"
                : "Test & save"}
          </button>
        </div>
        <p className="setup-fine">
          Launching on Vercel or another host? Add <code>TMDB_API_KEY</code> in
          that host&apos;s Environment Variables instead; this box only works on
          the computer running the app.
        </p>
      </form>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
export function SaveButton({
  slug,
  small = false,
}: {
  slug: string;
  small?: boolean;
}) {
  const [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("dramamatch-saved") ?? "[]",
      );
      setSaved(Array.isArray(value) && value.includes(slug));
    } catch {}
  }, [slug]);
  function toggle() {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("dramamatch-saved") ?? "[]",
      );
      const ids = Array.isArray(value)
        ? value.filter((v) => typeof v === "string")
        : [];
      const next = saved
        ? ids.filter((id) => id !== slug)
        : [...new Set([...ids, slug])];
      localStorage.setItem("dramamatch-saved", JSON.stringify(next));
      setSaved(!saved);
      window.dispatchEvent(new Event("dramamatch-saved"));
    } catch {
      setError("Saving is unavailable in this browser.");
    }
  }
  return (
    <>
      <button
        className={small ? "save-small" : "button secondary"}
        aria-label={saved ? "Remove from saved" : "Save drama"}
        aria-pressed={saved}
        onClick={toggle}
      >
        <Icon name={saved ? "check" : "bookmark"} size={small ? 17 : 18} />
        {!small && (saved ? "Saved" : "Save")}
      </button>
      {error && <small role="status">{error}</small>}
    </>
  );
}

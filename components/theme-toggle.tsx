"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("dramamatch-theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      className="icon-button theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      <Icon name={dark ? "sun" : "moon"} size={19} />
    </button>
  );
}

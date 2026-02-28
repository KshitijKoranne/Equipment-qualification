"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("eq-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("eq-theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
      }}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

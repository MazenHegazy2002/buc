"use client";

export default function ThemeToggle() {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  };
  return (
    <button className="theme-toggle" id="theme-toggle" onClick={toggle} aria-label="Switch between light and dark mode">
      <span className="only-light">Dark mode</span>
      <span className="only-dark">Light mode</span>
    </button>
  );
}

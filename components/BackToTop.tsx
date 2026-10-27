"use client";

import type { MouseEvent } from "react";

export function BackToTop({ label }: { label: string }) {
  const scroll = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <a href="#main" aria-label="Back to top" onClick={scroll}>{label}</a>;
}

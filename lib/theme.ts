import type { CSSProperties } from "react";
import type { SiteContent } from "./types";

export function siteThemeStyle(theme: SiteContent["theme"]): CSSProperties {
  const modernFont = (font: string) => /--font-(space-grotesk|manrope)/.test(font) ? "var(--font-geist-sans), Arial, sans-serif" : font;
  return {
    "--bg": theme.background,
    "--surface": theme.surface,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--line": theme.line,
    "--font-body": modernFont(theme.bodyFont),
    "--font-display": modernFont(theme.displayFont),
    fontFamily: "var(--font-body)",
  } as CSSProperties;
}

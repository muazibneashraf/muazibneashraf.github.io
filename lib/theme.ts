import type { CSSProperties } from "react";
import type { SiteContent } from "./types";

export function siteThemeStyle(theme: SiteContent["theme"]): CSSProperties {
  return {
    "--bg": theme.background,
    "--surface": theme.surface,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--line": theme.line,
    "--font-body": theme.bodyFont,
    "--font-display": theme.displayFont,
    fontFamily: "var(--font-body)",
  } as CSSProperties;
}

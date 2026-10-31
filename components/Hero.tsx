"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ResumeLink } from "@/components/ResumeOverlay";
import Link from "next/link";
import type { SiteContent } from "@/lib/types";
import { gmailComposeUrl } from "@/lib/gmail";
import { NetworkVisual } from "./NetworkVisual";

const StableNetworkVisual = memo(NetworkVisual);
// A soft navigation shares this document; a browser refresh creates a new one.
let documentIntroCompleted = false;
const INTRO_TIMING = {
  startDelays: [120, 150, 140, 140],
  charDelays: [18, 24, 18, 18],
  completionHold: 400,
  transitionDuration: 950,
};
type IntroPhase = "init" | "typing" | "holding" | "transitioning" | "completed";

export function Hero({ content }: { content: SiteContent }) {
  const { home, identity, contact } = content;
  const [lead, ...accent] = home.accentWord
    .split(/(?<=\.)\s+|\n/)
    .map((line) => line.trim().replace(/\.$/, ""));
  const targetGreeting = home.eyebrow || "HELLO, WORLD. I'M";
  const targetTitle = home.title || "Muaz Ibne Ashraf";
  const targetLead = lead || "Building software";
  const targetAccent = accent.join(" ") || "Exploring intelligence";
  const [introPhase, setIntroPhase] = useState<IntroPhase>("init");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [typedLines, setTypedLines] = useState(["", "", "", ""]);
  const copyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRestorationRef = useRef<History["scrollRestoration"] | null>(null);
  const runRef = useRef(0);
  const phaseRef = useRef<IntroPhase>("init");

  const changePhase = useCallback((phase: IntroPhase) => {
    phaseRef.current = phase;
    setIntroPhase(phase);
    const state = phase === "completed" ? "completed" : phase === "transitioning" ? "transitioning" : "active";
    document.documentElement.dataset.introState = state;
    window.dispatchEvent(new CustomEvent("muaz-intro-state", { detail: { state } }));
  }, []);

  const finishIntro = useCallback(() => {
    ++runRef.current;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (scrollRestorationRef.current !== null) history.scrollRestoration = scrollRestorationRef.current;
    documentIntroCompleted = true;
    setActiveLine(null);
    changePhase("completed");
  }, [changePhase]);

  useEffect(() => {
    const run = ++runRef.current;
    let disposed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const previousRestoration = history.scrollRestoration;
    scrollRestorationRef.current = previousRestoration;
    const lines = [targetGreeting, targetTitle, targetLead, targetAccent].map(value => Array.from(value));
    const schedule = (callback: () => void, delay: number) => {
      timerRef.current = setTimeout(() => {
        if (!disposed && runRef.current === run) callback();
      }, delay);
    };
    // Only the text moves. Its full, final dimensions are present even when empty.
    const measure = () => {
      const el = copyRef.current;
      if (!el || !["init", "typing", "holding"].includes(phaseRef.current)) return;
      // Measure the full text itself: the wrapper also contains unused column
      // width and paragraph margins. Sizing spans stay constant while typing.
      const measuredLines = Array.from(el.querySelectorAll(".intro-line-size")).map((line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        return { line: line.parentElement, rects: Array.from(range.getClientRects()).filter(rect => rect.width && rect.height) };
      });
      const rects = measuredLines.flatMap(line => line.rects);
      if (!rects.length) return;
      const left = Math.min(...rects.map(rect => rect.left));
      const right = Math.max(...rects.map(rect => rect.right));
      const top = Math.min(...rects.map(rect => rect.top));
      const bottom = Math.max(...rects.map(rect => rect.bottom));
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const x = window.innerWidth / 2 - ((left + right) / 2 - matrix.m41);
      const desktopLift = window.innerWidth >= 1024 ? Math.min(64, window.innerHeight * 0.06) : 0;
      const y = window.innerHeight / 2 - desktopLift - ((top + bottom) / 2 - matrix.m42);
      el.style.setProperty("--intro-offset-x", `${Math.round(x)}px`);
      el.style.setProperty("--intro-offset-y", `${Math.round(y)}px`);
      const nameRects = measuredLines[1]?.rects ?? rects;
      const nameWidth = Math.max(...nameRects.map(rect => rect.right)) - Math.min(...nameRects.map(rect => rect.left));
      const nameLeft = (left + right - nameWidth) / 2;
      // Balance the short lines around the name, then glide each back to its
      // homepage alignment with transforms; the reserved layout stays untouched.
      for (const measured of measuredLines) {
        if (!measured.rects.length) continue;
        const lineLeft = Math.min(...measured.rects.map(rect => rect.left));
        const lineRight = Math.max(...measured.rects.map(rect => rect.right));
        const offset = measured.line?.closest(".eyebrow")
          ? nameLeft - lineLeft
          : (left + right - lineLeft - lineRight) / 2;
        measured.line?.style.setProperty("--intro-line-offset-x", `${Math.round(offset)}px`);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phaseRef.current !== "completed") finishIntro();
    };
    const onMotion = () => { if (motion.matches) finishIntro(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", measure);
    motion.addEventListener("change", onMotion);

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const arrivedViaClientNavigation = navigation && new URL(navigation.name).pathname !== "/";
    const isLegacyReload = (window.performance as unknown as { navigation?: { type?: number } })?.navigation?.type === 1;
    const isRefresh = navigation?.type === "reload" || isLegacyReload;
    const hasSectionTarget = Boolean(location.hash && location.hash !== "#top" && document.getElementById(location.hash.slice(1)));
    if (isRefresh) document.documentElement.dataset.introBypass = "true";
    if (documentIntroCompleted || isRefresh || arrivedViaClientNavigation || hasSectionTarget || motion.matches || new URLSearchParams(location.search).has("backgroundDebug")) {
      schedule(finishIntro, 0);
    } else {
      history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, behavior: "instant" });
      document.documentElement.dataset.introState = "active";
      window.dispatchEvent(new CustomEvent("muaz-intro-state", { detail: { state: "active" } }));
      // Fonts are local and preloaded by next/font. Measure only once they settle.
      void document.fonts.ready.then(() => {
        if (disposed || runRef.current !== run) return;
        measure();
        changePhase("typing");
        setTypedLines(["", "", "", ""]);
        setActiveLine(0);
        let line = 0;
        let char = 0;
        const type = () => {
          const characters = lines[line];
          char++;
          const currentLine = line;
          const typed = characters.slice(0, char).join("");
          setTypedLines((previous) => previous.map((value, index) => index === currentLine ? typed : value));
          if (char < characters.length) {
            schedule(type, INTRO_TIMING.charDelays[line]);
          } else if (line < lines.length - 1) {
            line++;
            char = 0;
            schedule(() => { setActiveLine(line); type(); }, INTRO_TIMING.startDelays[line]);
          } else {
            setActiveLine(null);
            changePhase("holding");
            schedule(() => {
              changePhase("transitioning");
              schedule(finishIntro, INTRO_TIMING.transitionDuration);
            }, INTRO_TIMING.completionHold);
          }
        };
        schedule(type, INTRO_TIMING.startDelays[0]);
      });
    }
    return () => {
      disposed = true;
      runRef.current = run + 1;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      history.scrollRestoration = previousRestoration;
      scrollRestorationRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", measure);
      motion.removeEventListener("change", onMotion);
      delete document.documentElement.dataset.introState;
      window.dispatchEvent(new CustomEvent("muaz-intro-state", { detail: { state: "completed" } }));
    };
  }, [changePhase, finishIntro, targetAccent, targetGreeting, targetLead, targetTitle]);

  const text = (value: string, index: number) => (
    <span className="intro-line" aria-label={value}>
      <span className="intro-line-size" aria-hidden="true">{value}</span>
      <span className="intro-line-typed" aria-hidden="true" data-typing={activeLine === index || undefined}>
        <span className="intro-typed-run">{introPhase === "completed" ? value : typedLines[index]}</span>
      </span>
    </span>
  );
  const canSkipIntro = introPhase === "init" || introPhase === "typing" || introPhase === "holding";
  return (
    <>
      <section id="top" className="hero wrap">
        <span className="mono hero-coordinate">{identity.location}</span>
        <div className="hero-body" data-intro-phase={introPhase}>
          <div className="hero-copy">
            <div className="hero-intro-copy" ref={copyRef}>
              <p className="eyebrow">{text(targetGreeting, 0)}</p>
              <h1>{text(targetTitle, 1)}</h1>
              <p className="hero-role">
                {text(targetLead, 2)}<br />
                <span>{text(targetAccent, 3)}</span>
              </p>
            </div>
            <div className="hero-actions">
              <Link href={content.hero.primaryUrl} className="button primary">
                {content.hero.primaryLabel}
              </Link>
              {identity.resumeUrl && (
                <ResumeLink className="button secondary">
                  {content.hero.resumeLabel}
                </ResumeLink>
              )}
            </div>
            <div className="hero-socials">
              <a
                href={content.site.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                {content.site.githubLabel}
              </a>
              {contact.linkedin && (
                <a href={contact.linkedin} target="_blank" rel="noreferrer">
                  {content.site.linkedinLabel}
                </a>
              )}
              <a
                href={gmailComposeUrl(identity.email)}
                target="_blank"
                rel="noreferrer"
              >
                {content.site.emailLabel}
              </a>
            </div>
          </div>
          <StableNetworkVisual projects={content.projects} hero={content.hero} identity={identity} />
        </div>
        <div className="hero-bottom mono">
          <span>{content.hero.scrollLabel}</span>
        </div>
      </section>
      {canSkipIntro && (
        <div className="intro-controls-wrap">
          <button type="button" className="intro-skip-btn mono" onClick={finishIntro} aria-label="Skip introduction">
            Skip intro <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </>
  );
}

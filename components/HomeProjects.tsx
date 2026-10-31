"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ContentSections, Project } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";

export function HomeProjects({ projects, labels }: { projects: Project[]; labels: ContentSections["projectPage"] }) {
  const [expanded, setExpanded] = useState(false);
  const [moving, setMoving] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnButtonTop = useRef<number | null>(null);
  const running = useRef(false);
  const disposed = useRef(false);
  const animations = useRef(new Set<Animation>());
  useEffect(() => {
    disposed.current = false;
    const active = animations.current;
    return () => { disposed.current = true; active.forEach(animation => animation.cancel()); };
  }, []);
  const important = projects.filter(project => project.featured);
  const remaining = projects.filter(project => !project.featured);
  async function toggle() {
    const viewport = viewportRef.current, grid = gridRef.current;
    if (running.current || !viewport || !grid) return;
    running.current = true;
    setMoving(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motionPaused === "true";
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;
    root.style.overflowAnchor = "none";
    const animate = (element: Element, frames: Keyframe[], duration: number, delay = 0) => {
      const animation = element.animate(frames, { duration, delay, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
      animations.current.add(animation);
      return animation;
    };
    try {
      if (expanded) {
        // Return to the button's original viewport position while the full list
        // still exists, then collapse without letting scroll anchoring move it.
        const cards = [...grid.children] as HTMLElement[];
        const collapsedHeight = important.length ? Math.max(...cards.slice(0, important.length).map(card => card.getBoundingClientRect().bottom)) - grid.getBoundingClientRect().top : 0;
        const button = buttonRef.current!;
        const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 80;
        const previousTop = Math.max(header + 16, Math.min(returnButtonTop.current ?? window.innerHeight / 2, window.innerHeight - button.offsetHeight - 16));
        const gap = parseFloat(getComputedStyle(button.parentElement!).marginTop) || 0;
        const top = Math.max(0, grid.getBoundingClientRect().top + window.scrollY + collapsedHeight + gap - previousTop);
        if (!reduced) {
          const from = window.scrollY, start = performance.now();
          await new Promise<void>(resolve => {
            const step = (now: number) => {
              if (disposed.current) { resolve(); return; }
              const progress = Math.min(1, (now - start) / 650);
              const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
              window.scrollTo({ top: from + (top - from) * eased, behavior: "instant" });
              if (progress < 1) requestAnimationFrame(step); else resolve();
            };
            requestAnimationFrame(step);
          });
        } else window.scrollTo({ top, behavior: "instant" });
        if (disposed.current) return;
        if (!reduced) {
          const from = grid.getBoundingClientRect().height;
          cards.slice(important.length).forEach(card => animate(card, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-12px)" }], 220));
          await animate(viewport, [{ height: `${from}px` }, { height: `${collapsedHeight}px` }], 650).finished.catch(() => {});
        }
        if (!disposed.current) flushSync(() => setExpanded(false));
      } else {
        returnButtonTop.current = buttonRef.current?.getBoundingClientRect().top ?? null;
        const from = grid.getBoundingClientRect().height;
        flushSync(() => setExpanded(true));
        if (!reduced) {
          const to = grid.getBoundingClientRect().height;
          const height = animate(viewport, [{ height: `${from}px` }, { height: `${to}px` }], 760);
          [...grid.children].slice(important.length).forEach((card, index) => animate(card, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], 500, 80 + Math.min(index, 5) * 30));
          await height.finished.catch(() => {});
        }
      }
    } finally {
      animations.current.forEach(animation => animation.cancel());
      animations.current.clear();
      root.style.overflowAnchor = previousAnchor;
      running.current = false;
      if (!disposed.current) setMoving(false);
    }
  }
  return <>
    <div className="home-project-viewport" ref={viewportRef} aria-busy={moving}>
      <div id="home-project-list" ref={gridRef} className="project-grid featured-project-grid">
        {[...important, ...(expanded ? remaining : [])].map(project => <ProjectCard key={project.id} project={project} labels={labels} />)}
      </div>
    </div>
    {remaining.length > 0 && <div className="home-project-expansion">
      <button ref={buttonRef} className="button secondary" type="button" disabled={moving} aria-expanded={expanded} aria-controls="home-project-list" onClick={toggle}>
        {expanded ? "See fewer projects" : "See all projects"}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <span className="mono" aria-live="polite">{expanded ? projects.length : important.length} of {projects.length} projects</span>
    </div>}
  </>;
}

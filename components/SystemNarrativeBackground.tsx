"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { advanceBackground, createBackgroundSystem, damp, SECTION_THEMES, segmentClearance, type NarrativeSection, type SafeRect, createNeuroField, advanceNeuroField } from "@/lib/background-system";

export type { NarrativeSection } from "@/lib/background-system";
const SECTIONS = Object.keys(SECTION_THEMES) as NarrativeSection[];
const PROTECTED = [
  ".hero-copy", ".hero-actions", ".network-visual", ".section-heading",
  ".project-card", ".about-copy", ".education-card", ".skill-group", ".research-panel", ".trace-workbench",
  ".experience-row", ".capability-card", ".stack-section",
  ".page-intro", ".project-narrative", ".contact-details", ".contact-form",
  ".site-footer",
].join(",");

function sectionForPath(path: string): NarrativeSection {
  if (path.startsWith("/projects")) return "work";
  if (path.startsWith("/about")) return "about";
  if (path.startsWith("/experience") || path.startsWith("/internship")) return "job-experience";
  if (path.startsWith("/extracurricular")) return "experience";
  if (path.startsWith("/contact")) return "contact";
  return "hero";
}

export function SystemNarrativeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const routeRef = useRef("/");
  const refreshRef = useRef<(() => void) | null>(null);
  const pathname = usePathname();

  // Routing changes targets and cached content, never engine time.
  useEffect(() => {
    routeRef.current = pathname;
    refreshRef.current?.();
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    type CanvasWithContext = HTMLCanvasElement & { __narrativeContext?: CanvasRenderingContext2D };
    const canvasEl = canvas as CanvasWithContext;
    const context = canvasEl.__narrativeContext || canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;
    canvasEl.__narrativeContext = ctx;
    const system = createBackgroundSystem();
    const neuroField = createNeuroField();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let introWeight = 0;
    let targetIntroWeight = 0;
    let introStage: "active" | "transitioning" | "completed" = "completed";
    const initialPhase = document.querySelector(".hero-body")?.getAttribute("data-intro-phase");
    if (routeRef.current === "/" && initialPhase !== "completed" && document.documentElement.dataset.introBypass !== "true" && !motion.matches && !window.location.search.includes("backgroundDebug")) {
      targetIntroWeight = 1;
      introWeight = 1;
      introStage = "active";
    }
    const atmosphere = document.createElement("canvas");
    const lightCtx = atmosphere.getContext("2d")!;
    let frame = 0, layoutFrame = 0, scrollFrame = 0, lastTime: number | null = null;
    let width = 0, height = 0, ratio = 1, lightTime = -1, gutter = 48;
    let paused = document.querySelector(".interactive-network")?.getAttribute("data-motion") === "paused";
    let section: NarrativeSection = sectionForPath(routeRef.current);
    let scroll = window.scrollY;
    let zones: SafeRect[] = [], visibleZones: SafeRect[] = [];
    let sections: { id: NarrativeSection; top: number; bottom: number }[] = [];
    let pageHeight = 0, headerBottom = 80;
    let disposed = false;
    const canAnimate = () => !paused && !motion.matches && !document.hidden;

    const updateFieldTarget = () => {
      if (introStage === "active") { targetIntroWeight = 1; return; }
      if (introStage === "transitioning") { targetIntroWeight = 0.12; return; }
      if (routeRef.current !== "/") { targetIntroWeight = 0.65; return; }
      const hero = sections.find(item => item.id === "hero");
      if (!hero) { targetIntroWeight = 0; return; }
      const start = Math.max(0, hero.bottom - headerBottom - height * 0.25);
      const progress = Math.max(0, Math.min(1, (scroll - start) / Math.max(160, height * 0.4)));
      targetIntroWeight = 0.65 * progress * progress * (3 - 2 * progress);
    };

    const selectSection = () => {
      let next = sectionForPath(routeRef.current);
      if (routeRef.current === "/") {
        const focal = scroll + height * 0.42;
        const current = sections.find((s) => s.id === section);
        if (scroll < 100) next = "hero";
        else if (scroll + height >= pageHeight - 70) next = "contact";
        // A dead band keeps either scroll direction stable at boundaries.
        else if (current && focal >= current.top - 48 && focal <= current.bottom + 48) next = section;
        else next = sections.find((s) => s.top <= focal && s.bottom > focal)?.id ?? section;
      }
      if (next !== section) {
        section = next;
        document.documentElement.dataset.narrativeSection = next;
        canvas.parentElement!.dataset.activeSection = next;
      }
      visibleZones = zones.filter((z) => z.bottom > scroll - 64 && z.top < scroll + height + 64);
      updateFieldTarget();
    };

    // Layout reads happen after content/layout changes, never in the render loop.
    const measure = () => {
      layoutFrame = 0;
      width = canvas.clientWidth; height = canvas.clientHeight;
      const wrap = document.querySelector("#main .wrap");
      gutter = wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) : 24;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(width * ratio), h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      atmosphere.width = Math.max(1, Math.round(width / 2));
      atmosphere.height = Math.max(1, Math.round(height / 2));
      lightTime = -1; scroll = window.scrollY;
      pageHeight = document.documentElement.scrollHeight;
      sections = SECTIONS.flatMap((id) => {
        const el = id === "hero" ? document.querySelector("section.hero") : document.getElementById(id);
        if (!el) return [];
        const r = el.getBoundingClientRect();
        return [{ id, top: r.top + scroll, bottom: r.bottom + scroll }];
      });
      const elements = Array.from(document.querySelectorAll(PROTECTED));
      const selected = new Set(elements);
      zones = elements.filter((el) => {
        for (let p = el.parentElement; p; p = p.parentElement) if (selected.has(p)) return false;
        return !el.closest(".site-header");
      }).flatMap((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height ? [{ left: r.left - 6, right: r.right + 6, top: r.top + scroll - 6, bottom: r.bottom + scroll + 6 }] : [];
      });
      const header = document.querySelector(".site-header");
      headerBottom = header?.getBoundingClientRect().height ?? 80;
      const nav = header?.querySelector(".nav-links");
      if (nav && getComputedStyle(nav).display !== "none") headerBottom = Math.max(headerBottom, nav.getBoundingClientRect().bottom);
      selectSection();
      if (!canAnimate()) draw(0); else schedule();
    };
    const requestMeasure = () => {
      if (!disposed && !layoutFrame) layoutFrame = requestAnimationFrame(measure);
    };
    refreshRef.current = requestMeasure;

    const segmentVisibility = (ax: number, ay: number, bx: number, by: number) => {
      let distance = Math.max(0, Math.min(ay, by) - headerBottom - 8);
      for (const z of visibleZones) {
        // Broad phase avoids exact-distance work outside the feather region.
        if (Math.max(ax, bx) < z.left - 24 || Math.min(ax, bx) > z.right + 24 || Math.max(ay, by) + scroll < z.top - 24 || Math.min(ay, by) + scroll > z.bottom + 24) continue;
        distance = Math.min(distance, segmentClearance(ax, ay + scroll, bx, by + scroll, z));
        if (distance === 0) return 0;
      }
      const t = Math.min(1, distance / 24);
      return t * t * (3 - 2 * t);
    };
    // Keep the full intro composition, then soften it behind reading content.
    const fieldVisibility = (ax: number, ay: number, bx: number, by: number) =>
      introStage === "completed" ? 0.35 + 0.65 * segmentVisibility(ax, ay, bx, by) : 1;

    const drawAtmosphere = () => {
      const mobile = width < 768;
      if (mobile) {
        // Direct vector-smooth radial gradient on mobile - crystal clear, 0 pixelated blur
        const time = system.clock;
        const color = system.color;
        const x = width * 0.55 + Math.sin(time * 0.065) * width * 0.08;
        const y = height * 0.35 + Math.cos(time * 0.049) * height * 0.08;
        const r = Math.max(width, height) * 0.5;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
        glow.addColorStop(0, `rgba(${color.join(",")},${system.light * 0.3})`);
        glow.addColorStop(1, `rgba(${color.join(",")},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        return;
      }
      // Half-resolution light fields on desktop, refreshed at most 24 times per second.
      if (lightTime < 0 || system.clock - lightTime > 1 / 24) {
        lightTime = system.clock;
        const w = atmosphere.width, h = atmosphere.height, time = system.clock;
        lightCtx.clearRect(0, 0, w, h);
        for (let layer = 0; layer < 3; layer++) {
          const color = layer === 1 ? system.secondary : system.color;
          const x = w * (layer === 0 ? 0.73 : layer === 1 ? 0.17 : 0.58) + Math.sin(time * 0.065 + layer * 2) * w * 0.08;
          const y = h * (layer === 0 ? 0.27 : layer === 1 ? 0.65 : 0.9) + Math.cos(time * 0.049 + layer) * h * 0.075;
          const r = Math.max(w, h) * (layer === 2 ? 0.42 : 0.65);
          const glow = lightCtx.createRadialGradient(x, y, 0, x, y, r);
          glow.addColorStop(0, `rgba(${color.join(",")},${system.light * (layer === 2 ? 0.38 : 1)})`);
          glow.addColorStop(1, `rgba(${color.join(",")},0)`);
          lightCtx.fillStyle = glow; lightCtx.fillRect(0, 0, w, h);
        }
      }
      ctx.drawImage(atmosphere, 0, 0, width, height);
    };

    function draw(dt: number) {
      if (!width || !height) return;
      const mobile = width < 768;
      if (dt > 0) {
        advanceBackground(system, dt, section, mobile, scroll);
        if (introWeight > 0.001 || targetIntroWeight > 0.001) {
          advanceNeuroField(neuroField, dt, system.clock, mobile);
          introWeight = damp(introWeight, targetIntroWeight, 2.4, dt);
        }
      }
      if (motion.matches) {
        introWeight = targetIntroWeight;
        const target = SECTION_THEMES[section];
        system.color = [...target.color]; system.secondary = [...target.secondary];
        system.light = target.light; system.energy = target.energy; lightTime = -1;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height); drawAtmosphere();
      ctx.save();

      // Render the living continuous Neuro-Wave environment
      if (introWeight > 0.002) {
        for (const n of neuroField.nodes) {
          n.screenX = n.x * width;
          n.screenY = n.y * height;
        }

        for (const edge of neuroField.edges) {
          const a = neuroField.nodes[edge.from];
          const b = neuroField.nodes[edge.to];
          const avgBrightness = (a.brightness + b.brightness) * 0.5;
          const alpha = Math.max(0.08, avgBrightness * 0.35) * introWeight * system.energy * fieldVisibility(a.screenX, a.screenY, b.screenX, b.screenY);
          if (alpha < 0.003) continue;
          ctx.strokeStyle = `rgba(85, 223, 252, ${alpha})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(a.screenX, a.screenY);
          ctx.lineTo(b.screenX, b.screenY);
          ctx.stroke();
        }

        for (const p of neuroField.pulses) {
          if (p.progress > 1) continue;
          const edge = neuroField.edges[p.edgeIdx];
          if (!edge) continue;
          const a = neuroField.nodes[edge.from];
          const b = neuroField.nodes[edge.to];

          const px = a.screenX + (b.screenX - a.screenX) * p.progress;
          const py = a.screenY + (b.screenY - a.screenY) * p.progress;
          const alpha = Math.sin(p.progress * Math.PI) * 0.95 * introWeight * system.energy * fieldVisibility(px, py, px, py);
          if (alpha < 0.01) continue;

          const col = p.colorType === "cyan" ? "85, 223, 252" : "178, 155, 255";
          ctx.strokeStyle = `rgba(${col}, ${alpha * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(235, 250, 255, ${alpha * 0.95})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const n of neuroField.nodes) {
          const alpha = Math.max(0.15, n.brightness * (n.isHub ? 0.9 : 0.7)) * introWeight * (0.4 + system.energy * 0.6) * fieldVisibility(n.screenX, n.screenY, n.screenX, n.screenY);
          if (alpha < 0.005) continue;

          if (n.isHub) {
            ctx.strokeStyle = `rgba(85, 223, 252, ${alpha * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.screenX, n.screenY, n.radius * 2.2, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = n.isHub ? `rgba(235, 250, 255, ${alpha})` : `rgba(85, 223, 252, ${alpha})`;
          ctx.beginPath();
          ctx.arc(n.screenX, n.screenY, n.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const blend = dt > 0 ? Math.min(dt, 0.05) : 0;
      const color = system.color.map(Math.round).join(",");
      for (const n of system.nodes) {
        // Peripheral clusters occupy the actual gutters, including at 1440px.
        // Their identities, normalized trajectories and phases never change.
        const center = n.anchorX < 0.5 ? gutter * 0.42 : width - gutter * 0.42;
        n.screenX = n.ambient ? n.x * width : center + (n.x - n.anchorX) * Math.min(width, gutter * 10);
        n.screenY = (n.y - system.parallax * n.depth) * height;
        const target = n.clearance = segmentVisibility(n.screenX, n.screenY, n.screenX, n.screenY);
        n.visibility = motion.matches ? target : damp(n.visibility, target, 7, blend);
      }
      for (const edge of system.edges) {
        const a = system.nodes[edge.from], b = system.nodes[edge.to];
        const target = edge.clearance = segmentVisibility(a.screenX, a.screenY, b.screenX, b.screenY);
        edge.visibility = motion.matches ? target : damp(edge.visibility, target, 7, blend);
        const density = Math.min(a.density, b.density) * (motion.matches ? (mobile ? 0.75 : 1) : edge.density);
        const alpha = Math.min(edge.visibility, edge.clearance) * density * system.energy * 0.3;
        if (alpha < 0.002) continue;
        ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = 0.85;
        ctx.beginPath(); ctx.moveTo(a.screenX, a.screenY); ctx.lineTo(b.screenX, b.screenY); ctx.stroke();
      }
      for (const p of system.pulses) {
        if (p.progress > 1) continue; // Independent quiet intervals between signals.
        const edge = system.edges[p.edgeId], a = system.nodes[edge.from], b = system.nodes[edge.to];
        const density = Math.min(a.density, b.density) * (motion.matches ? (mobile ? 0.75 : 1) : edge.density);
        const alpha = Math.sin(p.progress * Math.PI) ** 2 * Math.min(edge.visibility, edge.clearance) * density * system.energy;
        if (alpha < 0.005) continue;
        const x = a.screenX + (b.screenX - a.screenX) * p.progress;
        const y = a.screenY + (b.screenY - a.screenY) * p.progress;
        ctx.fillStyle = `rgba(${color},${alpha * 0.25})`;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(225,249,255,${alpha * 0.7})`;
        ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      }
      for (const n of system.nodes) {
        const density = motion.matches ? (mobile ? 0.85 : 1) : n.density;
        const brightness = 0.84 + Math.sin(system.clock * n.speed * 1.7 + n.phase) * 0.16;
        const alpha = Math.min(n.visibility, n.clearance) * density * brightness * (n.ambient ? 0.18 : 0.68) * (0.4 + system.energy * 0.6);
        if (alpha < 0.003) continue;
        if (!n.ambient && n.radius > 2) {
          ctx.fillStyle = `rgba(${color},${alpha * 0.12})`;
          ctx.beginPath(); ctx.arc(n.screenX, n.screenY, n.radius * 3.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.beginPath(); ctx.arc(n.screenX, n.screenY, n.radius * system.scale, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function tick(timestamp: number) {
      frame = 0;
      if (!canAnimate()) { lastTime = null; return; }
      const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp; draw(dt); schedule();
    }
    function schedule() {
      if (!disposed && !frame && canAnimate()) frame = requestAnimationFrame(tick);
    }
    const syncMotion = () => {
      cancelAnimationFrame(frame); frame = 0; lastTime = null;
      if (document.hidden) return;
      draw(0); schedule();
    };
    const onMotion = (event: Event) => {
      const value = (event as CustomEvent<{ paused?: boolean }>).detail?.paused;
      if (typeof value === "boolean") {
        paused = value;
        document.documentElement.dataset.motionPaused = String(value);
        syncMotion();
      }
    };
    const onScroll = () => {
      scroll = window.scrollY;
      if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0; selectSection();
        if (!canAnimate() && !document.hidden) { lightTime = -1; draw(0); }
      });
    };

    // Opt-in diagnostics: snapshots only on request, no per-frame DOM writes.
    const inspect = (event: Event) => {
      (event as CustomEvent).detail?.({ section, paused, reduced: motion.matches, running: !!frame,
        system: structuredClone(system), neuroField: structuredClone(neuroField), fieldWeight: introWeight, targetFieldWeight: targetIntroWeight, width, height });
    };
    const debug = new URLSearchParams(window.location.search).has("backgroundDebug");
    if (debug) canvas.addEventListener("muaz-background-inspect", inspect);
    const resize = new ResizeObserver(requestMeasure);
    // This engine survives route changes; observe the persistent document so
    // replacement pages and late content still refresh its protected regions.
    resize.observe(document.body);
    resize.observe(canvas);
    const mutations = new MutationObserver((records) => {
      // Typing changes only the absolutely positioned text layer, never layout.
      // Avoid scanning and measuring the entire page on each character/cursor.
      if (records.some((record) => !(record.target instanceof Element ? record.target : record.target.parentElement)?.closest(".hero-intro-copy"))) requestMeasure();
    });
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-expanded"] });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", requestMeasure);
    window.addEventListener("muaz-trace-step", requestMeasure);
    window.addEventListener("muaz-motion-state", onMotion);
    const onIntroState = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string }>).detail;
      if (detail?.state === "active" || detail?.state === "typing") {
        introStage = "active";
      } else if (detail?.state === "transitioning") {
        introStage = "transitioning";
      } else if (detail?.state === "completed") {
        introStage = "completed";
      }
      updateFieldTarget();
      // Refresh protected content once the text reaches its final position.
      if (detail?.state === "completed") requestMeasure();
    };
    window.addEventListener("muaz-intro-state", onIntroState);
    document.addEventListener("visibilitychange", syncMotion);
    motion.addEventListener("change", syncMotion);
    document.fonts.ready.then(() => { if (!disposed) requestMeasure(); });
    advanceBackground(system, 0, section, window.innerWidth < 768, scroll);
    if (window.innerWidth < 768) {
      for (const n of system.nodes) n.density = 0.85;
      for (const e of system.edges) e.density = 0.75;
      system.scale = 0.85;
    }
    measure(); draw(0); schedule();
    return () => {
      disposed = true; refreshRef.current = null;
      delete document.documentElement.dataset.motionPaused;
      cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); cancelAnimationFrame(scrollFrame);
      resize.disconnect(); mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", requestMeasure);
      window.removeEventListener("muaz-trace-step", requestMeasure);
      window.removeEventListener("muaz-motion-state", onMotion);
      window.removeEventListener("muaz-intro-state", onIntroState);
      document.removeEventListener("visibilitychange", syncMotion);
      motion.removeEventListener("change", syncMotion);
      canvas.removeEventListener("muaz-background-inspect", inspect);
    };
  }, []);

  return <div className="system-narrative-container" aria-hidden="true">
    <canvas ref={canvasRef} className="system-narrative-canvas" />
  </div>;
}

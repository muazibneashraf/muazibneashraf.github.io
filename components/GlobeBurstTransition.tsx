"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { GlobeBurst } from "@/lib/globe-motion";
import { drawNeuralGlow } from "@/lib/neural-globe-glow";
import "./globe-motion.css";

// Lives in the root layout: the same particles survive the route changing below.
export function GlobeBurstTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const routeRef = useRef(pathname);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState<GlobeBurst | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => { routeRef.current = pathname; }, [pathname]);
  useEffect(() => {
    const start = (event: Event) => {
      if (routeRef.current !== "/") return;
      // Mount and paint the replacement before the source canvas disappears.
      flushSync(() => {
        setWaiting(false);
        setBurst((current) => current ?? (event as CustomEvent<GlobeBurst>).detail);
      });
    };
    window.addEventListener("muaz-globe-burst", start);
    return () => window.removeEventListener("muaz-globe-burst", start);
  }, []);

  useLayoutEffect(() => {
    if (!burst) return;
    const canvas = canvasRef.current, overlay = overlayRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !overlay) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const theme = getComputedStyle(overlay);
    const palette = {
      bg: theme.getPropertyValue("--bg").trim(), surface: theme.getPropertyValue("--surface").trim(),
      accent: theme.getPropertyValue("--accent").trim(),
      blue: theme.getPropertyValue("--blue").trim(), lilac: theme.getPropertyValue("--lilac").trim(),
      ink: theme.getPropertyValue("--ink").trim(),
    };
    document.documentElement.dataset.globeTransition = "active";
    document.documentElement.style.setProperty("--globe-page-opacity", "1");
    let frame = 0, last = 0, clock = 0, reveal = -1, welcomeExit = -1, navigated = false, offeredFallback = false;
    const points = burst.points.map((point, index) => {
      const dx = point.x - burst.centerX, dy = point.y - burst.centerY;
      const length = Math.max(1, Math.hypot(dx, dy));
      return { ...point, dx, dy, vx: dx / length * (240 + index % 7 * 42), vy: dy / length * (240 + index % 5 * 48) };
    });
    const draw = (time: number) => {
      clock += last ? Math.min(0.04, (time - last) / 1000) : 0;
      last = time;
      const width = window.innerWidth, height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const cover = Math.min(1, Math.max(0, (clock - 0.18) / 0.48));
      const coverEase = cover * cover * (3 - 2 * cover);
      // Fade only page content. The real network canvas remains visible below.
      let pageOpacity = 1 - coverEase;
      const expansion = Math.max(0, clock - 0.22);
      const ignition = 1 + Math.min(1, clock / 0.3) ** 2 * 0.22;
      const fade = Math.max(0, 1 - expansion / 1.5);
      drawNeuralGlow(ctx, burst.centerX, burst.centerY, burst.radius * ignition, palette, 1,
        Math.max(0, 1 - clock / 0.4));
      const glow = ctx.createRadialGradient(burst.centerX, burst.centerY, 0, burst.centerX, burst.centerY, burst.radius * (1.2 + expansion));
      glow.addColorStop(0, palette.accent);
      glow.addColorStop(0.5, palette.blue);
      glow.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.14 * fade;
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      const travel = 1.1 * Math.log(1 + expansion * 2.5);
      for (let edge = 0; edge < burst.edges.length; edge++) {
        const [a, b] = burst.edges[edge];
        const p = points[a], q = points[b];
        const curve = burst.curves[edge];
        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = Math.max(0, 0.45 - expansion * 1.5) * (0.55 + (p.z + q.z) * 0.2);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(burst.centerX + p.dx * ignition + p.vx * travel, burst.centerY + p.dy * ignition + p.vy * travel);
        ctx.quadraticCurveTo(burst.centerX + (curve.x - burst.centerX) * ignition + (p.vx + q.vx) * travel / 2,
          burst.centerY + (curve.y - burst.centerY) * ignition + (p.vy + q.vy) * travel / 2,
          burst.centerX + q.dx * ignition + q.vx * travel, burst.centerY + q.dy * ignition + q.vy * travel);
        ctx.stroke();
      }
      points.forEach((p, index) => {
        const x = burst.centerX + p.dx * ignition + p.vx * travel;
        const y = burst.centerY + p.dy * ignition + p.vy * travel;
        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = fade * Math.min(0.45, expansion);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * expansion * 0.07, y - p.vy * expansion * 0.07); ctx.stroke();
        ctx.fillStyle = index % 4 === 0 ? palette.lilac : palette.ink;
        ctx.globalAlpha = fade * (0.65 + p.z * 0.25);
        ctx.beginPath(); ctx.arc(x, y, index % 8 === 0 ? 2.6 : 1.4, 0, Math.PI * 2); ctx.fill();
      });
      if (expansion > 0) {
        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = Math.max(0, 0.35 - expansion * 0.4);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(burst.centerX, burst.centerY, burst.radius * (1.05 + expansion * 2), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!navigated && (clock > 0.66 || reduced.matches)) {
        navigated = true;
        router.push("/projects", { transitionTypes: ["globe-burst"] });
      }
      const welcome = welcomeRef.current;
      if (welcome) {
        // On a slow connection, hold the greeting until the destination is ready.
        if (routeRef.current === "/projects" && clock > 2.55 && welcomeExit < 0) welcomeExit = clock;
        const entrance = reduced.matches ? 0 : Math.min(1, Math.max(0, (clock - 0.9) / 0.5));
        const exit = welcomeExit < 0 ? 0 : Math.min(1, (clock - welcomeExit) / 0.45);
        const easeIn = entrance * entrance * (3 - 2 * entrance);
        const easeOut = exit * exit * (3 - 2 * exit);
        welcome.style.opacity = String(easeIn * (1 - easeOut));
        welcome.style.transform = `translateY(${(1 - easeIn) * 14 - easeOut * 8}px) scale(${0.98 + easeIn * 0.02})`;
        welcome.setAttribute("aria-hidden", String(entrance === 0 || exit === 1));
      }
      if (routeRef.current === "/projects" && (reduced.matches || (welcomeExit >= 0 && clock - welcomeExit > 0.35)) && reveal < 0) reveal = clock;
      if (reveal >= 0) {
        const progress = reduced.matches ? 1 : Math.min(1, (clock - reveal) / 0.7);
        const eased = progress * progress * (3 - 2 * progress);
        overlay.style.opacity = String(1 - eased);
        pageOpacity = 1 - coverEase * (1 - eased);
        if (progress === 1) { setBurst(null); return; }
      }
      document.documentElement.style.setProperty("--globe-page-opacity", String(pageOpacity));
      if (clock > 4 && !offeredFallback && routeRef.current !== "/projects") {
        offeredFallback = true; setWaiting(true);
      }
      if (routeRef.current !== "/" && routeRef.current !== "/projects") { setBurst(null); return; }
      frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.globeTransition;
      document.documentElement.style.removeProperty("--globe-page-opacity");
    };
  }, [burst, router]);

  if (!burst) return null;
  return <div ref={overlayRef} className="globe-burst-overlay" style={burst.theme as CSSProperties} data-globe-transition="active" role="status" aria-live="polite">
    <canvas ref={canvasRef} aria-hidden="true" />
    <span className="sr-only">Opening projects</span>
    <div ref={welcomeRef} className="globe-welcome" aria-hidden="true">
      <h2><span>Welcome to</span>{" "}My Projects</h2>
    </div>
    {waiting && <Link prefetch={false} className="globe-transition-fallback mono" href="/projects">Continue to projects →</Link>}
  </div>;
}

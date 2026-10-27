"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Project, HeroSettings, SiteContent } from "@/lib/types";
import "./hero-resume-motion.css";

const NODE_LAYOUTS = [
  {
    focus: "backend",
    className: "label-one",
    angle: -165,
    side: "left",
  },
  {
    focus: "research",
    className: "label-two",
    angle: 15,
    side: "right",
  },
  {
    focus: "fullstack",
    className: "label-four",
    angle: -40,
    side: "right",
  },
] as const;

type NetworkFocus = (typeof NODE_LAYOUTS)[number]["focus"];

// Pre-computed Fibonacci sphere geometry (computed once, 0 runtime allocation)
const NODE_COUNT = 180;
const BASE_NODES = Array.from({ length: NODE_COUNT }, (_, i) => {
  const y = 1 - (i / (NODE_COUNT - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
});

const EDGES: [number, number][] = [];
BASE_NODES.forEach((a, i) => {
  for (let j = i + 1; j < NODE_COUNT; j++) {
    const b = BASE_NODES[j];
    if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.34) {
      EDGES.push([i, j]);
    }
  }
});

// Focal hub nodes with enhanced luminescence
const HUB_NODES = new Set([0, 24, 48, 72, 96, 120, 144, 168]);

interface DataPulse {
  edgeIdx: number;
  progress: number;
  speed: number;
  isCyan: boolean;
}

export function NetworkVisual({ projects, hero, identity }: { projects: Project[]; hero: HeroSettings; identity: SiteContent["identity"] }) {
  const networkNodes = NODE_LAYOUTS.map(node => ({...node, label: hero.nodes.find(item => item.id === node.focus)?.label ?? "", preferred: hero.nodes.find(item => item.id === node.focus)?.projectId ?? ""}));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ targetX: 0, targetY: 0, currX: 0, currY: 0 });
  const motionControlRef = useRef<((paused: boolean) => void) | null>(null);
  const focusControlRef = useRef<(() => void) | null>(null);
  const selectedRef = useRef<NetworkFocus | null>(null);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<NetworkFocus | null>(null);

  const node = networkNodes.find((n) => n.focus === selected);
  const preview = node
    ? projects.find((project) => project.id === node.preferred)
    : undefined;

  useEffect(() => {
    selectedRef.current = selected;
    focusControlRef.current?.();
  }, [selected]);

  useEffect(() => {
    const onMotion = (event: Event) => {
      const value = (event as CustomEvent<{ paused?: boolean }>).detail?.paused;
      if (typeof value === "boolean") setPaused(value);
    };
    window.addEventListener("muaz-motion-state", onMotion);
    return () => window.removeEventListener("muaz-motion-state", onMotion);
  }, []);

  useEffect(() => {
    motionControlRef.current?.(paused);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("muaz-motion-state", { detail: { paused } }),
      );
    }
  }, [paused]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointerRef.current.targetX = Math.max(-1, Math.min(1, x * 2 - 1));
    pointerRef.current.targetY = Math.max(-1, Math.min(1, y * 2 - 1));
  };

  const handlePointerLeave = () => {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let angle = 0.35;
    let visible = true;
    let lastFrame = 0;
    let isPaused = false;
    let labelWidth = 0;
    let labelHeight = 0;
    let labeledFocus: NetworkFocus | null | undefined;
    let focusTime = 0;
    let measuredFocus: NetworkFocus | null | undefined;
    const focusWeights: Record<NetworkFocus, number> = { backend: 0, fullstack: 0, research: 0 };
    const previewTarget = { x: 0, y: 0 };

    // Pre-allocated coordinate buffers to guarantee 0 GC pressure in render loop
    const projected = Array.from({ length: NODE_COUNT }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));

    // Pre-allocated active packet pulses
    const PULSE_COUNT = 8;
    const pulses: DataPulse[] = Array.from({ length: PULSE_COUNT }, (_, i) => ({
      edgeIdx: Math.floor((i * EDGES.length) / PULSE_COUNT) % EDGES.length,
      progress: i / PULSE_COUNT,
      speed: 0.007 + (i % 3) * 0.003,
      isCyan: i % 2 === 0,
    }));

    const draw = (timestamp = 0) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      const elapsed = lastFrame && !isPaused && !motion.matches ? Math.min(timestamp - lastFrame, 40) : 0;
      const delta = elapsed / 16;
      const pointerBlend = 1 - Math.exp(-2.9 * elapsed / 1000);
      angle += elapsed * 0.0001;
      focusTime += elapsed;
      const activeFocus = selectedRef.current;
      const focusBlend = motion.matches || isPaused ? 1 : 1 - Math.exp(-elapsed * .008);
      for (const focus of Object.keys(focusWeights) as NetworkFocus[]) {
        focusWeights[focus] += ((activeFocus === focus ? 1 : 0) - focusWeights[focus]) * focusBlend;
      }
      const focusAmount = Math.min(1, focusWeights.backend + focusWeights.fullstack + focusWeights.research);

      // Supersample ordinary displays as well, keeping the thin orbit smooth.
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const ratio = isMobile
        ? Math.min(window.devicePixelRatio || 1, 1.35)
        : Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Use the canvas height for a prominent sphere; reserve side room for
      // the outer orbit on narrow screens instead of clipping its curve.
      const radius = Math.min(width / 2.35, height * 0.48);
      const centerX = width / 2;
      const centerY = height / 2;
      if (measuredFocus !== activeFocus || width !== labelWidth || height !== labelHeight) {
        measuredFocus = activeFocus;
        const terminal = containerRef.current?.querySelector<HTMLElement>(".terminal-card");
        if (terminal) {
          const bounds = terminal.getBoundingClientRect(), canvasBounds = canvas.getBoundingClientRect();
          previewTarget.x = bounds.left + bounds.width * .7 - canvasBounds.left;
          previewTarget.y = Math.min(height - 4, bounds.top - canvasBounds.top);
        }
      }

      // Anchor each floating label on the sphere's rim, with a small overlap.
      // Keep labels clear of the preview on shorter screens and selected modes.
      // Reposition after layout/selection changes, never during globe rotation.
      if (width !== labelWidth || height !== labelHeight || labeledFocus !== activeFocus) {
        labelWidth = width;
        labelHeight = height;
        labeledFocus = activeFocus;
        const terminalTop = containerRef.current?.querySelector<HTMLElement>(".terminal-card")?.offsetTop ?? height;
        const labelBottom = Math.min(height - 8, terminalTop - 12);
        const labels = NODE_LAYOUTS.map((n) => {
          const button = containerRef.current?.querySelector<HTMLButtonElement>(`[data-focus="${n.focus}"]`);
          return { n, button, width: button?.offsetWidth ?? 0, height: button?.offsetHeight ?? 0 };
        });
        for (const label of labels) {
          if (!label.button) continue;
          const angle = label.n.angle * Math.PI / 180;
          const edgeX = centerX + Math.cos(angle) * radius;
          const edgeY = centerY + Math.sin(angle) * radius;
          const left = label.n.side === "left" ? edgeX + 14 - label.width : edgeX - 14;
          label.button.style.left = `${Math.max(8, Math.min(width - label.width - 8, left))}px`;
          label.button.style.top = `${Math.max(24, Math.min(labelBottom - label.height, edgeY - label.height / 2))}px`;
        }
        containerRef.current?.setAttribute("data-labels-ready", "true");
      }

      // Atmosphere lives in the softly feathered CSS layer. A canvas-sized
      // glow previously left a visible straight edge above the sphere.

      // Quiet technical orbital paths framing the spherical cluster
      const orbit = ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius,
      );
      orbit.addColorStop(0, "rgba(85, 223, 252, 0.45)");
      orbit.addColorStop(0.5, "rgba(99, 135, 255, 0.28)");
      orbit.addColorStop(1, "rgba(178, 155, 255, 0.4)");
      ctx.strokeStyle = orbit;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.22, radius * 0.46, -0.45, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 0.56, radius * 1.1, -0.5, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();

      // Smooth pointer parallax interpolation
      pointerRef.current.currX +=
        (pointerRef.current.targetX - pointerRef.current.currX) * pointerBlend;
      pointerRef.current.currY +=
        (pointerRef.current.targetY - pointerRef.current.currY) * pointerBlend;

      const yaw = angle + pointerRef.current.currX * 0.35;
      const pitch = 0.28 + pointerRef.current.currY * 0.22;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Project 3D nodes into 2D view space
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = BASE_NODES[i];
        const x1 = n.x * cosYaw - n.z * sinYaw;
        const z1 = n.x * sinYaw + n.z * cosYaw;
        const y2 = n.y * cosPitch - z1 * sinPitch;
        const z2 = n.y * sinPitch + z1 * cosPitch;

        const perspective = 1 + z2 * 0.09;
        const pt = projected[i];
        pt.x = centerX + x1 * radius * perspective;
        pt.y = centerY + y2 * radius * perspective;
        pt.z = z2;
      }

      // Render network edges with depth-based luminescence
      const edgeCount = EDGES.length;
      ctx.globalAlpha = 1;
      for (let e = 0; e < edgeCount; e++) {
        const [i, j] = EDGES[e];
        const p = projected[i];
        const q = projected[j];
        const depth = (p.z + q.z + 2) / 4;

        if (depth > 0.55) {
          ctx.strokeStyle = `rgba(85, 223, 252, ${0.1 + depth * 0.4})`;
          ctx.lineWidth = 0.95;
        } else if (depth > 0.35) {
          ctx.strokeStyle = `rgba(99, 135, 255, ${0.06 + depth * 0.22})`;
          ctx.lineWidth = 0.7;
        } else {
          ctx.strokeStyle = `rgba(80, 110, 190, ${0.03 + depth * 0.12})`;
          ctx.lineWidth = 0.55;
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }

      // Render traveling data transmission signals
      for (let k = 0; k < PULSE_COUNT; k++) {
        const pulse = pulses[k];
        if (!isPaused && !motion.matches) {
          pulse.progress += pulse.speed * delta;
          if (pulse.progress >= 1) {
            pulse.progress = 0;
            pulse.edgeIdx = Math.floor(Math.random() * EDGES.length);
            pulse.speed = 0.007 + Math.random() * 0.008;
          }
        }

        const [i, j] = EDGES[pulse.edgeIdx];
        const p = projected[i];
        const q = projected[j];
        const avgZ = (p.z + q.z) / 2;

        if (avgZ > -0.15) {
          const px = p.x + (q.x - p.x) * pulse.progress;
          const py = p.y + (q.y - p.y) * pulse.progress;
          const alpha = Math.min(1, Math.max(0, (avgZ + 0.2) * 1.4));

          // Soft radiant bloom
          ctx.fillStyle = pulse.isCyan
            ? `rgba(85, 223, 252, ${0.32 * alpha})`
            : `rgba(178, 155, 255, ${0.32 * alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 4.2, 0, Math.PI * 2);
          ctx.fill();

          // High-luminance signal core
          ctx.fillStyle = pulse.isCyan
            ? `rgba(215, 250, 255, ${alpha})`
            : `rgba(240, 230, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render nodes with multi-tiered depth and hub glows
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = projected[i];
        const isHub = HUB_NODES.has(i);

        // Focal hub corona
        if (isHub && p.z > 0.1) {
          ctx.fillStyle = `rgba(85, 223, 252, ${0.12 + p.z * 0.18})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.z > 0.3) {
          ctx.fillStyle = `rgba(180, 245, 255, ${0.8 + p.z * 0.2})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHub ? 2.5 : 2.0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.z > 0) {
          ctx.fillStyle = `rgba(125, 195, 255, ${0.55 + p.z * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(110, 140, 220, ${0.2 + (p.z + 1) * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Schedule next frame when motion is enabled and visible
      if (!isPaused && !motion.matches && visible && !document.hidden) {
        lastFrame = timestamp;
        frame = requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      lastFrame = 0;
      draw();
    };
    motionControlRef.current = (value) => { isPaused = value; restart(); };
    focusControlRef.current = restart;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        restart();
      } else {
        cancelAnimationFrame(frame);
      }
    });

    observer.observe(canvas);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else if (visible) {
        restart();
      }
    };

    window.addEventListener("resize", restart);
    document.addEventListener("visibilitychange", handleVisibility);
    motion.addEventListener("change", restart);

    // Initial draw
    draw();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", restart);
      document.removeEventListener("visibilitychange", handleVisibility);
      motion.removeEventListener("change", restart);
      motionControlRef.current = null;
      focusControlRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="network-visual interactive-network"
      data-motion={paused ? "paused" : "running"}
      data-network-mode={selected ?? "overview"}
      style={{ touchAction: "pan-y" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onKeyDown={(e) => {
        if (e.key === "Escape") setSelected(null);
      }}
    >
      <div className="visual-caption mono">
        <span>{hero.visualCaption}</span>
        <span className="mint">{hero.visualHint}</span>
      </div>
      <canvas
        ref={canvasRef}
        aria-label={selected ? `${node?.label ?? selected}: interactive focus mode` : "Animated interconnected spherical network"}
        role="img"
      />
      {networkNodes.map((n) => (
        <button
          type="button"
          key={n.focus}
          className={`orbital-label network-node ${n.className} mono`}
          data-focus={n.focus}
          aria-expanded={selected === n.focus}
          aria-controls="network-project-preview"
          onClick={() => setSelected(selected === n.focus ? null : n.focus)}
        >
          {n.label}
          
        </button>
      ))}
      <div
        className={`terminal-card${selected ? " network-preview-open" : ""}`}
        data-focus={selected ?? undefined}
        id="network-project-preview"
        aria-live="polite"
      >
        {selected ? (
          <>
            <div className="terminal-top">
              <span className="mint">{node?.label}</span>
              <button
                type="button"
                className="network-preview-close"
                aria-label="Close project preview"
                onClick={() => {
                  setSelected(null);
                  document
                    .querySelector<HTMLButtonElement>(
                      `.network-node.${node?.className}`,
                    )
                    ?.focus();
                }}
              >
                ×
              </button>
            </div>
            <div className="network-preview-copy" key={selected}>
              {preview ? (
                <>
                  <p className="mono">{preview.role}</p>
                  <h3>{preview.title}</h3>
                  <p>{preview.summary}</p>
                  <Link
                    className="text-link"
                    href={`/projects/${preview.slug}`}
                  >
                    Explore project
                  </Link>
                </>
              ) : (
                <p>No project has been linked to this node yet.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="terminal-top">
              <span className="terminal-dots" aria-hidden="true">
                <i className="dot-red" />
                <i className="dot-yellow" />
                <i className="dot-green" />
              </span>
              <span className="terminal-path">{hero.codePath}</span>
              <span className="terminal-status">
                <i className="terminal-status-dot" aria-hidden="true" />
                python
              </span>
            </div>
            <code>
              <div className="terminal-code-line">
                <span className="terminal-line-num" aria-hidden="true">1</span>
                <span className="code-purple">class</span>{" "}
                <span className="mint">{hero.codeClass}</span>
                <span className="code-parens">(</span>
                <span className="code-type">{hero.codeBase}</span>
                <span className="code-parens">):</span>
              </div>
              <div className="terminal-code-line">
                <span className="terminal-line-num" aria-hidden="true">2</span>
                <span className="code-indent" aria-hidden="true">&nbsp;&nbsp;</span>
                <span className="code-prop">focus</span> = [
                <span className="code-string">{hero.codeFocus.map(value => JSON.stringify(value)).join(", ")}</span>]
              </div>
              <div className="terminal-code-line">
                <span className="terminal-line-num" aria-hidden="true">3</span>
                <span className="code-indent" aria-hidden="true">&nbsp;&nbsp;</span>
                <span className="code-prop">education</span> ={" "}
                <span className="code-string">{JSON.stringify(identity.university)}</span>
              </div>
              <div className="terminal-code-line">
                <span className="terminal-line-num" aria-hidden="true">4</span>
                <span className="code-indent" aria-hidden="true">&nbsp;&nbsp;</span>
                <span className="code-prop">mindset</span> ={" "}
                <span className="code-string">{JSON.stringify(hero.codeMindset)}</span>
              </div>
              <div className="terminal-prompt">
                <span className="terminal-prompt-sym" aria-hidden="true">&gt;</span>{" "}
                <span className="terminal-prompt-text">{hero.codePrompt}</span>
                <span className="cursor" aria-hidden="true">_</span>
              </div>
            </code>
          </>
        )}
      </div>
      <button
        className="motion-toggle mono"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
      >
        {paused ? "▶ Resume motion" : "Ⅱ Pause motion"}
      </button>
    </div>
  );
}

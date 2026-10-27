"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, HeroSettings, SiteContent } from "@/lib/types";
import { advanceGlobe, createGlobeMotion, rotateGlobe, type GlobeBurst } from "@/lib/globe-motion";
import { NEURAL_GLOBE } from "@/lib/neural-globe";
import { drawNeuralGlow } from "@/lib/neural-globe-glow";
import "./hero-resume-motion.css";
import "./globe-motion.css";

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

const BASE_NODES = NEURAL_GLOBE.nodes;
const EDGES = NEURAL_GLOBE.edges;
const NODE_COUNT = BASE_NODES.length;

const GLOBE_WARNINGS = [
  ["Hold on!", "Whoa, easy!", "Hey! Slow down!"],
  ["Stop spinning it!", "I'm getting dizzy!", "This feels unsafe…"],
  ["Stop!", "That's definitely too fast!", "Uh… we have a problem."],
  ["Stop! It's gonna explode!", "Too late. Brace yourself!", "I warned you!"],
] as const;

interface DataPulse {
  edgeIdx: number;
  progress: number;
  speed: number;
  isCyan: boolean;
}

export function NetworkVisual({ projects, hero, identity }: { projects: Project[]; hero: HeroSettings; identity: SiteContent["identity"] }) {
  const router = useRouter();
  const networkNodes = NODE_LAYOUTS.map(node => ({...node, label: hero.nodes.find(item => item.id === node.focus)?.label ?? "", preferred: hero.nodes.find(item => item.id === node.focus)?.projectId ?? ""}));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLButtonElement>(null);
  const warningRef = useRef<HTMLOutputElement>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const grab = grabRef.current;
    const container = containerRef.current;
    if (!canvas || !stage || !grab || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spin = createGlobeMotion();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let activePointer: number | null = null;
    let lastX = 0, lastY = 0, lastMove = 0, radiusAtGrab = 1, lastStatus = 0;
    let bursting = false;
    let warningRun = 0, warningTier = -1, warningTime = 0;
    let visible = true;
    let lastFrame = 0;
    let isPaused = false;
    let labelWidth = 0;
    let labelHeight = 0;
    let labeledFocus: NetworkFocus | null | undefined;
    let measuredFocus: NetworkFocus | null | undefined;
    const focusWeights: Record<NetworkFocus, number> = { backend: 0, fullstack: 0, research: 0 };
    const previewTarget = { x: 0, y: 0 };

    // Pre-allocated coordinate buffers to guarantee 0 GC pressure in render loop
    const projected = Array.from({ length: NODE_COUNT }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));
    const curves = EDGES.map(() => ({ x: 0, y: 0 }));
    const activation = new Float32Array(NODE_COUNT);
    const palette = getComputedStyle(container);
    const cyan = palette.getPropertyValue("--accent").trim();
    const blue = palette.getPropertyValue("--blue").trim();
    const lilac = palette.getPropertyValue("--lilac").trim();
    const ink = palette.getPropertyValue("--ink").trim();
    const glowTheme = { accent: cyan, blue };

    // Pre-allocated active packet pulses
    const PULSE_COUNT = 7;
    const pulses: DataPulse[] = Array.from({ length: PULSE_COUNT }, (_, i) => ({
      edgeIdx: NEURAL_GLOBE.inputs[i % NEURAL_GLOBE.inputs.length],
      progress: i / PULSE_COUNT,
      speed: 0.007 + (i % 3) * 0.003,
      isCyan: i % 2 === 0,
    }));

    const draw = (timestamp = 0) => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width === 0 || height === 0) return;
      const elapsed = lastFrame && !isPaused && !motion.matches ? Math.min(timestamp - lastFrame, 40) : 0;
      const delta = elapsed / 16;
      const activationDecay = Math.exp(-elapsed * 0.0025);
      if (spin.dragging && timestamp - lastMove > 80) {
        spin.velocityX *= Math.exp(-12 * elapsed / 1000);
        spin.velocityY *= Math.exp(-12 * elapsed / 1000);
      }
      advanceGlobe(spin, elapsed / 1000, !isPaused && !motion.matches);
      const warning = warningRef.current;
      if (warning) {
        if (spin.charge < 0.08 || isPaused || motion.matches) {
          warning.dataset.visible = "false";
          warning.textContent = "";
          warningTier = -1;
        } else {
          const tier = spin.charge < 0.3 ? 0 : spin.charge < 0.55 ? 1 : spin.charge < 0.78 ? 2 : 3;
          if (warningTier === -1) warningRun++;
          if (warningTier === -1 || (tier !== warningTier && timestamp - warningTime > 400)) {
            warning.textContent = GLOBE_WARNINGS[tier][(warningRun - 1) % 3];
            warning.dataset.level = String(tier);
            warning.dataset.visible = "true";
            warningTier = tier;
            warningTime = timestamp;
          }
        }
      }
      if (timestamp - lastStatus > 70 || timestamp === 0) {
        lastStatus = timestamp;
        container.style.setProperty("--globe-charge", spin.charge.toFixed(3));
        container.dataset.spinState = bursting ? "bursting" : spin.dragging ? "dragging" : spin.charge > 0.06 ? "charging" : "idle";
        container.dataset.spinSpeed = Math.hypot(spin.velocityX, spin.velocityY).toFixed(2);
      }
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
      const targetW = Math.round(width * 1.5 * ratio);
      const targetH = Math.round(height * 1.5 * ratio);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width * 1.5, height * 1.5);
      ctx.translate(width * 0.25, height * 0.25);

      // Use the canvas height for a prominent sphere; reserve side room for
      // the outer orbit on narrow screens instead of clipping its curve.
      const baseRadius = Math.min(width / 2.35, height * 0.48);
      const radius = baseRadius * spin.scale;
      const centerX = width / 2;
      const centerY = height / 2;
      if (measuredFocus !== activeFocus || width !== labelWidth || height !== labelHeight) {
        measuredFocus = activeFocus;
        const terminal = containerRef.current?.querySelector<HTMLElement>(".terminal-card");
        if (terminal) {
          const bounds = terminal.getBoundingClientRect(), canvasBounds = stage.getBoundingClientRect();
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
        grab.style.left = `${centerX - baseRadius}px`;
        grab.style.top = `${centerY - baseRadius}px`;
        grab.style.width = `${baseRadius * 2}px`;
        grab.style.height = `${baseRadius * 2}px`;
        const terminalTop = containerRef.current?.querySelector<HTMLElement>(".terminal-card")?.offsetTop ?? height;
        const labelBottom = Math.min(height - 8, terminalTop - 12);
        const labels = NODE_LAYOUTS.map((n) => {
          const button = containerRef.current?.querySelector<HTMLButtonElement>(`[data-focus="${n.focus}"]`);
          return { n, button, width: button?.offsetWidth ?? 0, height: button?.offsetHeight ?? 0 };
        });
        for (const label of labels) {
          if (!label.button) continue;
          const angle = label.n.angle * Math.PI / 180;
          const edgeX = centerX + Math.cos(angle) * baseRadius;
          const edgeY = centerY + Math.sin(angle) * baseRadius;
          const left = label.n.side === "left" ? edgeX + 14 - label.width : edgeX - 14;
          label.button.style.left = `${Math.max(8, Math.min(width - label.width - 8, left))}px`;
          label.button.style.top = `${Math.max(24, Math.min(labelBottom - label.height, edgeY - label.height / 2))}px`;
        }
        containerRef.current?.setAttribute("data-labels-ready", "true");
      }

      // Refined technical orbital paths framing the spherical cluster
      const orbit = ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius,
      );
      orbit.addColorStop(0, "rgba(85, 223, 252, 0.38)");
      orbit.addColorStop(0.5, "rgba(99, 135, 255, 0.22)");
      orbit.addColorStop(1, "rgba(178, 155, 255, 0.32)");
      ctx.strokeStyle = orbit;
      ctx.lineWidth = 0.95;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Primary elliptical orbit gently framing the globe
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.22, radius * 0.44, -0.45, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();

      // Subtle secondary orbit accent - delicate so it doesn't over-circle the scene
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 0.56, radius * 1.08, -0.5, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      drawNeuralGlow(ctx, centerX, centerY, radius, glowTheme, spin.charge);

      const { x: qx, y: qy, z: qz, w: qw } = spin;
      const xx = 1 - 2 * (qy * qy + qz * qz), xy = 2 * (qx * qy - qz * qw), xz = 2 * (qx * qz + qy * qw);
      const yx = 2 * (qx * qy + qz * qw), yy = 1 - 2 * (qx * qx + qz * qz), yz = 2 * (qy * qz - qx * qw);
      const zx = 2 * (qx * qz - qy * qw), zy = 2 * (qy * qz + qx * qw), zz = 1 - 2 * (qx * qx + qy * qy);

      // Project 3D nodes into 2D view space
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = BASE_NODES[i];
        const x1 = n.x * xx + n.y * xy + n.z * xz;
        const y2 = n.x * yx + n.y * yy + n.z * yz;
        const z2 = n.x * zx + n.y * zy + n.z * zz;

        const perspective = 1 + z2 * 0.09;
        const pt = projected[i];
        pt.x = centerX + x1 * radius * perspective;
        pt.y = centerY + y2 * radius * perspective;
        pt.z = z2;
        activation[i] *= activationDecay;
      }

      for (let e = 0; e < EDGES.length; e++) {
        const [a, b] = EDGES[e];
        const p = projected[a], q = projected[b];
        curves[e].x = (p.x + q.x) / 2;
        curves[e].y = (p.y + q.y) / 2;
      }

      // Render network edges with depth-based luminescence (restoring the outer circled texture)
      const edgeCount = EDGES.length;
      ctx.globalAlpha = 1;
      for (let e = 0; e < edgeCount; e++) {
        const [i, j] = EDGES[e];
        const p = projected[i];
        const q = projected[j];
        const depth = (p.z + q.z + 2) / 4;
        const signal = Math.max(activation[i], activation[j]);

        if (depth > 0.55) {
          ctx.strokeStyle = `rgba(85, 223, 252, ${0.1 + depth * 0.4 + signal * 0.2})`;
          ctx.lineWidth = 0.95 + signal * 0.3;
        } else if (depth > 0.35) {
          ctx.strokeStyle = `rgba(99, 135, 255, ${0.06 + depth * 0.22 + signal * 0.15})`;
          ctx.lineWidth = 0.7 + signal * 0.2;
        } else {
          ctx.strokeStyle = `rgba(80, 110, 190, ${0.03 + depth * 0.12 + signal * 0.1})`;
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
            activation[EDGES[pulse.edgeIdx][0]] = 0.8;
            activation[EDGES[pulse.edgeIdx][1]] = 1;
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
          ctx.globalAlpha = 0.32 * alpha;
          ctx.fillStyle = pulse.isCyan ? cyan : lilac;
          ctx.beginPath();
          ctx.arc(px, py, 4.2, 0, Math.PI * 2);
          ctx.fill();

          // High-luminance signal core
          ctx.globalAlpha = alpha;
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(px, py, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render nodes with multi-tiered depth and hub glows
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = projected[i];
        const isHub = BASE_NODES[i].hub;
        const signal = activation[i];

        // Focal hub corona
        if (isHub && p.z > 0.1) {
          ctx.globalAlpha = 0.12 + p.z * 0.18 + signal * 0.2;
          ctx.fillStyle = cyan;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7.5 + signal * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.z > 0.3) {
          ctx.globalAlpha = Math.min(1, 0.8 + p.z * 0.2 + signal * 0.2);
          ctx.fillStyle = isHub ? lilac : cyan;
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHub ? 2.5 : 2.0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.z > 0) {
          ctx.globalAlpha = Math.min(1, 0.55 + p.z * 0.3 + signal * 0.15);
          ctx.fillStyle = isHub ? lilac : blue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHub ? 2.0 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.2 + (p.z + 1) * 0.25;
          ctx.fillStyle = blue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (spin.charge >= 1 && !bursting) {
        bursting = true;
        spin.dragging = false;
        activePointer = null;
        if (typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
        container.dataset.spinState = "bursting";
        const bounds = stage.getBoundingClientRect();
        const style = getComputedStyle(container);
        const theme = Object.fromEntries(["--bg", "--surface", "--ink", "--muted", "--accent", "--line", "--blue", "--lilac", "--font-body", "--font-display", "--font-mono"]
          .map(property => [property, style.getPropertyValue(property).trim()]));
        window.dispatchEvent(new CustomEvent<GlobeBurst>("muaz-globe-burst", { detail: {
          theme,
          centerX: bounds.left + centerX, centerY: bounds.top + centerY, radius,
          points: projected.map(point => ({ x: bounds.left + point.x, y: bounds.top + point.y, z: point.z })),
          edges: EDGES,
          curves: curves.map(point => ({ x: bounds.left + point.x, y: bounds.top + point.y })),
        } }));
        return;
      }

      // Schedule next frame when motion is enabled and visible
      if (!bursting && !isPaused && !motion.matches && visible && !document.hidden) {
        lastFrame = timestamp;
        frame = requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      if (bursting) return;
      cancelAnimationFrame(frame);
      lastFrame = 0;
      draw();
    };
    const cancelDrag = () => {
      const pointer = activePointer;
      activePointer = null;
      spin.dragging = false;
      spin.velocityX = spin.velocityY = 0;
      if (pointer !== null && grab.hasPointerCapture(pointer)) grab.releasePointerCapture(pointer);
    };
    const onDown = (event: PointerEvent) => {
      if (bursting || activePointer !== null || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      // Pointer capture does not need DOM focus or a persistent focus outline.
      if (document.activeElement === grab) grab.blur();
      grab.setPointerCapture(event.pointerId);
      activePointer = event.pointerId;
      spin.dragging = spin.interacted = true;
      spin.velocityX = spin.velocityY = 0;
      lastX = event.clientX; lastY = event.clientY; lastMove = performance.now();
      radiusAtGrab = Math.min(stage.clientWidth / 2.35, stage.clientHeight * 0.48);
      container.dataset.spinState = "dragging";
      router.prefetch("/projects");
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer || bursting) return;
      const now = performance.now(), dt = Math.max(1 / 240, (now - lastMove) / 1000);
      const dx = -(event.clientY - lastY) * 1.35 / radiusAtGrab;
      const dy = (event.clientX - lastX) * 1.35 / radiusAtGrab;
      rotateGlobe(spin, dx, dy);
      const limit = Math.max(1, Math.hypot(dx / dt, dy / dt) / 14);
      const blend = 1 - Math.exp(-dt / 0.045);
      spin.velocityX += (dx / dt / limit - spin.velocityX) * blend;
      spin.velocityY += (dy / dt / limit - spin.velocityY) * blend;
      lastX = event.clientX; lastY = event.clientY; lastMove = now;
      if (isPaused || motion.matches) draw();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      const stale = Math.max(0, performance.now() - lastMove - 50) / 1000;
      spin.velocityX *= Math.exp(-12 * stale); spin.velocityY *= Math.exp(-12 * stale);
      spin.dragging = false;
      activePointer = null;
      if (grab.hasPointerCapture(event.pointerId)) grab.releasePointerCapture(event.pointerId);
      container.dataset.spinState = spin.charge > 0.06 ? "charging" : "idle";
    };
    const onCancel = (event: PointerEvent) => { if (event.pointerId === activePointer) cancelDrag(); };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activePointer !== null) { cancelDrag(); spin.charge = 0; }
    };
    const onKey = (event: KeyboardEvent) => {
      if (bursting) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); router.push("/projects", { transitionTypes: ["site-nav"] });
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const x = event.key === "ArrowUp" ? 0.16 : event.key === "ArrowDown" ? -0.16 : 0;
        const y = event.key === "ArrowRight" ? 0.16 : event.key === "ArrowLeft" ? -0.16 : 0;
        rotateGlobe(spin, x, y);
        if (isPaused || motion.matches) draw();
      } else if (event.key === "Escape") { cancelDrag(); spin.charge = 0; }
    };
    grab.addEventListener("pointerdown", onDown);
    grab.addEventListener("pointermove", onMove);
    grab.addEventListener("pointerup", onUp);
    grab.addEventListener("pointercancel", onCancel);
    grab.addEventListener("lostpointercapture", onCancel);
    grab.addEventListener("keydown", onKey);
    window.addEventListener("blur", cancelDrag);
    window.addEventListener("keydown", onEscape);
    motionControlRef.current = (value) => { isPaused = value; if (value) cancelDrag(); restart(); };
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
        cancelDrag();
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
      grab.removeEventListener("pointerdown", onDown);
      grab.removeEventListener("pointermove", onMove);
      grab.removeEventListener("pointerup", onUp);
      grab.removeEventListener("pointercancel", onCancel);
      grab.removeEventListener("lostpointercapture", onCancel);
      grab.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", cancelDrag);
      window.removeEventListener("keydown", onEscape);
      motionControlRef.current = null;
      focusControlRef.current = null;
    };
  }, [router]);

  return (
    <div
      ref={containerRef}
      className="network-visual interactive-network"
      data-motion={paused ? "paused" : "running"}
      data-network-mode={selected ?? "overview"}
      data-spin-state="idle"
      onKeyDown={(e) => {
        if (e.key === "Escape") setSelected(null);
      }}
    >
      <div className="visual-caption mono">
        <span>{hero.visualCaption}</span>
        <span className="mint">{hero.visualHint}</span>
      </div>
      <span className="sr-only" id="globe-instructions">Drag to rotate the globe, or use arrow keys. Press Enter to open projects.</span>
      <output ref={warningRef} className="globe-warning mono" data-visible="false" aria-live="polite" aria-atomic="true" />
      <div ref={stageRef} className="globe-stage">
        <canvas
          ref={canvasRef}
          aria-label={selected ? `${node?.label ?? selected}: interactive focus mode` : "Animated interconnected spherical network"}
          role="img"
        />
        <button ref={grabRef} className="globe-grab" type="button" aria-label="Spin the globe" aria-describedby="globe-instructions" />
      </div>
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

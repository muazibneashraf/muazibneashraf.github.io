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

interface SynapticRipple {
  nodeIdx: number;
  radius: number;
  maxRadius: number;
  speed: number;
  active: boolean;
  isCyan: boolean;
}

interface SatelliteRelay {
  radiusMult: number;
  angle: number;
  speed: number;
  tiltX: number;
  tiltZ: number;
  isCyan: boolean;
  targetHubIdx: number;
  pingPhase: number;
}

interface SpaceDust {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  speed: number;
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

    // Pre-allocated active packet pulses and synaptic ripple waves
    const PULSE_COUNT = 7;
    const pulses: DataPulse[] = Array.from({ length: PULSE_COUNT }, (_, i) => ({
      edgeIdx: NEURAL_GLOBE.inputs[i % NEURAL_GLOBE.inputs.length],
      progress: i / PULSE_COUNT,
      speed: 0.007 + (i % 3) * 0.003,
      isCyan: i % 2 === 0,
    }));

    const RIPPLE_COUNT = 6;
    const ripples: SynapticRipple[] = Array.from({ length: RIPPLE_COUNT }, (_, i) => ({
      nodeIdx: 0,
      radius: 0,
      maxRadius: 26,
      speed: 0.45,
      active: false,
      isCyan: i % 2 === 0,
    }));

    // Orbital satellite relays and deep space dust particles
    const satellites: SatelliteRelay[] = [
      { radiusMult: 1.22, angle: 0.8, speed: 0.0035, tiltX: -0.42, tiltZ: 0.25, isCyan: true, targetHubIdx: 12, pingPhase: 0 },
      { radiusMult: 1.28, angle: 3.2, speed: -0.0028, tiltX: 0.5, tiltZ: -0.38, isCyan: false, targetHubIdx: 60, pingPhase: 2.1 },
      { radiusMult: 1.18, angle: 4.9, speed: 0.0032, tiltX: -0.18, tiltZ: 0.65, isCyan: true, targetHubIdx: 108, pingPhase: 4.3 },
    ];

    const DUST_COUNT = 32;
    const spaceDust: SpaceDust[] = Array.from({ length: DUST_COUNT }, (_, i) => {
      const theta = (i * 2.399963) % (Math.PI * 2);
      const phi = Math.acos(1 - 2 * ((i + 0.5) / DUST_COUNT));
      const r = 1.08 + (i % 7) * 0.055;
      return {
        x: Math.sin(phi) * Math.cos(theta) * r,
        y: Math.sin(phi) * Math.sin(theta) * r,
        z: Math.cos(phi) * r,
        size: 0.7 + (i % 3) * 0.35,
        alpha: 0.15 + (i % 5) * 0.08,
        speed: 0.0008 + (i % 4) * 0.0004,
      };
    });

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

      // Dual technical orbital paths framing the spherical cluster (back arcs)
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 0.75;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.18, radius * 0.4, -0.42, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = lilac;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.25, radius * 0.44, 0.52, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      drawNeuralGlow(ctx, centerX, centerY, radius, glowTheme, spin.charge);

      // Subtle holographic Fresnel perimeter aura (ethereal edge glow, keeping the core open and unsmoothed)
      const fresnel = ctx.createRadialGradient(
        centerX, centerY, radius * 0.88,
        centerX, centerY, radius * 1.03
      );
      fresnel.addColorStop(0, "rgba(85, 223, 252, 0)");
      fresnel.addColorStop(0.65, "rgba(85, 223, 252, 0.045)");
      fresnel.addColorStop(0.85, "rgba(99, 135, 255, 0.055)");
      fresnel.addColorStop(1, "rgba(178, 155, 255, 0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = fresnel;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.03, 0, Math.PI * 2);
      ctx.fill();

      const { x: qx, y: qy, z: qz, w: qw } = spin;
      const xx = 1 - 2 * (qy * qy + qz * qz), xy = 2 * (qx * qy - qz * qw), xz = 2 * (qx * qz + qy * qw);
      const yx = 2 * (qx * qy + qz * qw), yy = 1 - 2 * (qx * qx + qz * qz), yz = 2 * (qy * qz - qx * qw);
      const zx = 2 * (qx * qz - qy * qw), zy = 2 * (qy * qz + qx * qw), zz = 1 - 2 * (qx * qx + qy * qy);

      // Render ambient micro-dust particles in 3D space
      ctx.fillStyle = cyan;
      for (let d = 0; d < DUST_COUNT; d++) {
        const dust = spaceDust[d];
        if (!isPaused && !motion.matches) {
          dust.x += dust.speed * delta * 0.2;
          if (dust.x > 1.5) dust.x = -1.5;
        }

        const dx = dust.x * xx + dust.y * xy + dust.z * xz;
        const dy = dust.x * yx + dust.y * yy + dust.z * yz;
        const dz = dust.x * zx + dust.y * zy + dust.z * zz;

        const persp = Math.sqrt(15) / (4 - dz);
        const px = centerX + dx * radius * persp;
        const py = centerY + dy * radius * persp;

        if (dz > -0.6) {
          ctx.globalAlpha = dust.alpha * Math.min(1, (dz + 0.8) * 0.65);
          ctx.beginPath();
          ctx.arc(px, py, dust.size * (persp > 1 ? 1.1 : 0.9), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Compute 3D satellite positions and project to screen space
      const satProjected = satellites.map((sat) => {
        if (!isPaused && !motion.matches) {
          sat.angle += sat.speed * delta;
          sat.pingPhase += 0.04 * delta;
        }

        const cosA = Math.cos(sat.angle), sinA = Math.sin(sat.angle);
        const cosT = Math.cos(sat.tiltX), sinT = Math.sin(sat.tiltX);
        const x0 = cosA * sat.radiusMult;
        const y0 = sinA * cosT * sat.radiusMult;
        const z0 = sinA * sinT * sat.radiusMult;

        const x1 = x0 * xx + y0 * xy + z0 * xz;
        const y2 = x0 * yx + y0 * yy + z0 * yz;
        const z2 = x0 * zx + y0 * zy + z0 * zz;

        const vx0 = -sinA, vy0 = cosA * cosT, vz0 = cosA * sinT;
        const vx1 = vx0 * xx + vy0 * xy + vz0 * xz;
        const vy2 = vx0 * yx + vy0 * yy + vz0 * yz;
        const wLen = Math.hypot(-vy2, vx1) || 1;
        const wx = -vy2 / wLen, wy = vx1 / wLen;

        const persp = Math.sqrt(15) / (4 - z2);
        const sx = centerX + x1 * radius * persp;
        const sy = centerY + y2 * radius * persp;

        return { sat, sx, sy, sz: z2, wx, wy };
      });

      const drawSatellite = (item: (typeof satProjected)[0]) => {
        const { sat, sx, sy, sz, wx, wy } = item;
        const color = sat.isCyan ? cyan : lilac;
        const depth = Math.min(1, Math.max(0, (sz + 1.2) * 0.45));

        // Solar array wings
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = 0.35 + depth * 0.45;
        ctx.beginPath();
        ctx.moveTo(sx - wx * 4.5, sy - wy * 4.5);
        ctx.lineTo(sx + wx * 4.5, sy + wy * 4.5);
        ctx.stroke();

        // Central satellite nucleus
        ctx.globalAlpha = 0.9 * depth;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing telemetry radio beacon
        const beaconPulse = Math.sin(sat.pingPhase * 2) * 0.5 + 0.5;
        ctx.globalAlpha = (0.15 + 0.25 * beaconPulse) * depth;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5 + beaconPulse * 2, 0, Math.PI * 2);
        ctx.fill();

        // Laser telemetry beam downlink to surface hub
        if (sz > -0.15) {
          const hubPt = projected[sat.targetHubIdx];
          if (hubPt && hubPt.z > -0.1) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.75;
            ctx.globalAlpha = (0.12 + 0.28 * beaconPulse) * Math.min(1, (sz + 0.4) * 1.1);
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(hubPt.x, hubPt.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Data reception point on target hub
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3 * beaconPulse;
            ctx.beginPath();
            ctx.arc(hubPt.x, hubPt.y, 3.2 + beaconPulse * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      // Draw back-satellites before the globe
      for (const item of satProjected) {
        if (item.sz <= 0) drawSatellite(item);
      }

      // Project 3D nodes into 2D view space
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = BASE_NODES[i];
        const x1 = n.x * xx + n.y * xy + n.z * xz;
        const y2 = n.x * yx + n.y * yy + n.z * yz;
        const z2 = n.x * zx + n.y * zy + n.z * zz;

        const perspective = Math.sqrt(15) / (4 - z2);
        const pt = projected[i];
        pt.x = centerX + x1 * radius * perspective;
        pt.y = centerY + y2 * radius * perspective;
        pt.z = z2;
        activation[i] *= activationDecay;
      }

      for (let e = 0; e < EDGES.length; e++) {
        const n = NEURAL_GLOBE.controls[e];
        const x = n.x * xx + n.y * xy + n.z * xz;
        const y = n.x * yx + n.y * yy + n.z * yz;
        const z = n.x * zx + n.y * zy + n.z * zz;
        const perspective = Math.sqrt(15) / (4 - z);
        curves[e].x = centerX + x * radius * perspective;
        curves[e].y = centerY + y * radius * perspective;
      }

      // Render network edges with depth-based luminescence (cortex circled texture + volumetric inner synapses)
      const edgeCount = EDGES.length;
      ctx.globalAlpha = 1;
      for (let e = 0; e < edgeCount; e++) {
        const [i, j] = EDGES[e];
        const p = projected[i];
        const q = projected[j];
        const depth = (p.z + q.z + 2) / 4;
        const shell = NEURAL_GLOBE.cortex[e];
        const signal = Math.max(activation[i], activation[j]);

        if (shell) {
          // Outer spherical cortex lattice (clean circled texture)
          ctx.strokeStyle = depth > 0.45 ? cyan : blue;
          ctx.globalAlpha = (0.055 + depth * depth * 0.28) + signal * 0.16;
          ctx.lineWidth = depth > 0.5 ? 0.75 : 0.55;
        } else {
          // Inner neural processing synapses: curved volumetric paths
          ctx.strokeStyle = activeFocus === "research" ? lilac : depth > 0.45 ? cyan : lilac;
          ctx.globalAlpha = (0.075 + depth * depth * 0.5) + signal * 0.2;
          ctx.lineWidth = 0.75 + signal * 0.35;
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(curves[e].x, curves[e].y, q.x, q.y);
        ctx.stroke();
      }

      // Render synaptic action potential ripples expanding from stimulated nodes and hubs
      for (let r = 0; r < RIPPLE_COUNT; r++) {
        const rip = ripples[r];
        if (!rip.active) continue;
        if (!isPaused && !motion.matches) {
          rip.radius += rip.speed * delta;
          if (rip.radius >= rip.maxRadius) {
            rip.active = false;
            continue;
          }
        }

        const pt = projected[rip.nodeIdx];
        if (pt.z > -0.2) {
          const progress = rip.radius / rip.maxRadius;
          const fade = (1 - progress) * Math.min(1, Math.max(0, (pt.z + 0.3) * 1.2));

          // Expanding primary ripple
          ctx.globalAlpha = 0.22 * fade;
          ctx.strokeStyle = rip.isCyan ? cyan : lilac;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rip.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Delicate trailing echo ring
          if (rip.radius > 6) {
            ctx.globalAlpha = 0.11 * fade;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, rip.radius - 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Render traveling data transmission signals with comet light trails
      for (let k = 0; k < PULSE_COUNT; k++) {
        const pulse = pulses[k];
        if (!isPaused && !motion.matches) {
          pulse.progress += pulse.speed * delta;
          if (pulse.progress >= 1) {
            const target = EDGES[pulse.edgeIdx][1];
            activation[target] = 1;
            const routes = NEURAL_GLOBE.outgoing[target];
            pulse.progress = 0;
            pulse.edgeIdx = routes.length
              ? routes[Math.floor(Math.random() * routes.length)]
              : NEURAL_GLOBE.inputs[Math.floor(Math.random() * NEURAL_GLOBE.inputs.length)];
            pulse.speed = 0.007 + Math.random() * 0.006;
            activation[EDGES[pulse.edgeIdx][0]] = 0.8;

            // Trigger action-potential ripple on arrival
            if (projected[target].z > -0.2) {
              const ripple = ripples.find((r) => !r.active);
              if (ripple) {
                ripple.active = true;
                ripple.nodeIdx = target;
                ripple.radius = 2;
                ripple.maxRadius = BASE_NODES[target].hub ? 26 : 18;
                ripple.speed = 0.5;
                ripple.isCyan = pulse.isCyan;
              }
            }
          }
        }

        const [i, j] = EDGES[pulse.edgeIdx];
        const p = projected[i];
        const q = projected[j];
        const avgZ = (p.z + q.z) / 2;

        if (avgZ > -0.18) {
          const t = pulse.progress, control = curves[pulse.edgeIdx];
          const u = 1 - t;
          const px = u * u * p.x + 2 * u * t * control.x + t * t * q.x;
          const py = u * u * p.y + 2 * u * t * control.y + t * t * q.y;

          // Tail coordinates (samples along bezier curve behind the pulse head)
          const t1 = Math.max(0, t - 0.035), u1 = 1 - t1;
          const p1x = u1 * u1 * p.x + 2 * u1 * t1 * control.x + t1 * t1 * q.x;
          const p1y = u1 * u1 * p.y + 2 * u1 * t1 * control.y + t1 * t1 * q.y;

          const t2 = Math.max(0, t - 0.07), u2 = 1 - t2;
          const p2x = u2 * u2 * p.x + 2 * u2 * t2 * control.x + t2 * t2 * q.x;
          const p2y = u2 * u2 * p.y + 2 * u2 * t2 * control.y + t2 * t2 * q.y;

          const alpha = Math.min(1, Math.max(0, (avgZ + 0.22) * 1.35));
          const color = pulse.isCyan ? cyan : lilac;

          // Luminous comet streak tail
          ctx.strokeStyle = color;
          ctx.lineCap = "round";

          ctx.globalAlpha = 0.14 * alpha;
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(p2x, p2y);
          ctx.lineTo(p1x, p1y);
          ctx.stroke();

          ctx.globalAlpha = 0.35 * alpha;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(px, py);
          ctx.stroke();

          // Soft radiant bloom at pulse head
          ctx.globalAlpha = 0.28 * alpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, 4.0, 0, Math.PI * 2);
          ctx.fill();

          // High-luminance signal core
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render nodes with multi-tiered depth and hub glows
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = projected[i];
        const isHub = BASE_NODES[i].hub;
        const isShell = BASE_NODES[i].shell;
        const signal = activation[i];
        const front = Math.max(0, (p.z + 1) / 2);

        // Focal hub corona and star diffraction spikes
        if ((isHub || signal > 0.1) && p.z > -0.1) {
          ctx.globalAlpha = 0.09 + signal * 0.16 + front * 0.1;
          ctx.fillStyle = isShell ? cyan : lilac;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (isShell ? 7 : 6) + signal * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Prominent front hubs: clean 4-point star lens flares
          if (p.z > 0.25 && isHub) {
            const flareLen = (isShell ? 8.5 : 7.5) + signal * 2.5;
            const flareAlpha = (0.24 + front * 0.42) * (0.8 + signal * 0.2);
            ctx.strokeStyle = isShell ? cyan : lilac;

            // Horizontal & vertical primary diffraction spikes
            ctx.globalAlpha = flareAlpha;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x - flareLen, p.y);
            ctx.lineTo(p.x + flareLen, p.y);
            ctx.moveTo(p.x, p.y - flareLen);
            ctx.lineTo(p.x, p.y + flareLen);
            ctx.stroke();

            // Diagonal micro-spikes for top front hubs
            if (p.z > 0.45) {
              const diagLen = flareLen * 0.45;
              ctx.globalAlpha = flareAlpha * 0.5;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(p.x - diagLen, p.y - diagLen);
              ctx.lineTo(p.x + diagLen, p.y + diagLen);
              ctx.moveTo(p.x - diagLen, p.y + diagLen);
              ctx.lineTo(p.x + diagLen, p.y - diagLen);
              ctx.stroke();
            }
          }
        }

        ctx.globalAlpha = Math.min(1, (isShell ? 0.2 + front * 0.55 : 0.3 + front * 0.65) + signal * 0.2);
        ctx.fillStyle = signal > 0.4 ? ink : isHub ? lilac : isShell ? cyan : blue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (isHub ? 2.3 : isShell ? 1.3 : 1.5) + signal * 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (isHub && p.z > 0) {
          ctx.globalAlpha = 0.2 + signal * 0.2;
          ctx.strokeStyle = isShell ? cyan : lilac;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.2 + signal, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Dual technical orbital paths framing the spherical cluster (front arcs)
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.18, radius * 0.4, -0.42, 0, Math.PI);
      ctx.stroke();

      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = lilac;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.25, radius * 0.44, 0.52, 0, Math.PI);
      ctx.stroke();

      // Draw front-satellites after the globe
      for (const item of satProjected) {
        if (item.sz > 0) drawSatellite(item);
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
    let isTouch = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDecided = false;

    const cancelDrag = () => {
      const pointer = activePointer;
      activePointer = null;
      spin.dragging = false;
      spin.velocityX = spin.velocityY = 0;
      isTouch = false;
      touchDecided = false;
      if (pointer !== null && grab.hasPointerCapture(pointer)) {
        try { grab.releasePointerCapture(pointer); } catch {}
      }
      container.dataset.spinState = "idle";
    };
    const onDown = (event: PointerEvent) => {
      if (bursting || activePointer !== null || !event.isPrimary || event.button !== 0) return;
      isTouch = event.pointerType === "touch";
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      lastMove = performance.now();
      radiusAtGrab = Math.min(stage.clientWidth / 2.35, stage.clientHeight * 0.48);

      if (document.activeElement === grab) grab.blur();

      if (!isTouch) {
        event.preventDefault();
        try { grab.setPointerCapture(event.pointerId); } catch {}
        spin.dragging = spin.interacted = true;
        spin.velocityX = spin.velocityY = 0;
        container.dataset.spinState = "dragging";
        router.prefetch("/projects");
      } else {
        // Mobile touch: wait for initial gesture displacement to differentiate
        // vertical thumb scrolling from horizontal globe spinning
        touchStartX = event.clientX;
        touchStartY = event.clientY;
        touchDecided = false;
        spin.dragging = false;
      }
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer || bursting) return;

      if (isTouch && !touchDecided) {
        const dxTotal = event.clientX - touchStartX;
        const dyTotal = event.clientY - touchStartY;
        const dist = Math.hypot(dxTotal, dyTotal);

        if (dist > 7) {
          touchDecided = true;
          // Predominantly vertical thumb scroll gesture: let browser scroll the page!
          if (Math.abs(dyTotal) > Math.abs(dxTotal) * 1.15) {
            cancelDrag();
            return;
          } else {
            // Horizontal swipe gesture: intentional globe rotation!
            try { grab.setPointerCapture(event.pointerId); } catch {}
            spin.dragging = spin.interacted = true;
            spin.velocityX = spin.velocityY = 0;
            container.dataset.spinState = "dragging";
            router.prefetch("/projects");
          }
        } else {
          return;
        }
      }

      if (!spin.dragging) return;
      if (isTouch && event.cancelable) event.preventDefault();

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
      isTouch = false;
      touchDecided = false;
      if (grab.hasPointerCapture(event.pointerId)) {
        try { grab.releasePointerCapture(event.pointerId); } catch {}
      }
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

// Simulation time and geometry belong to the environment, never to a section.
export type NarrativeSection = "hero" | "work" | "about" | "skills" | "research" | "trace" | "job-experience" | "experience" | "capabilities" | "contact";
type RGB = [number, number, number];
export interface SafeRect { left: number; top: number; right: number; bottom: number }
const cyan: RGB = [85, 223, 252], blue: RGB = [99, 135, 255];
const violet: RGB = [178, 155, 255], coral: RGB = [255, 150, 125];

export const SECTION_THEMES: Record<NarrativeSection, { color: RGB; secondary: RGB; light: number; energy: number }> = {
  hero: { color: cyan, secondary: blue, light: 0.12, energy: 0.8 },
  work: { color: violet, secondary: coral, light: 0.135, energy: 0.85 },
  about: { color: blue, secondary: violet, light: 0.105, energy: 0.6 },
  skills: { color: cyan, secondary: blue, light: 0.12, energy: 0.8 },
  research: { color: violet, secondary: blue, light: 0.125, energy: 0.7 },
  trace: { color: cyan, secondary: blue, light: 0.11, energy: 0.8 },
  "job-experience": { color: blue, secondary: violet, light: 0.075, energy: 0.4 },
  experience: { color: blue, secondary: violet, light: 0.075, energy: 0.4 },
  capabilities: { color: cyan, secondary: coral, light: 0.115, energy: 0.75 },
  contact: { color: blue, secondary: cyan, light: 0.085, energy: 0.45 },
};

export function damp(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * -Math.expm1(-rate * dt);
}

export function createBackgroundSystem() {
  let seed = 0x05032026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const centers = [[0.055, 0.21], [0.94, 0.46], [0.88, 0.82], [0.075, 0.79]];
  const offsets = [[0, -0.04], [0.018, 0], [-0.008, 0.045], [0.014, 0.071]];
  const nodes = Array.from({ length: 28 }, (_, id) => {
    const ambient = id >= 16;
    const center = centers[Math.floor(id / 4) % 4], offset = offsets[id % 4];
    const homeX = ambient ? 0.1 + random() * 0.8 : center[0] + offset[0];
    const homeY = ambient ? 0.12 + random() * 0.76 : center[1] + offset[1];
    return {
      id, cluster: ambient ? -1 : Math.floor(id / 4), homeX, homeY, anchorX: center[0],
      x: homeX, y: homeY, phase: random() * Math.PI * 2,
      speed: 0.09 + random() * 0.13, depth: 0.3 + random() * 0.7,
      radius: ambient ? 1 + random() * 0.5 : (id % 4 === 1 ? 2.7 : 1.6),
      ambient, mobile: id < 8 || (id >= 16 && id < 22), density: 1, visibility: 1, clearance: 1,
      driftX: 0.012, driftY: 0.016,
      screenX: 0, screenY: 0,
    };
  });
  const edges = centers.flatMap((_, cluster) => [[0, 1], [1, 2], [2, 3]].map(([a, b], local) => ({
    id: cluster * 3 + local, from: cluster * 4 + a, to: cluster * 4 + b, visibility: 1, density: 1, clearance: 1,
  })));
  const pulses = [0, 3, 7, 10].map((edgeId, id) => ({
    id, edgeId, progress: random() * 2, speed: 0.11 + random() * 0.07,
  }));
  const theme = SECTION_THEMES.hero;
  return {
    clock: 0, nodes, edges, pulses,
    color: [...theme.color] as RGB, secondary: [...theme.secondary] as RGB,
    light: theme.light, energy: theme.energy, parallax: 0, scale: 1,
  };
}
export type BackgroundSystem = ReturnType<typeof createBackgroundSystem>;

export function advanceBackground(system: BackgroundSystem, seconds: number, section: NarrativeSection, mobile: boolean, scroll: number) {
  const dt = Math.max(0, Math.min(seconds, 0.05));
  system.clock += dt;
  const theme = SECTION_THEMES[section];
  for (let c = 0; c < 3; c++) {
    system.color[c] = damp(system.color[c], theme.color[c], 1.8, dt);
    system.secondary[c] = damp(system.secondary[c], theme.secondary[c], 1.8, dt);
  }
  system.light = damp(system.light, theme.light, 1.8, dt);
  system.energy = damp(system.energy, theme.energy, 1.8, dt);
  system.parallax = damp(system.parallax, Math.tanh(scroll / 1800) * 0.012, 3, dt);
  system.scale = damp(system.scale, mobile ? 0.85 : 1, 4, dt);
  for (const edge of system.edges) edge.density = damp(edge.density, mobile ? 0.75 : 1, 4, dt);
  for (const node of system.nodes) {
    const t = system.clock * node.speed;
    node.x = node.homeX + Math.sin(t + node.phase) * node.driftX * node.depth;
    node.y = node.homeY + Math.cos(t * 0.83 + node.phase) * node.driftY * node.depth;
    node.density = damp(node.density, mobile ? 0.85 : 1, 4, dt);
  }
  for (const pulse of system.pulses) pulse.progress = (pulse.progress + pulse.speed * dt) % 2.4;
}

// Exact distance to a rectangle creates a continuous protection field. Whole
// edges fade before meeting content, rather than being cut into moving pieces.
function pointRectDistance(x: number, y: number, r: SafeRect) {
  return Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
}
function pointSegmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
export function segmentClearance(ax: number, ay: number, bx: number, by: number, r: SafeRect): number {
  if (segmentIntersectsRect(ax, ay, bx, by, r)) return 0;
  return Math.min(pointRectDistance(ax, ay, r), pointRectDistance(bx, by, r), pointSegmentDistance(r.left, r.top, ax, ay, bx, by), pointSegmentDistance(r.right, r.top, ax, ay, bx, by), pointSegmentDistance(r.left, r.bottom, ax, ay, bx, by), pointSegmentDistance(r.right, r.bottom, ax, ay, bx, by));
}

// Liang–Barsky tests the entire segment, including narrow regions that endpoint
// and midpoint sampling miss. Rectangles use document coordinates.
export function segmentIntersectsRect(ax: number, ay: number, bx: number, by: number, rect: SafeRect, pad = 0): boolean {
  let low = 0, high = 1;
  const dx = bx - ax, dy = by - ay;
  for (let side = 0; side < 4; side++) {
    const p = side === 0 ? -dx : side === 1 ? dx : side === 2 ? -dy : dy;
    const q = side === 0 ? ax - rect.left + pad : side === 1 ? rect.right + pad - ax : side === 2 ? ay - rect.top + pad : rect.bottom + pad - ay;
    if (p === 0) { if (q < 0) return false; }
    else {
      const t = q / p;
      if (p < 0) low = Math.max(low, t); else high = Math.min(high, t);
      if (low > high) return false;
    }
  }
  return true;
}

export interface NeuroNode {
  id: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  phase: number;
  speed: number;
  depth: number;
  radius: number;
  isHub: boolean;
  brightness: number;
  mobile: boolean;
}

export interface NeuroEdge {
  id: number;
  from: number;
  to: number;
}

export interface NeuroPulse {
  id: number;
  edgeIdx: number;
  progress: number;
  speed: number;
  colorType: "cyan" | "violet";
}

export interface NeuroField {
  nodes: NeuroNode[];
  edges: NeuroEdge[];
  pulses: NeuroPulse[];
}

export function createNeuroField(): NeuroField {
  let seed = 0x14041998;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const nodeCount = 42;
  const nodes: NeuroNode[] = Array.from({ length: nodeCount }, (_, id) => {
    const isPeriphery = id < 10;
    let homeX: number;
    let homeY: number;

    if (isPeriphery) {
      // Atmospheric nodes framing upper/lower regions
      homeX = 0.06 + random() * 0.88;
      homeY = id < 5 ? 0.05 + random() * 0.18 : 0.76 + random() * 0.18;
    } else {
      // Primary neural wave field distributed across the screen
      homeX = 0.08 + ((id - 10) % 8) * 0.11 + (random() - 0.5) * 0.06;
      homeY = 0.12 + Math.floor((id - 10) / 8) * 0.18 + (random() - 0.5) * 0.08;
    }

    const depth = 0.35 + random() * 0.65;
    const isHub = !isPeriphery && (id % 7 === 0);
    const radius = isHub ? 2.8 : (isPeriphery ? 1.4 + random() * 0.4 : 1.8 + random() * 0.6);
    const mobile = true;

    return {
      id,
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      screenX: 0,
      screenY: 0,
      phase: random() * Math.PI * 2,
      speed: 0.12 + random() * 0.16,
      depth,
      radius,
      isHub,
      brightness: 0.5,
      mobile,
    };
  });

  const edges: NeuroEdge[] = [];
  let edgeId = 0;
  const maxEdgesPerNode = 3;
  const connectionCounts = new Array(nodeCount).fill(0);

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (connectionCounts[i] >= maxEdgesPerNode || connectionCounts[j] >= maxEdgesPerNode) continue;
      const dx = nodes[i].homeX - nodes[j].homeX;
      const dy = nodes[i].homeY - nodes[j].homeY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.04 && dist < 0.23) {
        edges.push({ id: edgeId++, from: i, to: j });
        connectionCounts[i]++;
        connectionCounts[j]++;
      }
    }
  }

  const pulseCount = Math.min(6, edges.length);
  const pulses: NeuroPulse[] = Array.from({ length: pulseCount }, (_, id) => ({
    id,
    edgeIdx: (id * 3) % edges.length,
    progress: (id / pulseCount) * 1.5,
    speed: 0.14 + (id % 3) * 0.05,
    colorType: id % 2 === 0 ? "cyan" : "violet",
  }));

  return { nodes, edges, pulses };
}

export function advanceNeuroField(
  field: NeuroField,
  seconds: number,
  clock: number,
  mobile: boolean
) {
  const dt = Math.max(0, Math.min(seconds, 0.05));

  for (const node of field.nodes) {
    const w1 = Math.sin(node.homeX * 3.6 + node.homeY * 2.2 - clock * 0.85 + node.phase);
    const w2 = Math.sin(node.homeX * 2.4 - node.homeY * 3.2 + clock * 0.55);
    const waveVal = (w1 * 0.58 + w2 * 0.42 + 1) * 0.5;

    node.x = node.homeX + Math.sin(clock * node.speed + node.phase) * 0.010 * node.depth + Math.cos(w1) * 0.005;
    node.y = node.homeY + Math.cos(clock * node.speed * 0.85 + node.phase) * 0.013 * node.depth + Math.sin(w2) * 0.005;
    node.brightness = 0.32 + waveVal * 0.68;
  }

  for (const pulse of field.pulses) {
    pulse.progress += pulse.speed * dt;
    if (pulse.progress >= 1.8) {
      pulse.progress = 0;
      if (field.edges.length > 0) {
        pulse.edgeIdx = (pulse.edgeIdx + 3) % field.edges.length;
      }
    }
  }
}


export interface Neuron {
  x: number;
  y: number;
  z: number;
  shell: boolean;
  hub: boolean;
}

export interface NeuralGlobe {
  nodes: Neuron[];
  edges: [number, number][];
  controls: { x: number; y: number; z: number }[];
  cortex: boolean[];
  facets: boolean[];
  outgoing: number[][];
  inputs: number[];
}

// A 3D volumetric neural network globe:
// Outer spherical cortex (radius = 1.0) with clean circled lattice tracks and
// exact round spherical silhouette, wrapping seven internal volumetric AI
// processing layers. Signals actively pulse through the layered synaptic core
// and radiate to cortex hubs distributed across 3D space with zero linear alignment.
function createNeuralGlobe(): NeuralGlobe {
  const CORTEX_NODES = 144;
  const nodes: Neuron[] = [];
  const layers: number[][] = [];
  const edges: [number, number][] = [];
  const controls: { x: number; y: number; z: number }[] = [];
  const cortex: boolean[] = [];
  const facets: boolean[] = [];
  const seen = new Set<string>();
  const golden = Math.PI * (3 - Math.sqrt(5));

  // 1. Outer cortex: 144 nodes on the unit sphere (radius = 1.0)
  // Evenly distributed via Fibonacci spiral to guarantee exact round spherical silhouette
  for (let i = 0; i < CORTEX_NODES; i++) {
    const y = 1 - 2 * (i + 0.5) / CORTEX_NODES;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * golden;
    // Cortex hubs distributed across the spherical surface at different heights and depths
    const isCortexHub = i % 24 === 12;
    nodes.push({
      x: Math.cos(angle) * r,
      y,
      z: Math.sin(angle) * r,
      shell: true,
      hub: isCortexHub,
    });
  }

  // 2. Inner Volumetric Neural Processing Core: 7 layers [5, 8, 12, 14, 12, 8, 5] (64 nodes)
  // Deep neural architecture with nodes distributed across 3D cross-sectional layer disks
  const layerCounts = [5, 8, 12, 14, 12, 8, 5];
  layerCounts.forEach((count, layer) => {
    const x = -0.78 + layer * 0.26;
    const maxRadius = Math.sqrt(Math.max(0, 1 - x * x)) * 0.79;
    const indexes: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt((i + 0.6) / count) * maxRadius;
      const angle = i * golden + layer * 0.52;
      // Distribute hubs across different layers, radial distances, and 3D quadrants
      // avoiding center alignment (never all at i === 0)
      const isInnerHub =
        (layer === 1 && i === 3) ||
        (layer === 2 && i === 6) ||
        (layer === 3 && i === 2) ||
        (layer === 3 && i === 11) ||
        (layer === 4 && i === 5) ||
        (layer === 5 && i === 4);
      indexes.push(nodes.length);
      nodes.push({
        x,
        y: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        shell: false,
        hub: isInnerHub,
      });
    }
    layers.push(indexes);
  });

  const distance = (a: number, b: number) => {
    const p = nodes[a], q = nodes[b];
    return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  };

  const connect = (a: number, b: number, shell = false) => {
    if (a === b) return;
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (nodes[a].x > nodes[b].x) [a, b] = [b, a];
    edges.push([a, b]);
    const p = nodes[a], q = nodes[b];
    const bend = Math.sin(a * 1.7 + b * 0.9) * (shell ? 0.055 : 0.12);
    if (p.shell && q.shell) {
      // Projected midpoint onto unit sphere creates curved circular lattice tracks
      const length = Math.hypot(p.x + q.x, p.y + q.y, p.z + q.z);
      controls.push({ x: (p.x + q.x) / length, y: (p.y + q.y) / length, z: (p.z + q.z) / length });
    } else {
      // Curved organic synapses for volumetric neural pathways
      controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + bend, z: (p.z + q.z) / 2 - bend * 0.7 });
    }
    cortex.push(shell);
    facets.push(p.shell && q.shell);
  };

  // Connect adjacent neural layers (sparse forward/backward synapses)
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const from = layers[layer], to = layers[layer + 1];
    for (const a of from) {
      to.slice().sort((b, c) => distance(a, b) - distance(a, c)).slice(0, 3).forEach(b => connect(a, b));
    }
    for (const b of to) {
      connect(from.slice().sort((a, c) => distance(a, b) - distance(c, b))[0], b);
    }
  }

  // Connect cortex surface nodes (4 nearest neighbors) & bridge to inner layers
  const inner = layers.flat();
  for (let i = 0; i < CORTEX_NODES; i++) {
    connect(i, inner.slice().sort((a, b) => distance(i, a) - distance(i, b))[0], true);
    const closest = Array.from({ length: CORTEX_NODES }, (_, j) => j).filter(j => j !== i)
      .sort((a, b) => distance(i, a) - distance(i, b)).slice(0, 4);
    closest.forEach(node => connect(i, node, true));
  }

  const outgoing = nodes.map(() => [] as number[]);
  edges.forEach(([from], edge) => outgoing[from].push(edge));
  const inputs = layers[0].flatMap(node => outgoing[node]);

  return { nodes, edges, controls, cortex, facets, outgoing, inputs };
}

export const NEURAL_GLOBE = createNeuralGlobe();

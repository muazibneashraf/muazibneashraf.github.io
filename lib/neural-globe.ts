export interface Neuron {
  x: number;
  y: number;
  z: number;
  shell: boolean;
  hub: boolean;
}

export const CORTEX_NODES = 180;
export const HUB_NODES = new Set([0, 24, 48, 72, 96, 120, 144, 168]);

// A spherical 3D network with an outer circled lattice.
// Nodes are distributed across the sphere using the Fibonacci golden spiral,
// and neighboring nodes within threshold distance are connected.
// This naturally produces the curved spiral tracks (outer circled texture)
// and preserves a clean circular silhouette as the globe rotates.
function createNeuralGlobe() {
  const nodes: Neuron[] = [];
  const edges: [number, number][] = [];
  const controls: { x: number; y: number; z: number }[] = [];
  const cortex: boolean[] = [];
  const facets: boolean[] = [];

  for (let i = 0; i < CORTEX_NODES; i++) {
    const y = 1 - (i / (CORTEX_NODES - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    nodes.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      shell: true,
      hub: HUB_NODES.has(i),
    });
  }

  for (let i = 0; i < CORTEX_NODES; i++) {
    for (let j = i + 1; j < CORTEX_NODES; j++) {
      const a = nodes[i], b = nodes[j];
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.34) {
        const from = a.x <= b.x ? i : j;
        const to = a.x <= b.x ? j : i;
        edges.push([from, to]);
        const p = nodes[from], q = nodes[to];
        controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 });
        cortex.push(true);
        facets.push(true);
      }
    }
  }

  const outgoing = nodes.map(() => [] as number[]);
  edges.forEach(([from], edge) => outgoing[from].push(edge));

  const inputs: number[] = [];
  nodes.forEach((n, i) => {
    if (n.x < -0.5) {
      outgoing[i].forEach(edge => inputs.push(edge));
    }
  });
  if (inputs.length === 0) inputs.push(0);

  return { nodes, edges, controls, cortex, facets, outgoing, inputs };
}

export const NEURAL_GLOBE = createNeuralGlobe();

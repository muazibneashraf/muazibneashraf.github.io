type Neuron = { x: number; y: number; z: number; shell: boolean; hub: boolean };

// A spherical cortex wraps seven volumetric processing layers. Unlike a wire
// mesh, the links follow sparse, branching paths from inputs toward outputs.
function createNeuralGlobe() {
  const nodes: Neuron[] = [];
  const layers: number[][] = [];
  const edges: [number, number][] = [];
  const controls: { x: number; y: number; z: number }[] = [];
  const cortex: boolean[] = [];
  const seen = new Set<string>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 96; i++) {
    const y = 1 - 2 * (i + 0.5) / 96;
    const r = Math.sqrt(1 - y * y), angle = i * golden;
    nodes.push({ x: Math.cos(angle) * r, y, z: Math.sin(angle) * r, shell: true, hub: i % 19 === 0 });
  }
  [5, 8, 12, 14, 12, 8, 5].forEach((count, layer) => {
    const x = -0.78 + layer * 0.26;
    const radius = Math.sqrt(1 - x * x) * 0.79;
    const indexes: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt((i + 0.35) / count) * radius;
      const angle = i * golden + layer * 0.34;
      indexes.push(nodes.length);
      nodes.push({ x, y: Math.cos(angle) * r, z: Math.sin(angle) * r, shell: false, hub: i === 0 || (layer === 3 && i === 7) });
    }
    layers.push(indexes);
  });
  const distance = (a: number, b: number) => {
    const p = nodes[a], q = nodes[b];
    return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  };
  const connect = (a: number, b: number, shell = false) => {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (nodes[a].x > nodes[b].x) [a, b] = [b, a];
    edges.push([a, b]);
    const p = nodes[a], q = nodes[b];
    const bend = Math.sin(a * 1.7 + b * 0.9) * (shell ? 0.055 : 0.12);
    if (p.shell && q.shell) {
      const length = Math.hypot(p.x + q.x, p.y + q.y, p.z + q.z);
      controls.push({ x: (p.x + q.x) / length, y: (p.y + q.y) / length, z: (p.z + q.z) / length });
    } else controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + bend, z: (p.z + q.z) / 2 - bend * 0.7 });
    cortex.push(shell);
  };
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const from = layers[layer], to = layers[layer + 1];
    for (const a of from) to.slice().sort((b, c) => distance(a, b) - distance(a, c)).slice(0, 3).forEach(b => connect(a, b));
    for (const b of to) connect(from.slice().sort((a, c) => distance(a, b) - distance(c, b))[0], b);
  }
  const inner = layers.flat();
  for (let i = 0; i < 96; i++) {
    connect(i, inner.slice().sort((a, b) => distance(i, a) - distance(i, b))[0], true);
    const closest = Array.from({ length: 96 }, (_, j) => j).filter(j => j !== i)
      .sort((a, b) => distance(i, a) - distance(i, b)).slice(0, 2);
    closest.forEach(node => connect(i, node, true));
  }
  const outgoing = nodes.map(() => [] as number[]);
  edges.forEach(([from], edge) => outgoing[from].push(edge));
  const inputs = layers[0].flatMap(node => outgoing[node]);
  return { nodes, edges, controls, cortex, outgoing, inputs };
}

export const NEURAL_GLOBE = createNeuralGlobe();

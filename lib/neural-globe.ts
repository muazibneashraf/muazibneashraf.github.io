export interface Neuron {
  x: number;
  y: number;
  z: number;
  shell: boolean;
  hub: boolean;
  tesseract: boolean;
}

export type EdgeType = "cortex" | "tesseract" | "synapse";

// A 3D neural tesseract globe:
// Outer spherical cortex (radius = 1.0) with circled lattice tracks,
// encasing an inner 4D tesseract (hypercube) neural core with synaptic bridges.
// Signals actively pulse through the tesseract and radiate out to the cortex hubs.
function createNeuralGlobe() {
  const cortexCount = 144;
  const nodes: Neuron[] = [];
  const edges: [number, number][] = [];
  const edgeTypes: EdgeType[] = [];
  const controls: { x: number; y: number; z: number }[] = [];
  const cortex: boolean[] = [];
  const facets: boolean[] = [];
  const cortexSet = new Set<number>();
  const HUB_CORTEX = new Set([0, 24, 48, 72, 96, 120]);

  // 1. Outer cortex: 144 nodes on the unit sphere (radius = 1.0)
  for (let i = 0; i < cortexCount; i++) {
    const y = 1 - (i / (cortexCount - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    nodes.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      shell: true,
      hub: HUB_CORTEX.has(i),
      tesseract: false,
    });
    cortexSet.add(i);
  }

  // Cortex lattice: connections between neighbors on the spherical surface (d < 0.36)
  for (let i = 0; i < cortexCount; i++) {
    for (let j = i + 1; j < cortexCount; j++) {
      const a = nodes[i], b = nodes[j];
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.36) {
        const from = a.x <= b.x ? i : j;
        const to = a.x <= b.x ? j : i;
        edges.push([from, to]);
        edgeTypes.push("cortex");
        const p = nodes[from], q = nodes[to];
        controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 });
        cortex.push(true);
        facets.push(true);
      }
    }
  }

  // 2. Inner Tesseract Core: 16 4D hypercube vertices projected to 3D
  // Composed of an inner cube (r1 = 0.36) and outer cube (r2 = 0.66)
  const r1 = 0.36, r2 = 0.66;
  const signs = [-1, 1];
  const tesseractIndices: { sx: number; sy: number; sz: number; w: number; idx: number }[] = [];

  // Inner cube vertices (w = -1)
  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        const idx = nodes.length;
        nodes.push({
          x: sx * r1 * 0.577,
          y: sy * r1 * 0.577,
          z: sz * r1 * 0.577,
          shell: false,
          hub: (sx + sy + sz) === 1,
          tesseract: true,
        });
        tesseractIndices.push({ sx, sy, sz, w: -1, idx });
      }
    }
  }

  // Outer cube vertices (w = 1)
  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        const idx = nodes.length;
        nodes.push({
          x: sx * r2 * 0.577,
          y: sy * r2 * 0.577,
          z: sz * r2 * 0.577,
          shell: false,
          hub: (sx + sy + sz) === -1,
          tesseract: true,
        });
        tesseractIndices.push({ sx, sy, sz, w: 1, idx });
      }
    }
  }

  // Connect Tesseract hypercube edges (vertices differing in exactly 1 4D coordinate)
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const a = tesseractIndices[i], b = tesseractIndices[j];
      const diff = (a.sx !== b.sx ? 1 : 0) + (a.sy !== b.sy ? 1 : 0) + (a.sz !== b.sz ? 1 : 0) + (a.w !== b.w ? 1 : 0);
      if (diff === 1) {
        const na = nodes[a.idx], nb = nodes[b.idx];
        const from = na.x <= nb.x ? a.idx : b.idx;
        const to = na.x <= nb.x ? b.idx : a.idx;
        edges.push([from, to]);
        edgeTypes.push("tesseract");
        const p = nodes[from], q = nodes[to];
        controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 });
        cortex.push(false);
        facets.push(false);
      }
    }
  }

  // 3. Synaptic bridging rays: connect each outer tesseract vertex to 2 closest cortex nodes
  for (let i = 8; i < 16; i++) {
    const tNode = tesseractIndices[i];
    const sortedCortex = Array.from(cortexSet).sort((c1, c2) => {
      const d1 = Math.hypot(nodes[tNode.idx].x - nodes[c1].x, nodes[tNode.idx].y - nodes[c1].y, nodes[tNode.idx].z - nodes[c1].z);
      const d2 = Math.hypot(nodes[tNode.idx].x - nodes[c2].x, nodes[tNode.idx].y - nodes[c2].y, nodes[tNode.idx].z - nodes[c2].z);
      return d1 - d2;
    });
    [sortedCortex[0], sortedCortex[1]].forEach(cIdx => {
      const na = nodes[tNode.idx], nb = nodes[cIdx];
      const from = na.x <= nb.x ? tNode.idx : cIdx;
      const to = na.x <= nb.x ? cIdx : tNode.idx;
      edges.push([from, to]);
      edgeTypes.push("synapse");
      const p = nodes[from], q = nodes[to];
      controls.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 });
      cortex.push(false);
      facets.push(false);
    });
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

  return { nodes, edges, edgeTypes, controls, cortex, facets, outgoing, inputs };
}

export const NEURAL_GLOBE = createNeuralGlobe();

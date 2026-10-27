import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../lib/globe-motion.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { createGlobeMotion, rotateGlobe, advanceGlobe } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const neuralCode = ts.transpileModule(readFileSync(new URL("../lib/neural-globe.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { NEURAL_GLOBE } = await import(`data:text/javascript;base64,${Buffer.from(neuralCode).toString("base64")}`);
const evolve = (state, hz, seconds, enabled = true) => {
  for (let i = 0; i < hz * seconds; i++) advanceGlobe(state, 1 / hz, enabled);
};

test("neural paths stay inside a spherical volume and route signals between connected neurons", () => {
  const graph = NEURAL_GLOBE, degree = graph.nodes.map(() => 0), unique = new Set();
  assert.equal(graph.controls.length, graph.edges.length);
  graph.nodes.forEach(node => assert.ok(Math.hypot(node.x, node.y, node.z) <= 1.000001));
  graph.edges.forEach(([a, b], edge) => {
    assert.ok(graph.nodes[a] && graph.nodes[b] && a !== b);
    assert.ok(graph.nodes[a].x <= graph.nodes[b].x, "signals progress through the processing layers");
    const key = [Math.min(a, b), Math.max(a, b)].join(":");
    assert.ok(!unique.has(key)); unique.add(key);
    degree[a]++; degree[b]++;
    assert.ok(Object.values(graph.controls[edge]).every(Number.isFinite));
  });
  assert.ok(degree.every(value => value > 0), "no isolated neurons or dead visual fragments");
  graph.outgoing.forEach((edges, node) => edges.forEach(edge => assert.equal(graph.edges[edge][0], node)));
  const visited = new Set(), queue = graph.inputs.map(edge => graph.edges[edge][0]);
  while (queue.length) {
    const node = queue.pop();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const edge of graph.outgoing[node]) queue.push(graph.edges[edge][1]);
  }
  assert.ok([...visited].some(node => graph.nodes[node].x > 0.7 && !graph.nodes[node].shell), "activations reach the output layer");
});

test("screen-space dragging follows the hand in either direction and preserves a unit rotation", () => {
  const right = Object.assign(createGlobeMotion(), { x: 0, y: 0, z: 0, w: 1 });
  rotateGlobe(right, 0, 0.4);
  assert.ok(2 * (right.x * right.z + right.y * right.w) > 0, "front node travels right");
  rotateGlobe(right, 0, -0.8);
  assert.ok(2 * (right.x * right.z + right.y * right.w) < 0, "reversing travels left");
  const down = Object.assign(createGlobeMotion(), { x: 0, y: 0, z: 0, w: 1 });
  rotateGlobe(down, -0.4, 0);
  assert.ok(2 * (down.y * down.z - down.x * down.w) > 0, "front node travels down");
  for (let i = 0; i < 10000; i++) rotateGlobe(down, Math.sin(i) * 0.1, Math.cos(i) * 0.1);
  assert.ok(Math.abs(Math.hypot(down.x, down.y, down.z, down.w) - 1) < 1e-12);
});

test("momentum has the same direction, distance and decay at 60Hz and 144Hz", () => {
  const a = Object.assign(createGlobeMotion(), { velocityX: 4, velocityY: -8, interacted: true });
  const b = { ...a };
  evolve(a, 60, 2); evolve(b, 144, 2);
  for (const key of ["x", "y", "z", "w", "velocityX", "velocityY"]) {
    assert.ok(Math.abs(a[key] - b[key]) < 1e-10, key);
  }
  assert.ok(a.velocityX > 0 && a.velocityX < 4 && a.velocityY < 0 && a.velocityY > -8);
});

test("only sustained fast interaction charges a burst; idle and slow spins never do", () => {
  const idle = createGlobeMotion(); evolve(idle, 60, 60); assert.equal(idle.charge, 0);
  const slow = Object.assign(createGlobeMotion(), { dragging: true, interacted: true, velocityY: 2 });
  evolve(slow, 60, 30); assert.equal(slow.charge, 0); assert.equal(slow.scale, 1);
  const fast = Object.assign(createGlobeMotion(), { dragging: true, interacted: true, velocityY: 10 });
  evolve(fast, 60, 0.5); assert.ok(fast.charge > 0.1 && fast.charge < 0.4); assert.ok(fast.scale > 1);
  evolve(fast, 60, 3); assert.equal(fast.charge, 1);
  const flick = Object.assign(createGlobeMotion(), { interacted: true, velocityY: 10 });
  evolve(flick, 60, 3); assert.ok(flick.charge < 1, "one incidental flick cannot navigate away");
});

test("pause and reduced motion clear momentum and charge without undoing manual orientation", () => {
  const state = Object.assign(createGlobeMotion(), { interacted: true, velocityY: 10, charge: 0.9, scale: 1.4 });
  rotateGlobe(state, 0.2, -0.3);
  const orientation = [state.x, state.y, state.z, state.w];
  advanceGlobe(state, 1 / 60, false);
  assert.deepEqual([state.x, state.y, state.z, state.w], orientation);
  assert.deepEqual([state.velocityX, state.velocityY, state.charge, state.scale], [0, 0, 0, 1]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../lib/background-system.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { createBackgroundSystem, advanceBackground, segmentIntersectsRect, segmentClearance, SECTION_THEMES, createNeuroField, advanceNeuroField, createScrollMotion, advanceScrollMotion, easeVisibility } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const evolve = (s, hz, seconds, section) => {
  for (let i = 0; i < hz * seconds; i++) advanceBackground(s, 1 / hz, section, false, 0);
};

test("abrupt wheel input eases independently, continues after input stops, and settles without overshoot", () => {
  const state = createScrollMotion(0);
  advanceScrollMotion(state, 1000, 1 / 60);
  assert.ok(state.position > 0 && state.position < 20, 'a large scroll step does not jump the background');
  let previous = state.position;
  for (let frame = 0; frame < 120; frame++) {
    advanceScrollMotion(state, 1000, 1 / 60);
    assert.ok(state.position >= previous && state.position <= 1000, 'motion keeps gliding toward the stopped input');
    previous = state.position;
  }
  assert.ok(1000 - state.position < .01);
  const before = { ...state };
  advanceScrollMotion(state, 0, 0);
  close(state.position, before.position); close(state.velocity, before.velocity);
  advanceScrollMotion(state, 0, 1 / 60);
  assert.ok(state.position > 980, 'a reversal does not teleport the background');
});

test("scroll easing and visibility fades are consistent at 60Hz and 144Hz", () => {
  const a = createScrollMotion(100), b = createScrollMotion(100);
  let va = 1, vb = 1;
  for (let i = 0; i < 60; i++) { advanceScrollMotion(a, 2800, 1 / 60); va = easeVisibility(va, 0, 1 / 60); }
  for (let i = 0; i < 144; i++) { advanceScrollMotion(b, 2800, 1 / 144); vb = easeVisibility(vb, 0, 1 / 144); }
  close(a.position, b.position); close(a.velocity, b.velocity); close(va, vb);
  const firstFade = easeVisibility(1, 0, 1 / 60);
  assert.ok(firstFade > .8 && firstFade < 1, 'protection fades instead of snapping off');
  const firstReveal = easeVisibility(0, 1, 1 / 60);
  assert.ok(firstReveal > 0 && firstReveal < .06, 'nodes return gradually');
});

test("neural compositions morph continuously without replacing nodes, edges or signals", () => {
  const field = createNeuroField(), nodes = field.nodes, edges = field.edges, pulses = field.pulses;
  let clock = 0;
  for (const section of ["skills", "research", "work", "contact", "hero"]) {
    const before = field.nodes.map(n => [n.x, n.y]);
    advanceNeuroField(field, 1 / 60, clock += 1 / 60, false, section);
    field.nodes.forEach((n, i) => assert.ok(Math.hypot(n.x-before[i][0],n.y-before[i][1]) < .035, 'composition transitions have no position jump'));
    for (let frame = 0; frame < 120; frame++) advanceNeuroField(field, 1 / 60, clock += 1 / 60, false, section);
    assert.ok(field.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  }
  assert.equal(field.nodes,nodes); assert.equal(field.edges,edges); assert.equal(field.pulses,pulses);
});

test("section changes alter lighting but preserve the same trajectories and pulse paths", () => {
  const fixed = createBackgroundSystem(), themed = createBackgroundSystem();
  assert.deepEqual(fixed, themed, "seeded initialization");
  const population = themed.nodes, edges = themed.edges, pulses = themed.pulses;
  for (let frame = 0; frame < 1800; frame++) {
    advanceBackground(fixed, 1 / 60, "hero", false, 0);
    advanceBackground(themed, 1 / 60, Object.keys(SECTION_THEMES)[Math.floor(frame / 37) % Object.keys(SECTION_THEMES).length], false, 2000);
    close(fixed.clock, themed.clock);
    assert.deepEqual(fixed.pulses, themed.pulses);
    for (let n = 0; n < fixed.nodes.length; n++) {
      close(fixed.nodes[n].x, themed.nodes[n].x);
      close(fixed.nodes[n].y, themed.nodes[n].y);
    }
  }
  assert.equal(population, themed.nodes); assert.equal(edges, themed.edges); assert.equal(pulses, themed.pulses);
});

test("60Hz and 144Hz produce the same motion and exponential theme interpolation", () => {
  const a = createBackgroundSystem(), b = createBackgroundSystem();
  evolve(a, 60, 10, "skills"); evolve(b, 144, 10, "skills");
  close(a.clock, b.clock);
  a.nodes.forEach((n, i) => { close(n.x, b.nodes[i].x); close(n.y, b.nodes[i].y); });
  a.pulses.forEach((p, i) => close(p.progress, b.pulses[i].progress));
  a.color.forEach((c, i) => close(c, b.color[i]));
});

test("theme transitions blend, long gaps are capped, and responsive changes retain geometry", () => {
  const s = createBackgroundSystem();
  const original = s.nodes.map(n => [n.id, n.homeX, n.homeY, n.phase, n.speed]);
  advanceBackground(s, 1 / 60, "about", false, 0);
  assert.ok(s.color[0] > 85 && s.color[0] < SECTION_THEMES.about.color[0]);
  evolve(s, 60, 2, "about");
  assert.ok(Math.abs(s.color[0] - SECTION_THEMES.about.color[0]) < 3);
  const t = s.clock;
  advanceBackground(s, 300, "skills", true, 15000);
  close(s.clock - t, 0.05);
  assert.deepEqual(s.nodes.map(n => [n.id, n.homeX, n.homeY, n.phase, n.speed]), original);
  assert.ok(s.nodes[10].density > 0 && s.nodes[10].density < 1, "responsive density crossfades");
  assert.ok(s.edges[4].density > 0 && s.edges[4].density < 1);
});

test("protection distance changes continuously outside the entire content rectangle", () => {
  const r = { left: 20, right: 30, top: 20, bottom: 30 };
  close(segmentClearance(0, 10, 100, 10, r), 10);
  close(segmentClearance(0, 19.5, 100, 19.5, r), 0.5);
  close(segmentClearance(0, 25, 100, 25, r), 0);
  close(segmentClearance(10, 10, 10, 10, r), Math.sqrt(200));
  close(segmentClearance(0, 10, 10, 0, r), Math.sqrt(450));
});

test("full-segment protection covers narrow, diagonal, tangent and degenerate intersections", () => {
  const r = { left: 20, right: 30, top: 20, bottom: 30 };
  assert.equal(segmentIntersectsRect(0, 25, 100, 25, r), true, "ends and midpoint all outside");
  assert.equal(segmentIntersectsRect(0, 0, 100, 100, r), true);
  assert.equal(segmentIntersectsRect(0, 20, 100, 20, r), true);
  assert.equal(segmentIntersectsRect(25, 25, 25, 25, r), true);
  assert.equal(segmentIntersectsRect(0, 0, 0, 0, r), false);
  assert.equal(segmentIntersectsRect(0, 10, 100, 10, r), false);
  assert.equal(segmentIntersectsRect(0, 10, 100, 10, r, 12), true);
});

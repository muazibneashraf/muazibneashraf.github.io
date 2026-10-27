// Run against a production server: TEST_BASE_URL=http://127.0.0.1:3221 node tests/background.browser.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const output = resolve(process.env.BG_OUTPUT_DIR || "tmp/bg05-final");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || "msedge" });
const errors = [], report = { widths: [], samples: 0, maxFrameGap: 0, checks: [] };
const snapshot = page => page.evaluate(() => {
  let value;
  document.querySelector(".system-narrative-canvas").dispatchEvent(new CustomEvent("muaz-background-inspect", { detail: result => value = result }));
  return value;
});
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} vs ${b}`);
function continuous(before, after) {
  assert.ok(after.system.clock >= before.system.clock, "clock cannot reset");
  const dt = after.system.clock - before.system.clock;
  assert.deepEqual(after.system.nodes.map(n => [n.id, n.homeX, n.homeY, n.phase, n.speed]), before.system.nodes.map(n => [n.id, n.homeX, n.homeY, n.phase, n.speed]));
  assert.deepEqual(after.system.edges.map(e => [e.id, e.from, e.to]), before.system.edges.map(e => [e.id, e.from, e.to]));
  after.system.pulses.forEach((p, i) => {
    assert.equal(p.edgeId, before.system.pulses[i].edgeId);
    close(p.progress, (before.system.pulses[i].progress + p.speed * dt) % 2.4, "pulse trajectory");
  });
  after.system.nodes.forEach(n => {
    close(n.x, n.homeX + Math.sin(after.system.clock * n.speed + n.phase) * n.driftX * n.depth, "particle x");
    close(n.y, n.homeY + Math.cos(after.system.clock * n.speed * 0.83 + n.phase) * n.driftY * n.depth, "particle y");
  });
  report.samples++;
}
async function tour(page, duration) {
  return page.evaluate(async duration => {
    const samples = [], sections = new Set();
    const read = () => {
      let s; document.querySelector(".system-narrative-canvas").dispatchEvent(new CustomEvent("muaz-background-inspect", { detail: v => s = v }));
      samples.push(s); sections.add(s.section);
    };
    const end = document.documentElement.scrollHeight - innerHeight;
    for (const direction of [1, -1]) {
      const start = performance.now(); let previous = start, maxGap = 0, count = 0;
      await new Promise(resolve => {
        const step = time => {
          maxGap = Math.max(maxGap, time - previous); previous = time;
          const progress = Math.min(1, (time - start) / duration);
          scrollTo({ top: end * (direction === 1 ? progress : 1 - progress), behavior: "instant" });
          if (count++ % 12 === 0) read();
          if (progress < 1) requestAnimationFrame(step); else resolve();
        }; requestAnimationFrame(step);
      });
      read(); window.__maxTourGap = Math.max(window.__maxTourGap || 0, maxGap);
    }
    return { samples, sections: [...sections], maxGap: window.__maxTourGap };
  }, duration);
}
try {
  for (const width of [1440, 375, 768, 1920]) {
    const height = width === 375 ? 812 : width === 1920 ? 1080 : 900;
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: output, size: { width, height } } });
    await context.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      window.__backgroundInitializations = 0;
      HTMLCanvasElement.prototype.getContext = function(...args) {
        if (this.classList.contains("system-narrative-canvas")) window.__backgroundInitializations++;
        return get.apply(this, args);
      };
    });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(base + "/?backgroundDebug=1", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__backgroundInitializations > 0);
    let before = await snapshot(page);
    console.log(`${width}px: slow bidirectional scroll and trajectory sampling`);
    const result = await tour(page, width === 375 ? 9000 : 6500);
    for (const sample of result.samples) { continuous(before, sample); before = sample; }
    assert.equal(result.sections.length, 10, "tour passes all section themes");
    report.maxFrameGap = Math.max(report.maxFrameGap, result.maxGap);
    for (const id of ["hero", "work", "skills", "experience", "contact"]) {
      await page.evaluate(id => {
        const el = id === "hero" ? document.querySelector("section.hero") : document.getElementById(id);
        scrollTo({ top: id === "hero" ? 0 : el.getBoundingClientRect().top + scrollY - 100, behavior: "instant" });
      }, id);
      await page.waitForTimeout(1700);
      const after = await snapshot(page); continuous(before, after); before = after;
      await page.screenshot({ path: join(output, `${width}-${id}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}/${id}`);
    }
    // Rapid jumps, repeated reversals and walkthrough steps must not reinitialize.
    for (const id of ["about", "skills", "about", "skills", "trace", "contact", "work", "hero"]) {
      await page.evaluate(id => {
        const el = id === "hero" ? document.querySelector("section.hero") : document.getElementById(id);
        scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: "instant" });
        dispatchEvent(new CustomEvent("muaz-trace-step", { detail: { step: 2 } }));
      }, id);
      await page.waitForTimeout(60);
      const after = await snapshot(page); continuous(before, after); before = after;
    }
    if (width === 1440) {
      console.log("Desktop: pause/resume, reduced motion, visibility, resize and hysteresis");
      await page.getByRole("button", { name: "Pause motion" }).click();
      await page.waitForTimeout(80);
      const paused = await snapshot(page);
      assert.equal(paused.running, false);
      const frozenPixels = await page.locator(".system-narrative-canvas").evaluate(c => c.toDataURL());
      const frozenSphere = await page.locator(".network-visual canvas").evaluate(c => c.toDataURL());
      await page.waitForTimeout(500);
      assert.deepEqual((await snapshot(page)).system, paused.system);
      assert.equal(await page.locator(".system-narrative-canvas").evaluate(c => c.toDataURL()), frozenPixels);
      assert.equal(await page.locator(".network-visual canvas").evaluate(c => c.toDataURL()), frozenSphere);
      await page.getByRole("button", { name: "Resume motion" }).click();
      await page.waitForTimeout(200);
      let after = await snapshot(page); continuous(paused, after); assert.ok(after.system.clock > paused.system.clock);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(100);
      const reduced = await snapshot(page); assert.equal(reduced.running, false);
      await page.waitForTimeout(350); close((await snapshot(page)).system.clock, reduced.system.clock, "reduced clock");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForTimeout(100); after = await snapshot(page); continuous(reduced, after);
      // Exercise the real visibility listener with synthetic document visibility.
      await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
      const hidden = await snapshot(page); assert.equal(hidden.running, false);
      await page.waitForTimeout(400); close((await snapshot(page)).system.clock, hidden.system.clock, "hidden clock");
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
      await page.waitForTimeout(150); after = await snapshot(page); continuous(hidden, after);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
      await page.waitForTimeout(300);
      await cdp.send("Page.setWebLifecycleState", { state: "active" });
      await page.waitForTimeout(100); continuous(after, await snapshot(page));
      before = await snapshot(page);
      for (const w of [320, 375, 390, 768, 1024, 1440, 1920, 1440]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(180);
        after = await snapshot(page); continuous(before, after); before = after;
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `resize overflow ${w}`);
      }
      const boundary = await page.locator("#skills").evaluate(el => el.getBoundingClientRect().top + scrollY - innerHeight * 0.42);
      await page.evaluate(y => scrollTo({ top: y + 80, behavior: "instant" }), boundary);
      await page.waitForTimeout(80); assert.equal((await snapshot(page)).section, "skills");
      for (const offset of [-20, 20, -25, 25]) {
        await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), boundary + offset);
        await page.waitForTimeout(50); assert.equal((await snapshot(page)).section, "skills", "boundary hysteresis");
      }
      report.checks.push("pause freezes both canvas pixels and full simulation; resume preserves trajectories", "reduced motion stops loop", "synthetic visibility stop/resume and real CDP page freeze", "responsive geometry stable at all seven requested widths", "48px boundary hysteresis");
    }
    assert.equal(await page.evaluate(() => window.__backgroundInitializations), 1, "engine initialized only once");
    report.widths.push({ width, height, sections: result.sections, maxFrameGapMs: result.maxGap, initializations: 1 });
    const video = page.video();
    await context.close();
    await rename(await video.path(), join(output, `${width}-scroll.webm`));
    console.log(`${width}px: PASS; recording and five screenshots saved`);
  }
  assert.deepEqual(errors, []);
  report.checks.push("no browser console errors", "one engine initialization per full tour", "all sampled particles and pulses retain exact time-based trajectories");
  await writeFile(join(output, "verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }

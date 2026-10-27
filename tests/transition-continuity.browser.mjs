import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const output = resolve("tmp/transition-continuity");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const report = { visits: [], errors: [] };
try {
  for (const width of [1366, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 768 } });
    page.on("pageerror", error => report.errors.push(error.message));
    await page.addInitScript(() => {
      window.__continuityFrames = [];
      window.__continuityTransitions = [];
      window.__continuityRecording = false;
      const start = document.startViewTransition?.bind(document);
      if (start) document.startViewTransition = (...args) => {
        const transition = start(...args);
        transition.ready.then(() => {
          const artName = document.querySelector(".project-detail") && `project-art-${location.pathname.split("/").pop()}`;
          window.__continuityTransitions.push({
            ready: true,
            art: artName ? {
              opacityAnimations: document.getAnimations().filter(animation => {
                const pseudo = animation.effect?.pseudoElement || "";
                return pseudo === `::view-transition-old(${artName})` || pseudo === `::view-transition-new(${artName})`;
              }).flatMap(animation => animation.effect.getKeyframes().filter(frame => frame.opacity !== undefined && Number(frame.opacity) < 1)),
            } : null,
          });
        }).catch(error => window.__continuityTransitions.push({ error: String(error) }));
        return transition;
      };
      const sample = () => {
        if (window.__continuityRecording) window.__continuityFrames.push({
          path: location.pathname,
          scroll: scrollY,
          canvasSame: document.querySelector(".system-narrative-canvas") === window.__continuityCanvas,
        });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(`${base}/?backgroundDebug=1`, { waitUntil: "networkidle" });
    await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
    await page.evaluate(() => { window.__continuityCanvas = document.querySelector(".system-narrative-canvas"); });

    for (const index of [0, 1, 2, 3]) {
      const card = page.locator("#work .project-card").nth(index);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const title = await card.locator("h3").innerText();
      const before = await page.evaluate(() => {
        let snapshot;
        document.querySelector(".system-narrative-canvas").dispatchEvent(new CustomEvent("muaz-background-inspect", { detail: value => { snapshot = value; } }));
        window.__continuityFrames = [];
        window.__continuityRecording = true;
        return { scroll: scrollY, clock: snapshot?.system.clock };
      });
      await card.locator("h3 a").click();
      await page.waitForURL("**/projects/*");
      await page.waitForTimeout(700);
      assert.equal(await page.locator("h1").innerText(), title);
      assert.equal(await page.locator(".system-narrative-canvas").count(), 1);
      assert.ok(await page.evaluate(() => document.querySelector(".system-narrative-canvas") === window.__continuityCanvas), "the painted background survives navigation");
      assert.equal(await page.locator(".detail-actions").evaluate(el => getComputedStyle(el).opacity), "1", "copy is painted at handoff, without a second mount fade");
      await page.goBack();
      await page.waitForFunction(() => location.pathname === "/" && !!document.querySelector("#work"));
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => {
        window.__continuityRecording = false;
        let snapshot;
        document.querySelector(".system-narrative-canvas").dispatchEvent(new CustomEvent("muaz-background-inspect", { detail: value => { snapshot = value; } }));
        return { scroll: scrollY, clock: snapshot?.system.clock, frames: window.__continuityFrames, transitions: window.__continuityTransitions };
      });
      assert.ok(Math.abs(after.scroll - before.scroll) <= 1, "Back restores the original position");
      const restoredFrames = after.frames.filter(frame => frame.path === "/");
      assert.ok(restoredFrames.length > 0);
      assert.ok(restoredFrames.every(frame => Math.abs(frame.scroll - before.scroll) <= 1), "Back never paints the hero or scrolls through intermediate sections");
      assert.ok(after.frames.every(frame => frame.canvasSame), "no frame remounts an empty background canvas");
      assert.ok(after.clock >= before.clock, "background animation time never restarts");
      assert.ok(after.transitions.every(transition => !transition.error));
      for (const transition of after.transitions.filter(transition => transition.art)) {
        assert.deepEqual(transition.art.opacityAnimations, [], "shared artwork never fades through a dim or transparent frame");
      }
      report.visits.push({ width, title, restoredScroll: after.scroll, sampledFrames: after.frames.length });
      console.log(`${width}px/${title}: uninterrupted background, opaque artwork, exact Back position PASS`);
    }

    await page.locator("#work .project-card h3 a").first().click();
    await page.waitForURL("**/projects/*");
    await page.waitForTimeout(650);
    await page.getByRole("link", { name: "ALL PROJECTS", exact: true }).click();
    await page.waitForURL("**/projects");
    await page.waitForTimeout(650);
    assert.equal(await page.locator(".project-card").count(), 4);
    await page.locator(".project-filters button").nth(2).click();
    await page.waitForTimeout(450);
    assert.equal(await page.locator(".project-card").count(), 2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".project-filters button").first().click();
    await page.locator(".project-card h3 a").first().click();
    await page.waitForURL("**/projects/*");
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".detail-actions").evaluate(el => getComputedStyle(el).opacity), "1");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/${width}-case-study.png` });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }

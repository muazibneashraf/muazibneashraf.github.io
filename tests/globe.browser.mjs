import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3002";
const output = resolve("tmp/globe-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const report = { errors: [], visits: [] };
const speed = page => page.locator(".interactive-network").evaluate(el => Number(el.dataset.spinSpeed || 0));
const charge = page => page.locator(".interactive-network").evaluate(el => Number(el.style.getPropertyValue("--globe-charge") || 0));
async function open(page) {
  await page.goto(`${base}/?backgroundDebug=1`, { waitUntil: "networkidle" });
  await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
  await page.locator(".globe-grab").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const bounds = await page.locator(".globe-grab").boundingBox();
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, radius: bounds.width / 2 };
}
async function stroke(page, from, to, steps, delay) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await page.waitForTimeout(delay);
  }
}
async function spinToProjects(page, center, touch = false) {
  const frames = [];
  await page.evaluate(() => {
    window.__globeBackground = document.querySelector(".system-narrative-canvas");
    window.__globeFrames = [];
    let last = performance.now();
    const record = time => {
      window.__globeFrames.push({ dt: time - last, path: location.pathname, overlay: !!document.querySelector(".globe-burst-overlay") });
      last = time;
      if (location.pathname === "/" || document.querySelector(".globe-burst-overlay")) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  const start = { x: center.x + center.radius * 0.55, y: center.y };
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
  else { await page.mouse.move(start.x, start.y); await page.mouse.down(); }
  let maxCharge = 0, maxSpeed = 0;
  const started = performance.now();
  for (let i = 1; i <= 190; i++) {
    const angle = (performance.now() - started) / 1000 * 13;
    const p = { x: center.x + Math.cos(angle) * center.radius * 0.55, y: center.y + Math.sin(angle) * center.radius * 0.55 };
    if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
    else await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(16);
    const state = await page.evaluate(() => ({ burst: !!document.querySelector(".globe-burst-overlay"), charge: Number(document.querySelector(".interactive-network")?.style.getPropertyValue("--globe-charge") || 0), speed: Number(document.querySelector(".interactive-network")?.dataset.spinSpeed || 0) }));
    if (state.burst) break;
    maxCharge = Math.max(maxCharge, state.charge); maxSpeed = Math.max(maxSpeed, state.speed);
  }
  if (cdp) { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await cdp.detach(); }
  else await page.mouse.up();
  assert.ok(maxCharge > 0.5, `fast spinning progressively charges the globe (charge=${maxCharge}, speed=${maxSpeed})`);
  await page.waitForSelector(".globe-burst-overlay");
  await page.screenshot({ path: resolve(output, touch ? "mobile-burst.png" : "desktop-burst.png") });
  await page.waitForURL("**/projects", { timeout: 15000 });
  await page.waitForSelector(".globe-burst-overlay", { state: "detached", timeout: 10000 });
  assert.ok(await page.locator(".archive-section").isVisible());
  assert.ok(await page.evaluate(() => document.querySelector(".system-narrative-canvas") === window.__globeBackground), "same background survives the transition");
  frames.push(...await page.evaluate(() => window.__globeFrames));
  assert.ok(frames.some(f => f.path === "/projects" && f.overlay), "burst spans the route handoff");
  await page.screenshot({ path: resolve(output, touch ? "mobile-projects.png" : "desktop-projects.png") });
  const sorted = frames.slice(5).map(f => f.dt).sort((a, b) => a - b);
  return { maxCharge, frameP95: sorted[Math.floor(sorted.length * 0.95)], maxFrame: Math.max(...sorted) };
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => report.errors.push(error.message));
  let center = await open(page);
  const before = await page.locator(".globe-stage").boundingBox();
  await page.mouse.move(center.x - 60, center.y); await page.mouse.move(center.x + 60, center.y);
  assert.equal(await speed(page), 0, "hover does not steer or accelerate the globe");
  await stroke(page, center, { x: center.x + 70, y: center.y }, 20, 40);
  const slow = await speed(page);
  assert.ok(slow > 0 && slow < 2);
  assert.equal(await charge(page), 0, "slow dragging cannot trigger navigation");
  await page.mouse.up(); await page.waitForTimeout(1000);
  await stroke(page, { x: center.x - 70, y: center.y }, { x: center.x + 70, y: center.y }, 8, 12);
  const fast = await speed(page);
  assert.ok(fast > slow * 2, `fast drag ${fast} follows the hand faster than slow drag ${slow}`);
  await page.mouse.up(); await page.waitForTimeout(300);
  const coast = await speed(page);
  assert.ok(coast > 0 && coast < fast, "release retains momentum and slows naturally");
  const after = await page.locator(".globe-stage").boundingBox();
  assert.deepEqual(before, after, "rotation never moves the globe's layout anchor");
  await page.getByRole("button", { name: "Pause motion", exact: false }).click();
  await stroke(page, { x: center.x - 70, y: center.y }, { x: center.x + 70, y: center.y }, 8, 10);
  await page.mouse.up();
  assert.equal(await speed(page), 0, "Pause disables coasting");
  assert.equal(await charge(page), 0, "Pause disables charging");
  await page.getByRole("button", { name: "Resume motion", exact: false }).click();
  await stroke(page, center, { x: center.x + 25, y: center.y }, 4, 30);
  await page.keyboard.press("Escape"); await page.mouse.up(); await page.waitForTimeout(150);
  assert.equal(await page.locator(".interactive-network").getAttribute("data-spin-state"), "idle", "Escape cancels the captured drag");
  await page.getByRole("button", { name: "Backend", exact: true }).click();
  assert.equal(await page.locator('.network-node[data-focus="backend"]').getAttribute("aria-expanded"), "true");
  await page.getByRole("button", { name: "Close project preview" }).click();
  await page.screenshot({ path: resolve(output, "desktop-globe.png") });
  await page.waitForTimeout(2000);
  report.visits.push({ mode: "desktop", slow, fast, coast, ...await spinToProjects(page, center) });
  await page.goBack();
  await page.waitForSelector(".globe-grab");
  assert.equal(await page.locator(".interactive-network").getAttribute("data-spin-state"), "idle", "Back restores a usable globe");
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  phone.on("pageerror", error => report.errors.push(error.message));
  center = await open(phone);
  await phone.screenshot({ path: resolve(output, "mobile-globe.png") });
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
  report.visits.push({ mode: "touch", ...await spinToProjects(phone, center, true) });
  await phone.close();

  const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  reduced.on("pageerror", error => report.errors.push(error.message));
  center = await open(reduced);
  await stroke(reduced, center, { x: center.x + 100, y: center.y + 50 }, 8, 10);
  await reduced.mouse.up();
  assert.equal(await charge(reduced), 0, "reduced motion disables the explosion");
  await reduced.getByRole("button", { name: "Spin the globe", exact: true }).focus();
  await reduced.keyboard.press("ArrowRight");
  await reduced.keyboard.press("Enter");
  await reduced.waitForURL("**/projects");
  assert.equal(await reduced.locator(".globe-burst-overlay").count(), 0);
  report.visits.push({ mode: "reduced-motion-and-keyboard", passed: true });
  await reduced.close();
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

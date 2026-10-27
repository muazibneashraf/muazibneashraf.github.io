import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3456";
const outputDir = resolve("tmp/intro-verification");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL || "msedge",
});

const report = {
  stagesVerified: [],
  viewportsVerified: [],
  escapeVerified: false,
  refreshBypassVerified: false,
  reducedMotionVerified: false,
};

try {
  console.log("1. Testing full Cinematic Neuro-Wave Intro sequence at 1440px...");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(base, { waitUntil: "domcontentloaded" });

  // 1. Initial State: intro must be active
  await page.waitForSelector("[data-intro-phase='typing']", { timeout: 3000 });
  const initialPhase = await page.getAttribute("[data-intro-phase]", "data-intro-phase");
  assert.equal(initialPhase, "typing", "Hero starts in typing phase");
  report.stagesVerified.push("Intro starts in typing phase");

  assert.ok(await page.getByRole("button", { name: "Skip introduction" }).isVisible());

  // Stage 1: Greeting
  await page.waitForFunction(() => {
    const eyebrow = document.querySelector(".hero-copy .eyebrow");
    return eyebrow && eyebrow.textContent.toUpperCase().includes("HELLO, WORLD");
  }, { timeout: 3000 });
  await page.screenshot({ path: join(outputDir, "01-greeting-stage.png") });
  report.stagesVerified.push("Stage 1: Greeting typed");
  console.log("✓ Stage 1: Greeting typed");

  // Stage 2: Name
  await page.waitForFunction(() => {
    const h1 = document.querySelector(".hero-copy h1");
    return h1 && h1.textContent.includes("Muaz Ibne Ashraf");
  }, { timeout: 4000 });
  await page.screenshot({ path: join(outputDir, "02-name-stage.png") });
  report.stagesVerified.push("Stage 2: Name typed");
  console.log("✓ Stage 2: Name typed");

  // Stage 3: Tagline 1
  await page.waitForFunction(() => {
    const role = document.querySelector(".hero-copy .hero-role");
    return role && role.textContent.includes("Building software");
  }, { timeout: 4000 });
  await page.screenshot({ path: join(outputDir, "03-tagline1-stage.png") });
  report.stagesVerified.push("Stage 3: Tagline 1 typed");
  console.log("✓ Stage 3: Tagline 1 typed");

  // Stage 4: Tagline 2
  await page.waitForFunction(() => {
    const roleSpan = document.querySelectorAll(".intro-line-typed")[3];
    return roleSpan && roleSpan.textContent.includes("Exploring intelligence");
  }, { timeout: 4000 });
  await page.screenshot({ path: join(outputDir, "04-tagline2-stage.png") });
  report.stagesVerified.push("Stage 4: Tagline 2 typed");
  console.log("✓ Stage 4: Tagline 2 typed");

  // Phase 1: Completion holding & Phase 2/3/4/5: Transition
  console.log("Waiting for transition into homepage hero...");
  await page.waitForSelector("[data-intro-phase='transitioning']", { timeout: 4000 });
  assert.equal(await page.getByRole("button", { name: "Skip introduction" }).count(), 0, "Skip is removed when the homepage begins appearing");
  await page.screenshot({ path: join(outputDir, "05-transitioning.png") });
  report.stagesVerified.push("Phase 2-4: Transitioning into homepage");
  console.log("✓ Transitioning phase reached");

  // Final Handoff: Completed phase
  await page.waitForSelector("[data-intro-phase='completed']", { timeout: 5000 });
  await page.screenshot({ path: join(outputDir, "06-homepage-settled.png") });
  report.stagesVerified.push("Phase 5: Homepage handoff completed");
  console.log("✓ Phase 5: Homepage handoff completed");

  // Verify elements are visible and interactive
  const isGlobeVisible = await page.locator(".network-visual").isVisible();
  assert.ok(isGlobeVisible, "3D interactive globe is visible");

  const isActionsVisible = await page.locator(".hero-actions").isVisible();
  assert.ok(isActionsVisible, "Hero actions are visible");

  const seenInSession = await page.evaluate(() => sessionStorage.getItem("muaz_intro_seen"));
  assert.equal(seenInSession, null, "Intro completion does not persist across documents");

  await context.close();

  // 2. Test direct homepage on browser refresh
  console.log("2. Testing direct homepage on browser refresh...");
  const sessionContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const sessionPage = await sessionContext.newPage();
  await sessionPage.goto(base, { waitUntil: "domcontentloaded" });
  // Finish the current document playback using the existing Escape shortcut
  await sessionPage.waitForSelector("[data-intro-phase='typing']");
  await sessionPage.keyboard.press("Escape");
  await sessionPage.waitForSelector("[data-intro-phase='completed']");

  // Now reload page in same session
  await sessionPage.reload({ waitUntil: "domcontentloaded" });
  await sessionPage.waitForSelector("[data-intro-phase='completed']", { timeout: 3000 });
  const phaseOnReload = await sessionPage.getAttribute("[data-intro-phase]", "data-intro-phase");
  assert.equal(phaseOnReload, "completed", "Browser refresh opens the homepage directly");
  report.refreshBypassVerified = true;
  console.log("✓ Refresh bypass verified");
  await sessionContext.close();

  // 3. Test Escape shortcut
  console.log("3. Testing Escape shortcut functionality...");
  const skipContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const skipPage = await skipContext.newPage();
  await skipPage.goto(base, { waitUntil: "domcontentloaded" });
  await skipPage.waitForSelector("[data-intro-phase='typing']");
  await skipPage.keyboard.press("Escape");
  await skipPage.waitForSelector("[data-intro-phase='completed']", { timeout: 1000 });
  const skipSeen = await skipPage.evaluate(() => sessionStorage.getItem("muaz_intro_seen"));
  assert.equal(skipSeen, null, "Escape does not suppress a future document intro");
  report.escapeVerified = true;
  console.log("✓ Escape shortcut verified");
  await skipContext.close();

  // 4. Test Reduced Motion
  console.log("4. Testing prefers-reduced-motion...");
  const rmContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(base, { waitUntil: "domcontentloaded" });
  await rmPage.waitForSelector("[data-intro-phase='completed']", { timeout: 1500 });
  const rmPhase = await rmPage.getAttribute("[data-intro-phase]", "data-intro-phase");
  assert.equal(rmPhase, "completed", "Intro bypassed immediately when reduced-motion is preferred");
  report.reducedMotionVerified = true;
  console.log("✓ prefers-reduced-motion verified");
  await rmContext.close();

  // 5. Test Responsive Viewports (320px, 375px, 390px, 768px, 1024px, 1440px, 1920px)
  console.log("5. Testing responsive viewports...");
  const viewports = [320, 375, 390, 768, 1024, 1440, 1920];
  for (const width of viewports) {
    const vpContext = await browser.newContext({
      viewport: { width, height: width < 600 ? 812 : 900 },
    });
    const vpPage = await vpContext.newPage();
    await vpPage.goto(base, { waitUntil: "domcontentloaded" });
    await vpPage.waitForSelector("[data-intro-phase='typing']");

    // Check no horizontal overflow during intro
    const hasOverflowIntro = await vpPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasOverflowIntro, false, `No horizontal overflow at ${width}px during intro`);

    // Finish playback to check homepage layout
    await vpPage.keyboard.press("Escape");
    await vpPage.waitForSelector("[data-intro-phase='completed']");
    const hasOverflowCompleted = await vpPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasOverflowCompleted, false, `No horizontal overflow at ${width}px after completion`);

    await vpPage.screenshot({ path: join(outputDir, `vp-${width}px.png`) });
    report.viewportsVerified.push(width);
    console.log(`✓ ${width}px viewport verified (no overflow)`);
    await vpContext.close();
  }

  assert.deepEqual(errors, [], "No browser console errors encountered");
  console.log("\nALL CINEMATIC INTRO VERIFICATIONS PASSED!");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

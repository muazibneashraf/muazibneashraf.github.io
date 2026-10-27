import assert from "node:assert/strict";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);

const BASE = "http://localhost:3000";
const OUTPUT_DIR = "D:/Portfolio-Muaz-Audit-Export/visual-verification/refined-bg05";
const ARTIFACT_DIR = "C:/Users/User/.gemini/antigravity/brain/1f0c3676-c7ac-4430-a398-ed6b58a04f95";

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(ARTIFACT_DIR, { recursive: true });

async function run() {
  console.log("Launching browser for BG-05 Phase 2 screenshot export...");
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const saveScreenshot = async (filename) => {
    await page.screenshot({ path: join(OUTPUT_DIR, filename) });
    await page.screenshot({ path: join(ARTIFACT_DIR, filename) });
    console.log(`Saved screenshot to export & artifact: ${filename}`);
  };

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  console.log("Homepage loaded.");

  // Check 1: Canvas exists
  const canvas = await page.$(".system-narrative-canvas");
  assert(canvas, "Canvas .system-narrative-canvas must exist");

  // Initial State: Hero
  await page.waitForTimeout(600);
  const initialSection = await page.evaluate(() => document.documentElement.dataset.narrativeSection);
  assert.equal(initialSection, "hero");
  await saveScreenshot("state-01-hero.png");

  // Progress through all 9 sections and capture high-res desktop views
  const sections = [
    { id: "hero", file: "state-01-hero.png" },
    { id: "work", file: "state-02-projects.png" },
    { id: "about", file: "state-03-about.png" },
    { id: "skills", file: "state-04-skills.png" },
    { id: "research", file: "state-05-research.png" },
    { id: "trace", file: "state-06-trace.png" },
    { id: "experience", file: "state-07-experience.png" },
    { id: "capabilities", file: "state-08-capabilities.png" },
    { id: "contact", file: "state-09-contact.png" },
  ];

  for (const sec of sections) {
    if (sec.id === "hero") {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    } else {
      const el = await page.$(`#${sec.id}`);
      assert(el, `Section #${sec.id} must exist`);
      await el.scrollIntoViewIfNeeded();
    }

    await page.waitForTimeout(650);
    const activeSec = await page.evaluate(() => document.documentElement.dataset.narrativeSection);
    console.log(`Scrolled to #${sec.id} -> active section: ${activeSec}`);
    await saveScreenshot(sec.file);
  }

  // Mobile screenshots (375px standard)
  console.log("\n--- Capturing Mobile Screenshots (375px) ---");
  await page.setViewportSize({ width: 375, height: 750 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await saveScreenshot("mobile-01-hero-375px.png");

  const mobSkills = await page.$("#skills");
  await mobSkills.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await saveScreenshot("mobile-04-skills-375px.png");

  const mobExp = await page.$("#experience");
  await mobExp.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await saveScreenshot("mobile-07-experience-375px.png");

  // Ultrawide screenshot (1920px)
  console.log("\n--- Capturing Ultrawide Screenshot (1920px) ---");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await saveScreenshot("ultrawide-01-hero-1920px.png");

  assert.equal(errors.length, 0, `Errors encountered: ${JSON.stringify(errors)}`);
  console.log("\nAll updated screenshots generated and saved successfully!");

  await browser.close();
}

run().catch((err) => {
  console.error("Screenshot generation failed:", err);
  process.exit(1);
});

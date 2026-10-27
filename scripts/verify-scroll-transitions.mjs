import assert from "node:assert/strict";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);

const BASE = "http://localhost:3000";

async function verifyScroll() {
  console.log("Testing continuous bi-directional scroll transitions...");
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle" });

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`Page total height: ${totalHeight}px`);

  // Scroll down in increments
  console.log("Scrolling down continuously...");
  for (let top = 0; top < totalHeight; top += 350) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(50);
  }

  // Scroll back up in increments
  console.log("Scrolling back up continuously...");
  for (let top = totalHeight; top >= 0; top -= 350) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(50);
  }

  await page.waitForTimeout(300);

  const finalSection = await page.evaluate(() => document.documentElement.dataset.narrativeSection);
  console.log("Final narrative section at top:", finalSection);
  assert.equal(finalSection, "hero", "Must return to 'hero' at top");

  assert.equal(errors.length, 0, `Errors during scroll: ${JSON.stringify(errors)}`);
  console.log("Continuous bidirectional scroll: PASSED with 0 errors!");

  await browser.close();
}

verifyScroll().catch((err) => {
  console.error("Scroll test failed:", err);
  process.exit(1);
});

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const output = resolve("tmp/site-motion");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const report = { widths: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => report.errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copiedEmail = text; } } });
  });
  await page.goto(`${base}/?backgroundDebug=1`, { waitUntil: "networkidle" });
  await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
  const heading = page.locator("#skills .section-heading");
  assert.equal(await page.locator("[data-scroll-reveal], .reveal-ready").count(), 0);
  assert.equal(await heading.evaluate(el => getComputedStyle(el).opacity), "1", "headings are readable before scrolling");
  await heading.scrollIntoViewIfNeeded();
  assert.equal(await heading.evaluate(el => el.getAnimations({ subtree: true }).length), 0, "section headings stay static");
  assert.equal(await page.locator(".skill-motion").count(), 6);
  assert.equal(new Set(await page.locator(".skill-motion").evaluateAll(elements => elements.map(el => el.className))).size, 6);
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".profile-motion")?.dataset.profileVisible === "true");
  assert.ok(await page.locator(".portrait-frame-trace").isVisible());
  assert.equal(await page.locator(".education-milestone").count(), 3);
  const profile = page.locator(".profile-motion");
  const box = await profile.boundingBox();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3);
  await page.waitForTimeout(200);
  assert.notEqual(await profile.evaluate(el => el.style.getPropertyValue("--profile-y")), "", "profile responds to pointer position");
  await page.mouse.move(4, 4);

  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ["about", "skills", "research", "capabilities", "contact"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(850);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px/${id}: no overflow`);
      const invisibleText = await page.locator(`#${id} h2, #${id} h3`).evaluateAll(elements => elements.filter(el => getComputedStyle(el).opacity === "0").map(el => el.textContent));
      assert.deepEqual(invisibleText, [], `${width}px/${id}: visible headings`);
      if (width === 390 || width === 1440) await page.locator(`#${id}`).screenshot({ path: `${output}/${width}-${id}.png` });
    }
    report.widths.push(width);
    console.log(`${width}px: static headings, skill/research/capability artwork, profile and contact fit PASS`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
  await page.getByLabel("Name", { exact: true }).fill("Motion check");
  await page.getByLabel("Email", { exact: true }).fill("motion-check@example.test");
  await page.getByLabel("Message", { exact: true }).fill("This is an intercepted browser check.");
  const border = page.locator('label:has(textarea) .contact-field-border rect');
  await page.waitForTimeout(600);
  assert.equal(await border.evaluate(el => getComputedStyle(el).strokeDashoffset), "0px", "focused field draws its border");
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/messages", async route => {
    await gate;
    await route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"test"}' });
  });
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".contact-form")?.dataset.status === "sending");
  assert.ok(await page.locator(".submit-button").isDisabled());
  release();
  await page.waitForFunction(() => document.querySelector(".contact-form")?.dataset.status === "error");
  assert.equal(await page.getByLabel("Message", { exact: true }).inputValue(), "This is an intercepted browser check.", "failed submission keeps the message");
  assert.equal(await page.locator(".contact-status-icon").count(), 0, "failure never shows a success check");
  await page.unroute("**/api/messages");
  await page.route("**/api/messages", route => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".contact-form")?.dataset.status === "sent");
  assert.ok(await page.locator(".contact-status-icon").isVisible());
  assert.equal(await page.getByLabel("Message", { exact: true }).inputValue(), "");
  await page.locator(".copy-email").click();
  assert.equal(await page.locator(".copy-email").getAttribute("data-copied"), "true");
  console.log("Contact: focus, sending, error preservation, success and copy confirmation PASS (requests intercepted)");

  await page.goto(`${base}/?backgroundDebug=1`, { waitUntil: "networkidle" });
  await page.locator("#research").scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".rs-step").nth(3).click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".research-sequence").getAttribute("data-research-stage"), "3");
  assert.equal(await page.locator(".rs-art-scene").evaluate(el => getComputedStyle(el).opacity), "1");
  await page.locator(".rs-step").nth(3).press("ArrowDown");
  assert.equal(await page.locator(".research-sequence").getAttribute("data-research-stage"), "4");
  const running = await page.locator("#skills, #research, #capabilities").evaluateAll(elements => elements.flatMap(el => el.getAnimations({ subtree: true }).filter(a => a.playState === "running")));
  assert.equal(running.length, 0, "reduced motion stops new scenes");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    document.documentElement.dataset.motionPaused = "true";
    dispatchEvent(new CustomEvent("muaz-motion-state", { detail: { paused: true } }));
  });
  await page.locator(".rs-step").nth(2).click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".rs-art-scene").evaluate(el => getComputedStyle(el).opacity), "1", "paused stage remains inspectable");
  assert.equal(await page.locator(".research-sequence").getAttribute("data-scene-paused"), "true");
  console.log("Reduced motion, global pause and keyboard research inspection PASS");
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }

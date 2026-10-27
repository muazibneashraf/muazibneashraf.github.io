import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3221";
const output = resolve("tmp/navigation-fix");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const errors = [];

async function openNavigation(page) {
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
}

async function expectExperienceLanding(page) {
  await page.waitForFunction(() => {
    const heading = document.querySelector("#job-experience .eyebrow");
    const header = document.querySelector(".site-header");
    return heading && Math.abs(heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 24) < 1;
  });
}

async function expectTop(page) {
  await page.waitForFunction(() => location.pathname === "/" && scrollY < 1);
  assert.ok(await page.locator(".hero-copy h1").isVisible());
}

try {
  for (const width of [375, 768, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: width === 375 ? 812 : 959 }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await openNavigation(page);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Experience", exact: true }).click();
    await expectExperienceLanding(page);
    await page.screenshot({ path: join(output, `${width}-experience.png`) });
    await page.getByRole("link", { name: "Portfolio Muaz home" }).click();
    await expectTop(page);
    assert.equal(new URL(page.url()).hash, "");

    // Same-page navigation must work even without a hash, including repeat clicks.
    for (let i = 0; i < 2; i++) {
      await page.locator("#trace").evaluate(el => el.scrollIntoView({ behavior: "instant" }));
      assert.ok(await page.evaluate(() => scrollY > 500));
      await page.getByRole("link", { name: "Portfolio Muaz home" }).click();
      await expectTop(page);
    }

    await page.goto(`${base}/about`, { waitUntil: "networkidle" });
    await openNavigation(page);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Experience", exact: true }).click();
    await expectExperienceLanding(page);

    await page.goto(`${base}/projects`, { waitUntil: "networkidle" });
    await page.evaluate(() => scrollTo({ top: 900, behavior: "instant" }));
    await openNavigation(page);
    await page.getByRole("link", { name: "Portfolio Muaz home" }).click();
    await expectTop(page);
    if (width <= 760) assert.ok(await page.getByRole("button", { name: "Menu", exact: true }).isVisible());

    await page.locator("#trace").evaluate(el => el.scrollIntoView({ behavior: "instant" }));
    await page.getByRole("link", { name: "Portfolio Muaz home" }).focus();
    await page.keyboard.press("Enter");
    await expectTop(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.close();
    console.log(`${width}px: Experience gap 24px; logo works from sections, plain scroll, other routes, and keyboard; mobile menu closes: PASS`);
  }
  for (const width of [375, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 959 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + '/?backgroundDebug=1', { waitUntil: "networkidle" });
    for (const [label, id] of [["Experience", "job-experience"], ["About", "about"], ["Capabilities", "capabilities"], ["Projects", "work"]]) {
      await openNavigation(page);
      const before=await page.evaluate(()=>scrollY);
      await page.evaluate(()=>{window.__positions=[];const until=performance.now()+1400;const sample=()=>{window.__positions.push(scrollY);if(performance.now()<until)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: label, exact: true }).click();
      await page.waitForFunction(id=>Math.abs(document.querySelector(`#${id} .eyebrow`).getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-24)<1,id);
      const positions=await page.evaluate(()=>window.__positions);
      assert.ok(new Set(positions.map(Math.round)).size>6,`${width}px ${label} scrolls through intermediate positions`);
      assert.equal(new URL(page.url()).pathname,'/');
      const after=await page.evaluate(()=>scrollY);
      assert.ok(label==='About'||label==='Projects'?after<before:after>before,'The section is reached in the correct direction');
    }
    await page.getByRole("link", { name: "Portfolio Muaz home" }).click();await expectTop(page);
    // A matching section on a standalone page also scrolls in place.
    await page.goto(base+'/about',{waitUntil:'networkidle'});
    await page.evaluate(()=>scrollTo({top:700,behavior:'instant'}));await openNavigation(page);
    await page.getByRole('navigation').getByRole('link',{name:'About',exact:true}).click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('#about .eyebrow').getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-24)<1);
    assert.equal(new URL(page.url()).pathname,'/about');
    // An absent destination opens its separate route.
    await openNavigation(page);await page.getByRole('navigation').getByRole('link',{name:'Projects',exact:true}).click();await page.waitForURL('**/projects');
    await page.close();console.log(`${width}px: smooth scrolling up/down, standalone local sections and separate-page navigation: PASS`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

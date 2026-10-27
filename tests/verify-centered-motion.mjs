import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const output = resolve("tmp/centered-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || "msedge" });
const report = [], errors = [];
async function measure(page, selector, phase = "typing") {
  const snapshot = await page.waitForFunction(({selector, phase}) => {
    if (document.querySelector(".hero-body")?.dataset.introPhase !== phase) return null;
    const lines = [...document.querySelectorAll(selector)].map(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r => r.width && r.height);
    });
    const rects = lines.flat();
    const lineLefts = lines.map(rects => Math.min(...rects.map(r => r.left)));
    const lineDiffs = lines.map(rects => (Math.min(...rects.map(r => r.left)) + Math.max(...rects.map(r => r.right))) / 2 - innerWidth / 2);
    const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
    const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
    return { width: innerWidth, height: innerHeight, lineLefts, lineDiffs, x: (left + right)/2, y: (top + bottom)/2, diffX: (left + right)/2 - innerWidth/2, diffY: (top + bottom)/2 - innerHeight/2 };
  }, {selector, phase});
  const metrics = await snapshot.jsonValue();
  await snapshot.dispose();
  return metrics;
}
const expectIntroPosition = (metrics, label) => {
  assert.ok(Math.abs(metrics.diffX) <= 1, `${label}: text is ${metrics.diffX}px from horizontal center`);
  const expectedLift = metrics.width >= 1024 ? Math.min(64, metrics.height * 0.06) : 0;
  assert.ok(Math.abs(metrics.diffY + expectedLift) <= 1, `${label}: vertical offset ${metrics.diffY}px should be ${-expectedLift}px`);
};
try {
  for (const width of [320,375,390,768,1024,1440,1920]) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 812 : width === 1920 ? 959 : 900 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.waitForSelector('[data-intro-phase="typing"]');
    const planned = await measure(page, '.intro-line-size');
    expectIntroPosition(planned, `${width}px typing`);
    const actionBox = await page.locator('.hero-actions').boundingBox();
    // Check the actual typed text, not the centered container or hidden sizers.
    const typed = await measure(page, '.intro-line-typed .intro-typed-run', "holding");
    expectIntroPosition(typed, `${width}px full text`);
    assert.ok(typed.lineDiffs.slice(1).every(diff => Math.abs(diff) <= 1), `${width}px: name and both taglines should share the center axis: ${typed.lineDiffs}`);
    assert.ok(Math.abs(typed.lineLefts[0] - typed.lineLefts[1]) <= 1, `${width}px: greeting should align with the name's left edge`);
    await page.screenshot({ path: join(output, `${width}-centered.png`) });
    await page.waitForSelector('[data-intro-phase="completed"]');
    const finalBox = await page.locator('.hero-actions').boundingBox();
    for (const key of ['x','y','width','height']) assert.ok(Math.abs(finalBox[key]-actionBox[key]) < .6, `Homepage action ${key} moved`);
    assert.equal(await page.locator('.intro-skip-btn').count(), 0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(output, `${width}-home.png`) });
    if (width === 1920) {
      await page.reload();
      await page.waitForSelector('[data-intro-phase="completed"]');
      assert.equal(await page.locator('.intro-skip-btn').count(), 0, 'Refresh bypasses the intro');
      await page.goto(base);
      await page.waitForSelector('[data-intro-phase="typing"]');
      await page.setViewportSize({width:1024,height:768});
      expectIntroPosition(await measure(page,'.intro-line-typed .intro-typed-run', "holding"),'resize during intro');
    }
    report.push({width,planned,typed});
    await page.close();
    console.log(`${width}px: desktop lift/mobile centering verified within 1px; homepage positions unchanged: PASS`);
  }
  assert.deepEqual(errors,[]);
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const base = process.env.TEST_BASE_URL || 'http://localhost:3221';
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    const track = page.locator('.marquee-track');
    const animation = () => track.evaluate(el => { const a = el.getAnimations()[0]; return { time: Number(a.currentTime), start: a.startTime, state: a.playState }; });
    await page.getByRole('region', { name: 'Core technologies marquee' }).scrollIntoViewIfNeeded();
    await page.getByRole('region', { name: 'Core technologies marquee' }).hover();
    let before = await animation(); await page.waitForTimeout(300); let after = await animation();
    assert.equal(after.state, 'running'); assert.ok(after.time > before.time + 100); assert.equal(after.start, before.start);
    await page.getByRole('region', { name: 'Core technologies marquee' }).click();
    before = await animation(); await page.waitForTimeout(300); after = await animation();
    assert.equal(after.state, 'running'); assert.ok(after.time > before.time + 100); assert.equal(after.start, before.start);
    await page.getByRole('button', { name: 'Pause motion', exact: false }).click();
    await page.waitForTimeout(80); before = await animation(); await page.waitForTimeout(200); after = await animation();
    assert.equal(after.state, 'paused'); assert.ok(Math.abs(after.time - before.time) < 1);
    await page.getByRole('button', { name: 'Resume motion', exact: false }).click();
    before = await animation(); await page.waitForTimeout(200); after = await animation();
    assert.equal(after.state, 'running'); assert.ok(after.time > before.time + 100);
    await page.close();
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce' }); await reduced.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await reduced.locator('.marquee-track').evaluate(el => getComputedStyle(el).animationName), 'none');
  console.log('Ticker keeps the same timeline through hover and click, explicit pause/resume works, reduced motion respected at mobile and desktop sizes: PASS');
} finally { await browser.close(); }

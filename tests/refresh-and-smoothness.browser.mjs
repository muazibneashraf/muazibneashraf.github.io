import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const output = resolve("tmp/refresh-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const errors = [];
const report = { widths: [], reloads: 0, frames: [], checks: [] };
const phase = (page, value) => page.waitForSelector(`[data-intro-phase="${value}"]`, { timeout: 10000 });
const selectors = [".hero-body", ".hero-copy", ".hero-actions", ".hero-actions .primary", ".hero-actions .secondary", ".hero-socials", ".network-visual", ".terminal-card", ".site-header"];
const geometry = page => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
  const r = document.querySelector(selector).getBoundingClientRect();
  return [selector, [r.x, r.y, r.width, r.height]];
})), selectors);
const sameGeometry = (a, b, label) => {
  for (const selector of selectors) a[selector].forEach((value, i) => {
    assert.ok(Math.abs(value - b[selector][i]) < 0.6, `${label} ${selector}[${i}]: ${value} -> ${b[selector][i]}`);
  });
};
async function instrument(context) {
  await context.addInitScript(() => {
    window.__canvasInits = { background: 0, globe: 0 };
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(...args) {
      if (this.classList.contains("system-narrative-canvas")) window.__canvasInits.background++;
      if (this.closest(".network-visual")) window.__canvasInits.globe++;
      return get.apply(this, args);
    };
    window.__layoutScans = 0;
    const query = Document.prototype.querySelectorAll;
    Document.prototype.querySelectorAll = function(selector) {
      if (selector.includes(".hero-copy") && selector.includes(".project-card")) window.__layoutScans++;
      return query.call(this, selector);
    };
    const request = window.requestAnimationFrame;
    const cancel = window.cancelAnimationFrame;
    const pending = new Map();
    window.__duplicateFrames = 0;
    window.requestAnimationFrame = callback => {
      if ([...pending.values()].includes(callback)) window.__duplicateFrames++;
      const id = request.call(window, time => { pending.delete(id); callback(time); });
      pending.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel.call(window, id); };
    window.__introPhases = [];
    new MutationObserver(() => {
      const phase = document.querySelector(".hero-body")?.dataset.introPhase;
      if (phase) window.__introPhases.push(phase);
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-intro-phase"] });
    window.__shifts = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push(entry.value);
    }).observe({ type: "layout-shift", buffered: true });
  });
}
async function start(page) {
  await phase(page, "typing");
  assert.equal(await page.getByRole("button", { name: /restart/i }).count(), 0);
  assert.ok(await page.getByRole("button", { name: "Skip introduction" }).isVisible(), "Skip is available while the intro plays");
  assert.equal(await page.evaluate(() => typeof window.restartIntro), "undefined");
  // Preserve object identity across typing and the handoff, rather than checking
  // only that a replacement canvas happens to have the same dimensions.
  await page.evaluate(() => {
    window.__originalCanvases = [...document.querySelectorAll("canvas")];
    window.__geometryFrames = [];
    window.__gaps = [];
    window.__textOverflow = 0;
    let previous = performance.now();
    const sample = now => {
      window.__gaps.push(now - previous); previous = now;
      const r = document.querySelector(".hero-actions").getBoundingClientRect();
      window.__geometryFrames.push([r.x, r.y, r.width, r.height]);
      const title = document.querySelector(".hero-copy h1");
      if (title.querySelector(".intro-typed-run").getClientRects().length > title.querySelector(".intro-line-size").getClientRects().length) window.__textOverflow++;
      if (document.querySelector(".hero-body").dataset.introPhase !== "completed") requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
async function finish(page, before, label) {
  await phase(page, "completed");
  sameGeometry(before, await geometry(page), label);
  const metrics = await page.evaluate(() => ({
    canvasesRetained: window.__originalCanvases.every(c => c.isConnected),
    init: window.__canvasInits,
    scans: window.__layoutScans,
    duplicateFrames: window.__duplicateFrames,
    cls: window.__shifts.reduce((a,b) => a+b, 0),
    maxGap: Math.max(...window.__gaps),
    textOverflow: window.__textOverflow,
    frames: window.__geometryFrames,
    scroll: scrollY,
    overflow: document.documentElement.scrollWidth > innerWidth,
    locked: getComputedStyle(document.documentElement).overflowY === "hidden",
  }));
  assert.ok(metrics.canvasesRetained, "Background and globe canvases persist through transition");
  assert.equal(metrics.init.background, 1, "Single background context per document");
  // React Strict Mode intentionally creates/cleans the globe effect twice in dev.
  assert.ok(metrics.init.globe <= 2, "No globe reinitialization while typing");
  assert.equal(metrics.duplicateFrames, 0, "Never queue the same animation callback twice");
  assert.ok(metrics.scans <= 8, `No document measurement per keystroke (${metrics.scans} scans)`);
  for (const frame of metrics.frames) frame.forEach((value, i) => assert.ok(Math.abs(value - before[".hero-actions"][i]) < 0.6, `${label}: button container moved in a sampled frame`));
  assert.equal(metrics.scroll, 0);
  assert.equal(metrics.overflow, false);
  assert.equal(metrics.locked, false);
  assert.equal(metrics.textOverflow, 0, "The typing cursor must not introduce extra heading line breaks");
  assert.ok(metrics.cls < 0.01, `${label}: CLS ${metrics.cls}`);
  assert.equal(await page.locator(".intro-controls-wrap").count(), 0);
  assert.equal(await page.locator(".hero").count(), 1);
  assert.equal(await page.getByRole("button", { name: /skip.*intro/i }).count(), 0);
  assert.equal(await page.locator(".terminal-card").evaluate(el => getComputedStyle(el).backdropFilter), "none", "Globe remains visible through the card after the intro");
  report.frames.push({ label, maxGap: Math.round(metrics.maxGap), cls: metrics.cls, layoutScans: metrics.scans, samples: metrics.frames.length });
  return metrics;
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: join(output, "video"), size: { width: 1440, height: 900 } } });
  await instrument(context);
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base);
  await start(page);
  let initial = await geometry(page);
  // Assert the actual typed layers, not the invisible full-text sizing spans.
  for (const [index, expected] of ["HELLO", "Muaz Ibne Ashraf", "Building software", "Exploring intelligence"].entries()) {
    await page.waitForFunction(({index,expected}) => document.querySelectorAll(".intro-line-typed")[index].textContent.toLowerCase().includes(expected.toLowerCase()), {index,expected});
    assert.ok(await page.locator(".intro-line-typed").nth(index).evaluate(el => {
      const style = getComputedStyle(el);
      return !["transparent", "rgba(0, 0, 0, 0)"].includes(style.webkitTextFillColor) || style.backgroundImage !== "none";
    }), `Line ${index + 1} must paint its typed text, including the accent gradient`);
  }
  await page.screenshot({ path: join(output, "desktop-intro.png") });
  await phase(page, "transitioning");
  assert.equal(await page.getByRole("button", { name: "Skip introduction" }).count(), 0, "Skip disappears as soon as the homepage starts appearing");
  const transitionCardStyle = await page.locator(".terminal-card").evaluate(el => {
    const style = getComputedStyle(el);
    return { background: style.backgroundImage, filter: style.backdropFilter, transform: style.transform, zIndex: style.zIndex };
  });
  assert.equal(transitionCardStyle.filter, "none");
  await page.screenshot({ path: join(output, "desktop-transition.png") });
  await finish(page, initial, "initial load");
  const completedCardStyle = await page.locator(".terminal-card").evaluate(el => {
    const style = getComputedStyle(el);
    return { background: style.backgroundImage, filter: style.backdropFilter, transform: style.transform, zIndex: style.zIndex };
  });
  assert.deepEqual(completedCardStyle, transitionCardStyle, "Terminal appearance stays the same after the intro");
  await page.screenshot({ path: join(output, "desktop-home.png") });
  for (let i=0; i<3; i++) {
    await page.evaluate(() => scrollTo({top: 600, behavior:"instant"}));
    await page.reload({ waitUntil: "domcontentloaded" });
    await phase(page, "completed");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.introBypass), "true");
    assert.equal(await page.locator(".intro-skip-btn").count(), 0);
    assert.ok(await page.locator(".hero-actions .primary").isVisible());
    assert.ok(await page.locator(".site-header").isVisible());
    await page.waitForSelector('.network-visual[data-labels-ready="true"]');
    assert.equal(await page.locator('.network-node:visible').count(), 3);
    assert.equal(await page.evaluate(() => window.__introPhases.some(phase => ["typing", "holding", "transitioning"].includes(phase))), false, "Refresh never enters an intro playback phase");
    await page.waitForFunction(() => scrollY > 500);
    await page.evaluate(() => scrollTo({top: 0, behavior:"instant"}));
    sameGeometry(initial, await geometry(page), `direct homepage on reload ${i+1}`);
    report.reloads++;
  }
  // A refresh during typing also opens the homepage directly.
  await page.goto(base);
  await start(page);
  await page.waitForFunction(() => document.querySelector(".intro-line-typed").textContent.toUpperCase().includes("HELLO"));
  await page.reload();
  await phase(page, "completed");
  assert.equal(await page.locator(".intro-skip-btn").count(), 0);
  assert.equal(await page.evaluate(() => window.__introPhases.some(phase => ["typing", "holding", "transitioning"].includes(phase))), false);
  // Fresh visits still offer the existing Skip control.
  await page.goto(base);
  await start(page);
  await page.getByRole("button", { name: "Skip introduction" }).click();
  await phase(page,"completed");
  await page.waitForTimeout(4000);
  assert.equal(await page.locator(".hero-body").getAttribute("data-intro-phase"), "completed", "No stale typing callback after Skip");
  await page.keyboard.press("r");
  await page.evaluate(() => dispatchEvent(new CustomEvent("muaz-intro-restart")));
  assert.equal(await page.locator(".hero-body").getAttribute("data-intro-phase"), "completed", "No hidden replay control");
  await page.getByRole("link",{name:"All projects",exact:true}).click();
  await page.waitForURL("**/projects");
  await page.getByRole("link",{name:"Portfolio Muaz home"}).click();
  await phase(page,"completed");
  assert.equal(await page.locator(".intro-skip-btn").count(),0,"Soft navigation preserves completed intro");
  assert.ok(await page.locator('.hero-socials a[href*="github"]').isVisible());
  assert.ok(await page.locator('.hero-socials a[href*="linkedin"]').isVisible());
  assert.ok(await page.locator('.hero-socials a[href*="mail.google.com"]').isVisible());
  await page.locator('.hero-actions .secondary').click();
  await page.waitForSelector('.cv-dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.cv-dialog[open]',{state:'hidden'});
  await page.getByRole("button",{name:"Pause motion"}).click();
  assert.equal(await page.locator('.network-visual').getAttribute('data-motion'),'paused');
  await page.getByRole("button",{name:"Resume motion"}).click();
  await context.close();
  report.checks.push("typing sequence", "refresh bypass x3 with scroll restoration", "refresh during typing opens homepage", "Skip cancels timers", "Skip hidden throughout homepage transition", "no replay controls", "soft navigation", "social links", "resume overlay", "pause/resume");

  for (const width of [320,375,390,768,1024,1440,1920]) {
    const ctx = await browser.newContext({ viewport:{width,height:width<600?812:900} });
    await instrument(ctx);
    const p = await ctx.newPage();
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base);
    await start(p);
    const before = await geometry(p);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`intro overflow ${width}`);
    await p.waitForFunction(()=>document.querySelectorAll('.intro-line-typed')[3].textContent.includes('intelligence'));
    await p.screenshot({path:join(output,`${width}-intro.png`)});
    await finish(p,before,`${width}px`);
    await p.screenshot({path:join(output,`${width}-home.png`)});
    // Resizing a completed page must not restart the intro.
    await p.setViewportSize({width:width+1,height:900});
    await p.waitForTimeout(60);
    assert.equal(await p.locator('.hero-body').getAttribute('data-intro-phase'),'completed');
    report.widths.push(width);
    await ctx.close();
    console.log(`${width}px: full transition, fixed control anchors, no overflow or layout shift: PASS`);
  }
  const reduced = await browser.newContext({reducedMotion:'reduce',viewport:{width:375,height:812}});
  const p = await reduced.newPage();
  await p.goto(base);
  await phase(p,'completed');
  assert.equal(await p.locator('.intro-controls-wrap').count(),0);
  assert.ok(await p.locator('.hero-actions .primary').isVisible());
  await p.reload();
  await phase(p,'completed');
  await reduced.close();
  report.checks.push('reduced motion');

  const unhydratedContext = await browser.newContext({ viewport: {width: 1440, height: 900} });
  const unhydratedPage = await unhydratedContext.newPage();
  await unhydratedPage.goto(base);
  await phase(unhydratedPage, "typing");
  await unhydratedPage.route("**/_next/static/**/*.js", route => route.abort());
  await unhydratedPage.reload({waitUntil: "domcontentloaded"});
  assert.equal(await unhydratedPage.locator(".hero-body").getAttribute("data-intro-phase"), "init", "React has not hydrated the server HTML");
  assert.ok(await unhydratedPage.locator(".hero-actions .primary").isVisible(), "Homepage is visible before hydration on refresh");
  assert.ok(await unhydratedPage.locator(".site-header").isVisible());
  assert.ok(await unhydratedPage.locator(".hero-copy h1 .intro-line-size").isVisible());
  assert.equal(await unhydratedPage.locator(".intro-skip-btn").isVisible(), false);
  assert.equal(await unhydratedPage.locator('.network-node:visible').count(), 0, "Globe controls wait for their positions instead of overlapping before hydration");
  assert.notEqual(await unhydratedPage.evaluate(() => getComputedStyle(document.documentElement).overflowY), "hidden");
  await unhydratedPage.screenshot({path:join(output,"refresh-before-hydration.png")});
  await unhydratedContext.close();
  report.checks.push("refresh shows server-rendered homepage before hydration");

  // Separately measure first-load performance without screenshot/video overhead.
  const performanceContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await instrument(performanceContext);
  const performancePage = await performanceContext.newPage();
  await performancePage.goto(base);
  await start(performancePage);
  const performanceMetrics = await finish(performancePage, await geometry(performancePage), "initial load without capture");
  assert.ok(performanceMetrics.maxGap < 100, `First-load animation froze for ${performanceMetrics.maxGap}ms`);
  await performanceContext.close();
  report.checks.push('first-load frame timing without recording overhead');
  assert.deepEqual(errors,[],"No browser errors");
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }

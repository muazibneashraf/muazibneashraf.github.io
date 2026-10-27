import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const output = resolve('tmp/bg05-final'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const report = { viewports: [], routes: [], errors: [] };
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  await page.addInitScript(() => {
    window.__orbit = [];
    const proto = CanvasRenderingContext2D.prototype, ellipse = proto.ellipse, close = proto.closePath, stroke = proto.stroke;
    proto.ellipse = function(...args) { if (this.canvas.closest('.network-visual')) this.__orbit = { args, closed: false }; return ellipse.apply(this, args); };
    proto.closePath = function() { if (this.__orbit) this.__orbit.closed = true; return close.call(this); };
    proto.stroke = function(...args) {
      if (this.__orbit && window.__orbit.length < 2) window.__orbit.push({ ...this.__orbit, width: this.lineWidth, cap: this.lineCap, join: this.lineJoin, dashes: this.getLineDash() });
      this.__orbit = null; return stroke.apply(this, args);
    };
  });
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 1920 ? 1080 : 900 });
    await page.goto(base + '/?backgroundDebug=1', { waitUntil: 'networkidle' });
    const hero = page.locator('section.hero');
    assert.equal(await hero.locator('.availability, .hero-description, .hero-topline').count(), 0);
    const text = await hero.innerText();
    assert.ok(!text.includes('Open to software engineering opportunities'));
    assert.ok(!text.includes('Computer Science graduate from BRAC University, building Flask applications and exploring applied AI.'));
    for (const keep of ['Muaz Ibne Ashraf', 'Building software', 'Exploring intelligence', 'Explore my work', 'View résumé', 'GitHub', 'LinkedIn', 'Email']) assert.ok(text.includes(keep), keep);
    const spacing = await hero.evaluate(el => {
      const role = el.querySelector('.hero-role').getBoundingClientRect(), buttons = el.querySelector('.hero-actions').getBoundingClientRect();
      return buttons.top - role.bottom;
    });
    assert.ok(spacing >= 24 && spacing <= 40, `intentional tagline/button spacing ${width}: ${spacing}`);
    await page.screenshot({ path: join(output, `${width}-hero-clean.png`) });
    const orbit = await page.evaluate(() => window.__orbit);
    assert.equal(orbit.length, 2);
    for (const curve of orbit) {
      assert.equal(curve.closed, true); assert.equal(curve.dashes.length, 0);
      assert.ok(curve.width >= 1); assert.equal(curve.cap, 'round'); assert.equal(curve.join, 'round');
    }
    const diagrams = await page.locator('#work .project-diagram').evaluateAll(svgs => svgs.map(svg => {
      const nodes = [...svg.querySelectorAll('[data-node]')].map(g => ({ name: g.dataset.node, rect: g.querySelector('rect')?.getBBox() }));
      const errors = [];
      for (const t of svg.querySelectorAll('text')) {
        const b = t.getBBox(), v = svg.viewBox.baseVal;
        if (b.x < 0 || b.x + b.width > v.width || b.y < 0 || b.y + b.height > v.height) errors.push('label outside viewBox: ' + t.textContent);
        if (parseFloat(getComputedStyle(t).fontSize) * svg.getScreenCTM().a < 8.5) errors.push('label too small: ' + t.textContent);
      }
      const rect = g => { const r = g.querySelector('rect'); return {x:r.x.baseVal.value,y:r.y.baseVal.value,w:r.width.baseVal.value,h:r.height.baseVal.value}; };
      const near = (a,b,name) => { if (Math.abs(a-b) > 0.01) errors.push(name + ': ' + a + ' / ' + b); };
      if (svg.classList.contains('architecture-diagram')) {
        const groups = [...svg.querySelectorAll('[data-node]')], [root,core,...children] = groups.map(rect);
        const path=svg.querySelector('[data-edge="parent"]'), start=path.getPointAtLength(0), end=path.getPointAtLength(path.getTotalLength());
        near(start.x,root.x+root.w/2,'parent x'); near(start.y,root.y+root.h,'parent bottom');
        near(end.x,core.x+core.w/2,'core x'); near(end.y,core.y,'core top');
        children.forEach((node,i) => {
          const stem = svg.querySelector(`[data-edge="${groups[i+2].dataset.node}"]`), a=stem.getPointAtLength(0), b=stem.getPointAtLength(stem.getTotalLength());
          near(a.x,node.x+node.w/2,'stem center'); near(b.x,node.x+node.w/2,'stem end center'); near(b.y,node.y,'stem meets node'); near(a.y,122,'stem meets branch');
        });
        near(children[1].x-children[0].x,children[2].x-children[1].x,'even child spacing');
      }
      if (svg.classList.contains('community-map')) {
        const path=svg.querySelector('[data-edge="community-route"]'), length=path.getTotalLength();
        for (const point of svg.querySelectorAll('.community-points circle')) {
          let distance=Infinity;
          for(let i=0;i<=1000;i++) {const p=path.getPointAtLength(length*i/1000);distance=Math.min(distance,Math.hypot(p.x-point.cx.baseVal.value,p.y-point.cy.baseVal.value));}
          if(distance>.5)errors.push('community point off route');
        }
      }
      return { kind: svg.classList.value, labels: nodes.map(n=>n.name), errors };
    }));
    assert.equal(diagrams.length, 4);
    for (const d of diagrams) assert.deepEqual(d.errors, [], `${width}/${d.kind}`);
    for (const [i,id] of ['icu','lifeline','lottery','portfolio'].entries()) {
      const visual = page.locator('#work .project-visual').nth(i);
      await visual.screenshot({ path: join(output, `${width}-diagram-${id}.png`) });
    }
    await page.locator('#skills').scrollIntoViewIfNeeded(); await page.waitForTimeout(2000);
    const background = await page.evaluate(() => {
      let s;document.querySelector('.system-narrative-canvas').dispatchEvent(new CustomEvent('muaz-background-inspect',{detail:v=>s=v}));
      return {visibleConstellationNodes:s.system.nodes.filter(n=>!n.ambient&&Math.min(n.visibility,n.clearance)*n.density>.15).length,visibleEdges:s.system.edges.filter(e=>Math.min(e.visibility,e.clearance)*e.density>.15).length,light:s.system.light};
    });
    if(width>=768) assert.ok(background.visibleConstellationNodes>=8,'visible living constellations in gutters');
    await page.screenshot({path:join(output,`${width}-skills-refined.png`)});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
    report.viewports.push({width,spacing,diagrams,background,orbit});
    if(width===375) {
      await page.getByRole('button',{name:'Menu',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Close',exact:true}).getAttribute('aria-expanded'),'true');
      await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'About',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
    }
    console.log(`${width}px: clean hero, smooth orbital paths, all diagram geometry, background visibility, overflow: PASS`);
  }
  for (const route of ['/','/projects','/about','/extracurricular','/internship','/contact','/resume','/projects/icu-analyzer','/projects/lifeline','/projects/admission-lottery','/projects/portfolio-platform']) {
    await page.goto(base+route,{waitUntil:'networkidle'});
    assert.doesNotMatch(await page.locator('body').innerText(),/[↗→←↓↑]/,`decorative direction glyph on ${route}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route);
    if(route.startsWith('/projects/')) await page.locator('.detail-visual .project-visual').screenshot({path:join(output,`detail-${route.split('/').pop()}.png`)});
    report.routes.push(route);
  }
  assert.deepEqual(report.errors,[]);
  await writeFile(join(output,'refinement-verification.json'),JSON.stringify(report,null,2));
  console.log('All public routes: clean directional symbols and no browser errors: PASS');
} finally {await browser.close();}

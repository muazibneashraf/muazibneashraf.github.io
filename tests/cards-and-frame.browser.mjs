import assert from 'node:assert/strict';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3221', output=resolve('tmp/cards-and-frame');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const report={widths:[],errors:[]};
try {
 for(const width of [375,768,1440,1920]){
  const height=width===375?812:width===1920?1080:900;
  const context=await browser.newContext({viewport:{width,height},...(width===1440?{recordVideo:{dir:output,size:{width,height}}}:{})});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base,{waitUntil:'networkidle'}); await page.evaluate(()=>document.fonts.ready);
  assert.doesNotMatch(await page.locator('section.hero').innerText(),/IDEAS INTO IMPLEMENTATION|Python · Flask · React/);
  assert.equal(await page.locator('.hero-build').count(),0);
  const scrollPrompt=await page.locator('.hero-bottom span, .hero-bottom a').first().evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return Math.abs((a.left+a.right-b.left-b.right)/2);});
  assert.ok(scrollPrompt<1,'scroll prompt centered');
  const header=await page.locator('.site-header').evaluate(el=>({padding:parseFloat(getComputedStyle(el).paddingLeft),logo:el.querySelector('.wordmark').getBoundingClientRect().left}));
  assert.ok(header.padding<=48); assert.ok(Math.abs(header.padding-header.logo)<1);
  await page.locator('.site-header').screenshot({path:join(output,`${width}-navbar.png`)});
  await page.locator('.stack-strip').scrollIntoViewIfNeeded();
  const ticker=await page.locator('.stack-strip').evaluate(el=>{
   const container=el.querySelector('.marquee-track-container'),track=el.querySelector('.marquee-track'),groups=[...track.children],animation=track.getAnimations()[0];
   const viewport=container.getBoundingClientRect(),widths=groups.map(g=>g.getBoundingClientRect().width),gaps=[];
   animation.pause();const duration=animation.effect.getTiming().duration;
   for(const fraction of [0,.25,.5,.75,.999999,1]){
    animation.currentTime=duration*fraction;
    const items=[...track.querySelectorAll('.marquee-item')].map(x=>x.getBoundingClientRect()).filter(r=>r.right>viewport.left&&r.left<viewport.right).sort((a,b)=>a.left-b.left);
    let cursor=viewport.left,worst=0;
    for(const r of items){worst=Math.max(worst,r.left-cursor);cursor=Math.max(cursor,r.right);}
    worst=Math.max(worst,viewport.right-cursor);gaps.push(worst);
   }
   animation.currentTime=0; animation.play();
   return {background:getComputedStyle(el).backgroundColor,padding:parseFloat(getComputedStyle(el).paddingLeft),container:viewport.width,groups:widths,gaps};
  });
  assert.equal(ticker.background,'rgba(0, 0, 0, 0)');assert.ok(ticker.padding<=48);
  assert.ok(Math.abs(ticker.groups[0]-ticker.groups[1])<.1,'identical loop halves');
  assert.ok(ticker.groups[0]>=ticker.container,'track covers viewport');assert.ok(Math.max(...ticker.gaps)<=30,JSON.stringify(ticker.gaps));
  await page.locator('.stack-strip').screenshot({path:join(output,`${width}-ticker.png`)});
  const diagrams=[];
  for(const [index,id] of ['icu','lifeline','lottery','portfolio'].entries()){
   const visual=page.locator('#work .project-visual').nth(index);await visual.scrollIntoViewIfNeeded();
   const animations=await visual.locator('.project-diagram').evaluate(el=>el.getAnimations({subtree:true}).length);assert.ok(animations>=3,`${id}: living animation`);
   const before=await visual.locator('.diagram-packet').first().evaluate(el=>el.getBoundingClientRect().toJSON());
   await page.waitForTimeout(width===1440?1800:250);
   const after=await visual.locator('.diagram-packet').first().evaluate(el=>el.getBoundingClientRect().toJSON());
   assert.ok(Math.hypot(before.x-after.x,before.y-after.y)>1,`${id}: signals travel`);
   const errors=await visual.locator('.diagram-packet').evaluateAll(elements=>elements.map(el=>{
    const s=getComputedStyle(el),d=s.offsetPath.match(/^path\(["'](.*)["']\)$/)[1],path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);
    const point=path.getPointAtLength(path.getTotalLength()*parseFloat(s.offsetDistance)/100),screen=new DOMPoint(point.x,point.y).matrixTransform(el.ownerSVGElement.getScreenCTM()),r=el.getBoundingClientRect();
    return Math.hypot(screen.x-r.left-r.width/2,screen.y-r.top-r.height/2);
   }));
   assert.ok(Math.max(...errors)<1,`${id}: packet follows correct SVG path`);
   await visual.screenshot({path:join(output,`${width}-${id}.png`)});
   diagrams.push({id,animations,maxPathError:Math.max(...errors)});
  }
  await page.evaluate(()=>dispatchEvent(new CustomEvent('muaz-motion-state',{detail:{paused:true}})));
  const paused=await page.locator('#work .project-diagram').evaluateAll(es=>es.flatMap(el=>el.getAnimations({subtree:true}).map(a=>a.playState)));
  assert.ok(paused.length>10&&paused.every(s=>s==='paused'),'pause freezes all card motion');
  await page.waitForTimeout(250);
  await page.evaluate(()=>dispatchEvent(new CustomEvent('muaz-motion-state',{detail:{paused:false}})));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.diagram-motion:visible').count(),0,'reduced motion hides traveling decorations');
  const running=await page.locator('#work .project-diagram').evaluateAll(es=>es.flatMap(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running')));
  assert.equal(running.length,0,'reduced motion stops diagram animations');
  const visibleLabels=await page.locator('.marquee-tech:visible').allTextContents();assert.equal(visibleLabels.length,new Set(visibleLabels).size,'static ticker shows one copy per technology');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'reduced motion does not overflow');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  const footer=await page.locator('.site-footer').evaluate(el=>({padding:parseFloat(getComputedStyle(el).paddingLeft),copyright:el.querySelector('p').getBoundingClientRect().left}));
  assert.ok(footer.padding<=48);assert.ok(Math.abs(footer.padding-footer.copyright)<1);
  await page.locator('.site-footer').screenshot({path:join(output,`${width}-footer.png`)});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  report.widths.push({width,header,footer,ticker,diagrams});
  const video=page.video();await context.close();if(video)await rename(await video.path(),join(output,'animated-cards-1440.webm'));
  console.log(`${width}px: animated cards, precise signal paths, seamless ticker, frame gutters, pause and reduced motion: PASS`);
 }
 assert.deepEqual(report.errors,[]);await writeFile(join(output,'verification.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}

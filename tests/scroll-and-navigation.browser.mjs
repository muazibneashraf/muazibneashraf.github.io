import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000',output=resolve('tmp/scroll-polish');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const errors=[],report=[];
const snapshot=page=>page.evaluate(()=>{let value;document.querySelector('.system-narrative-canvas').dispatchEvent(new CustomEvent('muaz-background-inspect',{detail:result=>value=result}));return value;});
const surface=page=>page.locator('.site-header').evaluate(el=>parseFloat(getComputedStyle(el,'::before').opacity));
try {
 for(const width of [375,768,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:width<600?812:959}});
  await context.addInitScript(()=>{
   window.__engineStarts=0;const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args){if(this.classList.contains('system-narrative-canvas'))window.__engineStarts++;return get.apply(this,args);};
   window.__viewTransitions=[];
   if(document.startViewTransition){const start=document.startViewTransition.bind(document);document.startViewTransition=function(...args){const record={ready:false,names:[]};window.__viewTransitions.push(record);const transition=start(...args);transition.ready.then(()=>{record.ready=true;record.names=document.getAnimations().map(a=>a.animationName).filter(Boolean);},()=>{});return transition;};}
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});
  const initial=await snapshot(page);
  assert.ok(initial.fieldWeight<.01);
  assert.equal(await surface(page),0);
  await page.evaluate(()=>scrollTo({top:50,behavior:'instant'}));await page.waitForTimeout(250);
  assert.equal(await surface(page),0,'Navbar remains transparent for early scrolling');
  const boundaries=await page.evaluate(()=>{const hero=document.querySelector('section.hero').getBoundingClientRect(),header=document.querySelector('.site-header');const end=hero.bottom+scrollY-header.offsetHeight;return{end,mid:end-innerHeight*.175};});
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),boundaries.mid);await page.waitForTimeout(300);
  const middleSurface=await surface(page);assert.ok(middleSurface>.1&&middleSurface<.9,`Navbar should have a partial opacity, got ${middleSurface}`);
  const midway=await snapshot(page);assert.ok(midway.targetFieldWeight>0&&midway.targetFieldWeight<.65);
  await page.evaluate(y=>scrollTo({top:y+innerHeight*.3,behavior:'instant'}),boundaries.end);await page.waitForTimeout(1400);
  const revealed=await snapshot(page);
  assert.ok(revealed.fieldWeight>.58,'Intro network returns after the hero');
  assert.equal(await surface(page),1);
  assert.equal(await page.evaluate(()=>window.__engineStarts),1,'Scroll does not recreate the animation engine');
  assert.ok(revealed.system.clock>initial.system.clock);
  assert.deepEqual(revealed.neuroField.nodes.map(n=>[n.id,n.homeX,n.homeY]),initial.neuroField.nodes.map(n=>[n.id,n.homeX,n.homeY]));
  await page.screenshot({path:join(output,`${width}-network-return.png`)});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(1600);
  assert.ok((await snapshot(page)).fieldWeight<.03,'Network fades away again at the homepage');
  assert.equal(await surface(page),0);
  if(width===1440){
   const nav=page.getByRole('navigation',{name:'Main navigation'});
   const hoverStyle=el=>{const s=getComputedStyle(el);return{radius:s.borderRadius,background:s.backgroundColor,padding:s.padding,border:s.borderWidth};};
   await nav.getByRole('link',{name:'Capabilities',exact:true}).hover();await page.waitForTimeout(230);
   const other=await nav.getByRole('link',{name:'Capabilities',exact:true}).evaluate(hoverStyle);
   await page.locator('.site-header').screenshot({path:join(output,'capabilities-hover.png')});
   await nav.getByRole('link',{name:'Résumé',exact:true}).hover();await page.waitForTimeout(230);
   assert.deepEqual(await nav.getByRole('link',{name:'Résumé',exact:true}).evaluate(hoverStyle),other,'Résumé hover matches regular navigation links');
   await page.locator('.site-header').screenshot({path:join(output,'resume-hover.png')});
   await page.evaluate(()=>{window.__scrollPositions=[];const end=performance.now()+800;const sample=()=>{window.__scrollPositions.push(scrollY);if(performance.now()<end)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
   await nav.getByRole('link',{name:'Experience',exact:true}).click();
   await page.waitForTimeout(1000);
   const positions=await page.evaluate(()=>window.__scrollPositions);
   assert.ok(new Set(positions.map(Math.round)).size>6,'Section navigation scrolls through intermediate positions');
   await nav.getByRole('link',{name:'Projects',exact:true}).click();await page.waitForFunction(()=>location.hash==='#work');
   await page.waitForFunction(()=>Math.abs(document.querySelector('#work .eyebrow').getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-24)<1);
   await nav.getByRole('link',{name:'Let’s talk',exact:true}).click();await page.waitForURL('**/contact');
   await page.waitForFunction(()=>window.__viewTransitions.some(t=>t.ready));
   const transitions=await page.evaluate(()=>window.__viewTransitions);
   assert.ok(transitions.some(t=>t.names.includes('page-fade-in')||t.names.includes('page-fade-out')),`Route transitions use the page fade: ${JSON.stringify(transitions)}`);
   await page.waitForTimeout(350);
   await nav.getByRole('link',{name:'Résumé',exact:true}).click();
   await page.waitForSelector('.cv-dialog[open]');
   assert.equal(await page.locator('dialog h2,.pdf-controls,.cv-original').count(),0);
   await page.locator('.pdf-page').first().locator('.sr-only').waitFor({state:'attached'});
   await page.waitForFunction(()=>document.querySelector('.pdf-page')?.getAttribute('aria-busy')==='false');
   await page.screenshot({path:join(output,'cv-full-page.png')});
   const before=await page.locator('.pdf-page-canvas').first().boundingBox();
   await page.locator('.pdf-page-canvas').first().click({position:{x:30,y:30}});
   await page.waitForFunction(w=>document.querySelector('.pdf-page-canvas').getBoundingClientRect().width>w+100,before.width);
   await page.waitForTimeout(350);await page.screenshot({path:join(output,'cv-reading.png')});
   await page.keyboard.press('Escape');await page.waitForSelector('.cv-dialog[open]',{state:'hidden'});
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.getByRole('link',{name:'Portfolio Muaz home'}).click();await page.waitForURL('**/#top');
   await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
   assert.equal(await page.locator('.intro-skip-btn').count(),0);
  }
  report.push({width,middleSurface,fieldAfterHero:revealed.fieldWeight,engineStarts:1});
  await context.close();console.log(`${width}px: progressive navbar, network reappearance, persistent geometry: PASS`);
 }
 assert.deepEqual(errors,[]);
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
 console.log('Matched hover, smooth section scrolling, route crossfade, simplified CV and reduced motion: PASS');
}finally{await browser.close();}

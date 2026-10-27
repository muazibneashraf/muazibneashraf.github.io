import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=resolve('tmp/profile-admin-fix'),base=process.env.TEST_BASE_URL||'http://127.0.0.1:3221';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const report={widths:[],errors:[]};
try{
 for(const width of [375,768,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:width===375?812:1000},deviceScaleFactor:width===1440?1.25:1,...(width===1440?{recordVideo:{dir:output,size:{width:1440,height:1000}}}:{})});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  const chrome=await page.evaluate(()=>{const a=getComputedStyle(document.querySelector('.site-header')),b=getComputedStyle(document.querySelector('.site-footer')),chip=getComputedStyle(document.querySelector('.network-node'));return{header:a.backgroundColor,footer:b.backgroundColor,chip:chip.backgroundImage,profile:getComputedStyle(document.querySelector('.education-card')).backgroundImage,filter:a.backdropFilter,chipBlur:chip.backdropFilter,cardBlur:getComputedStyle(document.querySelector(".terminal-card")).backdropFilter};});
  assert.equal(chrome.header,'rgba(0, 0, 0, 0)');assert.equal(chrome.chipBlur,"blur(10px)");assert.equal(chrome.cardBlur,"none");assert.equal(chrome.filter,'none');
  const alpha=await page.locator('.network-visual canvas').evaluate(canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,16,16).data;let max=0;for(let i=3;i<pixels.length;i+=4)max=Math.max(max,pixels[i]);return max;});
  assert.equal(alpha,0,'no rectangular canvas glow edge');assert.equal(await page.locator('.network-grid').count(),0);
  if(width>760){const right=await page.locator('.hero-coordinate').evaluate(el=>document.body.getBoundingClientRect().right-el.getBoundingClientRect().right);assert.ok(right<=48.5,'location at outer page margin');}
  await page.screenshot({path:join(output,`${width}-hero.png`)});
  const ticker=await page.locator('.stack-section').evaluate(el=>{const a=el.querySelector('.stack-strip-lead').getBoundingClientRect(),row=el.querySelector('.stack-strip').getBoundingClientRect(),b=el.querySelector('.stack-strip-trail').getBoundingClientRect();return{leadBottom:a.bottom,rowTop:row.top,rowBottom:row.bottom,trailTop:b.top,trailBottom:b.bottom};});
  assert.ok(ticker.leadBottom<=ticker.rowTop+.5);assert.ok(ticker.trailBottom<=ticker.rowTop+.5);assert.ok(Math.abs(ticker.leadBottom-ticker.trailBottom)<.5);
  await page.locator('.stack-section').screenshot({path:join(output,`${width}-ticker.png`)});
  for(const route of ['/','/about']){
   if(route!=='/')await page.goto(base+route,{waitUntil:'networkidle'});
   const about=page.locator('#about');await about.scrollIntoViewIfNeeded();
   await page.locator('.about-portrait-image').evaluate(img=>img.decode());
   const stats=await about.evaluate(el=>{const heading=el.querySelector('.about-eyebrow').getBoundingClientRect(),card=el.querySelector('.education-card').getBoundingClientRect(),frame=el.querySelector('.about-portrait-frame').getBoundingClientRect(),image=el.querySelector('.about-portrait-image'),date=el.querySelector('.degree-date').getBoundingClientRect(),degree=el.querySelector('.education-degree-row h3').getBoundingClientRect(),prior=el.querySelector('.education-prior > div span').getBoundingClientRect();return{alignment:card.top-heading.top,ratio:frame.width/frame.height,transform:getComputedStyle(image).transform,cardFilter:getComputedStyle(el.querySelector('.education-card')).backdropFilter,degreeDateOffset:date.top-degree.top,dateRightOffset:date.right-prior.right,width:frame.width,height:frame.height};});
   if(width>850)assert.ok(Math.abs(stats.alignment)<1,'profile aligns with headline');
   assert.ok(Math.abs(stats.ratio-1106/1422)<.002);assert.equal(stats.transform,'none');assert.equal(stats.cardFilter,'none');assert.ok(stats.degreeDateOffset>=0&&stats.degreeDateOffset<=8);assert.ok(Math.abs(stats.dateRightOffset)<.5);
   assert.ok((await about.innerText()).includes('HSC · Science'));assert.ok((await about.innerText()).includes('SSC · Science'));
   let scroll=await page.evaluate(()=>scrollY);
   for(const offset of [0,41,99,42,0]){
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scroll+offset);await page.waitForTimeout(60);
    const size=await page.locator('.about-portrait-frame').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
    assert.ok(Math.abs(size.width-stats.width)<.1&&Math.abs(size.height-stats.height)<.1,'portrait dimensions stable during scrolling');
   }
   if(width===1440&&route==='/'){
    const sizes=await page.evaluate(async()=>{
     const start=performance.now(),origin=scrollY,frames=[];
     await new Promise(resolve=>{
      const tick=time=>{
       const p=Math.min(1,(time-start)/2200);
       scrollTo({top:origin+Math.sin(p*Math.PI*2)*80,behavior:'instant'});
       const r=document.querySelector('.about-portrait-frame').getBoundingClientRect();frames.push([r.width,r.height]);
       if(p<1)requestAnimationFrame(tick);else resolve();
      };requestAnimationFrame(tick);
     });return frames;
    });
    assert.ok(sizes.length>20&&sizes.every(([w,h])=>Math.abs(w-stats.width)<.1&&Math.abs(h-stats.height)<.1),'portrait stays stable throughout continuous scrolling');
   }
   await about.screenshot({path:join(output,`${width}-${route==='/'?'home-about':'about-page'}.png`)});
   await page.locator('.education-card').screenshot({path:join(output,`${width}-${route==='/'?'home-profile':'about-profile'}.png`)});
   report.widths.push({width,route,chrome,alpha,ticker,portrait:stats});
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const video=page.video();await context.close();if(video)await video.saveAs(join(output,'portrait-scroll-1440.webm'));
  console.log(`${width}px: blended navbar, transparent canvas corners, right-aligned location, ticker captions, full aligned profile and stable portrait scrolling: PASS`);
 }
 assert.deepEqual(report.errors,[]);await writeFile(join(output,'visual-verification.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}



import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3002';
const output=resolve('tmp/scroll-motion-refinement');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});
 await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
 const result=await page.evaluate(async()=>{
  const samples=[];
  const read=()=>{let data;document.querySelector('.system-narrative-canvas').dispatchEvent(new CustomEvent('muaz-background-inspect',{detail:value=>data=value}));return data;};
  let recording=true,previous=performance.now();
  const record=now=>{
   const data=read();samples.push({dt:now-previous,actual:data.scroll.actual,position:data.scroll.position,clock:data.system.clock,nodes:data.neuroField.nodes.map(n=>[n.x,n.y]),visibility:data.fieldVisibility.nodes});previous=now;
   if(recording)requestAnimationFrame(record);
  };
  scrollTo({top:document.querySelector('#skills').offsetTop-100,behavior:'instant'});
  await new Promise(r=>setTimeout(r,1200));requestAnimationFrame(record);
  for(const [delta,pause] of [[240,90],[80,40],[700,160],[-310,70],[1100,280],[-1200,80],[400,220]]){
   scrollBy({top:delta,behavior:'instant'});await new Promise(r=>setTimeout(r,pause));
  }
  const stopIndex=samples.length;
  await new Promise(r=>setTimeout(r,1000));recording=false;
  return {samples,stopIndex};
 });
 const jumps=result.samples.slice(1).map((sample,i)=>({raw:Math.abs(sample.actual-result.samples[i].actual),eased:Math.abs(sample.position-result.samples[i].position)})).filter(s=>s.raw>150);
 assert.ok(jumps.length>=4);
 assert.ok(jumps.every(jump=>jump.eased<jump.raw*.35),'abrupt input does not snap narrative position');
 const rest=result.samples.slice(result.stopIndex);
 assert.ok(rest.length>10&&Math.abs(rest[0].position-rest.at(-1).position)>10,'background keeps gliding after input stops');
 assert.ok(Math.abs(rest.at(-1).position-rest.at(-1).actual)<10,'background settles at the final viewport');
 const frames=result.samples.slice(4).map(s=>s.dt).sort((a,b)=>a-b);
 const p95=frames[Math.floor(frames.length*.95)];assert.ok(p95<45,`frame p95 ${p95}ms`);
 let maxVisibilityStep=0;
 for(let i=1;i<result.samples.length;i++)if(result.samples[i].dt<20){
  result.samples[i].visibility.forEach((value,j)=>{maxVisibilityStep=Math.max(maxVisibilityStep,Math.abs(value-result.samples[i-1].visibility[j]));});
 }
 assert.ok(maxVisibilityStep<.18,'node visibility fades instead of flashing on scroll');
 report.scroll={abruptSteps:jumps.length,frameP95:p95,maxVisibilityStep,settlingError:Math.abs(rest.at(-1).position-rest.at(-1).actual)};

 await page.locator('.skill-options').getByRole('button',{name:'Flask — linked to project work',exact:true}).click();
 assert.equal(await page.locator('.evidence-project[data-connected="true"]').count(),3);
 await page.locator('.skill-options').getByRole('button',{name:'Flask — linked to project work',exact:true}).click();
 assert.equal(await page.locator('.skill-options button[aria-pressed="true"]').count(),0);
 assert.equal(await page.locator('.evidence-map').getAttribute('data-selected-skill'),'');
 await page.locator('.skill-options').getByRole('button',{name:'PyTorch — linked to project work',exact:true}).click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.skill-options button[aria-pressed="true"]').count(),0);
 assert.equal(await page.locator('.skill-evidence').getByRole('button',{name:/clear/i}).count(),0);
 report.skills='Click again and Escape clear selection; no extra Clear control.';

 report.footers=[];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/projects','/about','/contact']){
   await page.goto(base+(route==='/'?'/?backgroundDebug=1':route),{waitUntil:'networkidle'});
   await page.locator('.site-footer').scrollIntoViewIfNeeded();await page.waitForTimeout(850);
   const footer=await page.locator('.site-footer').boundingBox();
   assert.ok(footer.height<=(width>760?72:105),`${width}px ${route}: footer height ${footer.height}`);
   assert.equal(await page.locator('.neural-signature img').getAttribute('src'),await page.locator('.wordmark .brand-art--compact img').getAttribute('src'));
   assert.equal(await page.locator('.section-heading .eyebrow').evaluateAll(elements=>elements.some(el=>!['none','normal',''].includes(getComputedStyle(el,'::before').content))),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   report.footers.push({width,route,height:footer.height});
   if(route==='/'&&(width===1440||width===390))await page.locator('.site-footer').screenshot({path:resolve(output,`footer-${width}.png`)});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});
 const snapshot=()=>page.evaluate(()=>{let value;document.querySelector('.system-narrative-canvas').dispatchEvent(new CustomEvent('muaz-background-inspect',{detail:data=>value=data}));return value;});
 const before=await snapshot();await page.mouse.wheel(0,500);await page.waitForTimeout(200);const after=await snapshot();
 assert.equal(before.system.clock,after.system.clock);assert.equal(after.scroll.position,after.scroll.actual);
 assert.deepEqual(errors,[]);report.errors=errors;
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

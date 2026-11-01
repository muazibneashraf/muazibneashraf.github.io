import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3002';
const content=JSON.parse(await readFile('data/portfolio-content.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/#trace`,{waitUntil:'networkidle'});
 await page.evaluate(()=>document.documentElement.dataset.motionPaused='true');
 const failures=[];
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:960});
  for(const project of content.projects) {
   await page.getByRole('button',{name:'Choose a project',exact:true}).click();
   await page.getByRole('option').filter({hasText:project.title}).click();
   for(let i=0;i<project.walkthroughSteps.length;i++) {
    await page.locator('.walk-stage').nth(i).click();
    const overflow=await page.locator('.process-scene').evaluate(scene=>{
     const out=[];
     for(const box of scene.querySelectorAll('.process-window')) {
      const panel=box.querySelector(':scope > .process-panel').getBoundingClientRect();
      for(const text of box.querySelectorAll('text')) {
       if(text.closest('.process-window')!==box)continue;
       const r=text.getBoundingClientRect();
       if(r.right>panel.right+1||r.left<panel.left-1||r.top<panel.top-1||r.bottom>panel.bottom+1) out.push(text.textContent);
      }
     }
     return out;
    });
    if(overflow.length)failures.push({width,project:project.slug,step:i,text:overflow});
    const before=await page.locator('.walk-body').boundingBox();
    await page.getByRole('button',{name:'Inspect this step',exact:true}).click();
    const after=await page.locator('.walk-body').boundingBox();
    assert.ok(Math.abs(before.height-after.height)<2,`Inspector height: ${project.slug}/${i}/${width}`);
    await page.getByRole('button',{name:'Back to animation',exact:true}).click();
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(failures,[],'All text must fit inside its own diagram panel');
 assert.deepEqual(errors,[]);
 console.log('PASS: every diagram panel and inspector across all 45 stages at desktop/mobile widths.');
} finally {await browser.close();}

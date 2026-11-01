import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:3002';
const data=JSON.parse(await readFile('data/portfolio-content.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const report=[]; const errors=[];
await mkdir('tmp/walkthrough-mobile-review',{recursive:true});
async function choose(page,title){await page.getByRole('button',{name:'Choose a project',exact:true}).click();const option=page.getByRole('option').filter({hasText:title});await option.waitFor({state:'visible'});await option.click();}
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/?review=walkthrough#trace`,{waitUntil:'networkidle'});
 await page.locator('.walkthrough').scrollIntoViewIfNeeded();
 for(const project of data.projects){
  await choose(page,project.title);
  const stages=project.walkthroughSteps;assert.equal(await page.getByRole('tab',{name:/^\d/}).count(),stages.length,project.title);
  for(let i=0;i<stages.length;i++){
   await page.locator('.walk-stage').nth(i).click();
   const before=await page.locator('.walk-body').boundingBox();
   assert.equal(await page.locator('.walk-scene-art .process-scene svg').count(),1);
   const sceneKey=await page.locator('.process-scene').getAttribute('data-scene');assert.equal(sceneKey,`${project.slug}-${i}`);
   await page.getByRole('button',{name:'Inspect this step',exact:true}).click();
   const after=await page.locator('.walk-body').boundingBox();assert.ok(Math.abs(after.height-before.height)<2,`inspection height ${project.title}/${i}`);
   assert.equal(await page.locator('.walk-stage-heading h3').innerText(),stages[i].title);
   assert.equal(await page.locator('.walk-stage[aria-selected="true"]').count(),1);
   assert.ok((await page.locator('.walk-preview-content').innerText()).trim()||await page.locator('.walk-preview-content svg').count());
   assert.doesNotMatch(await page.locator('.walk-preview-content').innerText(),/Illustrative workflow|"context":|"project":/);
   assert.equal(await page.getByRole('button',{name:'Previous stage',exact:true}).isDisabled(),i===0);
   assert.equal(await page.getByRole('button',{name:'Next stage',exact:true}).isDisabled(),i===stages.length-1);
  }
  assert.equal(await page.locator('.walk-footer a').getAttribute('href'),`/projects/${project.slug}`);
  report.push({project:project.slug,stages:stages.length,selection:'passed',link:'passed'});
 }
 await page.getByRole('button',{name:'Choose a project',exact:true}).click();
 const search=page.getByRole('searchbox',{name:'Search projects'});await search.fill('compiler');assert.equal(await page.getByRole('option').count(),1);
 await search.fill('not-a-project');await page.getByRole('status').filter({hasText:'No projects match'}).waitFor();
 await search.fill('pet');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.match(await page.locator('.trace-chooser-current').innerText(),/Pet/);
 await choose(page,'Compiler Front End');
 await page.getByRole('button',{name:'Next stage',exact:true}).click();await page.getByRole('button',{name:'Inspect this step',exact:true}).click();assert.match(await page.locator('.walk-preview-content').innerText(),/ASSIGNOP/);
 await page.locator('.walk-stage').nth(2).click();await page.getByRole('button',{name:'Inspect this step',exact:true}).click();assert.equal(await page.locator('.walk-expression-tree svg').count(),1);
 await page.locator('.walk-stage').nth(2).focus();await page.keyboard.press('End');assert.equal(await page.locator('.walk-stage[aria-selected="true"]').innerText().then(x=>x.includes('Intermediate code')),true);
 await page.getByRole('button',{name:'Replay walkthrough',exact:true}).click();assert.match(await page.locator('.walk-stage-heading h3').innerText(),/Source/);
 await page.waitForTimeout(5100);assert.match(await page.locator('.walk-stage-heading h3').innerText(),/Lexer/);
 await page.getByRole('button',{name:'Pause walkthrough',exact:true}).click();await page.waitForTimeout(4900);assert.match(await page.locator('.walk-stage-heading h3').innerText(),/Lexer/);
 await page.getByRole('button',{name:'Play walkthrough',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new CustomEvent('muaz-motion-state',{detail:{paused:true}})));
 assert.equal(await page.getByRole('button',{name:'Play walkthrough',exact:true}).isDisabled(),true);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('muaz-motion-state',{detail:{paused:false}})));
 await page.locator('.walk-stage').first().click();
 await page.locator('#trace').screenshot({path:'tmp/walkthrough-mobile-review/desktop-final.png'});
 for(const width of [1920,1024,768,430,390,360,320]){
  await page.setViewportSize({width,height:width>1000?960:844});await page.locator('.walkthrough').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
  if(width<=600){
   await page.getByRole('button',{name:'Choose a project',exact:true}).click();const box=await page.locator('.trace-project-menu').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=60&&box.y+box.height<=844,`sheet ${width}`);
   await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');assert.match(await page.locator('.trace-chooser-current').innerText(),/Central Public College/);
   for(let i=0;i<4;i++){await page.locator('.walk-stage').nth(i).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
   const p=await page.locator('.education-card').boundingBox(),a=await page.locator('.about-copy').boundingBox();assert.ok(p.y<a.y,`profile order ${width}`);
   await page.locator('.menu-toggle').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
   await page.locator('.menu-toggle').click();await page.locator('#primary-navigation').getByRole('link',{name:'About',exact:true}).click();await page.waitForTimeout(1200);
   assert.ok((await page.locator('.education-card').boundingBox()).y>=65);assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
   if(width===390){await page.screenshot({path:'tmp/walkthrough-mobile-review/about-final.png'});}
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.walkthrough').scrollIntoViewIfNeeded();await choose(page,'MiniVSFS');await page.locator('.walk-stage').nth(1).click();await page.waitForTimeout(500);await page.screenshot({path:'tmp/walkthrough-mobile-review/mobile-final.png'});
 const offscreen=await page.locator('.project-card').first().getAttribute('data-motion-visible');assert.equal(offscreen,'false');
 const card=page.locator('.project-card').first();await card.scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert.equal(await card.getAttribute('data-motion-visible'),'true');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.walkthrough').scrollIntoViewIfNeeded();assert.equal(await page.getByRole('button',{name:'Play walkthrough',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Next stage',exact:true}).click();assert.match(await page.locator('.walk-stage-heading h3').innerText(),/Write file/);
 assert.deepEqual(errors,[]);
 await writeFile('tmp/walkthrough-mobile-review/report.json',JSON.stringify({projects:report,totalStages:report.reduce((a,p)=>a+p.stages,0),widths:[1920,1440,1024,768,430,390,360,320],playPauseReplay:'passed',mobileMenu:'passed',profileOrder:'passed',offscreenMotion:'passed',reducedMotion:'passed',errors},null,2));
 console.log('PASS: all 11 projects / 45 stages, stage boundaries, links, keyboard, play/pause/replay, 8 widths, mobile sheet/navigation/profile order, offscreen and reduced motion.');
}finally{await browser.close();}

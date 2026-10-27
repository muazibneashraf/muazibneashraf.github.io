import assert from 'node:assert/strict';import {mkdtemp,mkdir,copyFile,symlink,rm,readFile,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';import{join,resolve,sep}from'node:path';import{spawn}from'node:child_process';import{once}from'node:events';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
function samplePdf(){const stream=t=>`BT /F1 24 Tf 30 360 Td (${t}) Tj ET`,a=stream('QA Page One'),b=stream('QA Page Two');const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',`<< /Length ${a.length} >>\nstream\n${a}\nendstream`,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',`<< /Length ${b.length} >>\nstream\n${b}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(pdf);}
const root=process.cwd(),fixture=await mkdtemp(join(tmpdir(),'muaz-pdf-viewer-')),output=resolve('tmp/admin-theme');await mkdir(output,{recursive:true});let server,browser;const errors=[],pdf=samplePdf();
try{
 for(const name of['.next','node_modules','public'])await symlink(join(root,name),join(fixture,name),process.platform==='win32'?'junction':'dir');await copyFile(join(root,'package.json'),join(fixture,'package.json'));await mkdir(join(fixture,'data'));const content=JSON.parse(await readFile(join(root,'data/portfolio-content.json'),'utf8'));content.identity.resumeUrl='/qa-resume.pdf';await writeFile(join(fixture,'data/portfolio-content.json'),JSON.stringify(content));
 const base='http://localhost:3227';server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'start','-p','3227'],{cwd:fixture,windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'production',ADMIN_PASSWORD:'pdf-test',AUTH_SECRET:'pdf-test-secret',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',VERCEL:''}});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/content')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'pdf-test'})});const cookie=login.headers.get('set-cookie').split(';')[0];const form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),'qa-resume.pdf');const uploaded=await(await fetch(base+'/api/resume',{method:'POST',headers:{cookie},body:form})).json();content.identity.resumeUrl=uploaded.url;assert.equal((await fetch(base+'/api/content',{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(content)})).status,200);
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 for(const width of[320,375,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:width<400?812:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/resume',{waitUntil:'networkidle'});const view=page.locator('.pdf-preview-viewport');
  await view.locator('.sr-only').filter({hasText:'QA Page One'}).waitFor();
  assert.equal(await page.locator('object,iframe,embed').count(),0);
  assert.equal(await page.locator('dialog h2, .pdf-controls, .cv-original').count(),0,'No title or extra toolbar rows');
  assert.equal(await page.locator('.pdf-page-canvas').count(),2,'All pages belong to one scrolling document');
  const fitted=await page.locator('.pdf-page-canvas').first().evaluate(c=>({width:c.width,css:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,pixel:[...c.getContext('2d').getImageData(1,1,1,1).data],availableHeight:c.closest('.pdf-preview-viewport').clientHeight-20,availableWidth:c.closest('.pdf-preview-viewport').clientWidth-24}));
  assert.ok(fitted.width>100);assert.deepEqual(fitted.pixel,[255,255,255,255]);
  assert.ok(fitted.height<=fitted.availableHeight+1,'Full first page is visible initially');
  assert.ok(fitted.css>=fitted.availableWidth*.9,'No large empty gutters inside the reader');
  const geometry=await page.evaluate(()=>{const paper=document.querySelector('.pdf-page-canvas').getBoundingClientRect(),frame=document.querySelector('.cv-dialog-document').getBoundingClientRect(),controls=document.querySelector('.cv-dialog-actions').getBoundingClientRect();return{left:paper.left-frame.left,right:frame.right-paper.right,detached:controls.left>=frame.right+8||controls.bottom<=frame.top-8,height:paper.height};});
  assert.ok(Math.abs(geometry.left-geometry.right)<1,'The blue gutters on both sides are equal');
  assert.ok(geometry.detached,'CV controls sit outside the document frame');
  assert.ok(await page.locator('.cv-dialog-actions').evaluate(el=>{const a=el.children[0].getBoundingClientRect(),b=el.children[1].getBoundingClientRect();return Math.abs(a.top-b.top)<1&&b.left>a.right;}),'Download and Close sit side by side');
  if(width>=1440)assert.ok(geometry.height>=950,'Detached controls leave almost the whole screen height for the full page');
  await page.locator('.pdf-page-canvas').first().click({position:{x:30,y:30}});
  await page.waitForFunction(w=>document.querySelector('.pdf-page-canvas').getBoundingClientRect().width>w+1,fitted.css);
  assert.equal(await page.locator('dialog').getAttribute('data-reading'),'true');
  await view.evaluate(el=>el.scrollTo({top:el.scrollHeight,behavior:'instant'}));
  await view.locator('.sr-only').filter({hasText:'QA Page Two'}).waitFor();
  assert.ok(await page.locator('.pdf-page').nth(1).evaluate(el=>el.getBoundingClientRect().top<el.closest('.pdf-preview-viewport').getBoundingClientRect().bottom),'Scroll reaches the second page');
  await view.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('dialog').dataset.reading==='false');
  const[download]=await Promise.all([page.waitForEvent('download'),page.locator('dialog').getByRole('link',{name:'Download CV',exact:true}).click()]);assert.deepEqual(await readFile(await download.path()),pdf);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`${width}-pdf-viewer.png`)});await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await page.locator('.resume-actions').getByRole('link',{name:'View résumé'}).click();await view.locator('.sr-only').filter({hasText:'QA Page One'}).waitFor();await page.getByRole('button',{name:'Close résumé'}).click();
  await page.route('**/api/resume?*',route=>route.fulfill({status:404,body:'Missing PDF'}));await page.reload();await page.locator('dialog').getByRole('alert').waitFor();assert.ok(await page.locator('dialog').getByRole('link',{name:'Download CV',exact:true}).isVisible());await page.close();console.log(`${width}px: full-page opening, click-to-read, continuous multipage scrolling, original download, close/reopen, error fallback: PASS`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}for(const name of['.next','node_modules','public'])await rm(join(fixture,name),{force:true});assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep));await rm(fixture,{recursive:true,force:true});}

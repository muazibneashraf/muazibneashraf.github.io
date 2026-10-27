import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,symlink,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),fixture=await mkdtemp(join(tmpdir(),'muaz-admin-browser-')),output=resolve('tmp/profile-admin-fix');
await mkdir(output,{recursive:true});let server,browser;
const errors=[];
try{
 for(const name of ['.next','node_modules','public'])await symlink(join(root,name),join(fixture,name),process.platform==='win32'?'junction':'dir');
 await copyFile(join(root,'package.json'),join(fixture,'package.json'));await mkdir(join(fixture,'data'));
 await copyFile(join(root,'data/portfolio-content.json'),join(fixture,'data/portfolio-content.json'));
 const fixtureContent=JSON.parse(await readFile(join(fixture,'data/portfolio-content.json'),'utf8'));
 if(!fixtureContent.internship.items.length){
  fixtureContent.internship.items.push({id:'qa-baseline-job',company:'QA Baseline',role:'Engineer',period:'2025',overview:'Isolated baseline for reorder checks.',cover:'',coverCrop:{x:50,y:50,zoom:100,fit:'cover'},learnings:[]});
  const {writeFile}=await import('node:fs/promises');await writeFile(join(fixture,'data/portfolio-content.json'),JSON.stringify(fixtureContent));
 }
 const base='http://localhost:3224';
 server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'start','-p','3224'],{cwd:fixture,windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'production',ADMIN_PASSWORD:'admin-browser-test',AUTH_SECRET:'admin-browser-test-secret',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',VERCEL:''}});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/content')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const original=await(await fetch(base+'/api/content')).json();
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/admin');await page.getByLabel('Portfolio password').fill('admin-browser-test');await page.getByRole('button',{name:'Enter studio'}).click();
 await page.getByRole('heading',{name:'Your details'}).waitFor();
 await page.route('**/api/resume',async route=>{if(route.request().method()==='POST')await new Promise(r=>setTimeout(r,300));await route.continue();});
 await page.getByLabel('Upload résumé PDF').setInputFiles(join(root,'public/Muaz_Ibne_Ashraf_CV_Finalized.pdf'));
 await page.getByText('Uploading résumé…',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Save changes',exact:true}).isDisabled(),true);
 await page.getByRole('status').filter({hasText:'is ready'}).waitFor();
 const url=await page.getByLabel('Résumé URL',{exact:false}).inputValue();assert.match(url,/^\/api\/resume\?v=[a-f0-9]{64}$/);
 assert.equal((await(await fetch(base+'/api/content')).json()).identity.resumeUrl,original.identity.resumeUrl);
 await page.locator('.resume-upload').screenshot({path:join(output,'admin-resume-upload.png')});
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText(/Saved at/).waitFor();
 assert.equal((await(await fetch(base+'/api/content')).json()).identity.resumeUrl,url);
 await page.goto(base);
 for(const selector of ['.site-header .nav-resume','.hero .button.secondary','.education-card .text-link']){
  await page.locator(selector).click();await page.locator('dialog[open]').waitFor();
  assert.equal(await page.locator('dialog .pdf-preview').getAttribute('data-pdf-url'),url);
  await page.locator('dialog .pdf-preview-viewport[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('dialog object, dialog iframe, dialog embed').count(),0);
  await page.getByRole('button',{name:'Close résumé',exact:true}).click();
 }
 await page.goto(base+'/resume');await page.locator('dialog[open]').waitFor();
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('dialog').getByRole('link',{name:'Download CV',exact:true}).click()]);
 assert.deepEqual(await readFile(await download.path()),await readFile(join(root,'public/Muaz_Ibne_Ashraf_CV_Finalized.pdf')));
 await page.getByRole('button',{name:'Close résumé',exact:true}).click();
 await page.goto(base+'/admin');await page.getByRole('heading',{name:'Your details'}).waitFor();
 await page.locator('.admin-sidebar nav button').filter({hasText:'Job experience'}).click();
 assert.equal(await page.locator('.admin-sidebar').getByText('Internship',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Add job'}).click();
 await page.getByLabel('Company',{exact:true}).fill('QA Software Studio');await page.getByLabel('Role',{exact:true}).fill('Software Engineer');
 await page.getByLabel('Period',{exact:true}).fill('2026 – present');await page.getByLabel('Overview',{exact:true}).fill('Built a verified publishing workflow.');
 await page.getByRole('button',{name:'Add achievement'}).click();await page.getByLabel('Achievement title',{exact:true}).fill('Reliable delivery');
 await page.getByLabel('What you contributed',{exact:true}).fill('Connected admin edits to the public website.');
 await page.getByRole('button',{name:'Move up',exact:true}).click();
 await page.locator('.project-manager-editor').screenshot({path:join(output,'admin-job-experience.png')});
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText(/Saved at/).waitFor();
 for(const route of ['/','/experience']){
  await page.goto(base+route);const jobs=page.locator('#job-experience');
  assert.ok((await jobs.innerText()).includes('QA Software Studio'));assert.ok((await jobs.innerText()).includes('Reliable delivery'));
  assert.ok((await jobs.locator('.experience-row').first().innerText()).includes('Software Engineer'));
  await jobs.screenshot({path:join(output,route==='/'?'published-home-jobs.png':'published-experience-page.png')});
 }
 await page.goto(base+'/internship');assert.equal(new URL(page.url()).pathname,'/experience');
 await page.goto(base+'/admin');await page.getByRole('heading',{name:'Your details'}).waitFor();
 await page.locator('.admin-sidebar nav button').filter({hasText:'Job experience'}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove',exact:true}).first().click();
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText(/Saved at/).waitFor();
 await page.goto(base);assert.ok(!(await page.locator('#job-experience').innerText()).includes('QA Software Studio'));
 assert.equal(await page.locator('#job-experience .experience-row').count(),original.internship.items.length);
 assert.deepEqual(errors,[]);
 console.log('Admin PDF upload/save, all résumé entry points and download bytes, job add/edit/reorder/delete, homepage and dedicated page, legacy redirect: PASS');
}finally{
 await browser?.close();if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}
 for(const name of ['.next','node_modules','public'])await rm(join(fixture,name),{force:true});
 assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep));await rm(fixture,{recursive:true,force:true});
}

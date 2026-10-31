import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,symlink,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

// Real production routes and isolated storage; no messages leave this test.
const root=process.cwd(), fixture=await mkdtemp(join(tmpdir(),'muaz-neural-design-'));
const output=resolve('tmp/neural-design-verified'), base='http://127.0.0.1:3228';
await mkdir(output,{recursive:true});
let browser,server;
const errors=[],report={};
const inspect=page=>page.locator('.system-narrative-canvas').evaluate(el=>{
 let result;el.dispatchEvent(new CustomEvent('muaz-background-inspect',{detail:value=>{result=value;}}));return result;
});
const section=async(page,id)=>{
 await page.locator('#'+id).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
 await page.waitForTimeout(1200);
};
try{
 for(const name of ['.next','node_modules','public'])await symlink(join(root,name),join(fixture,name),process.platform==='win32'?'junction':'dir');
 await copyFile(join(root,'package.json'),join(fixture,'package.json'));await mkdir(join(fixture,'data'));
 await copyFile(join(root,'data/portfolio-content.json'),join(fixture,'data/portfolio-content.json'));
 server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'start','-p','3228'],{cwd:fixture,windowsHide:true,stdio:'pipe',env:{...process.env,NODE_ENV:'production',ADMIN_PASSWORD:'neural-test',AUTH_SECRET:'isolated-neural-design-test',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',BLOB_READ_WRITE_TOKEN:'',USE_BLOB_STORAGE:'',VERCEL:''}});
 let serverLog='';server.stdout.on('data',data=>serverLog+=data);server.stderr.on('data',data=>serverLog+=data);
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw new Error(serverLog);try{if((await fetch(base+'/api/content')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error' && !message.text().includes('Failed to load resource'))errors.push(message.text());});
 await page.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});
 await page.waitForSelector('.hero-body[data-intro-phase="completed"]');
 assert.equal(await page.locator('#job-experience').count(),0);
 assert.equal(await page.locator('.nav-links a').filter({hasText:/^Experience$/}).count(),0);
 const order=await page.locator('main > section').evaluateAll(elements=>elements.map(el=>el.id));
 assert.ok(order.indexOf('about')<order.indexOf('work')&&order.indexOf('work')<order.indexOf('skills'));
 await page.screenshot({path:join(output,'desktop-home.png')});
 await section(page,'work');await page.screenshot({path:join(output,'desktop-work.png')});
 const initial=await inspect(page);
 await section(page,'skills');
 for(const [skill,count] of [['Flask',3],['PyTorch',1],['Next.js',1],['C',0]]){
  await page.locator('.skill-options').getByRole('button',{name:skill+' — linked to project work',exact:true}).or(page.locator('.skill-options').getByRole('button',{name:skill,exact:true})).click();
  assert.equal(await page.locator('.evidence-project[data-connected="true"]').count(),count,skill);
  assert.equal(await page.locator('.evidence-map').getAttribute('data-selected-skill'),skill);
 }
 const flask=page.locator('.skill-options').getByRole('button',{name:'Flask — linked to project work',exact:true});
 await flask.focus();await page.keyboard.press('Enter');assert.equal(await flask.getAttribute('aria-pressed'),'true');
 await page.screenshot({path:join(output,'desktop-skills.png')});
 await section(page,'research');const research=await inspect(page);
 assert.equal(research.section,'research');assert.ok(research.system.clock>initial.system.clock);
 assert.deepEqual(research.neuroField.nodes.map(n=>n.id),initial.neuroField.nodes.map(n=>n.id));
 assert.notDeepEqual(research.neuroField.nodes.map(n=>[n.x,n.y]),initial.neuroField.nodes.map(n=>[n.x,n.y]));
 await page.screenshot({path:join(output,'desktop-research.png')});
 await page.locator('.site-footer').scrollIntoViewIfNeeded();await page.waitForTimeout(2400);
 assert.equal(await page.locator('.neural-signature').getAttribute('data-assembled'),'true');
 assert.equal(await page.locator('.neural-signature img').getAttribute('src'),await page.locator('.wordmark .brand-art--compact img').getAttribute('src'));
 assert.equal(await page.locator('.neural-signature .brand-art').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.screenshot({path:join(output,'desktop-finale.png')});
 await page.goto(base+'/contact',{waitUntil:'networkidle'});
 await page.route('https://formsubmit.co/**',route=>route.abort());
 await page.route('**/api/messages',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Unavailable"}'}));
 await page.getByLabel('Name',{exact:true}).fill('Neural design test');
 await page.getByLabel('Email',{exact:true}).fill('neural-design@example.com');
 await page.getByLabel('Subject',{exact:true}).fill('Local isolated verification');
 await page.getByLabel('Message',{exact:true}).fill('Verified from browser through the local API and isolated inbox.');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.locator('.contact-form[data-status="error"]').waitFor();
 assert.equal(await page.locator('.contact-success-route').count(),0,'failed delivery never displays a success animation');
 await page.unroute('**/api/messages');
 const [response]=await Promise.all([page.waitForResponse(res=>res.url()===base+'/api/messages'&&res.request().method()==='POST'),page.getByRole('button',{name:'Send message',exact:true}).click()]);
 assert.equal(response.status(),201);
 await page.locator('.contact-form[data-status="sent"] .contact-success-route').waitFor();
 await page.waitForTimeout(700);await page.screenshot({path:join(output,'contact-delivery.png')});
 await page.request.post(base+'/api/auth/login',{data:{password:'neural-test'}});
 const inbox=await(await page.request.get(base+'/api/messages')).json();
 assert.equal(inbox.length,1);assert.equal(inbox[0].subject,'Local isolated verification');
 assert.equal(inbox[0].message,'Verified from browser through the local API and isolated inbox.');
 report.contact='Browser → POST 201 → isolated inbox → animated confirmation; failure state checked.';
 await page.goto(base+'/admin');
 await page.getByRole('heading',{name:'Your details'}).waitFor();
 await page.locator('.admin-sidebar nav button').filter({hasText:'Job experience'}).click();
 await page.getByRole('button',{name:/Add job/}).click();
 await page.getByLabel('Company',{exact:true}).fill('Local verification studio');
 await page.getByLabel('Role',{exact:true}).fill('Software engineer');
 await page.getByLabel('Period',{exact:true}).fill('2026');
 await page.getByLabel('Overview',{exact:true}).fill('An isolated test entry.');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText(/Saved at/).waitFor();
 await page.goto(base+'/?backgroundDebug=1');
 assert.equal(await page.locator('#job-experience').count(),1);
 assert.equal(await page.locator('.nav-links a').filter({hasText:/^Experience$/}).count(),1);
 assert.ok((await page.locator('#job-experience').innerText()).includes('Local verification studio'));
 await page.goto(base+'/admin');await page.getByRole('heading',{name:'Your details'}).waitFor();
 await page.locator('.admin-sidebar nav button').filter({hasText:'Job experience'}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Remove',exact:true}).first().click();
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText(/Saved at/).waitFor();
 await page.goto(base+'/?backgroundDebug=1');assert.equal(await page.locator('#job-experience').count(),0);
 report.jobs='Admin add/save reveals the public section and navigation; removing the last job hides both.';

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});await mobile.waitForSelector('.hero-body[data-intro-phase="completed"]');
 await section(mobile,'skills');
 await mobile.locator('.skill-mobile-families').getByRole('button',{name:'AI & machine learning',exact:true}).click();
 await mobile.locator('.skill-options').getByRole('button',{name:'PyTorch — linked to project work',exact:true}).click();
 assert.equal(await mobile.locator('.evidence-project[data-connected="true"]').count(),1);
 await mobile.locator('.evidence-panel').scrollIntoViewIfNeeded();await mobile.screenshot({path:join(output,'mobile-skills.png')});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mobile.locator('.evidence-project[data-connected="true"]').click();await mobile.waitForURL('**/projects/icu-analyzer');
 assert.equal(await mobile.locator('h1').innerText(),'ICU Analyzer');
 report.skills='Desktop pointer/keyboard and mobile category/touch selection lead to real project pages.';

 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.goto(base+'/?backgroundDebug=1',{waitUntil:'networkidle'});const paused=await inspect(reduced);await reduced.waitForTimeout(250);
 assert.equal((await inspect(reduced)).system.clock,paused.system.clock);
 await reduced.locator('.site-footer').scrollIntoViewIfNeeded();
 assert.equal(await reduced.locator('.neural-signature .brand-art').evaluate(el=>getComputedStyle(el).opacity),'1');
 report.reducedMotion='Static compositions and signature remain visible, with animation disabled.';
 assert.deepEqual(errors,[]);report.errors=errors;
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();
 if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}
 for(const name of ['.next','node_modules','public'])await rm(join(fixture,name),{force:true});
 assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep));await rm(fixture,{recursive:true,force:true});
}

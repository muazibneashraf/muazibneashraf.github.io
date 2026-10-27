import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,copyFile,symlink,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('authenticated résumé publishing and job edits reach the public website', {timeout:60000}, async()=>{
 const root=process.cwd(),fixture=await mkdtemp(join(tmpdir(),'muaz-publishing-'));
 let server;
 try{
  for(const name of ['.next','node_modules','public'])await symlink(join(root,name),join(fixture,name),process.platform==='win32'?'junction':'dir');
  await copyFile(join(root,'package.json'),join(fixture,'package.json'));await mkdir(join(fixture,'data'));
  await copyFile(join(root,'data/portfolio-content.json'),join(fixture,'data/portfolio-content.json'));
  const base='http://127.0.0.1:3223';
  server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'start','-p','3223'],{cwd:fixture,windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'production',ADMIN_PASSWORD:'publishing-test',AUTH_SECRET:'publishing-isolated-test-secret',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',VERCEL:''}});
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/content')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.equal((await fetch(base+'/api/resume',{method:'POST'})).status,401);
  assert.equal((await fetch(base+'/api/resume?v=../../secret')).status,404);
  const original=await(await fetch(base+'/api/content')).json();
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'publishing-test'})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const upload=async(bytes,name='updated-cv.pdf')=>{const form=new FormData();form.set('file',new Blob([bytes],{type:'application/pdf'}),name);return fetch(base+'/api/resume',{method:'POST',headers:{cookie},body:form});};
  assert.equal((await upload(Buffer.from('<html>not a PDF</html>'))).status,400);
  assert.equal((await upload(Buffer.alloc(4*1024*1024+1))).status,413);
  const pdf=await readFile(join(root,'public/Muaz_Ibne_Ashraf_CV_Finalized.pdf'));
  const response=await upload(pdf);assert.equal(response.status,200);
  const {url}=await response.json();assert.match(url,/^\/api\/resume\?v=[a-f0-9]{64}$/);
  assert.equal((await(await fetch(base+'/api/content')).json()).identity.resumeUrl,original.identity.resumeUrl,'draft upload must not replace published link');
  const download=await fetch(base+url);assert.equal(download.headers.get('content-type'),'application/pdf');
  assert.match(download.headers.get('cache-control'),/immutable/);assert.deepEqual(Buffer.from(await download.arrayBuffer()),pdf);
  const changed=structuredClone(original);changed.identity.resumeUrl=url;
  changed.internship.title='Job experience.';changed.internship.items=[{id:'verified-job',company:'Verified Studio',role:'Software Engineer',period:'2026 – present',overview:'Built the verified public workflow.',cover:'',coverCrop:{x:50,y:50,zoom:100,fit:'cover'},learnings:[{id:'achievement',title:'Reliable delivery',description:'Published a working content flow.'}]}];
  assert.equal((await fetch(base+'/api/content',{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(changed)})).status,200);
  for(const route of ['/','/experience']){
   const html=await(await fetch(base+route)).text();assert.match(html,/Verified Studio/);assert.match(html,/Built the verified public workflow/);assert.match(html,/Reliable delivery/);
  }
  const legacy=await fetch(base+'/internship');assert.equal(legacy.status,200);assert.equal(new URL(legacy.url).pathname,'/experience');
  const resume=await(await fetch(base+'/resume')).text();assert.ok(resume.includes(`href="${url}"`));assert.ok(!resume.includes('src="/resume-preview.webp"'));
  const second=await upload(Buffer.concat([pdf,Buffer.from('\n%new version\n')]));const next=await second.json();assert.notEqual(next.url,url);
  assert.equal((await(await fetch(base+'/api/content')).json()).identity.resumeUrl,url,'second draft keeps first published document');
  assert.deepEqual(Buffer.from(await(await fetch(base+url)).arrayBuffer()),pdf,'prior résumé version remains intact');
 }finally{
  if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}
  for(const name of ['.next','node_modules','public'])await rm(join(fixture,name),{force:true});
  assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep));await rm(fixture,{recursive:true,force:true});
 }
});

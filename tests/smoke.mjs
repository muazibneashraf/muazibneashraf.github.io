import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
for(const route of ['/', '/projects', '/projects/icu-analyzer', '/projects/lifeline', '/projects/admission-lottery', '/projects/portfolio-platform', '/about', '/experience', '/internship', '/extracurricular', '/contact', '/resume', '/admin']){const r=await fetch(base+route);assert.equal(r.status,200,route);const html=await r.text();assert.ok(!/Film and Art student|Stories that linger/.test(html),route);console.log(route+' OK');}
const missing=await fetch(base+'/projects/does-not-exist');assert.equal(missing.status,404);
const cv=await fetch(base+'/Muaz_Ibne_Ashraf_CV_Finalized.pdf');assert.equal(cv.status,200);const bytes=new Uint8Array(await cv.arrayBuffer());assert.equal(bytes[0],37);assert.equal(bytes[1],80);assert.equal(bytes[2],68);assert.equal(bytes[3],70);console.log('CV download OK');
for(const endpoint of ['/api/messages','/api/content']){const response=await fetch(base+endpoint,endpoint.endsWith('content')?{method:'PUT',headers:{'content-type':'application/json'},body:'{}'}:{});assert.equal(response.status,401);}
console.log('Private APIs reject unauthenticated access');
const invalid=await fetch(base+'/api/messages',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(invalid.status,400);console.log('Contact validation OK');


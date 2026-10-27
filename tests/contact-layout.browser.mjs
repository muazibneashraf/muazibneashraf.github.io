import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const output=resolve('tmp/contact-layout');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const errors=[];
try {
  for(const [width,height] of [[375,812],[768,959],[1024,768],[1440,900],[1920,959]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/contact',{waitUntil:'networkidle'});
    assert.ok(await page.getByRole('heading',{name:'Get in touch',exact:true}).isVisible());
    assert.equal(await page.locator('.contact-form input:not([name="website"]),.contact-form textarea').count(),4);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Contact layout has no horizontal overflow');
    if(width>=1024) {
      const layout=await page.evaluate(()=>{const copy=document.querySelector('.contact-page-copy').getBoundingClientRect(),form=document.querySelector('.contact-form').getBoundingClientRect(),submit=document.querySelector('.submit-button').getBoundingClientRect();return{sideBySide:form.left>copy.right,formTop:form.top,copyTop:copy.top,submitBottom:submit.bottom};});
      assert.ok(layout.sideBySide,'The introduction and form share one desktop row');
      assert.ok(layout.submitBottom<=height-20,'The send button is visible in the first desktop screen');
      assert.ok(Math.abs(layout.formTop-layout.copyTop)<100,'The form starts alongside the introduction');
    }
    await page.screenshot({path:join(output,`${width}-contact.png`)});
    await page.close();
    console.log(`${width}px: balanced contact layout, complete form, no overflow: PASS`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}

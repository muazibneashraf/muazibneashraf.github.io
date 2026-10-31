import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../lib/neural-ribbon.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {sampleNeuralRibbon}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('neural filaments preserve title space and carry depth on desktop and mobile',()=>{
 for(const [width,height] of [[1440,1000],[390,844]]) for(const time of [0,1,2.5,6,20]) for(let index=0;index<225;index++){
  const point=sampleNeuralRibbon(index,225,width,height,time,{x:0,y:0,z:0});
  assert.ok([point.x,point.y,point.z].every(Number.isFinite));
  assert.ok(point.z>=-1&&point.z<=1);
  if(point.x>width*.25&&point.x<width*.75)assert.ok(Math.abs(point.y-height*.5)>height*.1,'the central title remains readable');
 }
});
test('circulating ribbon samples stay continuous or cross their seam outside the viewport',()=>{
 for(let index=0;index<225;index++)for(let time=0;time<8;time+=.1){
  const a=sampleNeuralRibbon(index,225,1440,1000,time,{x:0,y:0,z:0});
  const b=sampleNeuralRibbon(index,225,1440,1000,time+1/60,{x:0,y:0,z:0});
  const outside=point=>point.x<0||point.x>1440;
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<20||(outside(a)&&outside(b)),'visible points never teleport between ribbon ends');
 }
});

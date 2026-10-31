import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../lib/skill-evidence.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {projectUsesSkill}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('skill connections use editable project evidence with exact technology aliases',()=>{
 const project={stack:['Next.js','PostgreSQL','CNN','LSTM / BiLSTM'],walkthroughSteps:[{tech:['TypeScript']}]};
 for(const skill of ['nextjs','Postgres','CNN','BiLSTM','TypeScript']) assert.ok(projectUsesSkill(project,skill),skill);
 for(const skill of ['Java','C','SQL','React','']) assert.equal(projectUsesSkill(project,skill),false,skill);
 assert.equal(projectUsesSkill({stack:['Flask']},'Flask'),true);
 assert.equal(projectUsesSkill({stack:[]},'Flask'),false,'removing a technology removes its connection');
 assert.equal(projectUsesSkill({},'Flask'),false);
});

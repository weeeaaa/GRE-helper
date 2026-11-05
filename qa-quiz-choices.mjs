import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const seed=JSON.parse(fs.readFileSync('data/quiz-seed.json','utf8'));
const src=ts.transpileModule(fs.readFileSync('lib/quiz.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;$/gm,'').replace(/export /g,'');
const {selectOption:s,answerReady:r}=new Function('seed',src+';return {selectOption,answerReady}')(seed);
assert.equal(s(seed.E001,'A',1),'B');
assert.equal(s(seed.E010,'C',4),'CE');assert.equal(s(seed.E010,'CE',0),'CE');assert.equal(s(seed.E010,'CE',2),'E');assert.equal(r(seed.E010,'C'),false);assert.equal(r(seed.E010,'CE'),true);
assert.equal(s(seed.E007,'ADH',1),'BDH');assert.equal(r(seed.E007,'AD'),false);assert.equal(r(seed.E007,'ADH'),true);
assert.equal(s(seed.E017,'AB',0),'B');assert.equal(r(seed.E003,'1.4'),true);
console.log('Single choice, multi-select toggle/limit, blank grouping and numeric input passed.');

import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const seed=JSON.parse(fs.readFileSync('data/quiz-seed.json','utf8'));
const source=ts.transpileModule(fs.readFileSync('lib/quiz.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;$/gm,'').replace(/export /g,'');
const {gradeAnswer,shuffled,quizQuestion}=new Function('seed',source+';return {gradeAnswer,shuffled,quizQuestion}')(seed);
for(const [a,k,r] of [['D,C','CD',true],['C,C,D','CD',false],['1.40','1.4',true],['7/5','1.4',true],['9100','1.4',false],['A','',null],['B','D',false],['a d h','ADH',true]])assert.equal(gradeAnswer(a,k),r);
const notes=JSON.parse(fs.readFileSync('data/seed.json','utf8'));assert.equal(notes.filter(quizQuestion).length,26);
for(const n of notes){const q=quizQuestion(n);assert.ok(q.prompt);assert.ok(q.key);assert.doesNotMatch(q.prompt+q.passage,/正確答案|您的答案|耗時|正确答案/);assert.equal(q.key,n.answer.match(/截圖答案：([^；]+)/)[1]);}
assert.equal(seed.E009.passage,seed.E008.passage);assert.equal(seed.E019.passage,seed.E018.passage);
assert.equal(quizQuestion({id:'new'}),null);assert.equal(quizQuestion({id:'new',reviewQuestion:'new question',reviewAnswer:'B'}).key,'B');
assert.deepEqual(shuffled([1,2,3]).sort(),[1,2,3]);console.log('26 question keys, shared passages, no answer labels, grading and new-question eligibility passed.');

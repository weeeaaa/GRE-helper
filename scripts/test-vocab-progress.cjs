const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE vocab_plan(user_id TEXT PRIMARY KEY,start TEXT,ids TEXT);CREATE TABLE vocab_views(user_id TEXT,event_id TEXT,card_id TEXT,viewed_at TEXT,PRIMARY KEY(user_id,event_id));');
const DB={prepare(sql){return {bind(...args){const q=db.prepare(sql);return {async first(){return q.get(...args)},async all(){return {results:q.all(...args)}},async run(){return q.run(...args)}}}}}};
function load(file,dependencies={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error('unexpected dependency '+n)},Response,Request,Date,JSON,Set,Map,structuredClone,console});return exports;
}
const model=load('lib/vocab-model.ts'),photo=load('lib/photo-vocabulary.ts',{'./vocab-model':model}),plan=load('lib/review-plan.ts');
const seed=JSON.parse(fs.readFileSync('data/vocab-seed.json')),additions=JSON.parse(fs.readFileSync('data/photo-vocab-20261020.json'));
const before=JSON.stringify(seed),once=photo.withPhotoVocabulary(seed,additions),twice=photo.withPhotoVocabulary(once,additions);
assert.equal(JSON.stringify(seed),before);
assert.equal(JSON.stringify(once),JSON.stringify(twice));
assert.equal(once.flatMap(g=>g.entries).length-seed.flatMap(g=>g.entries).length,22);
for(const n of [0,1,4,5,6,2680]){const ids=Array.from({length:n},(_,i)=>String(i)),parts=plan.splitDays(ids);assert.equal(JSON.stringify(parts.flat()),JSON.stringify(ids));assert.ok(Math.max(...parts.map(p=>p.length))-Math.min(...parts.map(p=>p.length))<=1);}
const route=load('app/api/vocab-progress/route.ts',{'cloudflare:workers':{env:{DB}},'../../../lib/store':{identity:r=>r.headers.get('test-user'),sameOrigin:()=>{},failure:e=>Response.json({error:e.message},{status:400})},'../../../lib/review-plan':plan});
async function post(user,body){const r=await route.POST(new Request('https://test.local/api/vocab-progress',{method:'POST',headers:{'test-user':user,'content-type':'application/json'},body:JSON.stringify(body)}));assert.equal(r.status,200);return r.json();}
(async()=>{
 let r=await post('test-a',{action:'init',ids:['a','b','c']});assert.equal(r.plan.ids.length,3);
 r=await post('test-a',{action:'init',ids:['a','b','c','d']});assert.equal(r.plan.ids.length,3);
 const event='00000000-0000-4000-8000-000000000001';
 await post('test-a',{action:'view',id:'a',event});
 r=await post('test-a',{action:'view',id:'a',event});assert.equal(r.counts.a,1);
 r=await post('test-a',{action:'view',id:'a',event:'00000000-0000-4000-8000-000000000002'});assert.equal(r.counts.a,2);
 r=await post('test-b',{action:'init',ids:['z']});assert.equal(Object.keys(r.counts).length,0);assert.equal(r.plan.ids[0],'z');
 const refresh=await route.GET(new Request('https://test.local/api/vocab-progress',{headers:{'test-user':'test-a'}}));assert.equal((await refresh.json()).counts.a,2);
 db.prepare('INSERT INTO vocab_views VALUES(?,?,?,?)').run('test-a','boundary-1','tz','2026-10-21T16:30:00Z');
 db.prepare('INSERT INTO vocab_views VALUES(?,?,?,?)').run('test-a','boundary-2','tz','2026-10-21T17:00:00Z');
 const dated=await (await route.GET(new Request('https://test.local/api/vocab-progress',{headers:{'test-user':'test-a'}}))).json();assert.deepEqual(dated.dates.tz,['2026-10-22']);assert.equal(dated.counts.tz,2);
 const fresh=await (await route.GET(new Request('https://test.local/api/vocab-progress',{headers:{'test-user':'fresh'}}))).json();assert.equal(fresh.plan,null);assert.deepEqual(fresh.dates,{});
 console.log('PASS: date-only-in-view, Taiwan midnight, distinct dates, read does not schedule;  22 additions, no original changes, idempotent merge; balanced days, fixed plan, repeat views, retry deduplication, persistence, user isolation.');db.close();
})().catch(e=>{console.error(e);process.exitCode=1});

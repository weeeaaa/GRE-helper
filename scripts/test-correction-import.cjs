const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},URL,Error,Response,Request,Date,JSON,Set,Map,console});return exports;}
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE records(user_id TEXT,id TEXT,data TEXT,revision INTEGER,updated_at TEXT,PRIMARY KEY(user_id,id));');
const DB={prepare(sql){return {bind(...args){return {async all(){return {results:db.prepare(sql).all(...args)}},execute(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}}},async batch(stmts){db.exec('BEGIN');try{const out=stmts.map(s=>s.execute());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
const seed=JSON.parse(fs.readFileSync('data/seed.json')),store=load('lib/store.ts',{'cloudflare:workers':{env:{DB}},'../data/seed.json':{default:seed}}),parser=load('lib/correction-import.ts');
const route=load('app/api/notes/import/route.ts',{'cloudflare:workers':{env:{DB}},'../../../../lib/store':store,'../../../../lib/correction-import':parser});
const n={id:'I_test',title:'測試',section:'Verbal',original:'Complete original question',vocabulary:'',options:'convoluted = 複雜的\nadulterated = 摻雜、被污染的',clues:'轉折',commentary:'解釋',reason:''};
function request(notes,origin='https://test.local'){return new Request('https://test.local/api/notes/import',{method:'POST',headers:{origin,'oai-authenticated-user-id':'test'},body:JSON.stringify({format:'gre-corrections-v1',notes})});}
(async()=>{
 assert.throws(()=>parser.parseCorrections({format:'gre-corrections-v1',notes:[{...n,section:'Quan',category:''}]}));
 assert.throws(()=>parser.parseCorrections({format:'gre-corrections-v1',notes:[{...n,blocks:[{type:'table',rows:[null]}]}]}));
 assert.throws(()=>parser.parseCorrections({format:'gre-corrections-v1',notes:[{...n,images:['https://untrusted/image.png']}]}));
 let r=await route.POST(request([n,{...n,id:'I_quan',section:'Quan',category:'觀念錯',blocks:[{type:'table',rows:[['a','b']]}]}]));assert.equal(r.status,200,await r.clone().text());let result=await r.json();assert.equal(result.imported,2);assert.equal(result.notes.find(x=>x.id==='I_quan').category,'觀念加強');
 const edited={...result.notes.find(x=>x.id==='I_test'),commentary:'使用者後來修改'};db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(edited),'I_test');
 result=await (await route.POST(request([n]))).json();assert.equal(result.imported,0);assert.equal(result.skipped,1);assert.equal(result.notes.find(x=>x.id==='I_test').commentary,'使用者後來修改');
 const count=db.prepare('SELECT count(*) AS n FROM records').get().n;
 r=await route.POST(request([{...n,id:'I_new'},{...n,id:'I_bad',section:'wrong'}]));assert.equal(r.status,400);assert.equal(db.prepare('SELECT count(*) AS n FROM records').get().n,count);
 assert.equal((await route.POST(request([n],'https://other.local'))).status,403);
 console.log('PASS: classifications, all fields, malformed content, duplicate imports preserve edits, invalid batch has no partial writes, cross-origin rejection. No live data changed.');
})().catch(e=>{console.error(e);process.exitCode=1});

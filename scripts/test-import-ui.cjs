const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},console,structuredClone,Set,Map,JSON,...globals});return exports;}
const layout=load('lib/quan-layout.ts',{}),parser=load('lib/correction-import.ts',{});
const note=parser.parseCorrections({format:'gre-corrections-v1',notes:[{id:'I_ui',title:'匯入測試',section:'Quan',category:'觀念加強',original:'Original question',blocks:[],reason:''} ]})[0];
const old={...note,blocks:[{type:'text',text:'保留原解法'},{type:'image',url:'/questions/1.png',alt:'原圖'}]};
assert.equal(layout.withQuanLayout(old).blocks.length,2);
assert.equal(layout.withQuanLayout({...old,reason:'保留錯因'}).blocks.length,2);
const populated={...old,blocks:[{type:'table',rows:[['算式','觀念','錯因'],['1+1=2','','']]},...old.blocks]};
assert.equal(layout.withQuanLayout(populated).blocks[0].rows[1][0],'1+1=2');
const blank={...old,blocks:[{type:'table',rows:[['算式','觀念','錯因'],[' ','','']]},...old.blocks]};
assert.equal(layout.withQuanLayout(blank).blocks.length,2);
assert.equal(layout.withQuanLayout({...old,reason:'保留錯因'}).reason,'保留錯因');
for(const labels of [['算式','錯因'],['算式','觀念','錯因']]){
 const legacy={...old,reason:'',blocks:[{type:'table',rows:[labels,labels.map((_,i)=>i===labels.length-1?'只注意到 close，沒有確認 closest。':'')]},...old.blocks]};
 const cleaned=layout.withQuanLayout(legacy);
 assert.equal(cleaned.blocks.length,old.blocks.length);
 assert.equal(cleaned.reason,'只注意到 close，沒有確認 closest。');
 assert.equal(JSON.stringify(layout.withQuanLayout(cleaned)),JSON.stringify(cleaned));
}
const generic={...old,blocks:[{type:'table',rows:[['A','B'],['1','2'],['3','4']]}]};
assert(!layout.isQuanCorrectionTable(layout.withQuanLayout(generic).blocks[0]));
// Execute the actual notebook success handler with React state setters recorded.
const notebookSource=fs.readFileSync('app/notebook.tsx','utf8');
const ast=ts.createSourceFile('notebook.tsx',notebookSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='importedNotes')handler=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);
assert(handler);
for(const duplicate of [false,true]){
 const state={};const scope={notes:duplicate?[note]:[],Set};
 for(const name of ['ImportOpen','Notes','View','Query','Message','Dirty','QuizDirty','EmptyTableFor','ImportedTarget','Draft','Versions','QuizPage','VocabPage','HighlightsPage','ExportPage'])scope['set'+name]=v=>state[name]=v;
 vm.runInNewContext(ts.transpileModule(handler+'\nimportedNotes(latest,batchIds,"完成");',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{...scope,latest:[old,{...note,id:'I_new',title:'新題'}],batchIds:duplicate?[note.id]:[note.id,'I_new']});
 assert.equal(state.ImportOpen,false);assert.equal(state.Draft.id,note.id);assert.equal(state.ImportedTarget,note.id);
 assert.equal(state.View,'全部錯題');assert.equal(state.Query,'');assert.equal(state.Dirty,false);assert.equal(state.QuizPage,false);
}
function harness(file,extra,globals={}){
 let slots=[],cursor=0;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})}};
 const jsx=(type,props)=>({type,props});
 const Component=load(file,{react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},...extra},globals).default;
 return props=>{cursor=0;return Component(props)};
}
function nodes(tree){if(!tree||typeof tree!=='object')return[];if(Array.isArray(tree))return tree.flatMap(nodes);return[tree,...nodes(tree.props?.children)];}
(async()=>{
 for(const [label,response] of [['new',{ok:true,data:{notes:[note],imported:1,skipped:0}}],['duplicate',{ok:true,data:{notes:[note],imported:0,skipped:1}}],['failure',{ok:false,data:{error:'離線'}}]]){
  const calls=[];let body;
  const render=harness('app/correction-import.tsx',{'../lib/quan-layout':layout,'../lib/correction-import':parser},{fetch:async(url,options)=>{body=JSON.parse(options.body);return{ok:response.ok,json:async()=>response.data}}});
  const props={onClose:()=>calls.push('close'),onSaved:(ns,ids)=>{calls.push('saved');assert.equal(ns[0].id,note.id);assert.equal(ids[0],note.id)}};
  const payload=JSON.stringify({format:'gre-corrections-v1',notes:[note]});
  nodes(render(props)).find(n=>n.type==='textarea').props.onChange({target:{value:payload}});
  const button=nodes(render(props)).find(n=>n.type==='button'&&n.props.className==='primary');assert.equal(button.props.disabled,false);
  await button.props.onClick();assert.equal(body.notes[0].id,note.id);
  assert.equal(calls.join(','),label==='failure'?'':'close,saved');
  if(label==='failure')assert.equal(nodes(render(props)).find(n=>n.type==='textarea').props.value,payload);
 }
 console.log('PASS: successful/duplicate imports close before navigation; failed imports retain input; blank Quan tables omitted, existing text/images/tables/reasons preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});

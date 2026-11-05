import {identity,list,get,save} from '../../lib/store';
import type {Note} from '../../lib/types';
import {env} from 'cloudflare:workers';
const tools=[
 {name:'upload_gre_image',description:'上傳使用者傳來的GRE題目或筆記圖片，回傳可加入筆記的圖片路徑。PNG、JPEG、WebP，最多12MB。',inputSchema:{type:'object',properties:{base64:{type:'string'},filename:{type:'string'}},required:['base64','filename'],additionalProperties:false}},
 {name:'list_gre_notes',description:'列出使用者GRE筆記和版本號。原文和使用者錯因不可自動刪改。',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'get_gre_note',description:'讀取完整GRE題目、圖片、原筆記和使用者錯因。',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'prepare_gre_review',description:'新增或更新AI負責的GRE檢討。先查證題目、生字、選項、邏輯。使用者錯因reason和原文original受保護，不由此工具修改。Quan原筆記blocks完整保留，新補充用appendBlocks追加，圖片用appendImages追加。先get_gre_note取得revision。',inputSchema:{type:'object',properties:{id:{type:'string'},revision:{type:'integer'},title:{type:'string'},section:{type:'string',enum:['Quan','Verbal']},category:{type:'string'},answer:{type:'string'},source:{type:'string'},vocabulary:{type:'string'},options:{type:'string'},clues:{type:'string'},commentary:{type:'string'},appendImages:{type:'array',items:{type:'string'}},appendBlocks:{type:'array',items:{type:'object'}}},required:['id','revision'],additionalProperties:false}}
];
export async function POST(req:Request){let id:any=null;try{
 const user=identity(req),r:any=await req.json();id=r.id;let result:any;
 if(r.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(r.method==='initialize')result={protocolVersion:r.params?.protocolVersion??'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'gre-notebook',version:'1.0.0'}};
 else if(r.method?.startsWith('notifications/'))return new Response(null,{status:204});
 else if(r.method==='tools/list')result={tools};
 else if(r.method==='tools/call'){
  const a=r.params.arguments??{};let value:any;
  if(r.params.name==='upload_gre_image'){
   if(typeof a.base64!=='string'||a.base64.length>17*1024*1024)throw Error('IMAGE_TOO_LARGE');
   const bytes=Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0));
   const type=bytes[0]===137&&bytes[1]===80?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
   if(!type||bytes.length>12*1024*1024)throw Error('INVALID_IMAGE');const key=crypto.randomUUID();await env.BUCKET.put(user+'/'+key,bytes,{httpMetadata:{contentType:type},customMetadata:{originalName:String(a.filename)}});value={url:'/api/media/'+key};
  }
  else if(r.params.name==='list_gre_notes')value=(await list(user)).map(n=>({id:n.id,title:n.title,section:n.section,category:n.category,revision:n.revision,updatedAt:n.updatedAt}));
  else if(r.params.name==='get_gre_note')value=await get(user,a.id)??{error:'NOT_FOUND'};
  else if(r.params.name==='prepare_gre_review'){
   const old=await get(user,a.id);if(old&&old.revision!==a.revision)throw new Error('CONFLICT');
   const next:Note=old?structuredClone(old):{id:a.id,title:'新題目',section:'Verbal',category:'',answer:'',source:'',images:[],blocks:[],vocabulary:'',options:'',clues:'',commentary:'',reason:'',original:'',revision:0};
   for(const key of ['title','section','category','answer','source','vocabulary','options','clues','commentary'])if(typeof a[key]==='string'){
    const prev=(next as any)[key];
    (next as any)[key]=['vocabulary','options','clues','commentary'].includes(key)&&prev&&!a[key].includes(prev)?prev+'\n\n補充：'+a[key]:a[key];
   }
   if(a.appendBlocks)next.blocks.push(...a.appendBlocks);if(a.appendImages)next.images.push(...a.appendImages);value=await save(user,next);
  }else throw new Error('UNKNOWN_TOOL');
  result={content:[{type:'text',text:JSON.stringify(value)}]};
 }else return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 return Response.json({jsonrpc:'2.0',id,result});
 }catch(e){return Response.json({jsonrpc:'2.0',id,result:{content:[{type:'text',text:e instanceof Error?e.message:'Request failed'}],isError:true}});}}

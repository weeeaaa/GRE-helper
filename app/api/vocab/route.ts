import {env} from 'cloudflare:workers';
import seed from '../../../data/vocab-seed.json';
import imported from '../../../data/vocab-import.json';
import additions from '../../../data/photo-vocab-20261020.json';
import additionsB from '../../../data/photo-vocab-20261020-b.json';
import {withPhotoVocabulary} from '../../../lib/photo-vocabulary';
import {identity,sameOrigin,failure} from '../../../lib/store';
import {exactGroup,similarGroups,mergeGroup,type VocabGroup} from '../../../lib/vocab-model';
async function read(user:string){const row=await env.DB.prepare('SELECT data,revision FROM vocabulary WHERE user_id=?').bind(user).first<any>();const groups:VocabGroup[]=row?JSON.parse(row.data):seed;return {groups:withPhotoVocabulary([...groups,...imported.filter(g=>!groups.some(x=>x.id===g.id))] as VocabGroup[],[...additions,...additionsB] as VocabGroup[]),revision:row?.revision??0};}
export async function GET(req:Request){try{return Response.json(await read(identity(req)));}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=identity(req),body=await req.json() as any,g=body.group as VocabGroup;
 if(!g||!['同義','片語','易混淆','易誤解','其他'].includes(g.kind)||typeof g.id!=='string'||g.id.length>100||!g.title?.trim()||typeof g.major!=='string'||g.title.length>200||g.major.length>200||!Array.isArray(g.entries)||!g.entries.length||g.entries.length>2000||g.entries.some(e=>!e.word?.trim()||['word','meaning','note'].some(k=>typeof (e as any)[k]!=='string'||(e as any)[k].length>12000)))throw Error('INVALID_VOCAB');
 const current=await read(user);if(body.revision!==current.revision)throw Error('CONFLICT');
 let groups=current.groups,merged=false,target:VocabGroup|undefined;
 const editing=groups.find(x=>x.id===g.id);
 if(editing){
  target=exactGroup(g,groups);
  if(target){merged=true;groups=groups.filter(x=>x.id!==g.id).map(x=>x.id===target!.id?mergeGroup(x,g):x);}
  else groups=groups.map(x=>x.id===g.id?g:x);
 }
 else{
  target=exactGroup(g,groups);
  if(!target&&g.kind==='同義'){
   const suggestions=similarGroups(g,groups);
   if(body.mergeId){target=groups.find(x=>x.id===body.mergeId&&x.kind==='同義');if(!target)throw Error('INVALID_MERGE');}
   else if(groups.some(x=>x.kind==='同義')&&body.decision!=='separate')return Response.json({needsDecision:true,suggestions,revision:current.revision});
  }
  if(target){merged=true;groups=groups.map(x=>x.id===target!.id?mergeGroup(x,g):x);}else groups=[...groups,{...g,id:crypto.randomUUID()}];
 }
 if(JSON.stringify(groups).length>6000000)throw Error('INVALID_SIZE');
 const rev=current.revision+1;const row=await env.DB.prepare('INSERT INTO vocabulary(user_id,data,revision) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision WHERE vocabulary.revision=? RETURNING revision').bind(user,JSON.stringify(groups),rev,current.revision).first();
 if(!row)throw Error('CONFLICT');return Response.json({groups,revision:rev,merged,title:target?.title??g.title});
 }catch(e){return failure(e);}}

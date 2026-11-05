import {env} from 'cloudflare:workers';
import {identity,sameOrigin,failure} from '../../../lib/store';
import {PLAN_START} from '../../../lib/review-plan';
async function read(user:string){
 const plan=await env.DB.prepare('SELECT start,ids FROM vocab_plan WHERE user_id=?').bind(user).first<{start:string;ids:string}>();
 const rows=await env.DB.prepare('SELECT card_id,COUNT(*) AS count FROM vocab_views WHERE user_id=? GROUP BY card_id').bind(user).all<{card_id:string;count:number}>();
 const events=await env.DB.prepare('SELECT card_id,viewed_at FROM vocab_views WHERE user_id=? ORDER BY viewed_at DESC').bind(user).all<{card_id:string;viewed_at:string}>();
 const dates:Record<string,string[]>={};
 for(const event of events.results){const date=new Date(event.viewed_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});const list=dates[event.card_id]??=[];if(!list.includes(date))list.push(date);}
 return {plan:plan?{start:plan.start,ids:JSON.parse(plan.ids)}:null,counts:Object.fromEntries(rows.results.map(r=>[r.card_id,r.count])),dates};
}
export async function GET(req:Request){try{return Response.json(await read(identity(req)));}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=identity(req),body=await req.json() as any;
 if(body.action==='init'){
  if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>30000||body.ids.some((id:unknown)=>typeof id!=='string'||!id||id.length>1000))throw Error('INVALID_PLAN');
  await env.DB.prepare('INSERT OR IGNORE INTO vocab_plan(user_id,start,ids) VALUES(?,?,?)').bind(user,PLAN_START,JSON.stringify([...new Set(body.ids)])).run();
 }else if(body.action==='view'){
  if(typeof body.id!=='string'||!body.id||body.id.length>1000||typeof body.event!=='string'||!/^[0-9a-f-]{36}$/.test(body.event))throw Error('INVALID_VIEW');
  await env.DB.prepare('INSERT OR IGNORE INTO vocab_views(user_id,event_id,card_id,viewed_at) VALUES(?,?,?,?)').bind(user,body.event,body.id,new Date().toISOString()).run();
 }else throw Error('INVALID_ACTION');
 return Response.json(await read(user));
 }catch(e){return failure(e);}}

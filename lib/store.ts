import { env } from 'cloudflare:workers';
import seed from '../data/seed.json';
import type { Note } from './types';
export function identity(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Error('UNAUTHENTICATED');return id;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin && origin!==new URL(req.url).origin)throw new Error('FORBIDDEN');}
export async function list(user:string):Promise<Note[]>{
 const result=await env.DB.prepare('SELECT data,revision,updated_at FROM records WHERE user_id=?').bind(user).all<any>();
 const map=new Map<string,Note>((seed as Note[]).map(n=>[n.id,n]));
 for(const row of result.results){const n=JSON.parse(row.data);map.set(n.id,{...n,revision:row.revision,updatedAt:row.updated_at});}
 return [...map.values()];
}
export async function get(user:string,id:string){return (await list(user)).find(n=>n.id===id);}
const safeUrl=(s:unknown)=>typeof s==='string' && /^\/(questions\/[0-9]+\.png|api\/media\/[a-f0-9-]+)$/.test(s);
export function validate(n:any): asserts n is Note {
 if(!n || typeof n.id!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(n.id)||!['Quan','Verbal'].includes(n.section)||!Number.isInteger(n.revision))throw new Error('INVALID_NOTE');
 for(const key of ['reviewQuestion','reviewAnswer'])if(n[key]!==undefined&&(typeof n[key]!=='string'||n[key].length>150000))throw new Error('INVALID_REVIEW');
 for(const key of ['title','category','answer','source','vocabulary','options','clues','commentary','reason','original'])if(typeof n[key]!=='string'||n[key].length>150000)throw new Error('INVALID_FIELD');
 if(!Array.isArray(n.images)||n.images.length>50||n.images.some((s:any)=>!safeUrl(s)))throw new Error('INVALID_IMAGE');
 if(!Array.isArray(n.blocks)||n.blocks.length>150)throw new Error('INVALID_BLOCKS');
 for(const b of n.blocks){if(b.type==='text'){if(typeof b.text!=='string'||b.text.length>150000)throw new Error('INVALID_TEXT');}else if(b.type==='image'){if(!safeUrl(b.url)||typeof b.alt!=='string')throw new Error('INVALID_IMAGE');}else if(b.type==='table'){if(!Array.isArray(b.rows)||b.rows.length>80||b.rows.some((r:any)=>!Array.isArray(r)||r.length>12||r.some((c:any)=>typeof c!=='string'||c.length>10000)))throw new Error('INVALID_TABLE');}else throw new Error('INVALID_BLOCK');}
 if(JSON.stringify(n).length>800000)throw new Error('NOTE_TOO_LARGE');
}
export async function save(user:string,n:Note):Promise<Note>{
 validate(n);const previous=await get(user,n.id);if(previous && previous.revision!==n.revision)throw new Error('CONFLICT');
 const revision=n.revision+1,now=new Date().toISOString();
 const next={...n,original:previous?.original??n.original,revision,updatedAt:now};
 if(previous)await env.DB.prepare('INSERT OR IGNORE INTO versions(user_id,id,revision,data,updated_at) VALUES(?,?,?,?,?)').bind(user,n.id,previous.revision,JSON.stringify(previous),now).run();
 const row=await env.DB.prepare('INSERT INTO records(user_id,id,data,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at WHERE records.revision=? RETURNING revision').bind(user,n.id,JSON.stringify(next),revision,now,n.revision).first();
 if(!row)throw new Error('CONFLICT');return next;
}
export async function history(user:string,id:string){const r=await env.DB.prepare('SELECT revision,data,updated_at FROM versions WHERE user_id=? AND id=? ORDER BY revision DESC LIMIT 40').bind(user,id).all<any>();return r.results.map(r=>({revision:r.revision,updatedAt:r.updated_at,note:JSON.parse(r.data)}));}
export function failure(error:unknown){const msg=error instanceof Error?error.message:'SERVER_ERROR';return Response.json({error:msg},{status:msg==='UNAUTHENTICATED'?401:msg==='FORBIDDEN'?403:msg==='CONFLICT'?409:msg.startsWith('INVALID')||msg==='NOTE_TOO_LARGE'?400:500});}

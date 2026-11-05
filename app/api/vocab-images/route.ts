import {env} from 'cloudflare:workers';
import {identity,sameOrigin,failure} from '../../../lib/store';
export async function GET(req:Request){try{const rows=await env.DB.prepare('SELECT id,url,note,status,created_at AS createdAt FROM vocab_images WHERE user_id=? ORDER BY created_at DESC').bind(identity(req)).all();return Response.json(rows.results);}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const user=identity(req),b=await req.json() as any;
 if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id)||typeof b.url!=='string'||!/^\/api\/media\/[a-f0-9-]{36}$/.test(b.url)||typeof b.note!=='string'||b.note.length>12000)throw Error('INVALID_IMAGE');
 const media=await env.BUCKET.head(user+'/'+b.url.split('/').pop());if(!media)throw Error('INVALID_IMAGE');
 await env.DB.prepare('INSERT OR IGNORE INTO vocab_images(user_id,id,url,note,created_at) VALUES(?,?,?,?,?)').bind(user,b.id,b.url,b.note,new Date().toISOString()).run();
 return Response.json({ok:true});
 }catch(e){return failure(e);}}

export async function PATCH(req:Request){try{sameOrigin(req);const user=identity(req),b=await req.json() as any;if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id)||!['pending','done'].includes(b.status))throw Error('INVALID_IMAGE');await env.DB.prepare('UPDATE vocab_images SET status=? WHERE user_id=? AND id=?').bind(b.status,user,b.id).run();return Response.json({ok:true});}catch(e){return failure(e);}}

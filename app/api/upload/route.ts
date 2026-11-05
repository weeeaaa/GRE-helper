import {env} from 'cloudflare:workers';
import {identity,sameOrigin,failure} from '../../../lib/store';
export async function POST(req:Request){try{
 sameOrigin(req);const user=identity(req);const form=await req.formData(),file=form.get('file');
 if(!(file instanceof File)||file.size>12*1024*1024)return Response.json({error:'請選擇 12 MB 以內的 PNG、JPEG 或 WebP 圖片。'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const type=bytes[0]===137&&bytes[1]===80&&bytes[2]===78?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':null;
 if(!type)return Response.json({error:'不支援此圖片格式。'},{status:400});
 const key=crypto.randomUUID();await env.BUCKET.put(user+'/'+key,bytes,{httpMetadata:{contentType:type},customMetadata:{originalName:file.name}});
 return Response.json({url:'/api/media/'+key});
 }catch(e){return failure(e);}}

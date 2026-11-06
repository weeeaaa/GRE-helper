import type {Note} from './types';
export function parseCorrectionText(input: string): Note[] {
 if (input.length > 6000000) throw Error('內容太長，請分批匯入。');
 const text = input.trim();
 const fences = Array.from(text.matchAll(/^`{3}(?:json)?[^\S\r\n]*\r?\n([\s\S]*?)^`{3}[^\S\r\n]*(?:\r?$)/gim));
 if (fences.length > 1) throw Error('請一次貼上一個完整訂正區塊，多題可放在同一個區塊。');
 let value: unknown;
 try {
  value = JSON.parse(fences[0]?.[1] ?? text);
 } catch {
  throw Error('請複製 GPT 提供的完整訂正格式，從第一個 { 到最後一個 }。');
 }
 return parseCorrections(value);
}
export function parseCorrections(value:unknown):Note[] {
 const p=value as {format?:unknown;notes?:unknown};
 if(!p||p.format!=='gre-corrections-v1'||!Array.isArray(p.notes)||!p.notes.length||p.notes.length>50)throw Error('請選擇我提供的訂正檔（gre-corrections-v1），每份最多50題。');
 const ids=new Set<string>();
 return p.notes.map((raw:any)=>{
  if(!raw||typeof raw.id!=='string'||!/^I_[A-Za-z0-9_-]{1,78}$/.test(raw.id)||ids.has(raw.id))throw Error('題目識別碼缺漏或重複，請重新取得訂正檔。');
  ids.add(raw.id);
  if(!['Verbal','Quan'].includes(raw.section))throw Error('每題必須指定 Verbal 或 Quan。');
  const category=raw.category==='觀念錯'?'觀念加強':raw.category??'';
  if(raw.section==='Quan'&&!['粗心','觀念加強'].includes(category))throw Error('Quan 必須指定粗心或觀念加強。');
  const note:Note={id:raw.id,section:raw.section,category,revision:0,images:raw.images??[],blocks:raw.blocks??[],title:raw.title,source:raw.source??'',answer:raw.answer??'',original:raw.original,vocabulary:raw.vocabulary??'',options:raw.options??'',clues:raw.clues??'',commentary:raw.commentary??'',reason:raw.reason??'',reviewQuestion:raw.reviewQuestion??'',reviewAnswer:raw.reviewAnswer??''};
  for(const key of ['title','category','source','answer','original','vocabulary','options','clues','commentary','reason','reviewQuestion','reviewAnswer'] as const)if(typeof note[key]!=='string'||note[key]!.length>150000)throw Error('訂正欄位格式不完整。');
  if(!note.title.trim()||!note.original.trim())throw Error('請保留題目標題與完整原始題目。');
  if(!Array.isArray(note.images)||!Array.isArray(note.blocks)||JSON.stringify(note).length>800000)throw Error('題目內容格式或大小不符。');
  const safeUrl=(u:unknown)=>typeof u==='string'&&/^\/(questions\/[0-9]+\.png|api\/media\/[a-f0-9-]+)$/.test(u);
  if(note.images.length>50||note.images.some(u=>!safeUrl(u))||note.blocks.length>150)throw Error('圖片或筆記區塊格式錯誤。');
  for(const b of note.blocks){if(!b||!(b.type==='text'?typeof b.text==='string'&&b.text.length<=150000:b.type==='image'?safeUrl(b.url)&&typeof b.alt==='string':b.type==='table'?Array.isArray(b.rows)&&b.rows.length<=80&&b.rows.every(r=>Array.isArray(r)&&r.length<=12&&r.every(c=>typeof c==='string'&&c.length<=10000)):false))throw Error('筆記文字、圖片或表格格式錯誤。');}
  if(note.section==='Verbal'&&['vocabulary','options','clues','commentary'].some(k=>typeof raw[k]!=='string'))throw Error('Verbal 須包含生字、選項單字、邏輯線索與檢討補充四欄；無內容可留空。');
  return note;
 });
}

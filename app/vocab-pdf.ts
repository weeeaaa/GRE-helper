import {PDFDocument,rgb,PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {VocabGroup} from '../lib/vocab-model';
export async function createVocabPdf(groups:VocabGroup[],fontBytes:Uint8Array,englishBytes:Uint8Array,headingOverride?:string,phoneticBytes?:Uint8Array){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:false}),english=await doc.embedFont(englishBytes,{subset:false});
 const phonetic=phoneticBytes?await doc.embedFont(phoneticBytes,{subset:false}):font;const supported=new Set(font.getCharacterSet());
 const ink=rgb(.19,.23,.25),blue=rgb(.22,.43,.53),colors=[rgb(1,.94,.60),rgb(.82,.93,.89),rgb(.96,.86,.90),rgb(.87,.87,.95)];let page!:PDFPage,x=36,y=756,col=0,section='',pageNo=0;
 const size=10.2,leading=15,CW=251;
 const title=(g:VocabGroup)=>headingOverride||'GRE單字筆記-'+(g.kind==='同義'?'同義字':g.kind==='易混淆'?'易混淆字':g.kind==='片語'?'片語':g.kind==='易誤解'?'易誤解字':g.major);
 const fontFor=(s:string)=>/^[\x20-\x7e]+$/.test(s)?english:font;
 function wrap(s:string,width:number){const out:string[]=[];for(const raw of s.replace(/\r/g,'').split('\n')){let line='';for(const token of raw.match(/[A-Za-z0-9]+|[^A-Za-z0-9]/gu)||['']){if(font.widthOfTextAtSize(line+token,size)>width&&line){out.push(line);line='';}for(const c of token){if(font.widthOfTextAtSize(line+c,size)>width&&line){out.push(line);line='';}line+=c;}}out.push(line);}return out;}
 function newPage(){page=doc.addPage([595.28,841.89]);pageNo++;col=0;x=36;y=756;page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:rgb(1,.996,.976)});for(let v=36;v<565;v+=12)page.drawLine({start:{x:v,y:38},end:{x:v,y:804},color:rgb(.925,.94,.92),thickness:.25});for(let v=38;v<805;v+=12)page.drawLine({start:{x:31,y:v},end:{x:565,y:v},color:rgb(.925,.94,.92),thickness:.25});page.drawLine({start:{x:29,y:35},end:{x:29,y:806},color:rgb(.85,.72,.74),thickness:.5});const ts=Math.min(18,520/font.widthOfTextAtSize(section,1));page.drawText(section,{x:36,y:784,size:ts,font,color:ink});page.drawText('GRE / '+new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'}),{x:36,y:20,size:8,font,color:ink});page.drawText(String(pageNo),{x:551,y:20,size:8,font,color:ink});}
 function nextColumn(){if(col===0){col=1;x=306;y=756;}else newPage();}
 function ensure(h:number){if(y-h<42)nextColumn();}
 function heading(s:string,c:number){const lines=wrap(s,CW-10);ensure(lines.length*18+22);for(const l of lines){page.drawRectangle({x,y:y-5,width:Math.min(CW,font.widthOfTextAtSize(l,11)+10),height:14,color:colors[c%4]});page.drawText(l,{x:x+4,y,size:11,font,color:ink});y-=19;}y-=3;}
 function brace(top:number,bottom:number){const h=top-bottom;if(h<5)return;page.drawSvgPath(`M 13 0 C 4 0 5 ${h*.15} 5 ${h*.32} C 5 ${h*.44} 2 ${h*.48} 0 ${h*.5} C 2 ${h*.52} 5 ${h*.56} 5 ${h*.68} C 5 ${h*.85} 4 ${h} 13 ${h}`,{x:x+1,y:top+10,borderColor:ink,borderWidth:1});}
 const sorted=[...groups].sort((a,b)=>rank(a)-rank(b));
 function rank(g:VocabGroup){return g.kind==='同義'?0:g.kind==='其他'&&/填空/.test(g.major)?1:g.kind==='易混淆'?2:g.kind==='片語'?3:4;}
 for(let gi=0;gi<sorted.length;gi++){
  const g=sorted[gi],t=title(g);if(section!==t){section=t;newPage();}else if(g.kind==='其他')newPage();
  const indent=g.kind==='易混淆'?23:g.kind==='同義'?12:0;
  const rows=g.entries.flatMap(e=>[...wrap(e.word+(e.meaning?'  '+e.meaning:''),CW-indent).map(text=>({text,color:ink})),...(e.note?wrap('補充：'+e.note,CW-indent).map(text=>({text,color:blue})):[]),{text:'',color:ink}]);
  const required=rows.length*leading+35;if(required<705)ensure(required);else ensure(70);
  heading(g.title,gi);let top=y;
  for(const r of rows){if(!r.text){y-=5;continue;}if(y-leading<42){if(g.kind==='易混淆')brace(top,y+leading);if(g.kind==='同義')page.drawLine({start:{x:x+2,y:top+10},end:{x:x+2,y:y+leading},thickness:.7,color:ink});nextColumn();heading(g.title+'（續）',gi);top=y;}if(r.text){let dx=x+indent;let run='';let chosen=fontFor(r.text);const flush=()=>{if(run){page.drawText(run,{x:dx,y,size,font:chosen,color:r.color});dx+=chosen.widthOfTextAtSize(run,size);run='';}};for(const c of r.text){const next=supported.has(c.codePointAt(0)!)?fontFor(r.text):phonetic;if(next!==chosen){flush();chosen=next;}run+=c;}flush();}y-=r.text?leading:5;}
  if(g.kind==='易混淆')brace(top,y+leading);
  if(g.kind==='同義')page.drawLine({start:{x:x+2,y:top+10},end:{x:x+2,y:y+leading},thickness:.7,color:ink});y-=9;
 }
 if(!pageNo){section='GRE單字筆記';newPage();}doc.setTitle('GRE單字筆記');return doc.save();
}
export async function downloadVocab(groups:VocabGroup[],status:(s:string)=>void,filename='GRE-單字筆記.pdf'){status('正在產生整份單字 PDF…');const resources=await Promise.all(['/fonts/NotoSansCJKtc-Bold.otf','/fonts/Kalam-Bold.ttf','/fonts/DejaVuSans.ttf'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('字型載入失敗');return new Uint8Array(await r.arrayBuffer());}));const bytes=await createVocabPdf(groups,resources[0],resources[1],filename.includes('收藏')?'GRE 收藏單字集':undefined,resources[2]);const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('整份單字 PDF 已產生，包含最新儲存內容。');}




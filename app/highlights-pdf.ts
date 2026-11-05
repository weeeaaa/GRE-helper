import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {Highlight} from './highlights';
export async function createHighlightsPdf(original:Uint8Array,fontBytes:Uint8Array,items:Highlight[]){
const doc=await PDFDocument.load(original);if(items.length){doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:false});let page=doc.addPage([595.28,841.89]),y=760;const ink=rgb(.17,.20,.21);
function heading(){page.drawText('GRE Note · 重點筆記',{x:40,y:790,font,size:18,color:ink});page.drawText(String(doc.getPageCount()),{x:550,y:24,font,size:9,color:ink});}heading();
function line(s:string,title=false){if(y<50){page=doc.addPage([595.28,841.89]);y=760;heading();}if(title)page.drawRectangle({x:37,y:y-4,width:Math.min(520,font.widthOfTextAtSize(s,11)+10),height:17,color:rgb(1,.9,.79)});page.drawText(s,{x:40,y,font,size:11,color:ink});y-=19;}
for(const [i,n] of items.entries()){for(const [text,title] of [[`${i+1}. ${n.title}`,true],[n.content,false]] as const){for(const raw of text.replace(/\r/g,'').split('\n')){let buf='';for(const c of raw.replace(/\t/g,'    ')){if(font.widthOfTextAtSize(buf+c,11)>510){line(buf,title);buf='';}buf+=c;}line(buf,title);}}y-=14;}}
return doc.save();}
export async function downloadHighlights(status:(s:string)=>void){status('正在匯出完整 GRE Note…');const [base,font,res]=await Promise.all([fetch('/exports/gre-note.pdf'),fetch('/fonts/NotoSansCJKtc-Bold.otf'),fetch('/api/highlights')]);if(!base.ok||!font.ok||!res.ok)throw Error('無法讀取重點筆記，請重試。');const bytes=await createHighlightsPdf(new Uint8Array(await base.arrayBuffer()),new Uint8Array(await font.arrayBuffer()),await res.json() as Highlight[]);const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download='GRE-重點複習.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('完整 GRE Note 已匯出，包含原有內容與已儲存的新重點。');}

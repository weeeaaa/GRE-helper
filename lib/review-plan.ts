export const PLAN_START='2026-10-20';
export type ReviewPlan={start:string;ids:string[]};
export function splitDays(ids:string[]){const size=Math.floor(ids.length/5),extra=ids.length%5;let offset=0;return Array.from({length:5},(_,i)=>{const batch=ids.slice(offset,offset+size+(i<extra?1:0));offset+=batch.length;return batch;});}
export function dayDate(start:string,day:number){const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+day);return d.toISOString().slice(0,10);}

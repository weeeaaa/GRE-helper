import seed from '../data/quiz-seed.json';
import type {Note} from './types';
export type QuizQuestion={prompt:string;passage:string;options:string[];key:string;groups:number};
export function quizQuestion(n:Note):QuizQuestion|null {if(n.reviewQuestion?.trim())return {prompt:n.reviewQuestion,passage:'',options:[],key:n.reviewAnswer?.trim()||'',groups:1};const q=(seed as Record<string,QuizQuestion>)[n.id];return q?{...q,key:n.reviewAnswer?.trim()||q.key}:null;}
export function gradeAnswer(input:string,key:string):boolean|null {if(!key.trim())return null;const normal=(s:string)=>s.normalize('NFKC').trim().toUpperCase();const a=normal(input),k=normal(key);if(/^[A-I]+$/.test(k)){const v=a.replace(/[\s,，、;；]/g,'');return /^[A-I]+$/.test(v)&&v.length===new Set(v).size&&[...v].sort().join('')===[...k].sort().join('');}if(/^-?\d+(\.\d+)?$/.test(k)){const v=a.replace(/^\$/,'').replace(/,/g,'');if(/^-?\d+(\.\d+)?$/.test(v))return Number(v)===Number(k);const f=v.match(/^(-?\d+)\s*\/\s*(\d+)$/);if(f&&Number(f[2]))return Math.abs(Number(f[1])/Number(f[2])-Number(k))<1e-9;return false;}return null;}
export function shuffled<T>(a:T[]){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

export function selectOption(q:QuizQuestion,answer:string,index:number):string {
 const letter=String.fromCharCode(65+index);
 if(index<0||index>=q.options.length)return answer;
 if(q.groups>1){const group=Math.floor(index/3);return [...answer].filter(c=>Math.floor((c.charCodeAt(0)-65)/3)!==group).concat(letter).sort().join('');}
 if(q.options.length===6||q.options.length===3){if(answer.includes(letter))return answer.replace(letter,'');if(q.options.length===6&&answer.length>=2)return answer;return [...answer,letter].sort().join('');}
 return letter;
}
export function answerReady(q:QuizQuestion,answer:string):boolean {
 if(!q.options.length)return !!answer.trim();
 if(q.groups>1)return Array.from({length:q.groups},(_,g)=>[...answer].filter(c=>Math.floor((c.charCodeAt(0)-65)/3)===g).length===1).every(Boolean);
 return q.options.length===6?answer.length===2:answer.length>0;
}

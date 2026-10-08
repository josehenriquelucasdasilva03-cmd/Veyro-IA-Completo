import {photoSettings,editorSettings} from '../media/studio-domain.js';
export const DURATIONS=[5,6,7,8,9,10,12,15,20,25,30];
export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function assert(ok,message,status=400){if(!ok)throw new AppError(message,status);}
export function cleanText(value,max=12000){assert(typeof value==='string'&&value.length<=max,'Texto inválido ou longo demais.');return value.trim();}
export function cleanState(input={}){
 assert(input&&typeof input==='object'&&!Array.isArray(input),'Projeto inválido.');
 const format=input.format??'auto',duration=input.duration??null;
 assert(['auto','vertical','horizontal'].includes(format),'Formato inválido.');
 assert(duration===null||DURATIONS.includes(duration),'Duração inválida.');
 const scenes=input.scenes??[];assert(Array.isArray(scenes)&&scenes.length<=30,'Limite de 30 cenas.');
 const normalized=scenes.map((s,i)=>({id:cleanText(String(s.id??i+1),80),text:cleanText(s.text??''),seconds:Number(s.seconds),locked:s.locked===true}));
 assert(normalized.every(s=>Number.isFinite(s.seconds)&&s.seconds>0),'Cada cena precisa de uma duração positiva.');
 assert(new Set(normalized.map(s=>s.id)).size===normalized.length,'Identificadores de cena repetidos.');
 if(normalized.length)assert(duration!==null&&Math.abs(normalized.reduce((n,s)=>n+s.seconds,0)-duration)<0.05,'O tempo das cenas deve corresponder à duração do projeto.');
 const fileIds=input.fileIds??[];assert(Array.isArray(fileIds)&&fileIds.length<=12&&fileIds.every(x=>typeof x==='string'&&x.length<=80),'Referências inválidas.');
 return {photo:photoSettings(input.photo),editor:editorSettings(input.editor),format,duration,original:cleanText(input.original??''),draft:cleanText(input.draft??''),scenes:normalized,fileIds:[...new Set(fileIds)],review:input.review!==false,visualStyle:cleanText(input.visualStyle??'',1000),characters:cleanText(input.characters??'',4000),constraints:cleanText(input.constraints??'',4000),audio:false};
}
export function memoryCommand(text){const match=text.match(/^(?:lembre(?:-se)?(?: disso)?|guarde(?: isso)?|memorize)\s*:\s*([\s\S]+)$/i);return match?.[1].trim()||null;}
export function validateProposal(output,state){
 assert(output&&typeof output.reply==='string'&&Array.isArray(output.scenes),'A IA retornou uma proposta incompleta.',502);
 assert(output.reply.length<=16000&&output.scenes.length<=30,'A proposta ultrapassou o limite.',502);
 if(output.scenes.length){const candidate=cleanState({...state,scenes:output.scenes});for(const scene of state.scenes.filter(s=>s.locked)){const found=candidate.scenes.find(s=>s.id===scene.id);assert(found&&found.text===scene.text&&found.seconds===scene.seconds&&found.locked,'A proposta alterou uma cena protegida. Revise o pedido.',422);}output.scenes=candidate.scenes;}
 return output;
}
export function planTasks(mode,hasImages){
 const roles=mode==='chat'?['Contexto','Conversa','Verificação']:['Contexto',...(hasImages?['Visão']:[]),'Roteiro e cenas','Verificação'];
 return roles.map((agent,i)=>({task_id:crypto.randomUUID(),agent,objective:agent==='Contexto'?'Recuperar somente este projeto e suas preferências':agent==='Verificação'?'Validar formato, duração e cenas protegidas':'Interpretar o pedido atual',dependencies:i?[i-1]:[],priority:'NORMAL',status:'QUEUED',attempt:0,timeout:45000,output:null,error:null}));
}

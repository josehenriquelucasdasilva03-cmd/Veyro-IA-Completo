import {AppError,assert,cleanText} from '../core/domain.js';
import {createTtsProvider,VOICE_PROFILES} from '../tts/provider.js';

export async function ttsRoute(req,env,path){
 if(path!=='/api/tts/synthesize')return null;
 assert(req.method==='POST','Método não aceito.',405);
 assert(Number(req.headers.get('content-length')||0)<=24000,'O pedido de voz pode ter até 24 KB.',413);
 const raw=await req.text();assert(new TextEncoder().encode(raw).byteLength<=24000,'O pedido de voz pode ter até 24 KB.',413);
 let body;try{body=JSON.parse(raw);}catch{throw new AppError('Pedido de voz inválido.');}
 assert(body&&typeof body==='object'&&!Array.isArray(body),'Pedido de voz inválido.');
 const text=cleanText(body.text,5000);assert(text,'Escreva uma resposta antes de gerar áudio.');
 assert(Object.hasOwn(VOICE_PROFILES,body.profile),'Perfil de voz inválido.');
 const rateAdjustment=body.rateAdjustment??0,pitchAdjustment=body.pitchAdjustment??0;
 assert(Number.isInteger(rateAdjustment)&&rateAdjustment>=-15&&rateAdjustment<=15,'A velocidade deve ficar entre -15% e +15%.');
 assert(Number.isInteger(pitchAdjustment)&&pitchAdjustment>=-6&&pitchAdjustment<=6,'A tonalidade deve ficar entre -6% e +6%.');
 return createTtsProvider(env).synthesize({text,profile:body.profile,rateAdjustment,pitchAdjustment});
}

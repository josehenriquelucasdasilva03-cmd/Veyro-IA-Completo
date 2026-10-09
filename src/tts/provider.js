import {AppError,assert} from '../core/domain.js';

export const VOICE_PROFILES=Object.freeze({
 atlas:{name:'Veyro Atlas',voice:'pt-BR-AntonioNeural',gender:'Masculina',description:'Grave, firme e madura.',rate:-2,pitch:-4},
 neo:{name:'Veyro Neo',voice:'pt-BR-FabioNeural',gender:'Masculina',description:'Clara, leve e ligeiramente aguda.',rate:2,pitch:1},
 luna:{name:'Veyro Luna',voice:'pt-BR-ThalitaNeural',gender:'Feminina',description:'Suave, doce e expressiva.',rate:0,pitch:4},
 iris:{name:'Veyro Iris',voice:'pt-BR-FranciscaNeural',gender:'Feminina',description:'Clara, séria e profissional.',rate:-2,pitch:0},
 rafael:{name:'Veyro Local',voice:'rafael',gender:'Masculina',description:'Voz em português sintetizada localmente pelo Pocket TTS, sem enviar o texto a um serviço externo.',rate:0,pitch:0}
});

const loopbackHost=host=>['localhost','127.0.0.1','::1'].includes(host);
export function pocketTtsBase(env){const base=String(env.POCKET_TTS_BASE_URL||'http://127.0.0.1:8000').replace(/\/+$/,'');try{const url=new URL(base);if(url.protocol==='http:'&&loopbackHost(url.hostname)&&!url.username&&!url.password&&!url.search&&!url.hash)return base;}catch{}return '';}
export function ttsReady(env){const provider=env.TTS_PROVIDER||'azure';if(provider==='pocket')return Boolean(pocketTtsBase(env));const key=env.AZURE_SPEECH_KEY;return provider==='azure'&&typeof key==='string'&&key.length>0&&key.length<=256&&!/[\r\n]/.test(key)&&/^[a-z0-9-]{2,64}$/i.test(env.AZURE_SPEECH_REGION||'');}
const escapeXml=value=>value.replace(/[<>&'\"]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[char]));
const boundedInt=(value,min,max,fallback)=>Number.isInteger(value)?Math.max(min,Math.min(max,value)):fallback;

export class TtsProvider{async synthesize(){throw new AppError('Provedor de voz ainda não implementado.',503);}}

export class AzureSpeechProvider extends TtsProvider{
 constructor(env){super();this.key=env.AZURE_SPEECH_KEY;this.region=String(env.AZURE_SPEECH_REGION||'').toLowerCase();}
 async synthesize({text,profile,rateAdjustment=0,pitchAdjustment=0}){
  assert(ttsReady({TTS_PROVIDER:'azure',AZURE_SPEECH_KEY:this.key,AZURE_SPEECH_REGION:this.region}),'Azure Speech não está configurado. Configure AZURE_SPEECH_KEY e AZURE_SPEECH_REGION no servidor.',503);
  const voice=VOICE_PROFILES[profile];assert(voice&&profile!=='rafael','Escolha uma das quatro vozes neurais do Azure.');
  const rate=Math.max(-20,Math.min(20,voice.rate+boundedInt(rateAdjustment,-15,15,0)));
  const pitch=Math.max(-10,Math.min(10,voice.pitch+boundedInt(pitchAdjustment,-6,6,0)));
  const rateText=`${rate>0?'+':''}${rate}%`,pitchText=`${pitch>0?'+':''}${pitch}%`;
  const ssml=`<speak version="1.0" xml:lang="pt-BR"><voice xml:lang="pt-BR" name="${voice.voice}"><prosody rate="${rateText}" pitch="${pitchText}">${escapeXml(text)}</prosody></voice></speak>`;
  let response;try{response=await fetch(`https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':this.key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3','User-Agent':'Veyro-IA'},body:ssml,signal:AbortSignal.timeout(30000)});}catch{throw new AppError('Azure Speech não respondeu. Confira a conexão, região e configuração do serviço.',503);}
  if(!response.ok){if(response.status===429)throw new AppError('O serviço de voz atingiu o limite temporário. Tente novamente mais tarde.',429);if(response.status===401||response.status===403)throw new AppError('Azure Speech recusou a credencial ou região configurada. Verifique as configurações no servidor.',503);throw new AppError('O serviço de voz não conseguiu gerar o áudio. A resposta em texto continua disponível.',502);}
  const contentType=response.headers.get('content-type')||'';assert(contentType.includes('audio/')||contentType==='application/octet-stream','O serviço de voz retornou um formato inválido.',502);
  const reader=response.body?.getReader();assert(reader,'O serviço de voz retornou áudio vazio.',502);const chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8*1024*1024){await reader.cancel();throw new AppError('O áudio gerado excedeu o limite de 8 MB.',502);}chunks.push(value);}}finally{reader.releaseLock();}assert(size>0,'O serviço de voz retornou áudio vazio.',502);
  return new Response(new Blob(chunks,{type:'audio/mpeg'}),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':String(size)}});
 }
}

export class PocketTtsProvider extends TtsProvider{
 constructor(env){super();this.base=pocketTtsBase(env);}
 async synthesize({text,profile}){
  assert(this.base,'Pocket TTS deve usar um serviço HTTP em loopback no servidor.',503);
  assert(profile==='rafael','A voz Rafael é a única voz portuguesa pronta do Pocket TTS. Escolha Veyro Local.');
  const form=new FormData();form.set('text',text);form.set('voice_url','rafael');let response;
  try{response=await fetch(this.base+'/tts',{method:'POST',body:form,signal:AbortSignal.timeout(120000)});}catch{throw new AppError('Pocket TTS local não respondeu. Inicie o serviço no computador.',503);}
  if(!response.ok)throw new AppError('Pocket TTS não conseguiu sintetizar o áudio local.',502);
  const contentType=(response.headers.get('content-type')||'').toLowerCase();assert(contentType.includes('audio/'),'Pocket TTS retornou um formato inválido.',502);
  const reader=response.body?.getReader();assert(reader,'Pocket TTS retornou áudio vazio.',502);const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8*1024*1024){await reader.cancel();throw new AppError('O áudio gerado excedeu o limite de 8 MB.',502);}chunks.push(value);}}finally{reader.releaseLock();}
  assert(size>0,'Pocket TTS retornou áudio vazio.',502);
  return new Response(new Blob(chunks,{type:'audio/wav'}),{headers:{'Content-Type':'audio/wav','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':String(size)}});
 }
}

export function createTtsProvider(env){const provider=env.TTS_PROVIDER||'azure';if(provider==='azure')return new AzureSpeechProvider(env);if(provider==='pocket')return new PocketTtsProvider(env);throw new AppError('Este provedor de voz não está disponível nesta versão.',503);}

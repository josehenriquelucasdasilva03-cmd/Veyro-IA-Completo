import {AppError,assert} from '../core/domain.js';
import {languages,QwenTranslator} from '../translation/translator.js';
const loopback=raw=>{try{const u=new URL(raw);return u.protocol==='http:'&&['127.0.0.1','localhost','[::1]','::1'].includes(u.hostname);}catch{return false;}};
export async function languageRoute(req,env,path){
 if(path==='/api/translate'&&req.method==='POST'){
  assert(Number(req.headers.get('content-length')||0)<=20000,'Pedido muito grande.',413);const raw=await req.text();assert(raw.length<=20000,'Pedido muito grande.',413);let b;try{b=JSON.parse(raw);}catch{throw new AppError('Pedido inválido.');}assert(b&&typeof b==='object'&&!Array.isArray(b),'Pedido inválido.');
  const result=await new QwenTranslator(env).translate({text:b.text,sourceLanguage:b.sourceLanguage||'auto',targetLanguage:b.targetLanguage});return Response.json(result,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='/api/speech/transcribe'&&req.method==='POST'){
  const base=String(env.SPEECH_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');assert(loopback(base),'O serviço de voz só pode usar um endereço local.',503);assert(typeof env.SPEECH_TOKEN==='string'&&env.SPEECH_TOKEN.length>=32,'O serviço local de voz não está configurado. Execute npm run setup.',503);
  const length=Number(req.headers.get('content-length')||0);assert(length<=15*1024*1024,'O áudio pode ter até 15 MB.',413);
  const form=await req.formData(),file=form.get('file'),language=form.get('language')||'auto';assert(file&&typeof file.arrayBuffer==='function','Selecione um áudio.');assert(file.size>0&&file.size<=15*1024*1024,'O áudio pode ter até 15 MB.',413);assert(/^audio\/(webm|mp4|ogg|wav|mpeg|flac|x-m4a|3gpp)$/.test(file.type.split(';')[0].trim()),'Formato de áudio não aceito. Grave em WebM, MP4, OGG ou WAV.');assert(languages[language],'Idioma de reconhecimento inválido.');
  const upstream=new FormData();upstream.set('file',file,file.name||'recording.webm');upstream.set('language',language);
  let response;try{response=await fetch(base+'/transcribe',{method:'POST',headers:{Authorization:'Bearer '+env.SPEECH_TOKEN},body:upstream,signal:AbortSignal.timeout(180000)});}catch{throw new AppError('Serviço local de reconhecimento indisponível. Inicie o serviço Whisper no notebook.',503);}
  if(!response.ok)throw new AppError(response.status===413?'O áudio passou do limite de duração ou tamanho.':response.status===429?'O serviço de voz já está processando outro áudio.':'Não foi possível transcrever o áudio.',response.status===413?413:response.status===429?429:502);
  const data=await response.json();assert(typeof data.text==='string'&&data.text.length<=12000,'Transcrição inválida.',502);assert(data.text.trim(),'Nenhuma fala foi reconhecida. Tente novamente em um local mais silencioso.',422);return Response.json(data,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 return null;
}

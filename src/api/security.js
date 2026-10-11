import {AppError,assert} from '../core/domain.js';

const costlyPaths = [
  [/^\/api\/conversations\/[^/]+\/messages$/, 'model'],
  [/^\/api\/projects\/[^/]+\/chat$/, 'model'],
  [/^\/api\/research$/, 'model'],
  [/^\/api\/translate$/, 'model'],
  [/^\/api\/tts\/synthesize$/, 'audio'],
  [/^\/api\/projects\/[^/]+\/photo-jobs\/[^/]+\/run$/, 'image'],
  [/^\/api\/projects\/[^/]+\/assets$/, 'upload'],
  [/^\/api\/profile\/avatar$/, 'upload']
];

export function requestBucket(method,path){
  if(method !== 'POST')return null;
  return costlyPaths.find(([pattern])=>pattern.test(path))?.[1]||null;
}

function configLimit(value,fallback){
  if(value === undefined || value === null || value === '')return fallback;
  const n=Number(value);
  assert(Number.isSafeInteger(n) && n>=1 && n<=100000,'Configuração de quota inválida.',503);
  return n;
}

export async function enforceSecurityLimits(req,env,db,user,path){
  const accessMode=env.VEYRO_AUTH_MODE==='cloudflare-access';
  const apiLimiter=env.API_RATE_LIMITER;
  if(accessMode)assert(apiLimiter&&typeof apiLimiter.limit==='function','Limites de proteção não configurados.',503);
  if(apiLimiter){
    const r=await apiLimiter.limit({key:user});
    assert(r?.success===true,'Muitas solicitações. Tente novamente mais tarde.',429);
  }

  const kind=requestBucket(req.method,path);
  if(!kind)return;
  const binding=kind==='upload'?env.UPLOAD_RATE_LIMITER:env.MODEL_RATE_LIMITER;
  if(accessMode)assert(binding&&typeof binding.limit==='function','Limites de proteção não configurados.',503);
  if(binding){
    const r=await binding.limit({key:user+':'+kind});
    assert(r?.success===true,'Limite temporário de uso atingido.',429);
  }
  if(kind==='upload')return;
  const daily=configLimit(env['VEYRO_'+kind.toUpperCase()+'_DAILY_LIMIT'],kind==='model'?80:kind==='image'?30:100);
  const monthly=configLimit(env['VEYRO_'+kind.toUpperCase()+'_MONTHLY_LIMIT'],kind==='model'?1200:kind==='image'?300:1500);
  const now=Date.now(),date=new Date(now).toISOString(),periods=[[date.slice(0,10),daily],[date.slice(0,7),monthly]];
  // Atomic reservations across requests / Cloudflare data centers. Counts calls, not provider tokens or currency.
  for(const [period,limit] of periods){
    const result=await db.run('INSERT INTO security_quotas(user_id,period_key,bucket,used,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(user_id,period_key,bucket) DO UPDATE SET used=security_quotas.used+1,updated_at=excluded.updated_at WHERE security_quotas.used<?',user,period,kind,now,limit);
    assert(result?.meta?.changes===1,'Seu limite de uso foi atingido. Retorne no próximo período.',429);
  }
}

export function logRoute(path){
  if(path.startsWith('/api/projects/'))return '/api/projects/:id';
  if(path.startsWith('/api/conversations/'))return '/api/conversations/:id';
  if(path.startsWith('/api/memory/'))return '/api/memory/:id';
  if(path.startsWith('/api/research/'))return '/api/research/:id';
  if(path.startsWith('/api/'))return '/api/other';
  return '/public';
}

export function secureResponse(response,req){
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','same-origin');
  headers.set('Permissions-Policy','geolocation=(), payment=(), usb=()');
  if(new URL(req.url).protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');
  if(new URL(req.url).pathname.startsWith('/api/'))headers.set('Cache-Control','no-store');
  if(response.status===429&&!headers.has('Retry-After'))headers.set('Retry-After','60');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

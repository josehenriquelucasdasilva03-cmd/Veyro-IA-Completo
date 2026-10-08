import {assert} from '../core/domain.js';
import {withGpuLock} from '../core/gpu-lock.js';

const loopback=new Set(['127.0.0.1','localhost','[::1]']);
function localEndpoint(value){try{const u=new URL(value);return u.protocol==='http:'&&loopback.has(u.hostname)&&!u.username&&!u.password;}catch{return false;}}
export function crewAiConfig(env){const base=String(env.AGENT_BASE_URL||'http://127.0.0.1:8766').replace(/\/$/,'');return {ready:env.VEYRO_AGENTS_ENABLED==='true'&&localEndpoint(base)&&Boolean(env.AGENT_TOKEN&&env.AGENT_TOKEN.length>=32)&&env.MODEL_PROVIDER==='local'&&Boolean(env.MODEL_NAME)&&localEndpoint(String(env.OLLAMA_BASE_URL||'http://127.0.0.1:11434')),base,token:env.AGENT_TOKEN};}
export const crewAiReady=env=>crewAiConfig(env).ready;

export class CrewAiResearchPlanner{
 constructor(env){this.config=crewAiConfig(env);}
 async plan(query,mode,signal){if(!this.config.ready)return null;return withGpuLock(async()=>{let response;try{response=await fetch(this.config.base+'/research/plan',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.config.token},body:JSON.stringify({query,mode}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(80000)]):AbortSignal.timeout(80000)});}catch{return null;}if(!response.ok)return null;let result;try{result=await response.json();}catch{return null;}if(!Array.isArray(result.queries))return null;const queries=result.queries.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,300)).filter(Boolean).slice(0,2);return queries.length?queries:null;});}
}

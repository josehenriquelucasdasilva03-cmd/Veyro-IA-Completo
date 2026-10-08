import test from 'node:test';
import assert from 'node:assert/strict';
import {crewAiConfig,CrewAiResearchPlanner} from '../src/agents/crewai-provider.js';

const configured={VEYRO_AGENTS_ENABLED:'true',AGENT_BASE_URL:'http://127.0.0.1:8766',AGENT_TOKEN:'x'.repeat(48),MODEL_PROVIDER:'local',MODEL_NAME:'qwen3.5:4b',OLLAMA_BASE_URL:'http://127.0.0.1:11434'};

test('CrewAI is opt-in and only accepts a local service with local Ollama',()=>{
 assert.equal(crewAiConfig({...configured,VEYRO_AGENTS_ENABLED:'false'}).ready,false);
 assert.equal(crewAiConfig({...configured,AGENT_BASE_URL:'http://example.org'}).ready,false);
 assert.equal(crewAiConfig({...configured,OLLAMA_BASE_URL:'https://example.org'}).ready,false);
 assert.equal(crewAiConfig(configured).ready,true);
});

test('planner sends the request to the authenticated local agent service and bounds queries',async()=>{
 const old=globalThis.fetch;let request;
 globalThis.fetch=async(url,options)=>{request={url:String(url),options};return Response.json({queries:['  pesquisa precisa  ','fonte oficial','terceira consulta']});};
 try{const result=await new CrewAiResearchPlanner(configured).plan('pergunta','STANDARD');assert.deepEqual(result,['pesquisa precisa','fonte oficial']);assert.equal(request.url,'http://127.0.0.1:8766/research/plan');assert.equal(request.options.headers.Authorization,'Bearer '+'x'.repeat(48));assert.deepEqual(JSON.parse(request.options.body),{query:'pergunta',mode:'STANDARD'});}
 finally{globalThis.fetch=old;}
});

test('planner falls back when local service is unavailable or returns no useful query',async()=>{
 const old=globalThis.fetch;
 try{globalThis.fetch=async()=>new Response('',{status:503});assert.equal(await new CrewAiResearchPlanner(configured).plan('pergunta','DEEP'),null);globalThis.fetch=async()=>Response.json({queries:['  ']});assert.equal(await new CrewAiResearchPlanner(configured).plan('pergunta','DEEP'),null);}
 finally{globalThis.fetch=old;}
});

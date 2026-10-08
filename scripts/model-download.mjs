import {spawn} from 'node:child_process';

const model=String(process.env.MODEL_NAME||'qwen3.5:4b').trim();
if(!/^[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+$/.test(model))throw Error('MODEL_NAME inválido. Use o formato nome:tag, por exemplo qwen3.5:4b.');

console.log(`Baixando ${model} pelo Ollama. O download pode ocupar alguns gigabytes.`);
const child=spawn('ollama',['pull',model],{stdio:'inherit',shell:false});
child.on('error',error=>{
 if(error.code==='ENOENT')console.error('O Ollama não foi encontrado. Instale o Ollama, abra-o e rode npm run model:download novamente.');
 else console.error(`Não foi possível iniciar o Ollama: ${error.message}`);
 process.exitCode=1;
});
child.on('exit',(code,signal)=>{if(signal)process.exitCode=1;else if(code!==0)process.exitCode=code||1;else console.log(`Modelo ${model} baixado. Confira com: ollama list`);});

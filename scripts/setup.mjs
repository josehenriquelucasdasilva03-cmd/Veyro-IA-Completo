import {access,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createLocalStorage} from './local-storage.mjs';

const major=Number(process.versions.node.split('.')[0]);
if(major<24)throw Error(`A Veyro precisa do Node.js 24 ou superior. Versão atual: ${process.versions.node}`);

try{await access('.env',constants.F_OK);console.log('Configuração .env já existe; foi preservada.');}
catch{await copyFile('.env.example','.env');console.log('Configuração local criada a partir de .env.example.');}

let envText=await readFile('.env','utf8'),secretsChanged=false;for(const name of ['SPEECH_TOKEN','WEB_READER_KEY','SEARXNG_SECRET','AGENT_TOKEN']){if(new RegExp('^'+name+'=.{32,}$','m').test(envText))continue;const line=name+'='+randomBytes(32).toString('hex');if(new RegExp('^'+name+'=.*$','m').test(envText))envText=envText.replace(new RegExp('^'+name+'=.*$','m'),line);else envText=envText.trimEnd()+'\n'+line+'\n';secretsChanged=true;}if(secretsChanged){await writeFile('.env',envText,{mode:0o600});console.log('Segredos aleatórios dos serviços locais criados ou completados em .env.');}

await mkdir('.local',{recursive:true});
const store=await createLocalStorage('.local');
store.close();
console.log('Banco local inicializado em .local/veyro.sqlite.');
console.log('Próximos passos: instale Ollama e Python 3.11; rode npm run model:download e instale services/speech/requirements.txt em um ambiente virtual.');
console.log('Depois execute npm run dev e abra http://127.0.0.1:4173.');

import {build} from 'esbuild';
import {readFile,mkdir,rm,copyFile} from 'node:fs/promises';
const entries={
 '/index.html':'src/frontend/index.html',
 '/app.js':'src/frontend/app.js',
 '/studio.js':'src/frontend/components/studio.js',
 '/chat.js':'src/frontend/components/chat.js',
 '/knowledge.js':'src/frontend/components/knowledge.js',
 '/styles.css':'src/frontend/styles/base.css',
 '/cinematic.css':'src/frontend/styles/cinematic.css'
};
const assets={};for(const [url,path]of Object.entries(entries))assets[url]=await readFile(path,'utf8');
assets['/cinematic.webp']={base64:(await readFile('public/assets/cinematic.webp')).toString('base64'),type:'image/webp'};
assets['/veyro-mascots.jpg']={base64:(await readFile('public/assets/veyro-mascots.jpg')).toString('base64'),type:'image/jpeg'};
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['src/api/router.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',define:{__ASSETS__:JSON.stringify(assets)}});
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}
catch(error){if(error.code!=='ENOENT')throw error;console.warn('Manifesto de hospedagem ausente nesta cópia: build local sem identidade de publicação.');}
console.log('Build local concluído. Nenhuma publicação foi realizada.');

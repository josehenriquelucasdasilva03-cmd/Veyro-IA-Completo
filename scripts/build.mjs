import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
const entries={
 '/index.html':'src/frontend/index.html',
 '/app.js':'src/frontend/app.js',
 '/boot-intro.js':'src/frontend/components/boot-intro.js',
 '/qwen-pages.js':'src/frontend/components/qwen-pages.js',
 '/boot-intro.css':'src/frontend/styles/boot-intro.css',
 '/studio.js':'src/frontend/components/studio.js',
 '/chat.js':'src/frontend/components/chat.js',
 '/voice-manager.js':'src/frontend/components/voice-manager.js',
 '/video.js':'src/frontend/components/video.js',
 '/knowledge.js':'src/frontend/components/knowledge.js',
 '/styles.css':'src/frontend/styles/base.css',
 '/cinematic.css':'src/frontend/styles/cinematic.css',
 '/video.css':'src/frontend/styles/video.css',
 '/cosmos.css':'src/frontend/styles/cosmos.css',
 '/planetarium-theme.css':'src/frontend/styles/planetarium-theme.css',
 '/cosmos-loader.js':'src/frontend/components/cosmos-loader.js',
 '/mascot3d-loader.js':'src/frontend/components/mascot3d-loader.js'
};
const assets={};for(const [url,path]of Object.entries(entries))assets[url]=await readFile(path,'utf8');
assets['/cinematic.webp']={base64:(await readFile('public/assets/cinematic.webp')).toString('base64'),type:'image/webp'};
assets['/veyro-mascots.jpg']={base64:(await readFile('public/assets/veyro-mascots.jpg')).toString('base64'),type:'image/jpeg'};
for(const mascot of ['black','blue','green','red']){
 for(const type of ['avatar','card']){
  const file='/veyro-'+mascot+'-'+type+'.webp';
  assets[file]={base64:(await readFile('public/assets'+file)).toString('base64'),type:'image/webp'};
 }
}
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
// Bundle Three.js locally. No external CDN is needed and CSP stays self-only.
const threeBundle=await build({entryPoints:['src/frontend/components/cosmos3d.js'],bundle:true,minify:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const threeScript=threeBundle.outputFiles[0].text;
assets['/cosmos3d.js']=threeScript;
await writeFile('dist/cosmos3d.js',threeScript);
const mascotBundle=await build({entryPoints:['src/frontend/components/mascot3d.js'],bundle:true,minify:true,write:false,format:'esm',platform:'browser',target:'es2022'});
assets['/mascot3d.js']=mascotBundle.outputFiles[0].text;
await writeFile('dist/mascot3d.js',assets['/mascot3d.js']);

await build({entryPoints:['src/api/router.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',define:{__ASSETS__:JSON.stringify(assets)}});
try{await copyFile('.openai/hosting.json','dist/.openai/hosting.json');}
catch(error){if(error.code!=='ENOENT')throw error;console.warn('Manifesto de hospedagem ausente nesta cópia: build local sem identidade de publicação.');}
console.log('Build local concluído. Nenhuma publicação foi realizada.');

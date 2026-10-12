import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Netlify preview serves only the browser UI. The authenticated Worker backend
// needs its own compatible runtime and bindings; this script does not expose it.
const files = [
  ['src/frontend/index.html', 'dist/site/index.html'],
  ['src/frontend/app.js', 'dist/site/app.js'],
  ['src/frontend/components/boot-intro.js', 'dist/site/boot-intro.js'],
  ['src/frontend/components/qwen-pages.js', 'dist/site/qwen-pages.js'],
  ['src/frontend/styles/boot-intro.css', 'dist/site/boot-intro.css'],
  ['src/frontend/components/studio.js', 'dist/site/studio.js'],
  ['src/frontend/components/chat.js', 'dist/site/chat.js'],
  ['src/frontend/components/voice-manager.js', 'dist/site/voice-manager.js'],
  ['src/frontend/components/video.js', 'dist/site/video.js'],
  ['src/frontend/components/knowledge.js', 'dist/site/knowledge.js'],
  ['src/frontend/styles/base.css', 'dist/site/styles.css'],
  ['src/frontend/styles/cinematic.css', 'dist/site/cinematic.css'],
  ['src/frontend/styles/video.css', 'dist/site/video.css'],
  ['src/frontend/styles/cosmos.css', 'dist/site/cosmos.css'],
  ['src/frontend/styles/planetarium-theme.css', 'dist/site/planetarium-theme.css'],
  ['src/frontend/components/cosmos-loader.js', 'dist/site/cosmos-loader.js'],
  ['dist/cosmos3d.js', 'dist/site/cosmos3d.js'],
  ['dist/mascot3d.js', 'dist/site/mascot3d.js'],
  ['src/frontend/components/mascot-ui.js', 'dist/site/mascot-ui.js'],
  ['src/frontend/styles/mascot.css', 'dist/site/mascot.css'],
  ['public/assets/cinematic.webp', 'dist/site/cinematic.webp'],
  ['public/assets/veyro-mascots.jpg', 'dist/site/veyro-mascots.jpg'],
  ...['black','blue','green','red'].flatMap(mascot=>['avatar','card'].map(type=>[
   'public/assets/veyro-'+mascot+'-'+type+'.webp',
   'dist/site/veyro-'+mascot+'-'+type+'.webp'
  ])),
];

await rm('dist/site', { recursive: true, force: true });
for (const [source, target] of files) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

// Static hosts do not have Cloudflare Worker bindings, databases or Qwen.
 // Explicitly mark this browser-only preview; the protected Worker HTML is unchanged.
const html = await readFile('dist/site/index.html', 'utf8');
const marked = html.replace('<head>', '<head>\n  <meta name="veyro-static-preview" content="true">');
if (marked === html) throw new Error('Cabeçalho HTML ausente: marcador da prévia não foi inserido.');
await writeFile('dist/site/index.html', marked);
const index = marked;
if (!index.includes('<title>Veyro IA</title>')) {
  throw new Error('O build do Netlify não encontrou o index.html oficial da Veyro IA.');
}
console.log('Prévia estática do Netlify preparada em dist/site.');

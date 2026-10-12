import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

// Netlify preview serves only the browser UI. The authenticated Worker backend
// needs its own compatible runtime and bindings; this script does not expose it.
const files = [
  ['src/frontend/index.html', 'dist/site/index.html'],
  ['src/frontend/auth-flow.js', 'dist/site/auth-flow.js'],
  ['src/frontend/app.js', 'dist/site/app.js'],
  ['src/frontend/components/studio.js', 'dist/site/studio.js'],
  ['src/frontend/components/chat.js', 'dist/site/chat.js'],
  ['src/frontend/components/video.js', 'dist/site/video.js'],
  ['src/frontend/components/knowledge.js', 'dist/site/knowledge.js'],
  ['src/frontend/styles/base.css', 'dist/site/styles.css'],
  ['src/frontend/styles/cinematic.css', 'dist/site/cinematic.css'],
  ['src/frontend/styles/video.css', 'dist/site/video.css'],
  ['src/frontend/styles/cosmos.css', 'dist/site/cosmos.css'],
  ['src/frontend/components/cosmos-loader.js', 'dist/site/cosmos-loader.js'],
  ['dist/cosmos3d.js', 'dist/site/cosmos3d.js'],
  ['public/assets/cinematic.webp', 'dist/site/cinematic.webp'],
  ['public/assets/veyro-mascots.jpg', 'dist/site/veyro-mascots.jpg'],
];

await rm('dist/site', { recursive: true, force: true });
for (const [source, target] of files) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

const index = await readFile('dist/site/index.html', 'utf8');
if (!index.includes('<title>Veyro IA</title>')) {
  throw new Error('O build do Netlify não encontrou o index.html oficial da Veyro IA.');
}
console.log('Prévia estática do Netlify preparada em dist/site.');

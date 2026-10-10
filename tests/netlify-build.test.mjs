import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('build do Netlify publica a página inicial e todos os arquivos referenciados', async () => {
  await import('../scripts/build-netlify.mjs');

  const required = [
    'dist/site/index.html', 'dist/site/app.js', 'dist/site/studio.js',
    'dist/site/chat.js', 'dist/site/knowledge.js', 'dist/site/styles.css',
    'dist/site/cinematic.css', 'dist/site/cinematic.webp', 'dist/site/veyro-mascots.jpg',
  ];
  for (const file of required) await access(file);

  const html = await readFile('dist/site/index.html', 'utf8');
  assert.match(html, /<title>Veyro IA<\/title>/);
  assert.match(html, /src="app\.js"/);
  assert.match(html, /href="styles\.css"/);
});

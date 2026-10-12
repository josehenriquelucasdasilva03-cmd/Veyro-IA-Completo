import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const css=readFileSync('src/frontend/styles/cinematic.css','utf8');
const build=readFileSync('scripts/build-netlify.mjs','utf8');
const worker=readFileSync('scripts/build.mjs','utf8');
test('mascot sprite uses a relative asset path for GitHub Pages project subdirectory',()=>{
 assert.match(css,/\.mascot-portrait\{[^\n]*background-image:url\('\.\/veyro-mascots\.jpg'\)/);
 assert.doesNotMatch(css,/url\(['"]?\/veyro-mascots\.jpg/);
 const projectSite=new URL('./veyro-mascots.jpg','https://example.github.io/Veyro-IA-Completo/cinematic.css');
 assert.equal(projectSite.pathname,'/Veyro-IA-Completo/veyro-mascots.jpg');
});
test('sprite is bundled for Cloudflare and copied to static Netlify or Pages',()=>{
 assert.ok(existsSync('public/assets/veyro-mascots.jpg'));
 assert.match(build,/\['public\/assets\/veyro-mascots\.jpg', 'dist\/site\/veyro-mascots\.jpg'\]/);
 assert.match(worker,/assets\['\/veyro-mascots\.jpg'\]/);
});
test('all four mascot slots share the fixed sprite and remain selectable',()=>{
 for(const id of ['blue','green','prime'])assert.ok(css.includes('[data-mascot='+id+']'));
 const html=readFileSync('src/frontend/index.html','utf8');
 for(const id of ['black','blue','green','prime'])assert.ok(html.includes('data-mascot-choice="'+id+'"'));
});

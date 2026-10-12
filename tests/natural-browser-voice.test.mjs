import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('src/frontend/components/voice-manager.js','utf8');
function init(voices){
 const window={speechSynthesis:{getVoices:()=>voices,cancel(){},pause(){},resume(){},speak(){}},SpeechSynthesisUtterance:function Speech(text){this.text=text;}};
 vm.runInNewContext(code,{window});return window.VeyroVoice;
}
test('browser voice ranking prefers natural/PT-BR and never uses a different language',()=>{
 const engine=init([
 {name:'Basic Português',lang:'pt-BR',localService:true},
 {name:'Microsoft Maria Neural',lang:'pt-BR',localService:false},
 {name:'Sofia US Natural',lang:'en-US',localService:false},
 {name:'PT Portugal',lang:'pt-PT',localService:true}
 ]);
 assert.equal(engine.voicesForLocale('pt-BR')[0].name,'Microsoft Maria Neural');
 assert.ok(engine.voicesForLocale('pt-BR').every(v=>v.lang.startsWith('pt')));
 assert.equal(engine.voicesForLocale('en-US')[0].name,'Sofia US Natural');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('src/frontend/components/voice-manager.js','utf8');
function engine(){
 const played=[],synth={getVoices(){return [{name:'Português',lang:'pt-BR'},{name:'English',lang:'en-US'}];},speak(utterance){played.push(utterance);utterance.onstart?.();},cancel(){},pause(){},resume(){}};
 function Utterance(text){this.text=text;}
 const window={speechSynthesis:synth,SpeechSynthesisUtterance:Utterance};
 vm.runInNewContext(code,{window}, {timeout:2000});
 return {engine:window.VeyroVoice,played};
}
test('Web Speech engine runs without network calls or secrets',()=>{
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.doesNotMatch(code,/fetch\(|localStorage|Bearer |api\/chat\/qwen/);
 const {engine:e}=engine();
 assert.equal(e.supported(),true);assert.equal(e.voices().length,2);
});
test('streaming Qwen response is split on sentence boundaries, no word duplication',()=>{
 const {engine:e,played}=engine();
 const statuses=[];
 assert.equal(e.startStream({lang:'pt-BR',onState:s=>statuses.push(s)}),true);
 e.pushToken('Olá. ');
 assert.equal(played.length,0); // Short segment will wait for a meaningful phrase.
 e.pushToken('Eu posso ajudar com suas dúvidas. ');
 assert.equal(played.length,1);
 assert.match(played[0].text,/Olá\./);
 played[0].onend();
 e.finish();
 assert.ok(statuses.includes('playing'));
 assert.ok(played.length>=2);
 for(let i=1;i<played.length;i++)played[i].onend();
 assert.equal(e.status(),'ended');
});
test('stop interrupts queued speech and newer messages start independently',()=>{
 const {engine:e,played}=engine();e.startText('Primeira mensagem muito grande. Ela deve ser interrompida.');assert.ok(played.length>0);
 e.stop();assert.equal(e.status(),'idle');
 e.startText('Nova mensagem de teste.');
 assert.ok(played.at(-1).text.includes('Nova mensagem'));
});
test('locale auto detection supports three common languages',()=>{
 const {engine:e}=engine();assert.equal(e.detectLanguage('Olá você está comigo e não sabe?','auto'),'pt-BR');
 assert.equal(e.detectLanguage('Hello you are the best, thanks!','auto'),'en-US');
 assert.equal(e.detectLanguage('Hola gracias, quiero hablar contigo también.','auto'),'es-ES');
});

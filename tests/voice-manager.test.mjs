import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('src/frontend/components/voice-manager.js','utf8');
function engine(voices=[{name:'Português',lang:'pt-BR'},{name:'English',lang:'en-US'}]){
 const played=[],synth={getVoices(){return voices;},speak(utterance){played.push(utterance);utterance.onstart?.();},cancel(){},pause(){},resume(){}};
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
test('automatic voice prefers Brazilian natural voices and ignores a saved foreign voice',()=>{
 const {engine:e,played}=engine([{name:'Local',lang:'pt-BR'},{name:'Natural Portugal',lang:'pt-PT'},{name:'Francisca Online Natural',lang:'pt-BR'},{name:'English Natural',lang:'en-US'}]);
 e.startText('Vamos conversar com uma voz natural.',{lang:'pt-BR',voiceName:'English Natural'});
 assert.equal(played[0].voice.name,'Francisca Online Natural');
 e.startText('Respeite minha escolha de voz.',{lang:'pt-BR',voiceName:'Local'});
 assert.equal(played.at(-1).voice.name,'Local');
});
test('word boundaries follow the active audio only and ignore cancelled sessions',()=>{
 const {engine:e,played}=engine(),boundaries=[];
 e.startText('Esta é uma apresentação natural.',{onBoundary:b=>boundaries.push(b)});
 const first=played[0];first.onboundary({name:'word',charIndex:0,charLength:4});
 assert.equal(boundaries.length,1);assert.equal(boundaries[0].text,first.text);
 e.pause();first.onboundary({name:'word',charIndex:5});assert.equal(boundaries.length,1);
 e.stop();first.onboundary({name:'word',charIndex:8});assert.equal(boundaries.length,1);
});
test('streaming keeps word joins and decimal punctuation intact',()=>{
 const {engine:e,played}=engine();e.startStream();
 for(const token of ['O valor é 3',',5 e a palavra é natu','ral. Vamos continuar com calma.'])e.pushToken(token);
 e.finish();
 while(e.status()!=='ended')played.at(-1).onend();
 assert.equal(played.map(u=>u.text).join(' '),'O valor é 3,5 e a palavra é natural. Vamos continuar com calma.');
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
 assert.equal(played.map(item=>item.text).join(' ').replace(/\\s+/g,' ').trim(),'Olá. Eu posso ajudar com suas dúvidas.');
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

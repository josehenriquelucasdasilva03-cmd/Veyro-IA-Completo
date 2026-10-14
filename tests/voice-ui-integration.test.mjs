import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('Qwen streaming tokens feed local speech alongside text, and session stops on error',()=>{
 const app=read('src/frontend/app.js');
 assert.match(app,/const speechStreaming=startQwenSpeech\(reply\.id\)/);
 assert.match(app,/if\(speechStreaming\)feedQwenSpeech\(piece\)/);
 assert.match(app,/if\(speechStreaming\)finishQwenSpeech\(\)/);
 assert.match(app,/\}catch\(error\)\{\s*stopSpeech\(\);/);
});
test('local voice works without native Worker TTS and preserves server fallback',()=>{
 const chat=read('src/frontend/components/chat.js');
 assert.match(chat,/if\(QWEN_PAGES\|\|!state\.tts\)return localSpeech\(clean/);
 assert.match(chat,/if\(window\.VeyroVoice\?\.supported\(\)\)localSpeech/);
 assert.match(chat,/function localSpeech\(/);
 assert.match(chat,/function startQwenSpeech\(/);
 assert.match(chat,/window\.VeyroVoice\?\.stop\(\)/);
 assert.match(chat,/window\.VeyroVoice\?\.pause\(\)/);
 assert.match(chat,/window\.VeyroVoice\?\.resume\(\)/);
});
test('mascot-specific voices, settings button, local microphone and low-motion fallback',()=>{
 const chat=read('src/frontend/components/chat.js'),html=read('src/frontend/index.html'),css=read('src/frontend/styles/cinematic.css');
 assert.match(chat,/MASCOT_VOICE_DEFAULTS=\{black:'atlas',blue:'neo',green:'luna',red:'iris'\}/);
 assert.match(html,/id="mascot-voice-settings"/);
 assert.match(chat,/function localVoiceSettings\(/);
 assert.match(chat,/recognizer\.start\(\)/);
 assert.match(css,/data-voice-performance=economico/);
 assert.match(css,/@keyframes veyro-mouth-wave/);
});

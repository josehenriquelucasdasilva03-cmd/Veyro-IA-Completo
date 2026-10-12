'use strict';
const $=id=>document.getElementById(id), DURATIONS=[5,6,7,8,9,10,12,15,20,25,30];
const labels={horizontal:'Horizontal · 16:9',vertical:'Vertical · 9:16',auto:'Automático'};
// Only static builds set this meta tag. The authenticated Cloudflare Worker never does.
const IS_STATIC_PREVIEW=Boolean(document.querySelector('meta[name="veyro-static-preview"]'));
const QWEN_PAGES=IS_STATIC_PREVIEW&&Boolean(window.VeyroQwenPages?.enabled);
const state={id:null,revision:0,title:'Novo projeto',step:'chat',mode:'chat',format:'auto',duration:null,original:'',draft:'',scenes:[],files:[],messages:[],memories:[],versions:[],runs:[],review:true,visualStyle:'',characters:'',constraints:'',photo:{},editor:{},allAssets:[],photoJobs:[],images:false,dirty:false,busy:false,chat:false,tts:false,ttsProvider:'azure'};
let autosave,savePromise=null,changeNumber=0;
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,fn,cls='text-button'){const b=el('button',text,cls);b.type='button';b.onclick=()=>handle(fn);return b;}
async function handle(fn){try{return await fn();}catch(e){feedback(e.message,true);if($('panel').open){let error=$('panel-error');if(!error){error=el('p',undefined,'error');error.id='panel-error';error.setAttribute('role','alert');$('panel-body').prepend(error);}error.textContent=e.message;}}}
function feedback(text,error=false){$('feedback').textContent=text|| (state.chat?'IA conectada · revise as propostas antes de aplicar':'IA ainda não conectada · você pode salvar e editar');$('feedback').classList.toggle('error',error);}
function sendPreviewMessage(text){
 if(!text.trim())throw Error('Digite uma mensagem para testar o chat.');
 const now=Date.now();
 state.chatMessages.push({id:crypto.randomUUID(),role:'user',text,status:'COMPLETE',created_at:now});
 if(!state.chatMessages.some(m=>m.role==='notice')){
  state.chatMessages.push({id:crypto.randomUUID(),role:'notice',text:'Prévia de interface: sua mensagem aparece apenas nesta aba. Nada foi enviado à IA, e nenhuma resposta foi gerada.',status:'COMPLETE',created_at:now+1});
 }
 $('prompt').value='';
 state.chatDraft='';
 chatDraftDirty=false;
 renderChatMessages();
 resizeText();
 feedback('Mensagem exibida nesta aba. Backend e Qwen ainda não conectados; isto não é envio real.');
}
let savedConversations=[],savedMemories=[],selectedSavedConversation=null,historyAvailable=false;
function cleanHistoryOnLogout(){
 savedConversations=[];savedMemories=[];selectedSavedConversation=null;historyAvailable=false;
 $('recent-conversations').replaceChildren();
 const memoryButton=$('veyro-qwen-memory-nav');
 if(memoryButton)memoryButton.disabled=true;
 $('memories-open').disabled=true;
}
async function refreshSavedConversations(){
 const r=await window.VeyroQwenPages.history('/api/history/conversations');
 savedConversations=r.conversations||[];
 const root=$('recent-conversations');
 root.replaceChildren();
 for(const item of savedConversations){
  const line=el('div',undefined,'veyro-history-row');
  const choice=el('button',item.title||'Nova conversa','veyro-history-choice');
  choice.type='button';
  choice.setAttribute('aria-current',String(item.id===selectedSavedConversation));
  choice.onclick=()=>handle(async()=>{await activateSavedConversation(item.id);closeSidebar();});
  const remove=el('button','×','veyro-history-delete');
  remove.type='button';
  remove.setAttribute('aria-label','Excluir conversa '+item.title);
  remove.onclick=()=>handle(async()=>{
   if(!confirm('Excluir esta conversa e todas as mensagens salvas?'))return;
   await window.VeyroQwenPages.history('/api/history/conversations/'+item.id,{method:'DELETE'});
   if(selectedSavedConversation===item.id){selectedSavedConversation=null;state.chatMessages=[];renderChatMessages();}
   await refreshSavedConversations();
   if(!selectedSavedConversation)await createSavedConversation();
  });
  line.append(choice,remove);
  root.append(line);
 }
}
async function activateSavedConversation(id){
 const data=await window.VeyroQwenPages.history('/api/history/conversations/'+id);
 selectedSavedConversation=id;
 state.chatMessages=(data.messages||[]).map(m=>({
  id:m.id,role:m.role,text:m.text,status:'COMPLETE',created_at:m.createdAt
 }));
 state.chatDraft='';chatDraftDirty=false;$('prompt').value='';
 renderChatMessages();resizeText();
 for(const choice of document.querySelectorAll('.veyro-history-choice'))choice.setAttribute('aria-current',String(choice.textContent===(data.conversation?.title||'Nova conversa')));
 $('save-status').textContent='Histórico salvo na sua conta Veyro';
}
async function createSavedConversation(){
 const r=await window.VeyroQwenPages.history('/api/history/conversations',{method:'POST',body:'{}'});
 await refreshSavedConversations();
 await activateSavedConversation(r.conversation.id);
 feedback('Nova conversa criada. Histórico vinculado à sua conta.');
}
function showSavedMemories(){
 const root=openPanel('Memórias do Veyro IA');
 root.append(el('p','Você decide o que a IA deve lembrar. As notas ficam na sua conta e podem ajudar nas próximas conversas. Não salve senhas ou dados sensíveis.','review-help'));
 const input=el('textarea');input.rows=3;input.maxLength=320;
 input.placeholder='Ex.: Prefiro respostas detalhadas em português.';
 input.setAttribute('aria-label','Nova memória');
 const count=el('small','Até 30 memórias de 320 caracteres.');
 const entries=el('div',undefined,'veyro-memory-list');
 function render(){
  entries.replaceChildren();
  for(const m of savedMemories){
   const line=el('div',undefined,'veyro-memory-entry');
   line.append(el('p',m.text),button('Excluir',async()=>{
    await window.VeyroQwenPages.history('/api/history/memories/'+m.id,{method:'DELETE'});
    savedMemories=savedMemories.filter(x=>x.id!==m.id);render();
   },'small-button'));
   entries.append(line);
  }
  if(!entries.children.length)entries.append(el('p','Nenhuma memória salva.'));
 }
 const save=button('Guardar memória',async()=>{
  const text=input.value.trim();
  if(!text)throw Error('Escreva uma informação para a Veyro lembrar.');
  const result=await window.VeyroQwenPages.history('/api/history/memories',{method:'POST',body:JSON.stringify({text})});
  savedMemories.unshift(result.memory);input.value='';render();
  feedback('Memória salva na sua conta Veyro.');
 },'text-button');
 root.append(input,count,save,entries);
 render();
}
async function restoreSavedVeyro(){
 const bridge=window.VeyroQwenPages;
 const [conversations,memories]=await Promise.all([
  bridge.history('/api/history/conversations'),
  bridge.history('/api/history/memories')
 ]);
 savedMemories=memories.memories||[];
 savedConversations=conversations.conversations||[];
 historyAvailable=true;
 if(savedConversations.length){await refreshSavedConversations();await activateSavedConversation(savedConversations[0].id);}
 else await createSavedConversation();
 const memoryButton=$('veyro-qwen-memory-nav');
 if(memoryButton)memoryButton.disabled=false;
 const memoriesTool=$('memories-open');
 if(memoriesTool){memoriesTool.disabled=false;memoriesTool.onclick=()=>handle(showSavedMemories);}
 $('new-chat').onclick=()=>handle(async()=>{await createSavedConversation();closeSidebar();$('prompt').focus();});
 $('save-status').textContent='Histórico e memórias salvos na sua conta';
}
let qwenGateVisible=false;
function lockQwenChat(locked){
 for(const selector of ['.screen','#sidebar','#sidebar-overlay']){
  const node=document.querySelector(selector);
  if(node)node.inert=locked;
 }
 document.body.classList.toggle('veyro-qwen-locked',locked);
}
function showQwenGate(){
 if(!QWEN_PAGES||window.VeyroQwenPages.connected())return;
 qwenGateVisible=true;
 lockQwenChat(true);
 // Do not put login over the cinematic intro.
 if(document.body.dataset.veyroIntroFinished!=='1')return;
 const gate=$('veyro-qwen-gate');
 gate.hidden=false;
 const submit=$('veyro-qwen-login-submit');
 submit.disabled=false;
 $('veyro-qwen-username').focus({preventScroll:true});
}
function hideQwenGate(){
 qwenGateVisible=false;
 $('veyro-qwen-gate').hidden=true;
 $('veyro-qwen-auth-message').textContent='';
 lockQwenChat(false);
}
function setupQwenLogin(){
 if(!QWEN_PAGES)return;
 const bridge=window.VeyroQwenPages;
 const form=$('veyro-qwen-login-form'),submit=$('veyro-qwen-login-submit');
 const username=$('veyro-qwen-username'),password=$('veyro-qwen-password'),message=$('veyro-qwen-auth-message');
 const sidebarBottom=$('sidebar').querySelector('.sidebar-bottom');
 const signout=el('button','Sair da conta','veyro-qwen-logout');
 signout.type='button';
 signout.hidden=true;
 signout.onclick=()=>handle(async()=>{
  if(state.busy)return;
  signout.disabled=true;
  try{await bridge.logout();}
  finally{
   signout.disabled=false;signout.hidden=true;
   cleanHistoryOnLogout();
   state.chatMessages=[];state.chatDraft='';chatDraftDirty=false;
   $('prompt').value='';
   renderChatMessages();
   $('veyro-qwen-password').value='';
   $('veyro-qwen-auth-message').textContent='';
   closeSidebar();
   feedback('Sessão encerrada. Entre novamente para conversar com Qwen.');
   showQwenGate();
  }
 });
 sidebarBottom?.append(signout);
 const memoryButton=el('button','Memórias','veyro-qwen-memory-nav');
 memoryButton.type='button';memoryButton.disabled=true;
 memoryButton.onclick=()=>handle(()=>{showSavedMemories();closeSidebar();});
 $('sidebar').querySelector('.sidebar-nav')?.append(memoryButton);
 document.addEventListener('veyro:intro-finished',()=>{
  if(qwenGateVisible)showQwenGate();
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!qwenGateVisible||submit.disabled)return;
  submit.disabled=true;
  message.textContent='Conectando sua conta ao Qwen…';
  try{
   const status=await bridge.login(username.value.trim().toLowerCase(),password.value);
   if(!status.enabled){
    await bridge.logout();
    throw Error('Conta autenticada, mas o Qwen está indisponível no momento. Tente mais tarde.');
   }
   hideQwenGate();
   signout.hidden=false;
   try{
    await restoreSavedVeyro();
    feedback('Qwen conectado · histórico e memória carregados.');
   }catch(historyError){
    historyAvailable=false;
    feedback('Qwen conectado, porém histórico indisponível: '+historyError.message,true);
    $('save-status').textContent='Histórico indisponível · conversa não será salva';
    if(!bridge.connected()){signout.hidden=true;showQwenGate();}
   }
   $('prompt').focus({preventScroll:true});
  }catch(error){
   message.textContent=error.message||'Não foi possível entrar. Confira seus dados e tente novamente.';
  }finally{password.value='';submit.disabled=false;}
 });
 showQwenGate();
}
async function sendGithubQwen(text){
 if(!text.trim())throw Error('Digite uma mensagem para enviar.');
 const bridge=window.VeyroQwenPages;
 if(!bridge.connected()){
  showQwenGate();
  feedback('Faça login para enviar sua mensagem ao Qwen.');
  return;
 }
 if(text.length>600)throw Error('O Qwen aceita até 600 caracteres por mensagem.');
 const earlier=state.chatMessages.filter(m=>['user','assistant'].includes(m.role)&&m.status==='COMPLETE'&&m.text).slice(-3).map(m=>({role:m.role,content:m.text.slice(0,360)}));
 const approvedMemories=savedMemories.slice(0,4).map(m=>m.text.replace(/\s+/g,' ').trim()).filter(Boolean).join(' | ').slice(0,285);
 const prior=approvedMemories?[{role:'user',content:'Preferências que salvei: '+approvedMemories},...earlier]:earlier;
 const now=Date.now(),user={id:crypto.randomUUID(),role:'user',text,status:'COMPLETE',created_at:now};
 const reply={id:crypto.randomUUID(),role:'assistant',text:'',status:'RUNNING',created_at:now+1};
 state.chatMessages.push(user,reply);renderChatMessages();busy(true);feedback('Aguardando resposta do Qwen…');
 try{
  await bridge.send(text,prior,piece=>{reply.text+=piece;renderChatMessages();});
  reply.status='COMPLETE';$('prompt').value='';state.chatDraft='';chatDraftDirty=false;
  if(historyAvailable&&selectedSavedConversation){
   try{
    await bridge.history('/api/history/conversations/'+selectedSavedConversation+'/turns',{
     method:'POST',body:JSON.stringify({message:text,answer:reply.text,messageId:user.id,answerId:reply.id})
    });
    await refreshSavedConversations();
    $('save-status').textContent='Conversa salva na sua conta Veyro';
    feedback('Resposta recebida e histórico salvo.');
   }catch(storageError){
    feedback('Resposta recebida, mas não foi possível salvar o histórico: '+storageError.message,true);
   }
  }else feedback('Resposta recebida, mas o histórico não está disponível nesta sessão.',true);
 }catch(error){
  state.chatMessages=state.chatMessages.filter(m=>m!==reply);
  state.chatMessages.push({id:crypto.randomUUID(),role:'notice',text:'Envio não concluído: '+(error.message||'falha no backend')+'. Confira a sessão e tente novamente.',status:'COMPLETE',created_at:Date.now()+1});
  feedback(error.message||'Envio não concluído.',true);
  if(!bridge.connected()){
   cleanHistoryOnLogout();
   const signout=document.querySelector('.veyro-qwen-logout');
   if(signout)signout.hidden=true;
   showQwenGate();
  }
 }finally{busy(false);renderChatMessages();resizeText();}
}
function startStaticPreview(){
 state.mode='chat';
 state.chatMessages=[];
 state.chatDraft='';
 $('prompt').value='';
 setStep('chat');
 modeButtons();
 $('chat-view').hidden=false;
 $('empty').hidden=true;
 $('review').hidden=true;
 $('result').hidden=true;
 $('photo-view').hidden=true;
 $('editor-view').hidden=true;
 $('save-status').textContent='Prévia local · sem salvamento no servidor';
 if(!QWEN_PAGES){
  const banner=el('div','PRÉVIA DO CHAT: teste o botão de enviar. As mensagens ficam apenas nesta aba e NÃO são enviadas ao Qwen.','veyro-preview-banner');
  banner.setAttribute('role','status');
  $('composer').before(banner);
 }
 for(const id of ['nav-images','nav-videos','nav-agents','photo-mode','editor-mode','create-mode','projects-open','memories-open','versions-open','activity-open','save','add','voice-input','translate-input','profile-open']){
  const node=$(id);if(node){node.disabled=true;node.title='Indisponível na prévia estática; precisa do backend autenticado.';}
 }
 $('project-title').disabled=true;
 $('new-chat').onclick=()=>{
  state.chatMessages=[];
  state.chatDraft='';
  chatDraftDirty=false;
  $('prompt').value='';
  renderChatMessages();
  feedback('Nova conversa de teste aberta. Nenhum dado foi enviado ou salvo no servidor.');
  $('prompt').focus();
 };
 renderChatMessages();
 if(QWEN_PAGES)setupQwenLogin();
 else feedback('Prévia de interface. Envie uma mensagem para testá-la visualmente, sem conexão com a IA.');
}
function showLoginGate(){const gate=$('auth-gate');if(gate)gate.hidden=false;}
function isCloudflareAccessRedirect(response){
 if(!response.redirected)return false;
 try{const u=new URL(response.url,location.href);return u.hostname.endsWith('.cloudflareaccess.com')||u.pathname.startsWith('/cdn-cgi/access/');}
 catch{return false;}
}
async function api(path,options={}){
 const headers={'X-Veyro-Request':'1',...options.headers};
 if(options.body&&!(options.body instanceof FormData)){headers['Content-Type']='application/json';options.body=JSON.stringify(options.body);}
 let response;
 try{response=await fetch('/api/'+path,{...options,headers});}
 catch{throw Error('API inacessível. Verifique a rede e o Worker de teste; prévias estáticas não oferecem login nem chat real.');}
 if(response.status===401||isCloudflareAccessRedirect(response)){showLoginGate();throw Error('Sua sessão expirou. Reabra a página protegida para entrar.');}
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.includes('application/json'))throw Error('O endereço atual não está entregando a API do Veyro IA. Prévia estática não autentica usuários.');
 const data=await response.json().catch(()=>{throw Error('O servidor retornou JSON inválido.');});
 if(!response.ok)throw Error(data.error||'Não foi possível concluir.');
 return data;
}
const route=action=>'projects/'+state.id+(action?'/'+action:'');
function payload(){return {format:state.format,duration:state.duration,original:state.mode==='create'&&state.step!=='review'?$('prompt').value:state.original,draft:state.mode==='create'&&state.step==='review'?$('prompt').value:state.draft,scenes:state.scenes,fileIds:state.files.map(f=>f.id),review:$('review-toggle').checked,visualStyle:state.visualStyle,characters:state.characters,constraints:state.constraints,photo:{...state.photo,prompt:state.mode==='photo'?$('prompt').value:state.photo.prompt},editor:{...state.editor,request:state.mode==='editor'?$('prompt').value:state.editor.request}};}
function changed(){state.dirty=true;changeNumber++;$('save-status').textContent='Alterações na tela';clearTimeout(autosave);autosave=setTimeout(()=>handle(()=>save()),1200);}
async function save(){clearTimeout(autosave);if(savePromise){await savePromise;if(state.dirty)return save();return;}if(!state.id||!state.dirty)return;
 const count=changeNumber,pid=state.id,data=payload();$('save-status').textContent='Salvando…';
 savePromise=(async()=>{try{const result=await api('projects/'+pid,{method:'PUT',body:{state:data,title:$('project-title').value.trim()||'Novo projeto',revision:state.revision}});if(state.id===pid){state.revision=result.revision;state.title=$('project-title').value;state.original=data.original;state.draft=data.draft;if(count===changeNumber){state.photo=data.photo;state.editor=data.editor;}state.dirty=count!==changeNumber;$('save-status').textContent=state.dirty?'Alterações na tela':'Salvo na sua conta';}}catch(e){$('save-status').textContent='Não salvo · tente novamente';throw e;}finally{savePromise=null;}})();await savePromise;if(state.dirty)return save();}
function resizeText(){const t=$('prompt');t.style.height='auto';t.style.height=t.scrollHeight+'px';}
function updateViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',(v?v.height:innerHeight)+'px');document.documentElement.style.setProperty('--viewport-top',(v?v.offsetTop:0)+'px');resizeText();}
function media(a,controls=false){const m=el(a.mime.startsWith('video/')?'video':'img');m.src='/api/projects/'+state.id+'/assets/'+a.id;if(m.tagName==='VIDEO'){m.muted=true;m.playsInline=true;m.preload='metadata';m.controls=controls;}else m.alt=a.name;return m;}
function setStep(step){if(state.mode==='photo'||state.mode==='editor'){studioComposer();resizeText();return;}state.step=step;const chat=state.mode==='chat',review=step==='review'&&!chat,duration=step==='duration'&&!chat;
 $('formats').hidden=chat||review||duration;$('durations').hidden=!duration;$('back').hidden=chat||step==='format';$('review-choice').hidden=chat||review;$('format-summary').hidden=chat||step==='format';$('format-summary').textContent=review?state.duration+' s · sem áudio':labels[state.format];
 $('step-label').textContent=chat?'CONVERSA':review?'03 / REVISÃO':duration?'02 / DURAÇÃO':'01 / FORMATO';$('back').textContent=review?'← Editar pedido':'← Alterar formato';
 $('send').setAttribute('aria-label',chat||review?'Enviar mensagem':duration?'Confirmar pedido':'Escolher duração');$('action-hint').textContent=chat||review?'Conversar com a Veyro':duration?'Escolha os segundos':'Escolha o formato e avance';
 $('prompt').placeholder=chat?'Converse ou escreva “Lembre: …”':review?'O que você quer mudar nas cenas?':'Descreva o vídeo que você quer criar…';$('add').disabled=state.busy;$('attachments').hidden=!state.files.length;resizeText();}
function renderFiles(){const root=$('attachments');root.replaceChildren();root.hidden=!state.files.length;for(const item of state.files){const card=el('div',undefined,'attachment'),remove=button('×',()=>{state.files=state.files.filter(f=>f.id!==item.id);renderFiles();changed();},'');remove.setAttribute('aria-label','Remover referência '+item.name);card.append(media(item),remove,el('small',item.name));root.append(card);}}
function balance(){if(!state.scenes.length)return;const locked=state.scenes.filter(s=>s.locked),unlocked=state.scenes.filter(s=>!s.locked),left=state.duration-locked.reduce((v,s)=>v+s.seconds,0);if(!unlocked.length){if(Math.abs(left)>0.01)throw Error('Desproteja uma cena antes de mudar a duração.');return;}if(left<=0)throw Error('As cenas protegidas já ocupam toda a duração.');unlocked.forEach((s,i)=>s.seconds=i===unlocked.length-1?left-(Math.floor(left/unlocked.length*100)/100)*(unlocked.length-1):Math.floor(left/unlocked.length*100)/100);}
function renderScenes(){const root=$('scene-list');root.replaceChildren();let start=0;state.scenes.forEach((scene,index)=>{const card=el('article',undefined,'scene-card'),head=el('div',undefined,'scene-heading');head.append(el('h2','Cena '+(index+1)),el('span',Number(start.toFixed(2))+'–'+Number((start+scene.seconds).toFixed(2))+' s'));start+=scene.seconds;
 const tools=el('div',undefined,'scene-tools'),lock=button(scene.locked?'Protegida ✓':'Proteger',()=>{scene.locked=!scene.locked;renderScenes();changed();},'small-button');lock.setAttribute('aria-pressed',String(scene.locked));tools.append(lock);
 if(index>0)tools.append(button('↑ Mover',()=>{[state.scenes[index-1],state.scenes[index]]=[scene,state.scenes[index-1]];renderScenes();changed();},'small-button'));
 if(state.scenes.length>1)tools.append(button('Remover',()=>{if(scene.locked)throw Error('Desproteja a cena antes de remover.');const previous=[...state.scenes];state.scenes=state.scenes.filter(s=>s.id!==scene.id);try{balance();}catch(e){state.scenes=previous;throw e;}renderScenes();changed();},'small-button'));
 const label=el('label','Descrição da cena'),input=el('textarea');input.id='scene-'+scene.id;label.htmlFor=input.id;input.value=scene.text;input.rows=3;input.maxLength=12000;input.oninput=()=>{scene.text=input.value;changed();};card.append(head,tools,label,input);root.append(card);
 });$('scene-total').textContent=state.scenes.length+' cena(s) · '+state.duration+' s';$('add-scene').disabled=state.scenes.length>=state.duration;}
function showReview(){$('photo-view').hidden=true;$('editor-view').hidden=true;state.mode='create';$('chat-view').hidden=true;$('result').hidden=true;$('empty').hidden=true;$('review').hidden=false;$('original-prompt').textContent=state.original||'Pedido com referências.';$('review-references').replaceChildren(...state.files.map(a=>{const f=el('figure');f.append(media(a,true),el('figcaption',a.name));return f;}));$('review-meta').textContent=labels[state.format];$('prompt').value=state.draft;setStep('review');renderScenes();renderMessages();renderProposals();modeButtons();}
function showSummary(){state.mode='create';$('chat-view').hidden=true;$('empty').hidden=true;$('review').hidden=true;$('result').hidden=false;$('result-prompt').textContent=state.original||'Pedido com referências.';$('result-details').replaceChildren();for(const [label,value]of [['Formato',labels[state.format]],['Duração',state.duration+' segundos'],['Referências',state.files.length+' arquivo(s)']]){const row=el('div');row.append(el('dt',label),el('dd',value));$('result-details').append(row);}feedback('Pedido configurado. A geração de vídeo ainda não está conectada.');}
$('edit').onclick=()=>{showReview();};
function modeButtons(){for(const m of ['photo','editor'])$(m+'-mode').setAttribute('aria-pressed',String(state.mode===m));$('create-mode').setAttribute('aria-pressed',String(state.mode==='create'));$('chat-mode').setAttribute('aria-pressed',String(state.mode==='chat'));chatModeUI();}
async function changeMode(mode){if(state.busy)return;if(state.mode===mode)return;await saveChatDraft();await save();stopClipPreview();state.mode=mode;if(mode==='photo'||mode==='editor'){studioOpen();return;}$('photo-view').hidden=true;$('editor-view').hidden=true;modeButtons();$('chat-view').hidden=mode!=='chat';$('empty').hidden=mode==='chat'||state.scenes.length>0;$('review').hidden=true;$('result').hidden=true;if(mode==='create'&&state.scenes.length)showReview();else{$('prompt').value=mode==='chat'?state.chatDraft:state.original;setStep(mode==='chat'?'chat':'format');}renderMessages();renderChatMessages();renderProposals();}
function renderMessages(){for(const id of ['conversation']){const root=$(id);root.replaceChildren();for(const message of state.messages){const node=el('div',undefined,'message '+message.role);node.append(el('span',message.role==='user'?'Você':message.role==='assistant'?'Veyro IA':'Aviso do sistema'),el('p',message.text));root.append(node);}}}
function renderProposals(){for(const id of ['proposals','review-proposals']){const root=$(id);root.replaceChildren();const run=state.runs.find(r=>r.status==='COMPLETE'&&r.output?.scenes?.length);if(!run)continue;const box=el('details',undefined,'original-request');box.append(el('summary','Proposta da IA · '+run.output.scenes.length+' cenas'));for(const [i,s]of run.output.scenes.entries())box.append(el('p',`${i+1}. ${s.text} (${s.seconds} s)`));for(const warning of run.output.warnings||[])box.append(el('p',warning,'error'));const apply=button('Aplicar esta proposta',async()=>{await save();await api(route('apply'),{method:'POST',body:{id:run.id,revision:state.revision}});await loadProject(state.id,{view:'review'});feedback('Proposta aplicada. O roteiro anterior está em Versões.');});apply.disabled=run.revision!==state.revision;box.append(apply);if(apply.disabled)box.append(el('p','O roteiro mudou depois desta proposta. Peça uma nova revisão.','pending-note'));root.append(box);}}
async function refreshDetails(){const data=await api(route());state.messages=data.messages;state.memories=data.memories;state.versions=data.versions;state.runs=data.runs;state.allAssets=data.assets;state.photoJobs=data.photoJobs||[];if(state.mode==='photo'||state.mode==='editor')studioRender();renderMessages();renderChatMessages();renderProposals();}
function busy(value){state.busy=value;for(const id of ['send','ask-plan','projects-open','create-mode','chat-mode','photo-mode','editor-mode','add','back','save','clip-add','editor-export','versions-open'])$(id).disabled=value;}
async function talk(text,mode){
 if(mode==='chat')return sendChat(text);
 const draft=$('prompt').value;$('prompt').value='';state.draft='';changed();
 try{await save();}catch(e){$('prompt').value=draft;changed();throw e;}
 busy(true);$('prompt').disabled=true;feedback(state.chat?'A Veyro está preparando uma resposta…':'Salvando seu pedido…');
 try{const result=await api(route('chat'),{method:'POST',body:{text,mode,requestId:crypto.randomUUID()}});await refreshDetails();const tool=result.tool||state.runs[0]?.output?.tool;if(tool==='photo'||tool==='editor'){busy(false);await studioRoute(tool,result.prompt||text);return;}const run=state.runs[0];feedback(run?.status==='FAILED'?run.error:state.chat?'Resposta recebida. Confira a conversa.':'Pedido salvo · IA ainda não conectada',run?.status==='FAILED');}
 catch(e){$('prompt').value=draft;changed();throw e;}finally{busy(false);$('prompt').disabled=false;resizeText();}
}
async function loadProject(id,options={}){stopClipPreview();const data=await api('projects/'+id),p=data.project;Object.assign(state,{photo:{},editor:{}},p.state,{id:p.id,title:p.title,revision:p.revision,dirty:false,files:data.assets.filter(a=>p.state.fileIds.includes(a.id)),messages:data.messages,memories:data.memories,versions:data.versions,runs:data.runs,allAssets:data.assets,photoJobs:data.photoJobs||[],mode:'create'});studioLoad();history.replaceState(null,'','#'+id);$('project-title').value=p.title;for(const [id,key]of [['visual-style','visualStyle'],['characters','characters'],['constraints','constraints']])$(id).value=state[key];$('review-toggle').checked=p.state.review;for(const b of $('formats').children)b.setAttribute('aria-pressed',String(b.dataset.format===state.format));for(const b of $('durations').children)b.setAttribute('aria-pressed',String(Number(b.dataset.duration)===state.duration));$('save-status').textContent='Salvo na sua conta';$('chat-view').hidden=true;$('review').hidden=true;$('result').hidden=true;$('empty').hidden=false;$('prompt').value=state.original;modeButtons();renderFiles();if(options.view==='review')showReview();else await openProjectConversation(options.conversationId);feedback();}
function openPanel(title){$('panel-title').textContent=title;$('panel-body').replaceChildren();if(!$('panel').open)$('panel').showModal();return $('panel-body');}
async function projects(){await saveChatDraft();await save();const root=openPanel('Seus projetos'),list=await api('projects');const field=el('input');field.placeholder='Buscar pelo nome';field.setAttribute('aria-label','Buscar projetos');const content=el('div');function render(){content.replaceChildren();for(const p of list.filter(p=>p.title.toLowerCase().includes(field.value.toLowerCase()))){const row=button(p.title,async()=>{await loadProject(p.id);$('panel').close();},'project-option');row.append(el('small',new Date(p.updated_at).toLocaleString('pt-BR')));content.append(row);}if(!content.children.length)content.append(el('p','Nenhum projeto encontrado.'));}field.oninput=render;root.append(button('+ Novo projeto',async()=>{const p=await api('projects',{method:'POST',body:{title:'Novo projeto'}});await loadProject(p.id);$('panel').close();}),field,content);render();}
async function memories(){await refreshDetails();const root=openPanel('Memórias'),intro=el('p','Você escolhe o que a Veyro deve lembrar. Essas preferências serão usadas nas respostas quando a IA estiver conectada.','review-help');const input=el('textarea');input.placeholder='Ex.: Prefiro histórias com visual realista.';input.rows=3;input.maxLength=2000;input.setAttribute('aria-label','Nova memória');const select=el('select');select.setAttribute('aria-label','Onde usar esta memória');for(const [value,text]of [['project','Só neste projeto'],['global','Em todos os meus projetos']]){const o=el('option',text);o.value=value;select.append(o);}root.append(intro,input,select,button('Guardar memória',async()=>{if(!input.value.trim())throw Error('Escreva a preferência que deseja guardar.');await api(route('memories'),{method:'POST',body:{text:input.value,scope:select.value}});await memories();feedback('Memória salva.');}));
 const search=el('input');search.placeholder='Buscar palavras nas memórias';search.setAttribute('aria-label','Buscar palavras nas memórias');const list=el('div');const render=()=>{list.replaceChildren();for(const m of state.memories.filter(m=>m.text.toLowerCase().includes(search.value.toLowerCase()))){const card=el('div',undefined,'memory-card');card.append(el('small',m.project_id?'NESTE PROJETO':'TODOS OS SEUS PROJETOS'),el('p',m.text),button('Esquecer',async()=>{await api(route('memories'),{method:'DELETE',body:{id:m.id}});await memories();feedback('Memória removida das próximas respostas.');},'small-button'));list.append(card);}if(!list.children.length)list.append(el('p','Nenhuma memória encontrada.','pending-note'));};search.oninput=render;root.append(search,list);render();}
async function versions(){await save();await refreshDetails();const root=openPanel('Versões do roteiro');root.append(el('p','Cada salvamento guarda o estado anterior. Restaurar também preserva o roteiro atual em uma nova versão.','review-help'));if(!state.versions.length)root.append(el('p','As versões aparecerão quando você salvar alterações.'));for(const v of state.versions){const card=el('details',undefined,'original-request');card.append(el('summary',new Date(v.created_at).toLocaleString('pt-BR')+' · '+v.label));let loaded=false;card.ontoggle=()=>{if(card.open&&!loaded)handle(async()=>{const data=await api(route('versions/'+v.id));loaded=true;card.append(el('p',data.state.original||'Sem pedido escrito'),el('p',data.state.scenes.map((s,i)=>`${i+1}. ${s.text}`).join('\n')||'Sem cenas'),el('p',`Photo Studio: ${data.state.photo?.prompt||'sem pedido'} · Editor: ${data.state.editor?.clips?.length||0} trecho(s)`),button('Restaurar esta versão',async()=>{await save();await api(route('restore'),{method:'POST',body:{id:v.id,revision:state.revision}});await loadProject(state.id);$('panel').close();feedback('Versão restaurada.');}));});};root.append(card);}}
async function activity(){await refreshDetails();const root=openPanel('Atividade e conexão');root.append(el('p',state.chat?'Conversa com IA: conectada.':'Conversa com IA: aguardando configuração.'),el('p',state.images?'Photo Studio: geração conectada.':'Photo Studio: pedidos salvos; geração aguardando conexão.'),el('p','Geração, edição automática e melhoria de vídeo: ainda não conectadas.','review-help'));root.append(el('p',state.web?.search&&state.web?.reader?'Pesquisa: buscador e leitor configurados.':'Pesquisa: aguardando conexão com buscador e leitor.'),el('p',state.semantic?'Busca por significado: modelo configurado.':'Busca por significado: aguardando modelo; busca por palavras disponível.'));root.append(button('Exportar roteiro e memórias',async()=>{await save();const exportData=await api(route());const url=URL.createObjectURL(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='veyro-projeto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'text-button'));
 const names={WAITING:'Aguardando conexão',QUEUED:'Na fila',RUNNING:'Em andamento',COMPLETE:'Concluído',FAILED:'Não concluído',CANCELLED:'Cancelado'};for(const r of state.runs){const card=el('div',undefined,'memory-card');card.append(el('strong',names[r.status]||r.status),el('small',new Date(r.created_at).toLocaleString('pt-BR')));if(r.error)card.append(el('p',r.error));for(const t of r.tasks)card.append(el('p',t.agent+' · '+(names[t.status]||t.status),'pending-note'));root.append(card);}if(!state.runs.length)root.append(el('p','Nenhum pedido de IA enviado neste projeto.','pending-note'));}
async function metadata(file){return new Promise(resolve=>{const m=document.createElement(file.type.startsWith('video/')?'video':'img'),url=URL.createObjectURL(file);const finish=data=>{clearTimeout(timer);URL.revokeObjectURL(url);resolve(data);};const timer=setTimeout(()=>finish({}),5000);m.preload='metadata';m.muted=true;m.onloadedmetadata=()=>finish({width:m.videoWidth,height:m.videoHeight,duration:m.duration});m.onload=()=>finish({width:m.naturalWidth,height:m.naturalHeight});m.onerror=()=>finish({});m.src=url;});}
async function addFiles(event){const files=[...event.target.files];event.target.value='';if(!state.id)throw Error('Abra um projeto primeiro.');if(state.files.length+files.length>12)throw Error('Use até 12 referências por pedido.');busy(true);try{for(const file of files){if(file.size>25*1024*1024)throw Error(file.name+': limite de 25 MB por arquivo.');feedback('Salvando '+file.name+'…');const form=new FormData();form.append('file',file);form.append('metadata',JSON.stringify(await metadata(file)));const result=await api(route('assets'),{method:'POST',body:form});state.files.push(result);state.allAssets.push(result);renderFiles();if(state.mode==='photo'||state.mode==='editor')studioRender();changed();await save();}feedback('Referências salvas no projeto.');}finally{busy(false);}}
for(const n of DURATIONS){const b=button(n+' s',()=>{const before=state.duration;state.duration=n;try{balance();}catch(e){state.duration=before;throw e;}for(const x of $('durations').children)x.setAttribute('aria-pressed',String(x===b));changed();},'');b.dataset.duration=n;b.setAttribute('aria-pressed','false');$('durations').append(b);}
for(const b of $('formats').children)b.onclick=()=>{state.format=b.dataset.format;for(const x of $('formats').children)x.setAttribute('aria-pressed',String(x===b));changed();};
$('composer').onsubmit=e=>{e.preventDefault();handle(async()=>{if(state.busy)return;const text=$('prompt').value.trim();if(IS_STATIC_PREVIEW){if(QWEN_PAGES)await sendGithubQwen(text);else sendPreviewMessage(text);return;}if(!state.id)throw Error('Os projetos ainda não foram carregados.');if(state.mode==='photo'){await submitPhoto();return;}if(state.mode==='editor'){await editorCommand(text);return;}if(state.mode==='create'&&state.step==='format'&&text){const hint=await api(route('intent'),{method:'POST',body:{text}});if(hint.tool){await studioRoute(hint.tool,text);return;}}if(state.mode==='chat'||state.step==='review'){if(!text&&!state.files.length)throw Error('Escreva uma mensagem ou adicione um arquivo.');await talk(text,state.mode==='chat'?'chat':'revise');return;}
 if(!text&&!state.files.length)throw Error('Escreva uma ideia ou adicione fotos e vídeos.');if(state.step==='format'){state.original=text;changed();setStep('duration');return;}if(!state.duration)throw Error('Escolha a duração.');state.original=text;state.draft='';if(!state.scenes.length)state.scenes=[{id:crypto.randomUUID(),text,seconds:state.duration,locked:false}];balance();if(!$('review-toggle').checked){showSummary();changed();await save();return;}showReview();changed();await save();await talk(text||'Crie uma proposta a partir das referências.','plan');});};
$('back').onclick=()=>{if(state.step==='review'){state.draft=$('prompt').value;$('prompt').value=state.original;$('review').hidden=true;$('empty').hidden=false;}setStep('format');};
$('ask-plan').onclick=()=>handle(()=>talk(state.original||'Crie uma proposta com as referências.','plan'));
$('add-scene').onclick=()=>handle(()=>{const previous=[...state.scenes];state.scenes.push({id:crypto.randomUUID(),text:'',seconds:1,locked:false});try{balance();}catch(e){state.scenes=previous;throw e;}renderScenes();changed();});
for(const [id,key]of [['visual-style','visualStyle'],['characters','characters'],['constraints','constraints']])$(id).oninput=()=>{state[key]=$(id).value;changed();};
$('prompt').oninput=()=>{if(state.mode==='chat'){resizeText();draftChanged();setMascotState($('prompt').value?'attention':'idle');return;}if(state.mode==='photo')state.photo.prompt=$('prompt').value;if(state.mode==='editor')state.editor.request=$('prompt').value;resizeText();changed();};$('project-title').oninput=changed;$('review-toggle').onchange=changed;
$('save').onclick=()=>handle(async()=>{await save();feedback('Projeto salvo.');});$('projects-open').onclick=()=>handle(projects);$('memories-open').onclick=()=>handle(knowledgeMemories);$('versions-open').onclick=()=>handle(versions);$('activity-open').onclick=()=>handle(activity);$('create-mode').onclick=()=>handle(()=>changeMode('create'));$('chat-mode').onclick=()=>handle(()=>changeMode('chat'));
$('panel-close').onclick=()=>$('panel').close();$('panel').onclick=e=>{if(e.target===$('panel'))$('panel').close();};
function menu(open){$('add-menu').hidden=!open;$('add').setAttribute('aria-expanded',String(open));}
$('add').onclick=()=>menu($('add-menu').hidden);for(const kind of ['photo','video']){$('add-'+kind).onclick=()=>{menu(false);$(kind+'-input').click();};$(kind+'-input').onchange=e=>handle(()=>addFiles(e));}
document.addEventListener('click',e=>{if(!e.target.closest('.add-wrap'))menu(false);});window.addEventListener('beforeunload',e=>{if(state.dirty||chatDraftDirty){e.preventDefault();e.returnValue='';}});window.addEventListener('resize',updateViewport);if(window.visualViewport){window.visualViewport.addEventListener('resize',updateViewport);window.visualViewport.addEventListener('scroll',updateViewport);}updateViewport();
initStudio();initChat();knowledgeInit();
if(IS_STATIC_PREVIEW)startStaticPreview();
else handle(async()=>{const [status,projects]=await Promise.all([api('status'),api('projects')]);state.chat=status.chat;state.tts=status.tts===true;state.ttsProvider=status.ttsProvider||'azure';state.images=status.images;state.web=status.research;state.semantic=status.embeddings;state.agents=status.agents;if($('agent-status'))$('agent-status').textContent=state.agents?'Agentes locais: configurados':'Agentes locais: aguardando configuração';const hash=location.hash.slice(1);let cid=null,pid=hash;if(hash.startsWith('c-')){try{const c=await api('conversations/'+hash.slice(2));cid=c.conversation.id;pid=c.conversation.project_id;}catch{pid=null;}}const selected=projects.find(p=>p.id===pid)||projects[0];const p=selected||await api('projects',{method:'POST',body:{title:'Meu primeiro projeto'}});await loadProject(p.id,{conversationId:cid});});

'use strict';
// Video Studio only calls the authenticated Veyro backend. No GPU keys here.
async function openVeyroVideoStudio(){
  const root=openPanel('VEYRO VIDEO STUDIO');
  root.append(el('p','Gere cenas curtas de vídeo com um motor privado. A execução e a fila são controladas pelo servidor.','review-help'));
  let status;
  try{status=await api('status');}
  catch{root.append(el('p','Não foi possível verificar o status do motor de vídeo.','error'));return;}
  if(!status.video){
    root.append(el('p','A geração de vídeo permanece desligada até a validação real da GPU e dos limites de custo.','pending-note'));
    return;
  }
  const form=el('form',undefined,'veyro-video-form');
  const field=el('textarea');field.rows=4;field.maxLength=2500;field.required=true;
  field.setAttribute('aria-label','Descreva o vídeo');
  field.placeholder='Descreva uma cena: cenário, ação, movimento de câmera e estilo.';
  const profile=el('select');profile.setAttribute('aria-label','Perfil do vídeo');
  for(const [key,label] of [['preview_480p','Prévia 480p'],['quality_720p','Qualidade 720p']]){
    const option=el('option',label);option.value=key;profile.append(option);
  }
  const create=el('button','Criar vídeo','text-button');create.type='submit';
  form.append(field,profile,create,el('p','O tempo e o progresso só serão informados após medições reais.','review-help'));
  const statusLine=el('p',undefined,'studio-status');statusLine.setAttribute('role','status');
  const refresh=el('button','Atualizar trabalhos','small-button');refresh.type='button';
  const list=el('div',undefined,'veyro-video-jobs');
  root.append(form,statusLine,refresh,list);

  async function renderJobs(){
    const projectId=state.id;
    list.replaceChildren();
    if(!projectId){list.append(el('p','Selecione um projeto primeiro.'));return;}
    let result;
    try{result=await api('projects/'+projectId+'/video-jobs');}
    catch{list.append(el('p','Não foi possível carregar os trabalhos. Use Atualizar.','error'));return;}
    const jobs=Array.isArray(result.jobs)?result.jobs:[];
    if(!jobs.length)list.append(el('p','Nenhum trabalho de vídeo neste projeto.','review-help'));
    for(const job of jobs){
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id||''))continue;
      const item=el('article',undefined,'veyro-video-job');
      const label={queued:'Na fila',running:'Gerando',completed:'Concluído',failed:'Falhou',cancelled:'Cancelado'}[job.status]||'Status desconhecido';
      item.append(el('strong',label),el('small',job.profile==='quality_720p'?'Perfil 720p':'Perfil 480p'));
      if(job.status==='completed'){
        const video=el('video');video.controls=true;video.playsInline=true;video.preload='none';
        video.src='/api/projects/'+projectId+'/video-jobs/'+job.id+'/result';
        video.setAttribute('aria-label','Resultado gerado no Video Studio');
        item.append(video);
      }
      if(job.status==='queued'){
        item.append(button('Cancelar trabalho',async()=>{
          await api('projects/'+projectId+'/video-jobs/'+job.id+'/cancel',{method:'POST'});
          statusLine.textContent='Trabalho retirado da fila.';
          await renderJobs();
        },'small-button'));
      }
      if(job.status==='running')item.append(el('p','A GPU está processando. Atualize para consultar o resultado.','review-help'));
      if(job.status==='failed')item.append(el('p','O processamento não foi concluído. Nenhum vídeo fictício foi criado.','review-help'));
      list.append(item);
    }
  }
  let pendingKey='',pendingPrompt='',pendingProfile='';
  form.onsubmit=e=>{
    e.preventDefault();
    handle(async()=>{
      create.disabled=true;
      try{
        const prompt=field.value.trim(),profileValue=profile.value;
        if(prompt!==pendingPrompt||profileValue!==pendingProfile){
          pendingPrompt=prompt;pendingProfile=profileValue;pendingKey=crypto.randomUUID();
        }
        const output=await api('projects/'+state.id+'/video-jobs',{
          method:'POST',body:{prompt,profile:profileValue,idempotencyKey:pendingKey}
        });
        statusLine.textContent='Trabalho recebido: '+output.id+'. Consulte o status.';
        pendingKey='';pendingPrompt='';pendingProfile='';
        field.value='';
        await renderJobs();
      }finally{create.disabled=false;}
    });
  };
  refresh.onclick=()=>handle(renderJobs);
  await renderJobs();
  field.focus();
}
const videoMenu=document.getElementById('nav-videos');
if(videoMenu)videoMenu.onclick=()=>handle(async()=>{
  closeSidebar();
  await openVeyroVideoStudio();
});

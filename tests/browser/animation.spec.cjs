const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{try{localStorage.setItem('veyro-mascot-v1','black');}catch{}});
});
test('static preview shows welcome screen even when API is offline',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/welcome-state/);
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('.veyro-cosmos-layer')).toHaveCount(1);
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('#feedback')).toContainText('API não conectada');
  expect(errors).toEqual([]);
});
test('mobile and desktop layout remains usable and has no horizontal overflow',async({page,isMobile})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#welcome')).toBeVisible();
  const metrics=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport+2);
  await expect(page.locator('#composer')).toBeVisible();
  await page.locator('[data-suggestion]').first().click();
  await expect(page.locator('#prompt')).not.toBeEmpty();
  if(isMobile){
    await page.locator('#sidebar-toggle').click();
    await expect(page.locator('body')).toHaveClass(/sidebar-open/);
    await page.locator('#sidebar-close').click();
    await expect(page.locator('body')).not.toHaveClass(/sidebar-open/);
  }
  expect(errors).toEqual([]);
});
test('reduced motion still renders planets and input without continuous animation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('.veyro-cosmos-ringed')).toHaveCount(1);
  const animation=await page.locator('.sun-ring').evaluate(el=>getComputedStyle(el).animationName);
  expect(animation).toBe('none');
  expect(errors).toEqual([]);
});
test('parallax responds without preventing typing',async({page,isMobile})=>{
  await page.goto('/');
  await expect(page.locator('#welcome')).toBeVisible();
  const rect=await page.locator('#welcome').boundingBox();
  expect(rect).toBeTruthy();
  if(!isMobile){
    await page.mouse.move(rect.x+rect.width*.85,rect.y+rect.height*.35);
    await page.waitForFunction(()=>Boolean(document.body.style.getPropertyValue('--veyro-near-x')));
  }
  await page.locator('#prompt').fill('Teste de composição visual');
  await expect(page.locator('#prompt')).toHaveValue('Teste de composição visual');
});

test('repeated reloads do not duplicate animation layers or crash',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(let attempt=0;attempt<3;attempt++){
    await page.goto('/');
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('.veyro-cosmos-layer')).toHaveCount(1);
    await expect(page.locator('.logo-veyro')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('authenticated mock conversation removes welcome and dims the scene',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const project={id:'p1',title:'Projeto de teste',revision:0,updated_at:'2026-10-12T10:00:00.000Z',
    state:{format:'auto',duration:null,original:'',draft:'',scenes:[],fileIds:[],review:true,
      visualStyle:'',characters:'',constraints:'',photo:{},editor:{}}};
  const conversation={id:'c1',project_id:'p1',title:'Teste realista',draft:''};
  const messages=[{id:'m1',role:'user',text:'O plano do projeto',status:'COMPLETE',
    created_at:1760263200000,attachments:[]}];
  await page.route('**/api/**',async route=>{
    const u=new URL(route.request().url);
    const path=u.pathname;
    let data;
    if(path==='/api/status')data={chat:true,tts:false,images:false,research:false,embeddings:false,agents:false};
    else if(path==='/api/profile')data={name:'Visitante de teste',avatar:null};
    else if(path==='/api/projects')data=[project];
    else if(path==='/api/projects/p1')data={project,assets:[],messages:[],memories:[],versions:[],runs:[],photoJobs:[]};
    else if(path==='/api/conversations')data=[{...conversation,updated_at:'2026-10-12T10:00:00.000Z'}];
    else if(path==='/api/conversations/c1')data={conversation,messages,hasMore:false};
    else return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'mock unknown route'})});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('/');
  await expect(page.locator('.chat-message.user')).toContainText('O plano do projeto');
  await expect(page.locator('body')).not.toHaveClass(/welcome-state/);
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.welcome-backdrop')).opacity)<.6);
  expect(errors).toEqual([]);
});

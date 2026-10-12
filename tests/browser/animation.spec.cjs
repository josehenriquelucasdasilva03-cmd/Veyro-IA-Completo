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

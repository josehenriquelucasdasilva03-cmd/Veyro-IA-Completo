const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests/browser',testMatch:'*.spec.cjs',timeout:25000,
  expect:{timeout:10000},retries:0,workers:1,reporter:'list',
  use:{baseURL:'http://127.0.0.1:4179',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'android-chromium',use:{...devices['Pixel 7'],viewport:{width:393,height:851}}}
  ],
  webServer:{command:'node scripts/serve-static-preview.mjs',port:4179,timeout:30000,reuseExistingServer:!process.env.CI}
});

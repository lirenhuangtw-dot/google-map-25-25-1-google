const {chromium}=require('/Users/li-renhuang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const ORIGIN='https://lirenhuangtw-dot.github.io';
const BASE='/google-map-25-25-1-google/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for(const width of [1280,390]) {
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error' && m.text().includes('Google Maps')) errors.push(m.text());});
   // Serve the checkout under its production origin; Google requests remain live.
   await page.route(`${ORIGIN}${BASE}**`,async route=>{
    const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice(BASE.length));
    const file=path.resolve(rel || 'index.html');if(!file.startsWith(process.cwd()+path.sep))return route.abort();
    const type={'.js':'application/javascript','.html':'text/html','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'}[path.extname(file)] || 'application/octet-stream';
    try{await route.fulfill({body:await fs.readFile(file),contentType:type});}catch{await route.fulfill({status:404,body:'Not found'});}
   });
   await page.goto(`${ORIGIN}${BASE}restaurant.html`);
   assert.equal(await page.locator('script[src*="maps.googleapis.com/maps/api/js"]').count(),0);
   const expected=await page.evaluate(()=>restaurantList.filter(x=>restaurantMatchesFilters(x)&&x.businessStatus!=='CLOSED_TEMPORARILY'&&x.location).length);
   await page.locator('#openRestaurantMap').click();
   await page.waitForFunction(()=>Number(document.querySelector('#restaurantMapCanvas').dataset.markerCount)>0,{},{timeout:30000});
   assert.equal(Number(await page.locator('#restaurantMapCanvas').getAttribute('data-marker-count')),expected);
   assert.ok(expected>30);
   await page.locator('[data-filter="gourmet"]').click();
   const gourmetCount=await page.evaluate(()=>restaurantList.filter(x=>restaurantMatchesFilters(x)&&x.businessStatus!=='CLOSED_TEMPORARILY'&&x.location).length);
   assert.equal(Number(await page.locator('#restaurantMapCanvas').getAttribute('data-marker-count')),gourmetCount);
   await page.waitForTimeout(3500);
   await page.locator('#restaurantSearch').fill('博多幸龍');
   assert.equal(await page.locator('#restaurantMapCanvas').getAttribute('data-marker-count'),'1');
   await page.locator('#fitRestaurantMap').click();
   await page.waitForTimeout(1000);
   await page.getByTitle('博多幸龍總本店',{exact:true}).click();
   await page.locator('.restaurant-map-popup').waitFor();
   await page.waitForTimeout(1000);
   assert.ok((await page.locator('.restaurant-map-popup').textContent()).includes('博多幸龍'));
   assert.ok((await page.locator('.restaurant-map-popup a').first().getAttribute('href')).includes('destination_place_id='));
   await page.locator('#restaurantMapCanvas').scrollIntoViewIfNeeded();
   await page.screenshot({path:`/tmp/restaurant-map-${width}.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await page.locator('.gm-err-container').count(),0);
   await page.locator('#restaurantSearch').fill('no-result-xyz123');
   assert.equal(await page.locator('#restaurantMapCanvas').getAttribute('data-marker-count'),'0');
   assert.equal(await page.locator('.restaurant-map-popup').count(),0);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS: live Google Maps desktop/mobile, lazy load, filter markers, popup, navigation, empty result');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

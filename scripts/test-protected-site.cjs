const { chromium } = require('/Users/li-renhuang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const origin = 'https://liren-guides-12901877410.asia-east1.run.app';

(async () => {
  assert.ok(process.env.GUIDE_PASSWORD, 'GUIDE_PASSWORD must be supplied without committing it');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && message.text().includes('Google Maps')) errors.push(message.text()); });
      for (const file of ['/restaurant.html', '/restaurant-map-config.js', '/restaurant-data.js']) {
        const response = await context.request.get(origin + file, { maxRedirects: 0 });
        assert.equal(response.status(), 303);
      }
      await page.goto(origin + '/restaurant.html');
      assert.equal(new URL(page.url()).pathname, '/login');
      assert.equal(await page.locator('script[src*="maps.googleapis.com"]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/liren-login-${width}.png` });
      await page.getByLabel('瀏覽密碼').fill(process.env.GUIDE_PASSWORD);
      await page.getByRole('button', { name: '進入指南' }).click();
      await page.waitForURL(origin + '/restaurant.html');
      const session = (await context.cookies()).find(cookie => cookie.name === '__Host-liren_session');
      assert.ok(session?.httpOnly && session.secure && session.sameSite === 'Lax');
      assert.equal((await context.request.get(origin + '/restaurant-map-config.js')).status(), 200);
      assert.equal(await page.locator('script[src*="maps.googleapis.com/maps/api/js"]').count(), 0);
      await page.locator('#restaurantSearch').fill('博多幸龍');
      await page.locator('#openRestaurantMap').click();
      await page.waitForFunction(() => document.querySelector('#restaurantMapCanvas').dataset.markerCount === '1', {}, { timeout: 45000 });
      await page.waitForTimeout(3500);
      await page.getByTitle('博多幸龍總本店', { exact: true }).click();
      await page.locator('.restaurant-map-popup').waitFor();
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('.gm-err-container').count(), 0);
      await page.locator('#restaurantMapCanvas').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/liren-protected-map-${width}.png` });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole('link', { name: '切換成寶寶放電指南' }).click();
      await page.waitForURL(origin + '/index.html');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole('button', { name: '登出', exact: true }).click();
      await page.waitForURL(origin + '/login');
      assert.equal((await context.request.get(origin + '/restaurant-map-config.js', { maxRedirects: 0 })).status(), 303);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: production mobile/desktop authentication, protected config, lazy live map, marker popup, shared guide login, logout, no overflow');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

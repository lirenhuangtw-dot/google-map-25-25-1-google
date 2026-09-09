import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { createGuideServer } from '../protected/server.mjs';

const password = randomBytes(12).toString('hex');
const salt = randomBytes(16).toString('hex');
const auth = { salt, hash: scryptSync(password, salt, 64).toString('hex'), sessionSecret: randomBytes(32).toString('hex') };
let time = Date.now();
const server = createGuideServer({ root: process.cwd(), auth, secure: false, now: () => time });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const get = (url, cookie) => fetch(origin + url, { redirect: 'manual', headers: cookie ? { cookie } : {} });
const login = (value, next = '/restaurant.html', source = origin) => fetch(origin + '/login', { method: 'POST', redirect: 'manual', headers: { Origin: source, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: value, next }) });
try {
  for (const url of ['/', '/restaurant.html', '/restaurant-map-config.js', '/restaurant-data.js', '/assets/app-icon-192.png']) {
    const response = await get(url); assert.equal(response.status, 303); assert.ok(response.headers.get('location').startsWith('/login?next='));
  }
  const page = await get('/login'); assert.equal(page.status, 200); assert.ok(!(await page.text()).includes('maps.googleapis.com'));
  assert.equal((await get('/healthz')).status, 200);
  assert.equal((await login(password, '/', 'https://example.com')).status, 403);
  assert.equal((await login('wrong')).status, 401);
  const success = await login(password); assert.equal(success.status, 303);
  const setCookie = success.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly; SameSite=Lax; Max-Age=604800/);
  const cookie = setCookie.split(';')[0];
  assert.equal((await get('/restaurant.html', cookie)).status, 200);
  assert.equal((await get('/index.html', cookie)).status, 200);
  assert.equal((await get('/restaurant-map-config.js', cookie)).status, 200);
  for (const url of ['/.env', '/protected/server.mjs', '/.git/config', '/assets/%2e%2e/%2e%2e/.env']) assert.equal((await get(url, cookie)).status, 404);
  assert.equal((await get('/restaurant.html', cookie + 'x')).status, 303);
  assert.equal((await login(password, '//evil.example')).headers.get('location'), '/restaurant.html');
  const logout = await fetch(origin + '/logout', { method: 'POST', redirect: 'manual', headers: { origin, cookie } });
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  time += 8 * 86400_000; assert.equal((await get('/restaurant.html', cookie)).status, 303);
  for (let i = 0; i < 5; i++) assert.equal((await login('wrong')).status, 401);
  assert.equal((await login(password)).status, 429);
  assert.throws(() => createGuideServer({ root: '.', auth: {} }));
  console.log('PASS: protected assets, login, CSRF, signed session, expiry, logout, path traversal, redirect safety, throttling, fail-closed configuration');
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }

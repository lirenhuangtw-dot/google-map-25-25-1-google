import http from 'node:http';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const derive = promisify(scrypt);
const sessionSeconds = 7 * 24 * 60 * 60;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeNext = value => /^\/(?!\/)[^\\\r\n]*$/.test(value || '') && !value.startsWith('/login') && !value.startsWith('/logout') ? value : '/restaurant.html';

function loginPage(next, message = '') {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LIREN 私人指南</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;background:#f3f5f4;color:#202925;font:16px system-ui,sans-serif;display:grid;place-items:center;padding:24px;letter-spacing:0}main{width:min(100%,380px)}.brand{font-weight:800;color:#326b55;font-size:16px}h1{font-size:28px;margin:14px 0 30px}label{display:block;font-weight:600;margin-bottom:10px}input,button{font:inherit;width:100%;min-height:50px;border-radius:6px}input{background:white;border:1px solid #8b9890;padding:12px}input:focus{outline:3px solid #a2cfbb;outline-offset:2px}button{margin-top:16px;border:0;background:#245d45;color:white;font-weight:700;cursor:pointer}button:focus-visible{outline:3px solid #245d45;outline-offset:3px}.error{color:#a32a2a;line-height:1.6}.note{color:#58665e;font-size:14px;margin-top:24px}
  </style></head><body><main><div class="brand">LIREN</div><h1>私人指南</h1><form action="/login" method="post"><input type="hidden" name="next" value="${escape(safeNext(next))}"><label for="password">瀏覽密碼</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128" autofocus>${message ? `<p class="error" role="alert">${escape(message)}</p>` : ''}<button type="submit">進入指南</button></form><p class="note">餐廳指南 · 寶寶放電指南</p></main></body></html>`;
}

export function createGuideServer({ root, auth, secure = true, now = Date.now }) {
  if (!/^[a-f0-9]{32}$/.test(auth?.salt) || !/^[a-f0-9]{128}$/.test(auth?.hash) || !/^[a-f0-9]{64}$/.test(auth?.sessionSecret)) throw new Error('Valid AUTH_CONFIG is required');
  root = path.resolve(root);
  const cookieName = secure ? '__Host-liren_session' : 'liren_session';
  const sign = value => createHmac('sha256', auth.sessionSecret).update(value).digest('hex');
  const equal = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const cookie = (value, age) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const authenticated = req => {
    const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value || value.length > 200) return false;
    const [expires, nonce, signature, extra] = value.split('.');
    return !extra && /^\d{13}$/.test(expires || '') && /^[a-f0-9]{32}$/.test(nonce || '') && /^[a-f0-9]{64}$/.test(signature || '') && Number(expires) > now() && Number(expires) <= now() + sessionSeconds * 1000 && equal(signature, sign(`${expires}.${nonce}`));
  };
  const attempts = new Map();
  let globalWindow = { start: now(), count: 0 };
  function limited(req) {
    const time = now();
    if (time - globalWindow.start >= 60_000) globalWindow = { start: time, count: 0 };
    if (++globalWindow.count > 30) return true;
    // Cloud Run appends its trusted client hop; the global cap also covers forged IP headers.
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',').at(-1).trim();
    for (const [key, bucket] of attempts) if (time - bucket.start >= 600_000) attempts.delete(key);
    const bucket = attempts.get(ip) || { start: time, count: 0 };
    attempts.set(ip, bucket);
    return ++bucket.count > 5;
  }
  function sameOrigin(req) {
    try { const origin = new URL(req.headers.origin); return origin.host === req.headers.host && origin.protocol === (secure ? 'https:' : 'http:'); } catch { return false; }
  }
  return http.createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const send = (status, body, type = 'text/plain; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body); };
    const redirect = location => { res.writeHead(303, { Location: location }); res.end(); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz' && req.method === 'GET') return send(200, 'ok');
      if (url.pathname === '/login' && req.method === 'GET') {
        if (authenticated(req)) return redirect(safeNext(url.searchParams.get('next')));
        return send(200, loginPage(url.searchParams.get('next')), types['.html']);
      }
      if (url.pathname === '/login' && req.method === 'POST') {
        if (!sameOrigin(req)) return send(403, 'Forbidden');
        if (limited(req)) { res.setHeader('Retry-After', '600'); return send(429, loginPage('', '嘗試次數過多，請 10 分鐘後再試。'), types['.html']); }
        if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') return send(415, 'Unsupported content type');
        if (Number(req.headers['content-length']) > 2048) return send(413, 'Request too large');
        const chunks = []; let length = 0;
        for await (const chunk of req) { length += chunk.length; if (length > 2048) return send(413, 'Request too large'); chunks.push(chunk); }
        const form = new URLSearchParams(Buffer.concat(chunks).toString());
        const password = form.get('password') || '';
        if (!password || password.length > 128) return send(400, loginPage(form.get('next'), '請輸入密碼。'), types['.html']);
        const hash = (await derive(password, auth.salt, 64)).toString('hex');
        if (!equal(hash, auth.hash)) return send(401, loginPage(form.get('next'), '密碼不正確，請再試一次。'), types['.html']);
        const payload = `${now() + sessionSeconds * 1000}.${randomBytes(16).toString('hex')}`;
        res.setHeader('Set-Cookie', cookie(`${payload}.${sign(payload)}`, sessionSeconds));
        return redirect(safeNext(form.get('next')));
      }
      if (url.pathname === '/logout' && req.method === 'POST') {
        if (!sameOrigin(req)) return send(403, 'Forbidden');
        res.setHeader('Set-Cookie', cookie('', 0)); return redirect('/login');
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Method not allowed');
      if (!authenticated(req)) return redirect(`/login?next=${encodeURIComponent(safeNext(req.url))}`);
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (name.includes('\\') || name.includes('\0')) return send(404, 'Not found');
      const ext = path.extname(name).toLowerCase();
      const allowed = /^\/[a-z0-9-]+\.(html|js|css)$/.test(name) || name === '/site.webmanifest' || (name.startsWith('/assets/') && types[ext]);
      if (!allowed) return send(404, 'Not found');
      const file = await realpath(path.join(root, name));
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) return send(404, 'Not found');
      return send(200, await readFile(file), types[ext]);
    } catch (error) {
      if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) || error instanceof URIError) return send(404, 'Not found');
      // Never log request bodies, cookies, or authentication material.
      console.error('Request failed', error.code || error.name);
      if (!res.headersSent) send(500, 'Request failed'); else res.end();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createGuideServer({ root: process.env.STATIC_ROOT || '/app/public', auth: JSON.parse(process.env.AUTH_CONFIG || '{}') });
  server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Protected guide server ready'));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

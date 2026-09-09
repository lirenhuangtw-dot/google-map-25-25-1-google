import { mkdir, writeFile } from 'node:fs/promises';

// GitHub Pages hosts only redirects. The full site runs behind server authentication.
const origin = 'https://liren-guides-12901877410.asia-east1.run.app';
await mkdir('pages-redirect', { recursive: true });
for (const [file, destination] of [['index.html', '/index.html'], ['restaurant.html', '/restaurant.html'], ['404.html', '/restaurant.html']]) {
  const url = origin + destination;
  await writeFile(`pages-redirect/${file}`, `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><meta name="robots" content="noindex"><title>LIREN 指南</title></head><body><p>指南已搬到安全入口。</p><a href="${url}">前往 LIREN 指南</a><script>location.replace(${JSON.stringify(url)} + location.search + location.hash);</script></body></html>`);
}

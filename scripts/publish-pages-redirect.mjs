import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import './build-pages-redirect.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const entries = [];
for (const file of ['index.html', 'restaurant.html', '404.html']) {
  const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { input: await readFile(`pages-redirect/${file}`), encoding: 'utf8' }).trim();
  entries.push(`100644 blob ${blob}\t${file}`);
}
const tree = execFileSync('git', ['mktree'], { input: entries.join('\n') + '\n', encoding: 'utf8' }).trim();
const branch = 'pages-redirect';
const remote = git('ls-remote', 'origin', `refs/heads/${branch}`);
let parent = [];
if (remote) {
  git('fetch', 'origin', branch);
  parent = ['-p', remote.split(/\s/)[0]];
}
const commit = git('commit-tree', tree, ...parent, '-m', 'Redirect public guide links to authenticated Cloud Run');
execFileSync('git', ['push', 'origin', `${commit}:refs/heads/${branch}`], { stdio: 'inherit' });
execFileSync('gh', ['api', '--method', 'PUT', 'repos/lirenhuangtw-dot/google-map-25-25-1-google/pages', '-f', 'build_type=legacy', '-f', `source[branch]=${branch}`, '-f', 'source[path]=/'], { stdio: 'inherit' });
console.log('Published redirect-only branch:', commit);

const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const base = 'https://duckplaces.vercel.app';
async function main() {
  const files = ['index.html', 'games.html', 'careers.html', '404.html', 'style.css', 'script.js', 'assets/hero-image.png', 'assets/logo-duck-places.png'];
  for (const file of files) {
    const route = file === 'index.html' ? '/' : file.endsWith('.html') ? '/' + file.slice(0, -5) : '/' + file;
    const res = await fetch(base + route, { signal: AbortSignal.timeout(20000) });
    assert.equal(res.status, 200, route);
    const remote = Buffer.from(await res.arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(remote).digest('hex'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), `File changed: ${file}`);
    console.log('PASS exact file:', route, remote.length);
  }
  for (const route of ['/games.html', '/index', '/index.html']) {
    const res = await fetch(base + route, { redirect: 'manual' });
    assert.ok([301, 307, 308].includes(res.status), route);
    console.log('PASS redirect:', route, res.status, res.headers.get('location'));
  }
  const ids = [...fs.readFileSync('script.js', 'utf8').matchAll(/universeId:\s*(\d+)/g)].map(match => match[1]);
  for (const route of ['/api/games?universeIds=' + ids.join(','), '/api/game-icons?universeIds=' + ids.join(',')]) {
    const res = await fetch(base + route, { signal: AbortSignal.timeout(20000) });
    assert.equal(res.status, 200, route);
    const json = await res.json();
    assert.equal(json.data.length, ids.length);
    if (route.startsWith('/api/game-icons')) assert.ok(json.data[0].imageUrl);
    else assert.equal(typeof json.data[0].playing, 'number');
    const repeat = await fetch(base + route);
    console.log('PASS API:', route.split('?')[0], json.data.length, 'cache:', repeat.headers.get('x-vercel-cache'));
  }
  const invalid = await fetch(base + '/api/games?universeIds=invalid');
  assert.equal(invalid.status, 400);
  console.log('PASS invalid API request');
  const missing = await fetch(base + '/missing-test-page');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Oops!/);
  console.log('PASS custom 404');
}
main().catch(error => { console.error(error); process.exit(1); });

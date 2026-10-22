const { test } = require('node:test');
const assert = require('node:assert/strict');
const makeHandler = require('../lib/roblox');

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, end() { return this; } };
}

test('rejects invalid IDs and writes without contacting Roblox', async () => {
  const previous = global.fetch;
  global.fetch = () => { throw new Error('Should not fetch'); };
  try {
    for (const url of ['/api/games', '/api/games?universeIds=1,evil', '/api/games?universeIds=0']) {
      const res = response();
      await makeHandler('games')({ method: 'GET', url }, res);
      assert.equal(res.code, 400);
    }
    const res = response();
    await makeHandler('games')({ method: 'POST', url: '/api/games?universeIds=1' }, res);
    assert.equal(res.code, 405);
  } finally { global.fetch = previous; }
});

test('preserves frontend response format and adds CDN caching', async () => {
  const previous = global.fetch;
  try {
    for (const kind of ['games', 'icons', 'thumbnails']) {
      let requested;
      global.fetch = async url => { requested = url; return { ok: true, json: async () => ({ data: [{ id: 123 }] }) }; };
      const res = response();
      await makeHandler(kind)({ method: 'GET', url: '/api/games?universeIds=123,123' }, res);
      assert.equal(res.code, 200);
      assert.deepEqual(res.body, { data: [{ id: 123 }] });
      assert.match(res.headers['Vercel-CDN-Cache-Control'], /s-maxage=60/);
      assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
      assert.equal(requested.searchParams.get('universeIds'), '123');
      if (kind === 'icons') assert.equal(requested.searchParams.get('size'), '512x512');
      if (kind === 'thumbnails') {
        assert.equal(requested.pathname, '/v1/games/multiget/thumbnails');
        assert.equal(requested.searchParams.get('countPerUniverse'), '1');
        assert.equal(requested.searchParams.get('size'), '768x432');
        assert.equal(requested.searchParams.get('format'), 'Webp');
      }
    }
  } finally { global.fetch = previous; }
});

test('upstream failures are not cached as successful responses', async () => {
  const previous = global.fetch;
  global.fetch = async () => ({ ok: false, status: 429 });
  try {
    const res = response();
    await makeHandler('games')({ method: 'GET', url: '/api/games?universeIds=123' }, res);
    assert.equal(res.code, 502);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.headers['Vercel-CDN-Cache-Control'], undefined);
  } finally { global.fetch = previous; }
});

test('cross-origin read preflight succeeds without contacting Roblox', async () => {
  const res = response();
  await makeHandler('games')({ method: 'OPTIONS', url: '/api/games' }, res);
  assert.equal(res.code, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS');
});

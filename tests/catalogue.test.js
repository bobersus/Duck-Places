const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('catalogue requires only placeId and universeId', () => {
  const games = vm.runInNewContext(fs.readFileSync('script.js', 'utf8') + ';DUCK_PLACES_GAMES');
  assert.ok(games.length > 0);
  assert.equal(new Set(games.map(game => game.universeId)).size, games.length);
  for (const game of games) {
    assert.deepEqual(Object.keys(game).sort(), ['placeId', 'universeId']);
    assert.ok(Number.isSafeInteger(game.placeId) && Number.isSafeInteger(game.universeId));
  }
});

test('names and destination IDs come from Roblox; failed requests retain them', async () => {
  let fail = false;
  const context = vm.createContext({
    window: {}, DUCK_PLACES_GAMES: [{ placeId: 111, universeId: 222 }],
    document: { hidden: false, addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
    localStorage: { setItem() {} }, URL, AbortSignal, Intl, console,
    fetch: async url => {
      if (fail) throw new Error('Offline');
      return { ok: true, json: async () => ({ data: url.startsWith('/api/games?')
        ? [{ id: 222, rootPlaceId: 333, name: 'Name from Roblox', created: '2026-01-15T12:00:00Z', playing: 12, visits: 456 }]
        : [{ universeId: 222, thumbnails: [{ state: 'Completed', imageUrl: 'https://tr.rbxcdn.com/first.webp' }] }] }) };
    }
  });
  vm.runInContext(fs.readFileSync('client.js', 'utf8'), context);
  await vm.runInContext('refreshGames()', context);
  let game = vm.runInContext('gamesData[0]', context);
  assert.equal(game.name, 'Name from Roblox');
  assert.equal(game.placeId, 333);
  assert.equal(game.robloxUrl, 'https://www.roblox.com/games/333');
  assert.equal(game.thumbnail, 'https://tr.rbxcdn.com/first.webp');
  assert.equal(game.created, '2026-01-15T12:00:00Z');
  fail = true;
  await vm.runInContext('refreshGames()', context);
  game = vm.runInContext('gamesData[0]', context);
  assert.equal(game.name, 'Name from Roblox');
  assert.equal(game.robloxUrl, 'https://www.roblox.com/games/333');
  assert.equal(game.created, '2026-01-15T12:00:00Z');
});

test('creation date sorting handles both directions and always puts unknown dates last', () => {
  const context = vm.createContext({ window: {}, DUCK_PLACES_GAMES: [], document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync('client.js', 'utf8'), context);
  const games = [
    { id: 'unknown', created: null }, { id: 'new', created: '2026-10-01T00:00:00Z' },
    { id: 'invalid', created: 'invalid' }, { id: 'old', created: '2025-01-01T00:00:00Z' }
  ];
  const compare = vm.runInContext('compareGamesByCreated', context);
  assert.deepEqual([...games].sort((a, b) => compare(a, b, true)).map(g => g.id), ['new', 'old', 'unknown', 'invalid']);
  assert.deepEqual([...games].sort((a, b) => compare(a, b, false)).map(g => g.id), ['old', 'new', 'unknown', 'invalid']);
});

test('GitHub Pages reads the live Vercel API and updates compact hero totals', async () => {
  let players = 330, visits = 27912345, offline = false;
  const requests = [];
  const nodes = { statCurrentPlayers: { textContent: '' }, statTotalVisits: { textContent: '' } };
  const context = vm.createContext({
    window: { location: { hostname: 'duckplaces.com' } }, DUCK_PLACES_GAMES: [{ placeId: 111, universeId: 222 }],
    document: { hidden: false, addEventListener() {}, getElementById(id) { return nodes[id] || null; }, querySelectorAll() { return []; } },
    localStorage: { setItem() {} }, URL, AbortSignal, Intl, console,
    fetch: async url => {
      requests.push(url);
      if (offline) throw new Error('Offline');
      return { ok: true, json: async () => ({ data: url.includes('/api/games?')
        ? [{ id: 222, name: 'Live game', playing: players, visits }]
        : [{ universeId: 222, thumbnails: [] }] }) };
    }
  });
  vm.runInContext(fs.readFileSync('client.js', 'utf8'), context);
  await vm.runInContext('refreshGames()', context);
  assert.ok(requests.every(url => url.startsWith('https://duckplaces.vercel.app/api/')));
  assert.equal(nodes.statCurrentPlayers.textContent, '330');
  assert.equal(nodes.statTotalVisits.textContent, '27.9M');
  players = 417; visits += 12;
  await vm.runInContext('refreshGames()', context);
  assert.equal(nodes.statCurrentPlayers.textContent, '417');
  assert.equal(nodes.statTotalVisits.textContent, '27.9M');
  assert.equal(nodes.statTotalVisits.title, '27,912,357');
  offline = true;
  await vm.runInContext('refreshGames()', context);
  assert.equal(nodes.statCurrentPlayers.textContent, '417');
});

test('compact counters support thousands, millions and billions', () => {
  const context = vm.createContext({ window: {}, DUCK_PLACES_GAMES: [], document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync('client.js', 'utf8'), context);
  const format = vm.runInContext('formatNumber', context);
  for (const [value, expected] of [[null, '—'], [0, '0'], [999, '999'], [1200, '1.2K'], [27912345, '27.9M'], [2300000000, '2.3B']]) {
    assert.equal(format(value), expected);
  }
});

test('hero counts from zero, retargets from its current value and respects reduced motion', () => {
  let now = 0, nextId = 0, reduced = false;
  const frames = new Map();
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: reduced }) }, DUCK_PLACES_GAMES: [], document: { addEventListener() {} },
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  vm.runInContext(fs.readFileSync('client.js', 'utf8'), context);
  const animate = vm.runInContext('animateHeroCounter', context);
  const el = { textContent: '' };
  function advance(time) {
    now = time;
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(callback => callback(now));
  }
  animate(el, 1000);
  assert.equal(el.textContent, '0');
  advance(850);
  assert.equal(el.textContent, '875');
  animate(el, 2000);
  assert.equal(el.textContent, '875');
  assert.equal(frames.size, 1);
  advance(1500);
  assert.equal(el.textContent, '2K');
  assert.equal(frames.size, 0);
  animate(el, 2000);
  assert.equal(frames.size, 0);
  animate(el, 0);
  advance(2150);
  assert.equal(el.textContent, '0');
  reduced = true;
  animate(el, 27912345);
  assert.equal(el.textContent, '27.9M');
  assert.equal(frames.size, 0);
});

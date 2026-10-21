const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('catalogue requires only placeId and universeId', () => {
  const games = vm.runInNewContext(fs.readFileSync('script.js', 'utf8') + ';DUCK_PLACES_GAMES');
  assert.equal(games.length, 41);
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
        ? [{ id: 222, rootPlaceId: 333, name: 'Name from Roblox', playing: 12, visits: 456 }]
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
  fail = true;
  await vm.runInContext('refreshGames()', context);
  game = vm.runInContext('gamesData[0]', context);
  assert.equal(game.name, 'Name from Roblox');
  assert.equal(game.robloxUrl, 'https://www.roblox.com/games/333');
});

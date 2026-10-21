const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('every configured game has saved API metadata for static hosting', () => {
  const games = vm.runInNewContext(fs.readFileSync('script.js', 'utf8') + ';DUCK_PLACES_GAMES');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/games-data.js', 'utf8'), context);
  const snapshot = context.window.DUCK_PLACES_SNAPSHOT;
  assert.ok(Number.isFinite(Date.parse(snapshot.updatedAt)));
  assert.equal(snapshot.games.length, games.length);
  for (const game of games) {
    const saved = snapshot.games.find(item => item.universeId === game.universeId);
    assert.ok(saved, `Missing universe ${game.universeId}; run npm run refresh-games`);
    assert.ok(saved.name?.trim() && saved.name !== 'Loading experience…');
    assert.equal(saved.robloxUrl, `https://www.roblox.com/games/${saved.placeId}`);
    assert.ok(saved.thumbnail === '/assets/game-placeholder.svg' || new URL(saved.thumbnail).hostname.endsWith('.rbxcdn.com'));
  }
});

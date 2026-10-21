const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('script.js', 'utf8');
const base = vm.runInNewContext(source + ';DUCK_PLACES_GAMES');
const ids = base.map(g => g.universeId).join(',');
async function read(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
(async () => {
  const [info, images] = await Promise.all([
    read('https://games.roblox.com/v1/games?universeIds=' + ids),
    read('https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=' + ids + '&countPerUniverse=1&defaults=true&size=768x432&format=Webp&isCircular=false')
  ]);
  const games = base.map(g => {
    const stats = info.data.find(s => s.id === g.universeId);
    const image = images.data.find(s => s.universeId === g.universeId)?.thumbnails?.[0];
    if (!stats?.name || !Number.isSafeInteger(stats.rootPlaceId) || stats.rootPlaceId <= 0) throw new Error(`Missing Roblox metadata for universe ${g.universeId}; keeping the previous snapshot`);
    return { ...g, placeId: stats.rootPlaceId, robloxUrl: `https://www.roblox.com/games/${stats.rootPlaceId}`, name: stats.name, playing: stats.playing ?? null, visits: stats.visits ?? null,
      thumbnail: image?.state === 'Completed' ? image.imageUrl : '/assets/game-placeholder.svg' };
  });
  fs.writeFileSync('assets/games-data.js', 'window.DUCK_PLACES_SNAPSHOT = ' + JSON.stringify({ updatedAt: new Date().toISOString(), games }) + ';\n');
  console.log(`Saved ${games.length} games; ${games.filter(g => g.thumbnail.startsWith('https:')).length} first thumbnails`);
})().catch(err => { console.error(err.message); process.exit(1); });

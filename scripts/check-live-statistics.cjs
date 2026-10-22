const { chromium } = require('C:/Users/Arseni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Test the current production origin with the candidate client before publishing it.
    if (process.env.CANDIDATE_CLIENT === '1') {
      await page.route(/https:\/\/(?:www\.)?duckplaces\.com\/client\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('client.js', 'utf8') }));
    }
    await page.addInitScript(() => {
      const original = window.setInterval;
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 60000) window.refreshStatsForTest = callback;
        return original(callback, delay, ...args);
      };
    });
    const live = page.waitForResponse(response => response.url().startsWith('https://duckplaces.vercel.app/api/games?') && response.status() === 200);
    await page.goto('https://www.duckplaces.com/', { waitUntil: 'domcontentloaded' });
    console.log('Checking live statistics on', page.url());
    const response = await live;
    assert.equal(response.headers()['access-control-allow-origin'], '*');
    const data = (await response.json()).data;
    const format = number => number.toLocaleString('en-US');
    const totals = list => ({ players: format(list.reduce((n, game) => n + game.playing, 0)), visits: format(list.reduce((n, game) => n + game.visits, 0)) });
    async function checkHero(list) {
      const expected = totals(list);
      await page.waitForFunction(expected => document.getElementById('statCurrentPlayers').textContent === expected.players && document.getElementById('statTotalVisits').textContent === expected.visits, expected);
      return expected;
    }
    const originalTotals = await checkHero(data);
    assert.equal(await page.evaluate(() => typeof window.refreshStatsForTest), 'function');
    const changed = data.map((game, index) => index === 0 ? { ...game, playing: 11007, visits: game.visits + 17 } : game);
    await page.route('https://duckplaces.vercel.app/api/games?**', route => route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ data: changed }) }));
    await page.evaluate(() => window.refreshStatsForTest());
    const updatedTotals = await checkHero(changed);
    const card = page.locator(`[data-place-id="${changed[0].rootPlaceId}"]`);
    await page.waitForFunction(({ id, visits }) => {
      const values = document.querySelector(`[data-place-id="${id}"]`)?.querySelectorAll('.game-stat-value');
      return values?.[0]?.textContent === '11,007' && values?.[1]?.textContent === visits;
    }, { id: changed[0].rootPlaceId, visits: format(changed[0].visits) });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const nextLive = page.waitForResponse(r => r.url().startsWith('https://duckplaces.vercel.app/api/games?') && r.status() === 200);
    await page.goto('https://www.duckplaces.com/games', { waitUntil: 'domcontentloaded' });
    await nextLive;
    await page.waitForFunction(({ id, visits }) => {
      const values = document.querySelector(`[data-place-id="${id}"]`)?.querySelectorAll('.game-stat-value');
      return values?.[0]?.textContent === '11,007' && values?.[1]?.textContent === visits;
    }, { id: changed[0].rootPlaceId, visits: format(changed[0].visits) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(JSON.stringify({ result: 'PASS', liveGameCount: data.length, originalTotals, updatedTotals, checks: 'Actual cross-origin API; exact totals; minute timer; refreshed home and catalogue cards; mobile layout' }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });

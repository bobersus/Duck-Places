const { chromium } = require('C:/Users/Arseni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
async function main() {
  fs.mkdirSync('preview', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.locator('#topGamesGrid .game-card').first().waitFor();
    assert.equal(await page.locator('#topGamesGrid .game-card').count(), 8);
    assert.equal(await page.locator('.game-card-image').first().evaluate(image => image.naturalWidth / image.naturalHeight), 16 / 9);
    await page.locator('.game-card-image').evaluateAll(images => images.forEach(image => image.loading = 'eager'));
    await page.waitForFunction(() => [...document.querySelectorAll('.game-card-image')].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: 'preview/home-desktop.png', fullPage: true });
    await page.locator('#our-games').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'preview/games-section.png' });
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#allGamesGrid .game-card').count(), 41);
    const imageResponse = await page.request.get('http://127.0.0.1:4173/api/game-thumbnails?universeIds=8688305922');
    assert.equal(imageResponse.status(), 200);
    const firstThumbnail = (await imageResponse.json()).data[0].thumbnails[0].imageUrl;
    assert.equal(await page.locator('[data-place-id="131146262725992"] img').getAttribute('src'), firstThumbnail);
    await page.locator('#gameSearch').fill('soccer');
    const results = await page.locator('.game-card-title').allTextContents();
    assert.ok(results.length > 0 && results.length < 41 && results.every(name => name.toLowerCase().includes('soccer')));
    await page.locator('#gameSearch').fill('zzzz-no-such-game');
    assert.equal(await page.locator('.game-card').count(), 0);
    assert.ok(await page.locator('.empty-state').isVisible());
    await page.locator('#gameSearch').fill('');
    await page.locator('#sortTrigger').click();
    await page.getByRole('option', { name: 'Name A–Z' }).click();
    const names = await page.locator('.game-card-title').allTextContents();
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
    await page.screenshot({ path: 'preview/catalog-desktop.png', fullPage: false });
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/games', '/careers', '/404']) {
        await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${width}px overflow on ${route}`);
        if (width === 390 && route === '/') {
          await page.locator('.game-card-image').evaluateAll(images => images.forEach(image => image.loading = 'eager'));
          await page.waitForFunction(() => [...document.querySelectorAll('.game-card-image')].every(image => image.complete && image.naturalWidth > 0));
          await page.screenshot({ path: 'preview/home-mobile.png', fullPage: true });
          await page.locator('#navToggle').click();
          assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'true');
          await page.locator('#mainNav a[href="/games"]').click();
          assert.ok(page.url().endsWith('/games'));
        }
      }
    }
    // The saved catalogue must remain usable when the live API fails.
    await page.route('**/api/**', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"offline"}' }));
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.game-card').count(), 41);
    assert.match(await page.locator('.games-status').textContent(), /saved data/);
    assert.deepEqual(errors, []);
    console.log('PASS: first thumbnail matches Roblox; 16:9 images; 41 games; search, sort, mobile navigation, 4 viewport sizes, API failure fallback; no page errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });

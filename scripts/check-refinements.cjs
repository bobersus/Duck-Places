const { chromium } = require('C:/Users/Arseni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    fs.mkdirSync('preview', { recursive: true });
    const context = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'First visit follows dark system theme');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Manual choice persists');
    await page.goto('http://127.0.0.1:4173/careers', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Theme persists across pages');
    assert.equal(await page.locator('.role-details').count(), 1);
    assert.match(await page.locator('.apply-card .btn-primary').getAttribute('href'), /forms.gle/);
    await page.screenshot({ path: 'preview/careers-dark.png', fullPage: true });
    await page.getByRole('button', { name: 'System', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.screenshot({ path: 'preview/careers-light.png', fullPage: true });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    assert.equal(await page.getByText('Independent Roblox studio', { exact: true }).count(), 0);
    assert.equal(await page.locator('#about .value-card').count(), 3);
    assert.equal(await page.locator('.game-card-play svg').count(), 8);
    assert.equal(await page.locator('.hero-subtitle').evaluate(el => getComputedStyle(el).fontWeight), '500');
    assert.match(await page.locator('.hero .btn-primary').evaluate(el => getComputedStyle(el).boxShadow), /255, 181, 27/);
    await page.locator('#about').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'preview/about-light.png' });
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    const trigger = page.locator('#sortTrigger');
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.ok(await page.getByRole('listbox').isVisible());
    const duration = await page.locator('.sort-menu').evaluate(el => getComputedStyle(el).transitionDuration);
    assert.notEqual(duration, '0s');
    await page.locator('.sort-menu').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await page.screenshot({ path: 'preview/sort-light.png' });
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#gameSort').inputValue(), 'visits');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await trigger.press('ArrowDown'); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#gameSort').inputValue(), 'name');
    await trigger.click(); await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
    await trigger.click(); await page.locator('h1').click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await trigger.click();
    await page.locator('.sort-menu').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await page.screenshot({ path: 'preview/sort-dark.png' });
    await page.keyboard.press('Escape');
    for (const theme of ['Light', 'Dark']) {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of ['/', '/games', '/careers', '/404']) {
          await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'networkidle' });
          await page.getByRole('button', { name: theme, exact: true }).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme} ${width}px ${route}`);
          if (width === 390 && route === '/careers') await page.screenshot({ path: `preview/careers-mobile-${theme.toLowerCase()}.png`, fullPage: true });
        }
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.sort-menu').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.deepEqual(errors, []);
    console.log('PASS: system theme, manual persistence, navigation, reset to system; SVG arrows, typography, colored shadows, new studio and careers; sort keyboard, animation, outside click, Escape, reduced motion; both themes at 390/768/1440px; no page errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });

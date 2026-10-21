const { chromium } = require('C:/Users/Arseni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/games', '/careers', '/privacy-policy.html']) {
      const response = await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('.eyebrow, .value-number').count(), 0);
      assert.equal(await page.locator('.theme-buttons button svg').count(), 3);
      assert.equal(await page.locator('.theme-buttons button').first().getAttribute('aria-label'), 'Light');
      assert.equal(await page.locator('.nav-link-primary').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 172, 54)');
      if (route === '/' || route === '/games') assert.doesNotMatch(await page.locator('body').textContent(), /Statistics updated/);
      if (route === '/careers') assert.equal(await page.locator('.careers-intro h1 span').evaluate(el => getComputedStyle(el).color), 'rgb(207, 149, 29)');
      if (route !== '/privacy-policy.html') assert.equal(await page.locator('footer a[href="/privacy-policy.html"]').count(), 1);
    }
    assert.equal(await page.locator('.policy-content > section').count(), 10);
    assert.equal(await page.locator('.policy-toc a').count(), 10);
    assert.equal(await page.locator('a[href="mailto:support@duckplaces.com"]').count(), 1);
    assert.equal((await page.request.get('http://127.0.0.1:4173/assets/privacy-policy.pdf')).status(), 200);
    await page.screenshot({ path: 'preview/privacy-light.png' });
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.screenshot({ path: 'preview/theme-icons.png' });
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'preview/privacy-dark.png' });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['Light', 'Dark']) {
        await page.getByRole('button', { name: theme, exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.locator('.policy-toc a').last().click();
        await page.waitForFunction(() => location.hash === '#policy-10');
        assert.ok(await page.locator('#policy-10').isVisible());
      }
    }
    await page.locator('.theme-buttons').screenshot({ path: 'preview/theme-icons-detail.png' });
    assert.deepEqual(errors, []);
    console.log('PASS: no section labels or update timestamps; orange Contact Us; lighter Careers heading; theme icons and persistence; policy links, 10 anchors, PDF and email; both themes and three viewport widths.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });

const { chromium } = require('C:/Users/Arseni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 945 }, colorScheme: 'dark' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    const intro = await page.locator('#hero .hero-content').evaluate(hero => hero.getAnimations({ subtree: true }).filter(animation => animation.effect.getKeyframes().some(frame => String(frame.transform).includes('scale('))).length);
    assert.equal(intro, 4, 'Only the first hero has four scale intro animations');
    assert.equal(await page.locator('.hero-backdrop-image').evaluate(image => image.getAnimations().length), 1);
    await page.locator('#hero').evaluate(hero => Promise.all(hero.getAnimations({ subtree: true }).map(animation => animation.finished)));
    await page.evaluate(() => scrollTo({ top: 300, behavior: 'instant' }));
    await page.waitForFunction(() => parseFloat(document.querySelector('.hero-backdrop').style.getPropertyValue('--hero-shift')) >= 29);
    const covered = await page.locator('#hero').evaluate(hero => {
      const frame = hero.getBoundingClientRect(), image = hero.querySelector('.hero-backdrop').getBoundingClientRect();
      return image.top <= frame.top && image.bottom >= frame.bottom && image.left <= frame.left && image.right >= frame.right;
    });
    assert.ok(covered, 'Parallax never exposes a gap at the edges');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.hero-backdrop').style.getPropertyValue('--hero-shift') === '0px');
    assert.equal(await page.locator('#scrollDown').count(), 0);
    for (const [width, height] of [[1920,945], [1440,900], [390,844], [844,390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')) - document.querySelector('.site-header').getBoundingClientRect().height) < 1);
      const box = await page.locator('#hero').boundingBox();
      assert.ok(box.y + box.height >= height - 1, `Next section is below the screen at ${width}x${height}`);
      if (height > 600) assert.ok(Math.abs(box.y + box.height - height) < 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.hero-stat').first().hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.hero-stat-value')).transform.startsWith('matrix(1.14'));
    await page.screenshot({ path: 'preview/hero-full-height.png' });
    assert.ok(await page.locator('#about .studio-story').evaluate(el => el.classList.contains('motion-pending')));
    await page.locator('#about').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#about .studio-story').classList.contains('motion-revealed'));
    await page.locator('#about .studio-story').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await page.screenshot({ path: 'preview/about-revealed.png' });
    await page.goto('http://127.0.0.1:4173/games', { waitUntil: 'networkidle' });
    const alignment = await page.locator('.search-wrap').evaluate(el => {
      const icon = getComputedStyle(el, '::before');
      const input = el.querySelector('input').getBoundingClientRect();
      const wrap = el.getBoundingClientRect();
      return { icon: wrap.top + parseFloat(icon.top), input: input.top + input.height / 2, mask: icon.maskImage };
    });
    assert.ok(Math.abs(alignment.icon - alignment.input) < 1);
    assert.ok(alignment.mask.includes('svg'));
    await page.screenshot({ path: 'preview/search-aligned.png' });
    for (const route of ['/', '/careers', '/privacy-policy.html', '/404']) {
      await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'networkidle' });
      const links = page.locator('.btn-primary, .text-link');
      assert.equal(await links.locator('svg.link-arrow').count(), await links.count());
      assert.ok(await links.first().evaluate(el => getComputedStyle(el, '::after').content === 'none'));
      if (route !== '/') assert.equal(await page.locator('.careers-intro').evaluateAll(nodes => nodes.flatMap(el => el.getAnimations({ subtree: true })).length), 0);
    }
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.hero-backdrop').evaluate(el => getComputedStyle(el).transform), 'none');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#hero').evaluate(hero => hero.getAnimations({ subtree: true }).length), 0);
    assert.equal(await page.locator('.motion-pending').count(), 0);
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await noJS.goto('http://127.0.0.1:4173/');
    assert.equal(await noJS.locator('#about .studio-story').evaluate(el => getComputedStyle(el).opacity), '1');
    await noJS.close();
    assert.deepEqual(errors, []);
    console.log('PASS: viewport-filling hero at 4 sizes; 4 intro animations only on home; stat hover; SVG arrows; centered SVG search icon; scroll reveal; reduced motion; content visible without JS.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });

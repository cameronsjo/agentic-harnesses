// Run against npm run preview with Playwright available via NODE_PATH.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width === 390, hasTouch: width === 390 });
      await page.route('https://**', route => route.abort());
      await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4119/', { waitUntil: 'domcontentloaded' });
      let nav = page.locator('.app-shell > .sidenav');
      if (width === 390) {
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
        nav = page.locator('#nav-drawer .sidenav');
      }
      await nav.waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Negative control: putting the original shim back must fail native inheritance.
      if (process.env.KNOWN_BAD) {
        const css = execFileSync('git', ['show', 'origin/main:site/src/styles.css'], { encoding: 'utf8' });
        const start = css.indexOf('/* Sidenav button shim');
        const end = css.indexOf('/* ---- scenario / transport', start);
        assert(start >= 0 && end > start);
        await page.addStyleTag({ content: css.slice(start, end) });
      }
      const buttons = nav.getByRole('button').filter({ has: page.locator('.label') });
      assert.equal(await buttons.count(), 9);
      const style = await buttons.first().evaluate(el => {
        const computed = getComputedStyle(el);
        const parent = getComputedStyle(el.parentElement);
        const rect = el.getBoundingClientRect();
        return { font: computed.fontFamily, inheritedFont: parent.fontFamily,
          height: rect.height, width: rect.width, color: computed.color,
          accent: computed.getPropertyValue('--accent').trim(), shadow: computed.boxShadow };
      });
      assert.equal(style.font, style.inheritedFont);
      assert(style.height >= 44);
      assert.notEqual(style.shadow, 'none');
      await buttons.first().focus();
      assert(await buttons.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth) > 0));
      await nav.getByRole('button', { name: 'Claude Code', exact: true }).click();
      if (width === 390) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      assert.equal(await nav.getByRole('button', { name: 'Claude Code', exact: true }).getAttribute('aria-current'), 'page');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log({ viewport: width, ...style, selected: 'Claude Code', overflow: false });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

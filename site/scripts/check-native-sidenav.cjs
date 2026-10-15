/*
  Run against a local preview with Playwright supplied via NODE_PATH:

    npm run build
    npm run preview -- --host 127.0.0.1 --port 4119
    NODE_PATH=/path/to/playwright/node_modules node scripts/check-native-sidenav.cjs

  PREVIEW_URL changes the preview URL. Set CHROME_CHANNEL=chrome to use an
  installed Chrome instead of Playwright's bundled Chromium; leave it unset
  when the bundled browser is the available runtime. Set KNOWN_BAD=1 to inject
  the vendored pre-#19 shim and assert that the native-font check fails.
*/
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const harnessCount = readdirSync(path.resolve(__dirname, '../src/data/loops'))
  .filter(file => file.endsWith('.json') && file !== 'schema.json').length;
assert(harnessCount > 0, 'expected at least one harness data file');
const expectedNavButtonCount = harnessCount + 1; // one "Compare all" overview item
const knownBadShim = readFileSync(path.join(__dirname, 'fixtures/sidenav-button-shim.css'), 'utf8');

(async () => {
  const launchOptions = { headless: true };
  if (process.env.CHROME_CHANNEL) launchOptions.channel = process.env.CHROME_CHANNEL;
  const browser = await chromium.launch(launchOptions);
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
        await page.addStyleTag({ content: knownBadShim });
      }
      const buttons = nav.getByRole('button').filter({ has: page.locator('.label') });
      assert.equal(await buttons.count(), expectedNavButtonCount);
      await buttons.first().click();
      if (width === 390) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      assert.equal(await buttons.first().getAttribute('aria-current'), 'page');
      const style = await buttons.first().evaluate(el => {
        const computed = getComputedStyle(el);
        const parent = getComputedStyle(el.parentElement);
        const rect = el.getBoundingClientRect();
        return { font: computed.fontFamily, inheritedFont: parent.fontFamily,
          height: rect.height, width: rect.width, color: computed.color,
          accent: computed.getPropertyValue('--accent').trim(), shadow: computed.boxShadow };
      });
      assert.equal(style.font, style.inheritedFont, 'Native button font must inherit from navigation');
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

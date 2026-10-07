const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://ansys.synopsys.com/academic/terms-and-conditions#tab1-1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const source = fs.readFileSync(path.join(dir, 'extractor.js'), 'utf8');
    const result = await page.evaluate('(async () => { ' + source + '\nreturn await extractPage(false, false, true); })()');

    for (const name of ['Product Names', 'Fair Use and Copyright', 'Trademarks', 'Licensing and Terms of Use']) {
      assert(result.includes('--- TAB: ' + name + ' ---'), 'Missing tab capture: ' + name);
    }
    assert(result.includes('Because the Ansys portfolio contains a wide range of products'), 'Product Names body was not captured.');
    assert(result.includes('Academic users'), 'Fair Use and Copyright body was not captured.');
    assert(result.includes('Ansys trademarks its product names'), 'Trademarks body was not captured.');
    assert(result.includes('may not be used for any commercial activity'), 'Licensing and Terms of Use body was not captured.');
    assert(result.includes('Tab exploration: ON.'));
    assert(!result.includes('Tab states captured: 0'));

    const section = result.split('[TAB EXPLORATION]')[1]?.split('[TAB EXPLORATION NOTES]')[0] || '';
    console.log('PASS: Ansys four-tab capture.');
    console.log(section.trim().slice(0, 12000));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

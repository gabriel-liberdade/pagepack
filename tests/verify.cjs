// Optional browser fixture test. Run with Playwright available in NODE_PATH.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..');

(async () => {
  const executablePath = process.env.CHROME_PATH || '/usr/bin/chromium';
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.route('https://fixture.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `
      <title>PagePack fixture</title>
      <h1>Create project</h1>
      <label>Project name <input id="project-name" required value="Secret Project"></label>
      <label>Public <input id="public" type="checkbox" checked></label>
      <label>Mode <select id="mode"><option value="a">Alpha</option><option value="b" selected>Beta</option></select></label>
      <button id="continue">Continue</button>
      <button disabled>Disabled action</button>
      <div role="combobox" aria-label="Visibility" aria-expanded="false" aria-controls="visibility-options"></div>
      <div id="visibility-options" role="listbox" hidden><div role="option" aria-selected="true">Public</div><div role="option">Private</div></div>
      <input type="password" aria-label="Password" value="NEVER_READ_PASSWORD">
      <p>Bearer abcdefghijklmnop</p>
    ` }));
    await page.goto('https://fixture.test/start?token=SECRET#fragment');

    const source = fs.readFileSync(path.join(dir, 'extractor.js'), 'utf8');
    const result = await page.evaluate(`(async () => { ${source}\nreturn await extractPage(true, false); })()`);

    assert(result.includes('PAGEPACK FRAME'));
    assert(result.includes('[INTERACTIVE MAP'));
    assert(result.includes('id=project-name'));
    assert(result.includes('checked'));
    assert(result.includes('options=2'));
    assert(result.includes('E'));
    assert(result.includes('Alpha'));
    assert(result.includes('Beta'));
    assert(result.includes('Public'));
    assert(result.includes('Private'));
    assert(result.includes('[MASKED]'));
    assert(!result.includes('Secret Project'));
    assert(!result.includes('NEVER_READ_PASSWORD'));
    assert(!result.includes('abcdefghijklmnop'));
    assert(result.includes('?[PARAMETERS OMITTED]'));
    assert(result.includes('#[FRAGMENT OMITTED]'));

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.name, 'PagePack');
    assert.equal(manifest.version, '2.0.0');
    assert.equal(manifest.manifest_version, 3);

    console.log('PASS: interactive map, options, state, masking and manifest.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

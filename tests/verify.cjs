// Optional browser fixture test. Run with Playwright available in NODE_PATH.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..');

(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
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

      <h2>ARIA controls tabs</h2>
      <div role="tablist" aria-label="Primary tabs" id="primary-tabs">
        <button type="button" role="tab" id="primary-1" aria-selected="true" aria-controls="panel-1">Overview</button>
        <button type="button" role="tab" id="primary-2" aria-selected="false" aria-controls="panel-2">Details</button>
        <button type="button" role="tab" id="primary-3" aria-selected="false" aria-controls="panel-3">Async data</button>
        <button type="button" role="tab" id="primary-disabled" aria-selected="false" aria-controls="panel-disabled" aria-disabled="true">Disabled tab</button>
        <button type="button" role="tab" id="primary-noop" aria-selected="false" aria-controls="panel-noop">Unresponsive tab</button>
      </div>
      <section role="tabpanel" id="panel-1" aria-labelledby="primary-1">
        Overview content
        <div role="tablist" aria-label="Nested tabs" id="nested-tabs">
          <button type="button" role="tab" id="nested-1" aria-selected="true" aria-controls="nested-panel-1">Nested first</button>
          <button type="button" role="tab" id="nested-2" aria-selected="false" aria-controls="nested-panel-2">Nested second</button>
        </div>
        <div role="tabpanel" id="nested-panel-1" aria-labelledby="nested-1">Nested content one</div>
        <div role="tabpanel" id="nested-panel-2" aria-labelledby="nested-2" hidden>Nested content two</div>
      </section>
      <section role="tabpanel" id="panel-2" aria-labelledby="primary-2" hidden>Details content from second tab</section>
      <section role="tabpanel" id="panel-3" aria-labelledby="primary-3" hidden>Waiting for async content</section>
      <section role="tabpanel" id="panel-disabled" aria-labelledby="primary-disabled" hidden>Disabled content must not be clicked</section>
      <section role="tabpanel" id="panel-noop" aria-labelledby="primary-noop" hidden>Unresponsive content must stay hidden</section>

      <h2>Href tabs</h2>
      <div role="tablist" aria-label="Href tabs" id="href-tabs">
        <a role="tab" id="href-1" aria-selected="true" href="#href-panel-1">Hash alpha</a>
        <a role="tab" id="href-2" aria-selected="false" href="#href-panel-2">Hash beta</a>
      </div>
      <section role="tabpanel" id="href-panel-1" aria-labelledby="href-1">Same duplicated content</section>
      <section role="tabpanel" id="href-panel-2" aria-labelledby="href-2" hidden>Same duplicated content</section>

      <h2>ARIA-only tabs</h2>
      <div id="aria-only-tabs">
        <button type="button" id="aria-only-1" aria-selected="true" aria-controls="aria-only-panel-1">ARIA only first</button>
        <button type="button" id="aria-only-2" aria-selected="false" aria-controls="aria-only-panel-2">ARIA only second</button>
      </div>
      <section id="aria-only-panel-1">ARIA-only first body</section>
      <section id="aria-only-panel-2" hidden>ARIA-only second body</section>

      <script>
        function activate(tab, tablist, panel) {
          for (const other of tablist.querySelectorAll('[role="tab"]')) other.setAttribute('aria-selected', String(other === tab));
          const ids = [...tablist.querySelectorAll('[role="tab"]')]
            .map(item => item.getAttribute('aria-controls') || (item.getAttribute('href') || '').replace(/^#/, ''))
            .filter(Boolean);
          for (const id of ids) {
            const node = document.getElementById(id);
            if (node) node.hidden = node !== panel;
          }
        }
        const primaryTabs = document.getElementById('primary-tabs');
        document.getElementById('primary-1').onclick = () => activate(document.getElementById('primary-1'), primaryTabs, document.getElementById('panel-1'));
        document.getElementById('primary-2').onclick = () => activate(document.getElementById('primary-2'), primaryTabs, document.getElementById('panel-2'));
        document.getElementById('primary-3').onclick = () => setTimeout(() => {
          document.getElementById('panel-3').textContent = 'Async content loaded after click';
          activate(document.getElementById('primary-3'), primaryTabs, document.getElementById('panel-3'));
        }, 120);

        const nestedTabs = document.getElementById('nested-tabs');
        document.getElementById('nested-1').onclick = () => activate(document.getElementById('nested-1'), nestedTabs, document.getElementById('nested-panel-1'));
        document.getElementById('nested-2').onclick = () => activate(document.getElementById('nested-2'), nestedTabs, document.getElementById('nested-panel-2'));

        const hrefTabs = document.getElementById('href-tabs');
        document.getElementById('href-1').onclick = () => activate(document.getElementById('href-1'), hrefTabs, document.getElementById('href-panel-1'));
        document.getElementById('href-2').onclick = () => activate(document.getElementById('href-2'), hrefTabs, document.getElementById('href-panel-2'));

        const ariaOnly1 = document.getElementById('aria-only-1');
        const ariaOnly2 = document.getElementById('aria-only-2');
        const ariaOnlyPanel1 = document.getElementById('aria-only-panel-1');
        const ariaOnlyPanel2 = document.getElementById('aria-only-panel-2');
        ariaOnly1.onclick = () => {
          ariaOnly1.setAttribute('aria-selected', 'true');
          ariaOnly2.setAttribute('aria-selected', 'false');
          ariaOnlyPanel1.hidden = false;
          ariaOnlyPanel2.hidden = true;
        };
        ariaOnly2.onclick = () => {
          ariaOnly1.setAttribute('aria-selected', 'false');
          ariaOnly2.setAttribute('aria-selected', 'true');
          ariaOnlyPanel1.hidden = true;
          ariaOnlyPanel2.hidden = false;
        };
      </script>
    ` }));
    await page.goto('https://fixture.test/start?token=SECRET#fragment');

    const source = fs.readFileSync(path.join(dir, 'extractor.js'), 'utf8');
    const result = await page.evaluate(`(async () => { ${source}\nreturn await extractPage(true, false, true); })()`);

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

    assert(result.includes('Tab exploration: ON.'));
    assert(result.includes('[TAB EXPLORATION]'));
    assert(result.includes('--- TAB: Overview ---'));
    assert(result.includes('Details content from second tab'));
    assert(result.includes('Async content loaded after click'));
    assert(result.includes('Nested content one'));
    assert(result.includes('Nested content two'));
    assert(result.includes('ARIA-only second body'));
    assert(result.includes('--- TAB: ARIA only second ---'));
    assert(result.includes('Same duplicated content'));
    assert(result.includes('duplicate of tab'));
    assert(result.includes('Disabled tab'));
    assert(result.includes('Unresponsive tab'));
    assert(result.includes('capture failed'));
    assert.equal(await page.locator('#primary-1').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#nested-1').getAttribute('aria-selected'), 'true');
    assert.equal(new URL(page.url()).hash, '#fragment');

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.name, 'PagePack');
    assert.equal(manifest.version, '2.1.0');
    assert.equal(manifest.manifest_version, 3);

    console.log('PASS: map, masking, dropdowns, robust tab exploration, nested tabs, deduplication and state restoration.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

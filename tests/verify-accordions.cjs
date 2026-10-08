const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <div role="tablist"><button type="button" role="tab" aria-selected="true" aria-controls="mobile" id="m">Celular</button><button type="button" role="tab" aria-selected="false" aria-controls="desktop" id="d">Computador</button></div>
      <section role="tabpanel" id="mobile"><details id="outer"><summary>Auditorias aprovadas</summary><p>Mobile audit body</p><details id="inner"><summary>Nested audit</summary><p>Nested useful body</p></details></details></section>
      <section role="tabpanel" id="desktop" hidden><details id="other"><summary>Auditorias aprovadas</summary><p>Desktop audit body</p></details></section>
      <button type="button" id="async" aria-expanded="false" aria-controls="async-panel">Exibir detalhes</button><section id="async-panel" hidden></section>
      <button type="button" aria-expanded="false" aria-controls="noop">Unresponsive panel</button><section id="noop" hidden>Do not claim this was captured</section>
      <form onsubmit="window.submitted=true;return false"><button aria-expanded="false" aria-controls="unsafe">Mostrar</button><section id="unsafe" hidden>Unsafe body</section></form>
      <script>
        m.onclick=()=>{m.setAttribute('aria-selected','true');d.setAttribute('aria-selected','false');mobile.hidden=false;desktop.hidden=true;};
        d.onclick=()=>{d.setAttribute('aria-selected','true');m.setAttribute('aria-selected','false');desktop.hidden=false;mobile.hidden=true;};
        document.getElementById('async').onclick=()=>{const c=document.getElementById('async'),p=document.getElementById('async-panel');const open=c.getAttribute('aria-expanded')!=='true';c.setAttribute('aria-expanded',String(open));p.hidden=!open;if(open)setTimeout(()=>p.textContent='Loaded useful async content',120);};
      </script>`);
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../extractor.js'), 'utf8') });
    const result = await page.evaluate(() => extractPage(false, false, true));
    assert.match(result, /TAB: Celular \| Panel: "Auditorias aprovadas".*captured/);
    assert.match(result, /TAB: Computador \| Panel: "Auditorias aprovadas".*captured/);
    for (const text of ['Mobile audit body', 'Desktop audit body', 'Nested useful body', 'Loaded useful async content']) assert(result.includes(text));
    assert.match(result, /Unresponsive panel.*failed:/);
    assert.match(result, /Panel: "Mostrar".*skipped: unsafe/);
    assert.equal(await page.evaluate(() => window.submitted), undefined);
    assert.equal(await page.locator('#m').getAttribute('aria-selected'), 'true');
    for (const id of ['outer', 'inner', 'other']) assert.equal(await page.locator('#'+id).evaluate(el => el.open), false);
    assert.equal(await page.locator('#async').getAttribute('aria-expanded'), 'false');
    const off = await page.evaluate(() => extractPage(false, false, false, false));
    assert.match(off, /Accordion exploration: OFF/);
    assert.match(off, /Expandable panels found: 0/);
    const limited = await page.evaluate(() => extractPage(false, false, false, true, { maxDepth: 1, maxPanels: 1 }));
    assert.match(limited, /skipped: (depth|panel) limit/);
    console.log('PASS: accordion content per tab, nested and async panels, failure reporting, unsafe submissions, restoration and limits.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

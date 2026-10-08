const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const storage = new Map();
function open() {
  const controls = Object.fromEntries(['copy', 'save', 'status', 'mask', 'tabs', 'reveal'].map(id => [id, { checked: false, listeners: {}, addEventListener(event, callback) { this.listeners[event] = callback; } }]));
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../popup.js'), 'utf8'), {
    document: { getElementById: id => controls[id] },
    localStorage: { getItem: key => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, value) }
  });
  return controls;
}
let controls = open();
assert.equal(controls.mask.checked, false);
assert.equal(controls.reveal.checked, false);
assert.equal(controls.tabs.checked, true);
for (const id of ['mask', 'tabs', 'reveal']) {
  controls[id].checked = !controls[id].checked;
  controls[id].listeners.change();
}
controls = open();
assert.equal(controls.mask.checked, true);
assert.equal(controls.reveal.checked, true);
assert.equal(controls.tabs.checked, false);
for (const id of ['mask', 'tabs', 'reveal']) {
  controls[id].checked = !controls[id].checked;
  controls[id].listeners.change();
}
controls = open();
assert.equal(controls.mask.checked, false);
assert.equal(controls.reveal.checked, false);
assert.equal(controls.tabs.checked, true);
console.log('PASS: defaults and all preferences persist both true and false after reopening.');

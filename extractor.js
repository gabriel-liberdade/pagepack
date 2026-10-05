/* Self-contained: chrome.scripting serializes this function into the active tab. */
async function extractPage(mask = true, revealMenus = false) {
  const omitted = '[EXCLUDED: credential]';
  const masked = '[MASKED]';
  const secretKey = /password|passwd|senha|passphrase|token|secret|credential|credencial|authorization|api[-_\s]?key|access[-_\s]?key|session[-_\s]?(?:id|key)|csrf|xsrf|otp|one[-_\s]?time|verification[-_\s]?code|c[oó]digo.*(?:acesso|verifica|autentica)|login|username|usu[aá]rio/i;
  const personalKey = /\bcpf\b|\bcnpj\b|e[-_\s]?mail|phone|telefone|celular|\btel\b|protocolo|solicita[cç][aã]o|nome|name|endere[cç]o|address|nascimento|birth|identidade|documento|passport|passaporte|raz[aã]o|cep|postal/i;
  const customSelector = '[role="combobox"],[role="listbox"],[role="radio"],[role="checkbox"],[role="switch"],[role="textbox"],[role="searchbox"],[role="spinbutton"],[role="slider"],[contenteditable]:not([contenteditable="false"])';
  const dropdownSelector = '[role="combobox"],[aria-haspopup="listbox"],md-select,mat-select,ng-select,.ng-select,.ui-select-container,.selectize-control';
  const optionSelector = '[role="option"],md-option,mat-option,ng-option,.ng-option,.ui-select-choices-row,.selectize-dropdown [data-value]';
  const structureSelector = `h1,h2,h3,h4,h5,h6,[role="heading"],a[href],button,label,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="menuitem"],${customSelector}`;
  const excludedTags = 'script,style,noscript,template,input,textarea,select';
  const interactiveSelector = [
    'a[href]', 'button', 'input:not([type="hidden"])', 'textarea', 'select', 'summary',
    '[contenteditable]:not([contenteditable="false"])', '[role="button"]', '[role="link"]',
    '[role="checkbox"]', '[role="radio"]', '[role="switch"]', '[role="textbox"]', '[role="searchbox"]',
    '[role="combobox"]', '[role="listbox"]', '[role="tab"]', '[role="menuitem"]', '[role="treeitem"]',
    '[role="slider"]', '[role="spinbutton"]', '[role="gridcell"]', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  }
  const all = selector => roots.flatMap(root => [...root.querySelectorAll(selector)]);
  const uniqueElements = elements => [...new Set(elements)];
  const sensitiveElements = new Set();

  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    for (let ancestor = el; ancestor; ancestor = ancestor.parentElement || ancestor.getRootNode().host) {
      const css = getComputedStyle(ancestor);
      if (ancestor.hidden || css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse' || Number(css.opacity) === 0 || css.contentVisibility === 'hidden') return false;
    }
    return [...el.getClientRects()].some(rect => rect.width > 0 && rect.height > 0);
  }

  function insideSecret(el) {
    for (let ancestor = el; ancestor; ancestor = ancestor.parentElement || ancestor.getRootNode().host) {
      if (sensitiveElements.has(ancestor)) return true;
    }
    return false;
  }

  function textOf(el, includeHidden = false) {
    if (!el) return '';
    const parts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      if (!node.parentElement?.closest(excludedTags) && !insideSecret(node.parentElement) && (includeHidden || visible(node.parentElement))) parts.push(node.textContent);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function labelledByText(el) {
    return (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .map(id => el.getRootNode().getElementById?.(id)).filter(Boolean).map(node => textOf(node, true)).join(' ').trim();
  }

  function labelOf(el) {
    const labels = [...(el.labels || [])].map(label => textOf(label, true)).filter(Boolean).join(' ').trim();
    const inputValue = el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type) ? el.value : '';
    return labels || labelledByText(el) || el.getAttribute('aria-label') || inputValue || el.getAttribute('alt') || textOf(el) || el.getAttribute('placeholder') || el.getAttribute('title') || el.name || el.id || '(unlabeled)';
  }

  function groupLabel(el) {
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector(':scope > legend');
      if (legend && textOf(legend, true)) return textOf(legend, true);
    }
    const group = el.closest('[role="group"],[role="radiogroup"],[role="listbox"]');
    if (group && group !== el) return labelOf(group);
    return '';
  }

  function contextOf(el) {
    return [labelOf(el), groupLabel(el), el.name, el.id, el.type, el.autocomplete].filter(Boolean).join(' ');
  }

  const controls = all('input:not([type="hidden"]),select,textarea').filter(visible);
  const customControls = all(customSelector).filter(el => visible(el) && !el.matches('input,select,textarea,button') && !(el.isContentEditable && el.parentElement?.isContentEditable));
  for (const el of [...controls, ...customControls]) {
    if (el.type === 'password' || secretKey.test(contextOf(el))) sensitiveElements.add(el);
  }

  const replacements = [];
  if (mask) for (const el of controls) {
    if (!sensitiveElements.has(el) && el.type !== 'file' && (personalKey.test(contextOf(el)) || el.tagName === 'TEXTAREA' || ['text','email','tel','search','url','number','date','datetime-local'].includes(el.type)) && el.value) replacements.push(el.value);
  }
  if (mask) for (const el of customControls) {
    const role = el.getAttribute('role');
    if (!insideSecret(el) && (personalKey.test(contextOf(el)) || el.isContentEditable || role === 'textbox' || role === 'searchbox')) {
      const value = el.getAttribute('aria-valuetext') || ('value' in el ? el.value : '') || textOf(el);
      if (value) replacements.push(value);
    }
  }
  replacements.sort((a, b) => b.length - a.length);

  function clean(value) {
    let text = String(value ?? '');
    text = text.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, omitted)
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, omitted)
      .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|AKIA[A-Z0-9]{16})\b/g, omitted)
      .replace(/((?:password|passwd|senha|token|secret|api[-_ ]?key|authorization|credencial|login|username)\s*[:=]\s*)[^\s,;]+/gi, '$1' + omitted);
    if (!mask) return text;
    for (const value of replacements) text = text.split(value).join(masked);
    return text.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL MASKED]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID MASKED]')
      .replace(/((?:protocolo|n[uú]mero\s+(?:da\s+)?solicita[cç][aã]o)\s*[:#=]?\s*)[a-z0-9][a-z0-9./_-]*\d[a-z0-9./_-]*/gi, '$1[PROTOCOL MASKED]')
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ MASKED]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF MASKED]')
      .replace(/(?:\+?55[\s.-]*)?\(?\b\d{2}\)?[\s.-]*\d{4,5}[\s.-]*\d{4}\b/g, '[PHONE MASKED]')
      .replace(/\b\d{4,5}[- ]\d{4}\b/g, '[PHONE MASKED]')
      .replace(/\b\d{6,}\b/g, '[NUMBER/ID MASKED]');
  }

  function safeURL(value) {
    try {
      const url = new URL(value, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return '[non-HTTP URL omitted]';
      url.username = url.password = '';
      let secretPathValue = false;
      const pathname = url.pathname.split('/').map(segment => {
        let decoded;
        try { decoded = decodeURIComponent(segment); } catch { decoded = segment; }
        if (secretPathValue) { secretPathValue = false; return '[EXCLUDED]'; }
        if (secretKey.test(decoded) || /\beyJ|^sk-/.test(decoded)) { secretPathValue = true; return '[EXCLUDED]'; }
        if (mask && (/\d/.test(decoded) || decoded.length >= 24 || /@/.test(decoded))) return '[ID MASKED]';
        return clean(decoded);
      }).join('/');
      return clean(url.origin) + pathname + (url.search ? '?[PARAMETERS OMITTED]' : '') + (url.hash ? '#[FRAGMENT OMITTED]' : '');
    } catch { return '[invalid URL]'; }
  }

  function stateBits(el) {
    const bits = [];
    const disabled = !!el.disabled || el.getAttribute('aria-disabled') === 'true';
    bits.push(disabled ? 'disabled' : 'enabled');
    if ('checked' in el && ['checkbox', 'radio'].includes(el.type)) bits.push(el.checked ? 'checked' : 'unchecked');
    if (el.hasAttribute('aria-checked')) bits.push(`aria-checked=${clean(el.getAttribute('aria-checked'))}`);
    if (el.hasAttribute('aria-selected')) bits.push(`aria-selected=${clean(el.getAttribute('aria-selected'))}`);
    if (el.hasAttribute('aria-expanded')) bits.push(`expanded=${clean(el.getAttribute('aria-expanded'))}`);
    if (el.hasAttribute('aria-pressed')) bits.push(`pressed=${clean(el.getAttribute('aria-pressed'))}`);
    if (el.hasAttribute('aria-current')) bits.push(`current=${clean(el.getAttribute('aria-current'))}`);
    if (el.hasAttribute('aria-invalid')) bits.push(`invalid=${clean(el.getAttribute('aria-invalid'))}`);
    if (el.readOnly || el.getAttribute('aria-readonly') === 'true') bits.push('readonly');
    if (el.required || el.getAttribute('aria-required') === 'true') bits.push('required');
    return bits;
  }

  function safeControlValue(el) {
    const context = contextOf(el);
    const role = el.getAttribute('role') || '';
    if (insideSecret(el) || secretKey.test(context)) return omitted;
    if (el.type === 'file') return '[FILE: contents/path not collected]';
    if (el.tagName === 'SELECT') {
      return [...el.selectedOptions].map(option => `${clean(option.text)} (value=${clean(option.value)})`).join('; ') || '(no selection)';
    }
    const personal = mask && (personalKey.test(context) || el.tagName === 'TEXTAREA' || ['text','email','tel','search','url','number','date','datetime-local'].includes(el.type) || role === 'textbox' || role === 'searchbox' || el.isContentEditable);
    if (personal) return masked;
    const activeId = el.getAttribute('aria-activedescendant');
    const active = activeId ? el.getRootNode().getElementById?.(activeId) : null;
    const value = el.getAttribute('aria-valuetext') || ('value' in el ? el.value : '') || (active ? textOf(active, tr
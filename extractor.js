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
  for (const el of [...controls, ...customContro
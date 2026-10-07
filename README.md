# PagePack

**Turn any webpage into structured context that an AI can understand and use to guide you.**

PagePack is a local-first browser extension for Chromium-based browsers such as Brave and Chrome. With one click it maps the current webpage into readable text you can paste into ChatGPT, Claude, Gemini, Copilot, or any other AI assistant.

Instead of exporting only page text, PagePack builds an **interactive map** of the page. Every relevant control receives a temporary reference such as `E001`, `E002`, `E003`, so an AI can answer with precise instructions like:

> Click `FRAME 0 / E014`, type the repository name in `E009`, choose option `E021.O2`, then click `E027`.

## What PagePack captures

- Visible page text and headings
- Links and sanitized destinations
- Buttons and their enabled/disabled state
- Text fields, textareas and current values
- Checkboxes, radios and switches with checked state
- Native `<select>` elements with **all options**, including selected/disabled state and optgroups
- Custom ARIA comboboxes/listboxes and options already present in the DOM
- Optional best-effort exploration of custom dropdowns whose options are loaded only after opening the menu
- Automatic exploration of recognized tabs, including JavaScript-driven and nested tab states, with best-effort restoration of the original state
- Labels, placeholders, names, IDs, roles and useful ARIA relationships
- Validation metadata such as required, min/max, pattern, maxlength and error/help references
- Forms, submit controls, dialogs, landmarks, tabs and details elements
- Open shadow DOM
- Same-origin and cross-origin frames when browser permissions allow access

PagePack does **not** control your browser for you. The exported references are meant to help an AI tell *you* exactly where to click or what to fill in.

## Why this exists

Screenshots are useful, but they can miss text, hidden select options, exact field states and accessibility metadata. Raw HTML is too noisy and can expose unnecessary data. PagePack produces a compact, AI-friendly middle layer focused on what a person needs to understand and operate the page.

## Install in Brave or Chrome

1. Download or clone this repository.
2. Open `brave://extensions` or `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Pin **PagePack** to the toolbar if desired.

## Use

1. Open the webpage you want help with.
2. Click the PagePack extension icon.
3. Enable **Mask personal data** when you want ordinary personal values redacted. Recognizable credentials are excluded regardless.
4. Leave **Explore tabs automatically** enabled to capture recognized tab states; disable it on a page if you do not want PagePack to interact with tabs.
5. Optionally enable **Explore hidden menu options** if the page uses menus whose options only appear after opening them.
6. Click **Copy PagePack**.
7. Paste into your AI assistant with `Ctrl+V` and ask what to click, select or type.

You can also save the output as a UTF-8 TXT file.

## Interactive references

References are generated fresh on every export and are scoped to a frame:

```text
===== FRAME 0 — MAIN =====
E001 | LINK | "Skip to content" | enabled | ...
E009 | TEXT | "Repository name *" | value=(empty) | enabled, required | id=repository-name-input
E021 | BUTTON | "Public" | enabled | haspopup=listbox
E027 | BUTTON | "Create repository" | enabled
```

Dropdown options use child references:

```text
E021 DROPDOWN | "Visibility" | options-known=2
  E021.O1 | "Public" | selected | visible
  E021.O2 | "Private" | not-selected | visible
```

This makes follow-up instructions much less ambiguous when a page contains repeated labels or several similar buttons.

## Automatic tab exploration

PagePack 2.1 can explore recognized tab interfaces instead of exporting only the tab that happens to be selected. It prioritizes ARIA tabs/tablists and common tab attributes, interacts only when the control has strong tab evidence, waits for tab/panel/DOM state to settle, captures each state, deduplicates identical content, limits nesting and total exploration, then attempts to restore the original tab and hash.

The feature is enabled by default and can be turned off in the popup. It does not intentionally follow links to another page or click generic action buttons.

## Custom dropdown exploration

Some modern sites do not create menu options until a dropdown is opened. PagePack has an **experimental, opt-in** mode that tries to click only recognized combobox/listbox controls that currently expose no options, waits briefly, records newly available options, and then attempts to close the menu with Escape.

It is disabled by default because opening a menu can temporarily change page UI or trigger lazy-loading/network activity. PagePack does not intentionally submit forms or click arbitrary action buttons during this process.

If a site still does not expose the options, open that dropdown manually, leave it open, and export again.

## Privacy and security

PagePack runs locally in the browser and does not send captures to a server.

- Password fields and controls whose context looks like credentials, tokens, authentication codes or secrets are never intentionally read.
- Recognizable Bearer tokens, JWTs and common API-key formats are removed from exported text.
- URL query parameters and fragments are omitted from ordinary URL output. Tab exploration may report a same-page tab hash as state metadata.
- With masking enabled, common personal data patterns and values from ordinary text-entry fields are masked.
- File contents and local file paths are not collected.
- Cookies, localStorage, sessionStorage, request headers, network bodies and password-manager data are not read.
- Extension pages use a CSP that disables network connections.

Masking is heuristic, not a guarantee. Review the result before sharing sensitive pages.

## Limits

A normal browser extension cannot inspect the browser's own toolbar, tabs, menus or other native UI the way an OS-level accessibility/screen tool can. PagePack focuses on the webpage DOM.

It may also miss closed shadow DOM, protected browser pages, internal PDF viewers, text rendered only in images/canvas, virtualized items not currently created by the site, and frames blocked by the browser.

## Development

The extension has no build step. Main files:

- `manifest.json`
- `popup.html`
- `popup.css`
- `popup.js`
- `frames.js`
- `extractor.js`

Syntax check:

```bash
node --check extractor.js
node --check frames.js
node --check popup.js
```

The browser fixture test in `tests/verify.cjs` uses Playwright when available.

## Licença / License

MIT. See [LICENSE](LICENSE).

---

### Resumo em português

O PagePack transforma a página aberta em um mapa textual para IA. Ele identifica campos, botões, checkboxes, radios, selects, dropdowns e estados atuais, atribui referências como `E012` e lista opções como `E012.O1`. Você cola o resultado na IA e pode pedir: **“me diga exatamente onde clicar e o que preencher”**.

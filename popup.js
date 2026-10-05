const copyButton = document.getElementById('copy');
const saveButton = document.getElementById('save');
const status = document.getElementById('status');

async function exportPage(action) {
  copyButton.disabled = saveButton.disabled = true;
  status.textContent = 'Mapeando página e controles…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Nenhuma aba disponível.');
    const mask = document.getElementById('mask').checked;
    const revealMenus = document.getElementById('reveal').checked;
    const { text, count, missing } = await collectFrames(tab.id, mask, revealMenus);
    const summary = `${count} frame(s) exportado(s).${missing ? ` ${missing} frame(s) não capturado(s).` : ''}`;

    if (action === 'copy') {
      await navigator.clipboard.writeText(text);
      status.textContent = `Copiado. Cole em qualquer IA com Ctrl+V. ${summary}`;
    } else {
      const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pagepack-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = `TXT gerado. Veja os downloads do navegador. ${summary}`;
    }
  } catch (error) {
    status.textContent = error?.name === 'NotAllowedError'
      ? 'O navegador bloqueou a cópia. Use Salvar TXT.'
      : 'Não foi possível mapear esta página. Páginas internas, lojas de extensões e alguns PDFs são bloqueados pelo navegador.';
  } finally {
    copyButton.disabled = saveButton.disabled = false;
  }
}

copyButton.addEventListener('click', () => exportPage('copy'));
saveButton.addEventListener('click', () => exportPage('save'));

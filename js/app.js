(function () {
  const { PROVIDERS, ORDER } = window.LMATFY;
  const { ROASTS, ROAST_ORDER, DEFAULT_ROAST } = window.LMATFY_ROASTS;

  const providerGrid = document.getElementById('providerGrid');
  const roastGrid = document.getElementById('roastGrid');
  const customRoastEl = document.getElementById('customRoast');
  const questionEl = document.getElementById('question');
  const charCountEl = document.getElementById('charCount');
  const generateBtn = document.getElementById('generateBtn');
  const resultEl = document.getElementById('result');
  const linkOutput = document.getElementById('linkOutput');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const previewBtn = document.getElementById('previewBtn');
  const prefillNote = document.getElementById('prefillNote');
  const historyList = document.getElementById('historyList');

  const MAX_LEN = 600;
  const HISTORY_KEY = 'lmatfy_history';
  let selectedProvider = 'gpt';
  let selectedRoast = DEFAULT_ROAST;

  if (window.LMATFY_THEME) {
    window.LMATFY_THEME.watch((mode) => {
      document.documentElement.setAttribute('data-theme', mode);
    });
  }

  function renderProviderGrid() {
    providerGrid.innerHTML = ORDER.map((id) => {
      const p = PROVIDERS[id];
      return `
        <div class="provider-card ${id === selectedProvider ? 'selected' : ''}" data-id="${id}" style="--pc:${p.brandColor}">
          <div class="check">✓</div>
          <div class="icon">${p.logo('card-' + id)}</div>
          <div class="name">${p.name}</div>
        </div>`;
    }).join('');

    providerGrid.querySelectorAll('.provider-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectedProvider = card.dataset.id;
        renderProviderGrid();
        resultEl.classList.remove('show');
      });
    });
  }

  function renderRoastGrid() {
    roastGrid.innerHTML = ROAST_ORDER.map((id) => {
      const r = ROASTS[id];
      return `
        <button type="button" class="roast-pill ${id === selectedRoast ? 'selected' : ''}" data-id="${id}">
          <span class="emoji">${r.emoji}</span>${r.name}
        </button>`;
    }).join('');

    roastGrid.querySelectorAll('.roast-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        selectedRoast = pill.dataset.id;
        renderRoastGrid();
        resultEl.classList.remove('show');
      });
    });

    customRoastEl.classList.toggle('show', selectedRoast === 'custom');
    if (selectedRoast === 'custom') customRoastEl.focus();
  }

  function updateCharCount() {
    const len = questionEl.value.length;
    charCountEl.textContent = `${len} / ${MAX_LEN}`;
  }

  /**
   * The whole link payload is LZ-compressed into a single opaque "d" param so
   * the URL stays compact and the recipient can't read the question (or the
   * roast) before the animation plays. Format before compression is
   * "provider\nroast\ncustomMessage\nquestion" — the question goes last so it
   * can safely contain newlines; the custom message is a single-line input.
   */
  function buildLaunchUrl(providerId, question, roast, customMessage) {
    const payload = [providerId, roast, roast === 'custom' ? customMessage : '', question].join('\n');
    const url = new URL('launch.html', window.location.href);
    url.searchParams.set('d', LZString.compressToEncodedURIComponent(payload));
    return url.toString();
  }

  function buildShareMessage(link) {
    return `Could have searched this, but here: ${link}`;
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(entry) {
    const history = getHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
    renderHistory();
  }

  function removeHistory(index) {
    const history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-history">No links yet — generate one above and it\'ll show up here.</div>';
      return;
    }
    historyList.innerHTML = history
      .map((item, i) => {
        const p = PROVIDERS[item.provider];
        return `
          <div class="history-item">
            <span class="dot" style="background:${p ? p.brandColor : '#888'}"></span>
            <span class="q" dir="auto">${escapeHtml(item.question)}</span>
            <span class="provider-tag">${p ? p.name : item.provider}</span>
            <button data-copy="${i}" title="Copy link">Copy</button>
            <button data-remove="${i}" title="Remove">✕</button>
          </div>`;
      })
      .join('');

    historyList.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = getHistory()[Number(btn.dataset.copy)];
        if (item) copyToClipboard(item.link, btn, 'Copy');
      });
    });
    historyList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeHistory(Number(btn.dataset.remove)));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function copyToClipboard(text, btn, restoreLabel) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
    }
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = restoreLabel || original), 1400);
    }
  }

  generateBtn.addEventListener('click', () => {
    const question = questionEl.value.trim();
    if (!question) {
      questionEl.focus();
      questionEl.style.borderColor = '#e5484d';
      setTimeout(() => (questionEl.style.borderColor = ''), 900);
      return;
    }

    const customMessage = customRoastEl.value.trim();
    if (selectedRoast === 'custom' && !customMessage) {
      customRoastEl.focus();
      customRoastEl.style.borderColor = '#e5484d';
      setTimeout(() => (customRoastEl.style.borderColor = ''), 900);
      return;
    }

    const link = buildLaunchUrl(selectedProvider, question, selectedRoast, customMessage);
    linkOutput.value = link;
    previewBtn.href = link;
    prefillNote.textContent = 'Send it. Let the animation do the judging.';
    resultEl.classList.add('show');

    saveHistory({ provider: selectedProvider, question, link, ts: Date.now() });
  });

  copyBtn.addEventListener('click', () => copyToClipboard(linkOutput.value, copyBtn, 'Copy'));

  shareBtn.addEventListener('click', async () => {
    const text = buildShareMessage(linkOutput.value);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Let me GPT that for you', text, url: linkOutput.value });
        return;
      } catch (e) {
        // Fall back to copy when the share sheet is cancelled or unavailable.
      }
    }
    copyToClipboard(text, shareBtn, 'Share');
  });

  questionEl.addEventListener('input', updateCharCount);

  renderProviderGrid();
  renderRoastGrid();
  updateCharCount();
  renderHistory();
})();

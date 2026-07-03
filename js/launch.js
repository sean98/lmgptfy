(function () {
  const { PROVIDERS } = window.LMATFY;
  const ROASTS = window.LMATFY_ROASTS;
  const root = document.getElementById('root');
  const body = document.getElementById('launchBody');

  const { providerId, question, roastId, customMessage } = parseLink();
  const provider = PROVIDERS[providerId];
  const roast = ROASTS.get(roastId);

  if (!provider || !question) {
    renderError();
    return;
  }

  /**
   * Links carry a compressed payload in "d" (see app.js for the format). The
   * original plain "?to=...&q=..." format is still accepted so old links keep
   * working.
   */
  function parseLink() {
    const params = new URLSearchParams(window.location.search);
    const compressed = params.get('d');
    if (compressed) {
      const payload = LZString.decompressFromEncodedURIComponent(compressed);
      if (!payload) return {};
      const [providerId, roastId, customMessage, ...rest] = payload.split('\n');
      return {
        providerId,
        roastId,
        customMessage: (customMessage || '').trim(),
        question: rest.join('\n').trim(),
      };
    }
    return {
      providerId: params.get('to'),
      question: (params.get('q') || '').trim(),
      roastId: null,
      customMessage: '',
    };
  }

  const message = (roast.id === 'custom' && customMessage ? customMessage : roast.message).replace(
    /\{name\}/g,
    provider.name
  );

  applyPalette(getMode());
  if (window.LMATFY_THEME) {
    window.LMATFY_THEME.watch((mode) => applyPalette(mode));
  }
  runSequence();

  function getMode() {
    return window.LMATFY_THEME ? window.LMATFY_THEME.current() : 'light';
  }

  function applyPalette(mode) {
    const palette = provider.palette[mode] || provider.palette.light;
    body.style.setProperty('--p-bg', palette.bg);
    body.style.setProperty('--p-panel', palette.panel);
    body.style.setProperty('--p-input-bg', palette.input);
    body.style.setProperty('--p-border', palette.border);
    body.style.setProperty('--p-text', palette.text);
    body.style.setProperty('--p-muted', palette.muted);
    body.style.setProperty('--p-accent', palette.accent);
    body.classList.add('launch-body', provider.themeClass);
  }

  function renderError() {
    root.innerHTML = `
      <div class="launch-error">
        <div style="font-size:40px;">🤔</div>
        <h2 style="margin:0;">This link is missing something</h2>
        <p style="color:var(--muted);max-width:420px;">
          We couldn't find a valid AI provider and question in this link.
        </p>
        <a href="index.html" class="primary-btn" style="width:auto;padding:12px 22px;">Create a new link</a>
      </div>`;
  }

  function runSequence() {
    root.innerHTML = `
      <div class="mock-shell">
        <div class="mock-rail">
          <span class="rail-logo">${provider.logo('rail')}</span>
          <span class="rail-dot new"></span>
          <span class="rail-dot"></span>
          <span class="rail-dot"></span>
          <span class="rail-dot"></span>
        </div>
        <div class="mock-app">
          <button class="skip-btn" id="skipBtn">Skip ▶</button>
          <div class="mock-topbar">
            <span class="logo">${provider.logo('top')}</span>
            <span class="wordmark">${provider.wordmark}</span>
            <span class="chip">${provider.modelChip}</span>
          </div>
          <div class="mock-center">
            <div class="mock-greeting">${provider.greeting}</div>
            <div class="mock-inputbar" id="inputbar">
              <span class="typed-text" id="typedText" dir="auto"></span><span class="caret" id="caret"></span>
              <span class="mock-send-btn" id="sendBtn">➤</span>
            </div>
          </div>
          <span class="mock-pointer" id="mockPointer" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 2.5L19 12.8L12.3 13.9L9.6 20.5L5 2.5Z" fill="#1a1a1a" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
          </span>
          <div class="mock-footer">
            <div class="mock-progress-track"><div class="mock-progress-fill" id="progressFill"></div></div>
            <div class="mock-status-text" id="statusText" dir="auto">${message}</div>
          </div>
        </div>
      </div>`;

    const typedTextEl = document.getElementById('typedText');
    const sendBtn = document.getElementById('sendBtn');
    const progressFill = document.getElementById('progressFill');
    const skipBtn = document.getElementById('skipBtn');
    const pointer = document.getElementById('mockPointer');
    const inputbar = document.getElementById('inputbar');

    const destination = provider.buildUrl(question);
    const timers = [];
    let redirected = false;

    const POINTER_APPEAR = 250;
    const POINTER_TRAVEL = 1200;
    const POINTER_SETTLE = 300;
    const PRE_DELAY = POINTER_APPEAR + POINTER_TRAVEL + POINTER_SETTLE;
    // Rough estimate only, for the progress bar's pacing — real typing time is
    // whatever typeQuestion() actually takes (see its per-character rhythm).
    // Not scaled down for long questions: a real person doesn't type a
    // 500-character question at 3x speed just because it's long.
    const TYPING_DURATION = 110 * question.length;
    const POST_TYPE_PAUSE = 500;
    const SEND_PULSE = 500;
    const STATUS_PAUSE = 1400;
    const TOTAL = PRE_DELAY + TYPING_DURATION + POST_TYPE_PAUSE + SEND_PULSE + STATUS_PAUSE;

    // Cap below 100% — the timeline estimate can drift from the actual
    // setTimeout chain (typing jitter, tab throttling), and the bar must never
    // look finished while the steps are still playing. goToDestination()
    // snaps it to 100%.
    const startTime = performance.now();
    const progressInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(96, (elapsed / TOTAL) * 100);
      progressFill.style.width = pct + '%';
    }, 50);
    timers.push(progressInterval);

    schedule(POINTER_APPEAR, () => movePointerToInput());

    schedule(PRE_DELAY, () => {
      pointer.style.opacity = '0';
      inputbar.classList.add('focused');
      typeQuestion(typedTextEl, question, () => {
        schedule(POST_TYPE_PAUSE, () => {
          sendBtn.classList.add('active');
          attemptClipboardCopy(question);
          schedule(SEND_PULSE + STATUS_PAUSE, () => goToDestination());
        });
      });
    });

    function movePointerToInput() {
      const from = pointer.getBoundingClientRect();
      const to = inputbar.getBoundingClientRect();
      const targetX = to.left + Math.min(46, to.width * 0.12) - from.left;
      const targetY = to.top + to.height / 2 - from.top;
      pointer.style.setProperty('--tx', `${targetX}px`);
      pointer.style.setProperty('--ty', `${targetY}px`);
      pointer.style.opacity = '1';
      pointer.style.transition = `transform ${POINTER_TRAVEL}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      pointer.style.transform = 'translate(var(--tx), var(--ty))';
      schedule(POINTER_TRAVEL, () => {
        pointer.classList.add('clicked');
      });
    }

    skipBtn.addEventListener('click', () => {
      attemptClipboardCopy(question);
      goToDestination();
    });

    function schedule(delay, fn) {
      const id = setTimeout(fn, delay);
      timers.push(id);
      return id;
    }

    function goToDestination() {
      if (redirected) return;
      redirected = true;
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      progressFill.style.width = '100%';
      window.location.href = destination;
    }
  }

  /**
   * Mimics a real typing rhythm rather than a flat interval: a baseline
   * keystroke speed with jitter, a small break after spaces (word boundary),
   * a longer break after sentence-ending punctuation (thinking/breathing),
   * and occasional random hesitation mid-word. Deliberately NOT scaled by
   * question length — a long question should still look hand-typed, not
   * fast-forwarded.
   */
  function typeQuestion(el, text, onDone) {
    let i = 0;
    function step() {
      if (i >= text.length) {
        onDone && onDone();
        return;
      }
      const typedChar = text[i];
      i += 1;
      el.textContent = text.slice(0, i);
      setTimeout(step, delayAfter(typedChar));
    }
    step();
  }

  function delayAfter(char) {
    const keystroke = 60 + Math.random() * 55; // baseline human typing rhythm
    if ('.!?'.includes(char)) return keystroke + 200 + Math.random() * 260; // end-of-sentence breath
    if (',;:'.includes(char)) return keystroke + 100 + Math.random() * 150; // clause pause
    if (char === ' ') return keystroke + 30 + Math.random() * 90; // word boundary
    if (Math.random() < 0.06) return keystroke + 150 + Math.random() * 280; // mid-word hesitation
    return keystroke;
  }

  async function attemptClipboardCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      /* clipboard may be blocked outside a secure/user-gesture context; safe to ignore */
    }
  }
})();

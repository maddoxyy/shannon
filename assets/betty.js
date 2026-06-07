(() => {
  'use strict';

  /* ============================================================
     Betty — assistente da Shannon.
     Chatbot de respostas pré-programadas (sem IA real, sem rede).
     Módulo único usado na Home e na Dashboard.
     ============================================================ */

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE_KEY = 'betty:v1';

  const WELCOME = (name) =>
    `Olá, ${name}. Eu sou a Betty, assistente da Shannon. Posso te ajudar a entender como funciona nossa plataforma de computação orbital sob demanda.`;

  const FALLBACK =
    'Este MVP ainda é conceitual. Posso te ajudar melhor com dúvidas sobre a Shannon, computação orbital, dashboard, parceria enterprise, capacidade contratada ou proposta da Global Solution.';

  // Ícone da Betty — reusado no cabeçalho do painel e injetado nos gatilhos [data-betty-open].
  const BETTY_ICON = `
    <svg class="betty-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4v2" />
      <path d="M8.3 6h7.4A3.3 3.3 0 0 1 19 9.3v5.4a3.3 3.3 0 0 1-3.3 3.3H8.3A3.3 3.3 0 0 1 5 14.7V9.3A3.3 3.3 0 0 1 8.3 6Z" />
      <path d="M3.5 11.2H5" />
      <path d="M19 11.2h1.5" />
      <circle cx="9.6" cy="12" r=".85" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="12" r=".85" fill="currentColor" stroke="none" />
      <path d="M10.2 15h3.6" />
    </svg>`;

  // Base de conhecimento (perguntas sugeridas + respostas + palavras-chave).
  const KB = [
    {
      id: 'o-que-e',
      q: 'O que é a Shannon?',
      a: 'A Shannon é uma plataforma conceitual de computação orbital sob demanda. A ideia é permitir que empresas de IA contratem capacidade de GPU/TPU em uma infraestrutura orbital gerenciada pela Shannon, sem comprar satélites ou operar máquinas.',
      keywords: ['o que e a shannon', 'o que e shannon', 'que e a shannon', 'sobre a shannon', 'plataforma']
    },
    {
      id: 'como-usa',
      q: 'Como uma empresa usa a plataforma?',
      a: 'Uma empresa parceira acompanha sua capacidade contratada, uso atual, workloads, disponibilidade da constelação, alertas operacionais e pode abrir chamados para solicitar expansão de capacidade.',
      keywords: ['como usa', 'como uma empresa usa', 'usa a plataforma', 'como funciona a plataforma', 'empresa usa']
    },
    {
      id: 'gpu-tpu',
      q: 'O que é capacidade orbital de GPU/TPU?',
      a: 'É o uso de poder computacional localizado em módulos orbitais, pensado para cargas pesadas de IA, processamento em lote, simulações e dados espaciais. No MVP, isso é representado como simulação.',
      keywords: ['gpu', 'tpu', 'capacidade orbital', 'poder computacional', 'modulos orbitais']
    },
    {
      id: 'substitui',
      q: 'A Shannon substitui data centers terrestres?',
      a: 'Não. A Shannon é uma camada complementar. A proposta é usar computação orbital em cargas específicas, principalmente quando escala, energia, processamento assíncrono ou dados espaciais tornam a órbita mais estratégica.',
      keywords: ['substitui', 'data center', 'data centers', 'terrestre', 'terrestres', 'nuvem', 'cloud']
    },
    {
      id: 'claude',
      q: 'Como funciona a parceria com uma empresa como a Claude AI?',
      a: 'Neste cenário, a Claude AI é uma cliente enterprise da Shannon. Ela não opera satélites: apenas acompanha capacidade contratada, workloads, disponibilidade, métricas e solicita expansão quando necessário.',
      keywords: ['claude', 'parceria', 'cliente enterprise', 'como funciona a parceria']
    },
    {
      id: 'capacidade',
      q: 'Como solicitar mais capacidade?',
      a: 'Na Dashboard, o cliente pode abrir um chamado de expansão, informar a capacidade desejada, prioridade e justificativa. A equipe Shannon avaliaria a solicitação no modelo enterprise.',
      keywords: ['solicitar', 'mais capacidade', 'aumento de capacidade', 'expansao', 'expandir', 'chamado']
    },
    {
      id: 'mvp',
      q: 'O que este MVP apresenta?',
      a: 'Este MVP apresenta a experiência de uma empresa parceira acompanhando uma infraestrutura orbital de computação: capacidade contratada, uso, workloads, status operacional e suporte por IA com a Betty.',
      keywords: ['mvp', 'o que este mvp', 'apresenta', 'prototipo', 'global solution']
    }
  ];

  const GREET = ['oi', 'ola', 'ei', 'bom dia', 'boa tarde', 'boa noite'];
  const GREET_REPLY = 'Olá. Como posso ajudar? Você pode escolher uma das perguntas sugeridas ou escrever a sua.';
  const THANKS = ['obrigad', 'valeu', 'agradec'];
  const THANKS_REPLY = 'De nada. Se quiser, posso explicar outro ponto da Shannon.';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalize = (s) =>
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  const state = {
    open: false,
    identified: false,
    user: { name: '', email: '' },
    typing: false,
    lastFocus: null
  };

  let els = null;
  let prevOverflow = '';

  /* ---- Persistência opcional (somente identidade, sem transcript) ---- */
  function loadIdentity() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.identified && data.user && data.user.name) {
        state.identified = true;
        state.user = { name: String(data.user.name), email: String(data.user.email || '') };
      }
    } catch (_) { /* sessionStorage indisponível: segue sem persistência */ }
  }
  function saveIdentity() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ identified: state.identified, user: state.user }));
    } catch (_) { /* ignore */ }
  }

  /* ---- Construção do DOM (uma vez) ---- */
  function buildDOM() {
    const scrim = document.createElement('div');
    scrim.className = 'betty-scrim';
    scrim.hidden = true;
    scrim.addEventListener('click', close);

    const panel = document.createElement('aside');
    panel.className = 'betty-panel';
    panel.id = 'betty-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'betty-title');
    panel.setAttribute('aria-hidden', 'true');
    panel.hidden = true;

    panel.innerHTML = `
      <header class="betty-head">
        <div class="betty-id">
          <span class="betty-mark" aria-hidden="true">
            ${BETTY_ICON}
          </span>
          <span class="betty-id-text">
            <strong id="betty-title">Betty</strong>
            <span class="betty-sub">Assistente da Shannon</span>
          </span>
        </div>
        <button class="betty-close" type="button" aria-label="Fechar assistente">&times;</button>
      </header>

      <form class="betty-gate" novalidate>
        <p class="betty-gate-lead">Antes de começar, como podemos falar com você?</p>
        <label class="betty-field">
          <span>Nome</span>
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label class="betty-field">
          <span>E-mail</span>
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <p class="betty-error" role="alert" hidden></p>
        <button class="betty-btn" type="submit">Iniciar conversa</button>
      </form>

      <div class="betty-chat" hidden>
        <div class="betty-messages" role="log" aria-live="polite" aria-label="Conversa com a Betty"></div>
        <div class="betty-suggestions" aria-label="Perguntas frequentes"></div>
        <form class="betty-composer">
          <input type="text" name="q" placeholder="Escreva sua pergunta…" autocomplete="off" aria-label="Escreva sua pergunta" />
          <button class="betty-send" type="submit" aria-label="Enviar mensagem">
            <svg class="betty-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>

      <p class="betty-foot">Respostas pré-definidas · sem IA real.</p>
    `;

    document.body.appendChild(scrim);
    document.body.appendChild(panel);

    els = {
      scrim,
      panel,
      close: panel.querySelector('.betty-close'),
      gate: panel.querySelector('.betty-gate'),
      gateName: panel.querySelector('input[name="name"]'),
      gateEmail: panel.querySelector('input[name="email"]'),
      gateError: panel.querySelector('.betty-error'),
      chat: panel.querySelector('.betty-chat'),
      messages: panel.querySelector('.betty-messages'),
      suggestions: panel.querySelector('.betty-suggestions'),
      composer: panel.querySelector('.betty-composer'),
      composerInput: panel.querySelector('.betty-composer input')
    };

    els.close.addEventListener('click', close);
    els.gate.addEventListener('submit', onGateSubmit);
    els.gate.addEventListener('input', (e) => clearInvalid(e.target));
    els.composer.addEventListener('submit', onComposerSubmit);
    panel.addEventListener('keydown', onPanelKeydown);
  }

  /* ---- Abertura / fechamento ---- */
  function open(trigger) {
    if (!els) buildDOM();
    state.lastFocus = trigger || document.activeElement;
    state.open = true;

    els.scrim.hidden = false;
    els.panel.hidden = false;
    els.panel.setAttribute('aria-hidden', 'false');
    // força reflow para a transição de entrada
    void els.panel.offsetWidth;
    els.scrim.classList.add('is-open');
    els.panel.classList.add('is-open');

    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (state.identified) {
      enterChat(false);
      window.setTimeout(() => els.composerInput.focus(), reducedMotion ? 0 : 60);
    } else {
      els.gate.hidden = false;
      els.chat.hidden = true;
      window.setTimeout(() => els.gateName.focus(), reducedMotion ? 0 : 60);
    }
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    els.scrim.classList.remove('is-open');
    els.panel.classList.remove('is-open');
    els.panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = prevOverflow;

    const hide = () => {
      els.panel.hidden = true;
      els.scrim.hidden = true;
    };
    if (reducedMotion) hide();
    else window.setTimeout(hide, 200);

    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
  }

  /* ---- Gate (nome + e-mail) ---- */
  function clearInvalid(field) {
    if (field && field.classList && field.classList.contains('betty-invalid')) {
      field.classList.remove('betty-invalid');
      field.removeAttribute('aria-invalid');
    }
  }
  function flag(field) {
    field.classList.add('betty-invalid');
    field.setAttribute('aria-invalid', 'true');
  }

  function onGateSubmit(event) {
    event.preventDefault();
    const name = els.gateName.value.trim();
    const email = els.gateEmail.value.trim();
    let firstInvalid = null;

    [els.gateName, els.gateEmail].forEach(clearInvalid);
    if (!name) { flag(els.gateName); firstInvalid = firstInvalid || els.gateName; }
    if (!email || !EMAIL_RE.test(email)) { flag(els.gateEmail); firstInvalid = firstInvalid || els.gateEmail; }

    if (firstInvalid) {
      els.gateError.textContent = 'Preencha nome e um e-mail válido para começar.';
      els.gateError.hidden = false;
      firstInvalid.focus();
      return;
    }

    els.gateError.hidden = true;
    state.user = { name, email };
    state.identified = true;
    saveIdentity();
    enterChat(true);
    window.setTimeout(() => els.composerInput.focus(), reducedMotion ? 0 : 60);
  }

  /* ---- Chat ---- */
  function enterChat(fresh) {
    els.gate.hidden = true;
    els.chat.hidden = false;
    renderSuggestions();
    if (fresh || !els.messages.childElementCount) {
      els.messages.textContent = '';
      addMessage('bot', WELCOME(state.user.name));
    }
  }

  function renderSuggestions() {
    els.suggestions.textContent = '';
    KB.slice(0, 3).forEach((intent) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'betty-chip';
      chip.textContent = intent.q;
      chip.addEventListener('click', () => handleIntent(intent));
      els.suggestions.appendChild(chip);
    });
  }

  function addMessage(from, text) {
    const msg = document.createElement('div');
    msg.className = `betty-msg betty-msg--${from}`;
    const bubble = document.createElement('p');
    bubble.className = 'betty-bubble';
    bubble.textContent = text; // textContent → seguro contra HTML injetado
    msg.appendChild(bubble);
    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function showTyping() {
    state.typing = true;
    const wrap = document.createElement('div');
    wrap.className = 'betty-msg betty-msg--bot betty-typing';
    wrap.innerHTML = '<p class="betty-bubble"><span></span><span></span><span></span></p>';
    wrap.setAttribute('aria-hidden', 'true');
    els.messages.appendChild(wrap);
    els.messages.scrollTop = els.messages.scrollHeight;
    return wrap;
  }

  function botRespond(text) {
    if (reducedMotion) { addMessage('bot', text); return; }
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      state.typing = false;
      addMessage('bot', text);
    }, 600);
  }

  function handleIntent(intent) {
    addMessage('user', intent.q);
    botRespond(intent.a);
  }

  function answerFor(raw) {
    const n = normalize(raw);
    if (!n) return null;
    if (THANKS.some((k) => n.includes(k))) return THANKS_REPLY;
    const words = n.split(' ');
    if (words.length <= 4 && GREET.some((k) => n === k || words.includes(k))) return GREET_REPLY;

    let best = null;
    let bestScore = 0;
    for (const intent of KB) {
      let score = 0;
      for (const kw of intent.keywords) { if (n.includes(kw)) score += 1; }
      if (score > bestScore) { bestScore = score; best = intent; }
    }
    return bestScore > 0 ? best.a : FALLBACK;
  }

  function onComposerSubmit(event) {
    event.preventDefault();
    const value = els.composerInput.value.trim();
    if (!value) return;
    addMessage('user', value);
    els.composerInput.value = '';
    botRespond(answerFor(value));
  }

  /* ---- Acessibilidade: ESC + focus trap ---- */
  function focusable() {
    return Array.from(
      els.panel.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hidden && el.offsetParent !== null);
  }

  function onPanelKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  /* ---- Wiring dos gatilhos ---- */
  function init() {
    loadIdentity();
    document.querySelectorAll('[data-betty-open]').forEach((trigger) => {
      if (!trigger.querySelector('.betty-icon')) trigger.insertAdjacentHTML('afterbegin', BETTY_ICON);
    });
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-betty-open]');
      if (!trigger) return;
      event.preventDefault();
      open(trigger);
    });
  }

  init();
})();

(function () {
  'use strict';

  var cfg = window.ChatbotConfig || {};
  var API_URL  = cfg.apiUrl   || 'http://localhost:5001/chat';
  var TITLE    = cfg.title    || 'Asistente Virtual';
  var SUBTITLE = cfg.subtitle || 'Estamos para ayudarte';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  var sessionId = uuid();
  var isOpen    = false;
  var isLoading = false;

  /* ── Styles ─────────────────────────────────────────────────────────── */
  var css = [
    '#cb-w *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;padding:0}',

    /* Button */
    '#cb-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,.45);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s,box-shadow .2s}',
    '#cb-btn:hover{transform:scale(1.07);box-shadow:0 6px 18px rgba(37,99,235,.55)}',
    '#cb-btn svg{width:26px;height:26px}',

    /* Panel */
    '#cb-panel{position:fixed;bottom:92px;right:24px;width:360px;height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.16);display:flex;flex-direction:column;z-index:2147483645;overflow:hidden;opacity:0;transform:translateY(10px) scale(.97);transition:opacity .22s,transform .22s;pointer-events:none}',
    '#cb-panel.cb-open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}',

    /* Header */
    '#cb-header{background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}',
    '#cb-avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#cb-avatar svg{width:22px;height:22px}',
    '#cb-htext{flex:1;min-width:0}',
    '#cb-htitle{color:#fff;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#cb-hsub{color:rgba(255,255,255,.72);font-size:12px;margin-top:2px}',
    '#cb-close{background:none;border:none;cursor:pointer;padding:4px;color:rgba(255,255,255,.75);display:flex;align-items:center;border-radius:6px;transition:color .15s,background .15s;flex-shrink:0}',
    '#cb-close:hover{color:#fff;background:rgba(255,255,255,.15)}',
    '#cb-close svg{width:18px;height:18px}',

    /* Messages */
    '#cb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#cb-msgs::-webkit-scrollbar{width:4px}',
    '#cb-msgs::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px}',

    '.cb-m{display:flex;flex-direction:column;max-width:82%;animation:cb-in .18s ease}',
    '.cb-bot{align-self:flex-start}',
    '.cb-usr{align-self:flex-end}',
    '.cb-b{padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.48;word-break:break-word}',
    '.cb-bot .cb-b{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:3px}',
    '.cb-usr .cb-b{background:#2563eb;color:#fff;border-bottom-right-radius:3px}',
    '.cb-t{font-size:11px;color:#94a3b8;margin-top:4px;padding:0 2px}',
    '.cb-usr .cb-t{text-align:right}',

    /* Typing dots */
    '.cb-dots{display:flex;align-items:center;gap:5px;padding:11px 14px;background:#f1f5f9;border-radius:14px;border-bottom-left-radius:3px;width:fit-content}',
    '.cb-d{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:cb-bounce 1.1s infinite}',
    '.cb-d:nth-child(2){animation-delay:.18s}',
    '.cb-d:nth-child(3){animation-delay:.36s}',

    /* Input area */
    '#cb-foot{padding:11px 14px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}',
    '#cb-inp{flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 12px;font-size:14px;line-height:1.45;outline:none;resize:none;max-height:88px;color:#1e293b;transition:border-color .15s;font-family:inherit}',
    '#cb-inp:focus{border-color:#2563eb}',
    '#cb-inp::placeholder{color:#94a3b8}',
    '#cb-send{width:38px;height:38px;border-radius:10px;background:#2563eb;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}',
    '#cb-send:hover{background:#1d4ed8}',
    '#cb-send:disabled{background:#cbd5e1;cursor:default}',
    '#cb-send svg{width:17px;height:17px}',

    '@keyframes cb-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes cb-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',

    /* Mobile */
    '@media(max-width:420px){#cb-panel{width:calc(100vw - 16px);right:8px;bottom:80px;height:calc(100svh - 96px);max-height:520px}#cb-btn{right:16px;bottom:16px}}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── SVG Icons ───────────────────────────────────────────────────────── */
  var I = {
    chat: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
    bot: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>',
  };

  /* ── DOM ─────────────────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.id = 'cb-w';
  wrap.innerHTML =
    '<button id="cb-btn" aria-label="Abrir chat">' + I.chat + '</button>' +
    '<div id="cb-panel" role="dialog" aria-label="Asistente virtual">' +
      '<div id="cb-header">' +
        '<div id="cb-avatar">' + I.bot + '</div>' +
        '<div id="cb-htext">' +
          '<p id="cb-htitle">' + TITLE + '</p>' +
          '<p id="cb-hsub">' + SUBTITLE + '</p>' +
        '</div>' +
        '<button id="cb-close" aria-label="Cerrar">' + I.close + '</button>' +
      '</div>' +
      '<div id="cb-msgs"></div>' +
      '<div id="cb-foot">' +
        '<textarea id="cb-inp" placeholder="Escribí tu mensaje…" rows="1"></textarea>' +
        '<button id="cb-send" aria-label="Enviar">' + I.send + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  var btn     = document.getElementById('cb-btn');
  var panel   = document.getElementById('cb-panel');
  var closeBtn = document.getElementById('cb-close');
  var msgs    = document.getElementById('cb-msgs');
  var inp     = document.getElementById('cb-inp');
  var sendBtn = document.getElementById('cb-send');

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function hms() {
    var d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  function addMsg(text, role) {
    var d = document.createElement('div');
    d.className = 'cb-m cb-' + (role === 'user' ? 'usr' : 'bot');
    d.innerHTML = '<div class="cb-b">' + esc(text) + '</div><span class="cb-t">' + hms() + '</span>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'cb-m cb-bot';
    typingEl.innerHTML = '<div class="cb-dots"><div class="cb-d"></div><div class="cb-d"></div><div class="cb-d"></div></div>';
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  /* ── Panel open/close ────────────────────────────────────────────────── */
  function open() {
    isOpen = true;
    panel.classList.add('cb-open');
    if (msgs.children.length === 0) {
      addMsg('¡Hola! 👋 Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?', 'bot');
    }
    inp.focus();
  }
  function close() { isOpen = false; panel.classList.remove('cb-open'); }

  /* ── Send ────────────────────────────────────────────────────────────── */
  function send() {
    var text = inp.value.trim();
    if (!text || isLoading) return;

    inp.value = '';
    inp.style.height = 'auto';
    addMsg(text, 'user');
    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        addMsg(data.response || 'Lo siento, no pude procesar tu consulta.', 'bot');
      })
      .catch(function () {
        hideTyping();
        addMsg('No se pudo conectar con el asistente. Verificá tu conexión.', 'bot');
      })
      .finally(function () {
        isLoading = false;
        sendBtn.disabled = false;
        inp.focus();
      });
  }

  /* ── Events ──────────────────────────────────────────────────────────── */
  inp.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 88) + 'px';
  });

  btn.addEventListener('click', function () { isOpen ? close() : open(); });
  closeBtn.addEventListener('click', close);
  sendBtn.addEventListener('click', send);
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  /* Public API — opcional para uso avanzado */
  window.ChatbotWidget = { open: open, close: close, reset: function () { msgs.innerHTML = ''; sessionId = uuid(); } };

})();

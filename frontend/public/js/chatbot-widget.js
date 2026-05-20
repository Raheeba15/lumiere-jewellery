// ============================================================
// Lumière AI Chatbot Widget
// Drop-in: add <script src="/js/chatbot-widget.js"></script>
// to any page (before </body>)
// ============================================================

(function () {
  'use strict';

  // ── inject styles ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400&display=swap');

    #lm-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #C9A84C, #A07830);
      border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(201,168,76,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; transition: transform 0.2s, box-shadow 0.2s;
      color: #1a1208;
    }
    #lm-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(201,168,76,0.55); }
    #lm-chat-btn .lm-badge {
      position: absolute; top: -4px; right: -4px;
      background: #c0392b; color: #fff; border-radius: 50%;
      width: 18px; height: 18px; font-size: 10px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Jost', sans-serif; font-weight: 400;
    }

    #lm-chat-window {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 370px; max-height: 580px;
      background: #FAF8F4;
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: 4px;
      box-shadow: 0 16px 60px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      font-family: 'Jost', sans-serif; font-weight: 300;
      transform: translateY(16px) scale(0.97);
      opacity: 0; pointer-events: none;
      transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    #lm-chat-window.open {
      transform: translateY(0) scale(1);
      opacity: 1; pointer-events: all;
    }

    .lm-header {
      background: linear-gradient(135deg, #1a1208, #2e2010);
      padding: 16px 18px;
      display: flex; align-items: center; justify-content: space-between;
      border-radius: 4px 4px 0 0;
    }
    .lm-header-left { display: flex; align-items: center; gap: 10px; }
    .lm-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #C9A84C, #8B6914);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .lm-header-text {}
    .lm-header-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 15px; font-weight: 400; color: #FAF0DC;
      letter-spacing: 1.5px;
    }
    .lm-header-status {
      font-size: 10px; color: rgba(201,168,76,0.7);
      letter-spacing: 1px; text-transform: uppercase;
    }
    .lm-header-actions { display: flex; gap: 8px; }
    .lm-header-btn {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.5); font-size: 14px; padding: 4px;
      transition: color 0.2s;
    }
    .lm-header-btn:hover { color: rgba(255,255,255,0.9); }

    .lm-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 300px; max-height: 380px;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.3) transparent;
    }
    .lm-messages::-webkit-scrollbar { width: 4px; }
    .lm-messages::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }

    .lm-msg {
      max-width: 85%; display: flex; flex-direction: column; gap: 2px;
    }
    .lm-msg.bot { align-self: flex-start; }
    .lm-msg.user { align-self: flex-end; }

    .lm-bubble {
      padding: 10px 14px; border-radius: 2px;
      font-size: 13px; line-height: 1.65; font-weight: 300;
    }
    .lm-msg.bot .lm-bubble {
      background: #fff;
      border: 1px solid rgba(201,168,76,0.15);
      color: #2C2010;
      border-radius: 0 8px 8px 8px;
    }
    .lm-msg.user .lm-bubble {
      background: linear-gradient(135deg, #C9A84C, #A07830);
      color: #1a1208; font-weight: 400;
      border-radius: 8px 0 8px 8px;
    }
    .lm-bubble strong { font-weight: 500; }
    .lm-bubble em { font-style: italic; }

    /* Product cards */
    .lm-products {
      display: flex; flex-direction: column; gap: 8px; margin-top: 8px;
    }
    .lm-product-card {
      background: #fff; border: 1px solid rgba(201,168,76,0.2);
      padding: 10px 12px; border-radius: 2px;
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; transition: border-color 0.2s, transform 0.15s;
      font-size: 12px;
    }
    .lm-product-card:hover {
      border-color: rgba(201,168,76,0.5); transform: translateX(2px);
    }
    .lm-product-thumb {
      width: 48px; height: 48px; flex-shrink: 0;
      border-radius: 2px; overflow: hidden;
      background: linear-gradient(135deg,#F5EFE0,#EDE3CC);
      display: flex; align-items: center; justify-content: center;
    }
    .lm-product-thumb img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .lm-product-emoji { font-size: 22px; line-height: 1; }
    .lm-product-info { flex: 1; min-width: 0; }
    .lm-product-name { font-weight: 400; color: #1a1208; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lm-product-cat { font-size: 10px; color: rgba(201,168,76,0.8); text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }
    .lm-product-price { font-weight: 400; color: #2C2010; font-size: 13px; white-space: nowrap; }
    .lm-product-add {
      background: linear-gradient(135deg,#C9A84C,#A07830);
      color: #1a1208; border: none; cursor: pointer;
      padding: 5px 10px; font-size: 10px; letter-spacing: 1px;
      text-transform: uppercase; font-family: 'Jost', sans-serif;
      border-radius: 2px; font-weight: 400; white-space: nowrap;
      transition: opacity 0.2s;
    }
    .lm-product-add:hover { opacity: 0.85; }

    /* Order tracking */
    .lm-order-card {
      background: #fff; border: 1px solid rgba(201,168,76,0.2);
      padding: 12px; border-radius: 2px; margin-top: 8px; font-size: 12px;
    }
    .lm-order-id { font-weight: 400; color: #1a1208; font-size: 13px; margin-bottom: 8px; }
    .lm-order-timeline {
      display: flex; align-items: center; gap: 4px;
      margin: 10px 0; flex-wrap: wrap;
    }
    .lm-step {
      display: flex; align-items: center; gap: 4px; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .lm-step .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #ddd; flex-shrink: 0;
    }
    .lm-step.done .dot { background: #C9A84C; }
    .lm-step.done { color: #1a1208; }
    .lm-step:not(.done) { color: #aaa; }
    .lm-step-line { flex: 1; height: 1px; background: #e0d9cc; min-width: 10px; }
    .lm-order-items { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
    .lm-order-item { display: flex; justify-content: space-between; color: #555; font-size: 12px; }
    .lm-order-total { margin-top: 8px; font-weight: 400; color: #1a1208; font-size: 13px; display: flex; justify-content: space-between; border-top: 1px solid #f0e8d8; padding-top: 8px; }

    /* Quick replies */
    .lm-quick-replies {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;
    }
    .lm-quick-btn {
      background: none; border: 1px solid rgba(201,168,76,0.35);
      color: #8B6914; font-size: 11px; font-family: 'Jost', sans-serif;
      padding: 5px 10px; cursor: pointer; border-radius: 20px;
      font-weight: 300; transition: all 0.2s; white-space: nowrap;
    }
    .lm-quick-btn:hover { background: rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.7); }

    /* Typing indicator */
    .lm-typing {
      display: flex; gap: 4px; padding: 12px 14px;
      background: #fff; border: 1px solid rgba(201,168,76,0.15);
      border-radius: 0 8px 8px 8px; width: fit-content;
      align-self: flex-start;
    }
    .lm-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(201,168,76,0.6); animation: lmBounce 1.2s infinite; }
    .lm-dot:nth-child(2) { animation-delay: 0.2s; }
    .lm-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes lmBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }

    /* Input area */
    .lm-input-area {
      border-top: 1px solid rgba(201,168,76,0.15);
      padding: 12px 14px;
      display: flex; gap: 8px; align-items: flex-end;
      background: #fff; border-radius: 0 0 4px 4px;
    }
    .lm-input {
      flex: 1; border: 1px solid rgba(201,168,76,0.2);
      background: #FAF8F4; padding: 9px 12px;
      font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 300;
      color: #2C2010; outline: none; resize: none;
      border-radius: 2px; max-height: 80px;
      transition: border-color 0.2s;
    }
    .lm-input:focus { border-color: rgba(201,168,76,0.5); }
    .lm-input::placeholder { color: #bbb; }
    .lm-send-btn {
      background: linear-gradient(135deg, #C9A84C, #A07830);
      color: #1a1208; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 2px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0; transition: opacity 0.2s;
    }
    .lm-send-btn:hover { opacity: 0.85; }
    .lm-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .lm-footer {
      text-align: center; padding: 6px 0 10px;
      font-size: 10px; color: #ccc; letter-spacing: 0.5px;
    }

    @media (max-width: 420px) {
      #lm-chat-window { width: calc(100vw - 20px); right: 10px; bottom: 90px; }
    }
  `;
  document.head.appendChild(style);

  // ── build HTML ─────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'lm-chat-btn';
  btn.title = 'Chat with Lumière';
  btn.innerHTML = `✦ <span class="lm-badge" id="lm-notif-badge" style="display:none">1</span>`;

  const win = document.createElement('div');
  win.id = 'lm-chat-window';
  win.innerHTML = `
    <div class="lm-header">
      <div class="lm-header-left">
        <div class="lm-avatar">✦</div>
        <div class="lm-header-text">
          <div class="lm-header-name">Lumière Assistant</div>
          <div class="lm-header-status">● Online</div>
        </div>
      </div>
      <div class="lm-header-actions">
        <button class="lm-header-btn" id="lm-clear-btn" title="Clear chat">↺</button>
        <button class="lm-header-btn" id="lm-close-btn" title="Close">✕</button>
      </div>
    </div>
    <div class="lm-messages" id="lm-messages"></div>
    <div class="lm-input-area">
      <textarea class="lm-input" id="lm-input" placeholder="Ask me anything..." rows="1"></textarea>
      <button class="lm-send-btn" id="lm-send-btn" title="Send">➤</button>
    </div>
    <div class="lm-footer">Powered by Lumière AI ✦</div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  // ── state ──────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  const QUICK_REPLIES = ['Show me rings 💍', 'Bracelets under Rs 3000', 'Track my order', 'Return policy', 'Featured pieces ✦'];
  const lmProductCache = {}; // id → full product object

  // ── helpers ────────────────────────────────────────────────

  const msgs = () => document.getElementById('lm-messages');
  const input = () => document.getElementById('lm-input');
  const sendBtn = () => document.getElementById('lm-send-btn');

  function scrollBottom() {
    const m = msgs();
    m.scrollTop = m.scrollHeight;
  }

  function formatText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function addMessage(content, role, extra = null) {
    const m = msgs();
    const msgEl = document.createElement('div');
    msgEl.className = `lm-msg ${role}`;

    let html = `<div class="lm-bubble">${formatText(content)}</div>`;

    // Render product cards
    if (extra?.type === 'products' && extra.data?.length) {
      html += `<div class="lm-products">`;
      extra.data.forEach(p => {
        const thumb = p.image_url
          ? `<img src="${p.image_url.replace(/"/g, '&quot;')}" alt="${(p.name || '').replace(/"/g, '&quot;')}" loading="lazy">`
          : `<span class="lm-product-emoji">${p.emoji || '💎'}</span>`;
        // Safely encode the full product object for the cart button
        const productJson = JSON.stringify({
          id: p.id, product_id: p.id,
          name: p.name, price: p.price,
          emoji: p.emoji || '💎',
          image_url: p.image_url || '',
          category: p.category_name || ''
        }).replace(/"/g, '&quot;');
        html += `
          <div class="lm-product-card" onclick="window.location='/product/${p.id}'">
            <div class="lm-product-thumb">${thumb}</div>
            <div class="lm-product-info">
              <div class="lm-product-name">${p.name}</div>
              <div class="lm-product-cat">${p.category_name || ''}</div>
            </div>
            <div class="lm-product-price">Rs ${p.price.toLocaleString()}</div>
            <button class="lm-product-add" onclick="event.stopPropagation(); lmAddToCart('${p.id}')">Add</button>
          </div>`;
        // Store product data for cart use
        lmProductCache[p.id] = {
          id: p.id, product_id: p.id,
          name: p.name, price: p.price,
          emoji: p.emoji || '💎',
          image_url: p.image_url || '',
          category_name: p.category_name || '',
          category: p.category_name || ''
        };
      });
      html += `</div>`;
    }

    // Handle server-side addToCart action
    if (extra?.type === 'addToCart' && extra.data) {
      const p = extra.data;
      lmProductCache[p.id] = {
        id: p.id, product_id: p.id,
        name: p.name, price: p.price,
        emoji: p.emoji || '💎',
        image_url: p.image_url || '',
        category_name: p.category_name || p.category || '',
        category: p.category_name || p.category || ''
      };
      if (typeof Cart !== 'undefined') Cart.add(lmProductCache[p.id]);
      const thumb = p.image_url
        ? `<img src="${p.image_url.replace(/"/g,'&quot;')}" alt="${(p.name||'').replace(/"/g,'&quot;')}" style="width:40px;height:40px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:8px">`
        : `<span style="font-size:20px;margin-right:8px">${p.emoji || '💎'}</span>`;
      html = `<div class="lm-bubble" style="display:flex;align-items:center">${thumb}<div><strong>${p.name}</strong> has been added to your cart ✦<br><a href="/cart" style="font-size:11px;color:#8B6914">View Cart →</a></div></div>`;
    }

    // Render order tracking
    if (extra?.type === 'order' && extra.data) {
      const o = extra.data;
      const steps = ['pending','processing','shipped','delivered'];
      const cur = steps.indexOf(o.status);
      const statusEmojis = { pending:'⏳', processing:'⚙️', shipped:'🚚', delivered:'✅', cancelled:'❌' };

      html += `<div class="lm-order-card">
        <div class="lm-order-id">Order #${o.id} &nbsp; ${statusEmojis[o.status] || '📦'} ${o.status.toUpperCase()}</div>
        <div class="lm-order-timeline">`;

      steps.forEach((s, i) => {
        html += `<div class="lm-step ${i <= cur ? 'done' : ''}"><div class="dot"></div>${s}</div>`;
        if (i < steps.length - 1) html += `<div class="lm-step-line"></div>`;
      });

      html += `</div><div class="lm-order-items">`;
      (o.items || []).forEach(item => {
        html += `<div class="lm-order-item"><span>${item.emoji || '💎'} ${item.name} × ${item.quantity}</span><span>Rs ${(item.price * item.quantity).toLocaleString()}</span></div>`;
      });
      html += `</div>
        <div class="lm-order-total"><span>Total</span><span>Rs ${o.total.toLocaleString()}</span></div>
      </div>`;
    }

    msgEl.innerHTML = html;
    m.appendChild(msgEl);
    scrollBottom();
    return msgEl;
  }

  function addQuickReplies(replies) {
    const m = msgs();
    const el = document.createElement('div');
    el.className = 'lm-quick-replies';
    el.id = 'lm-quick-replies';
    replies.forEach(r => {
      const b = document.createElement('button');
      b.className = 'lm-quick-btn';
      b.textContent = r;
      b.onclick = () => { el.remove(); sendMessage(r); };
      el.appendChild(b);
    });
    m.appendChild(el);
    scrollBottom();
  }

  function showTyping() {
    const m = msgs();
    const el = document.createElement('div');
    el.id = 'lm-typing';
    el.className = 'lm-typing';
    el.innerHTML = `<div class="lm-dot"></div><div class="lm-dot"></div><div class="lm-dot"></div>`;
    m.appendChild(el);
    scrollBottom();
  }

  function hideTyping() {
    const el = document.getElementById('lm-typing');
    if (el) el.remove();
  }

  function showWelcome() {
    msgs().innerHTML = '';
    addMessage(`Welcome to Lumière ✦\n\nI'm your personal jewellery assistant. I can help you discover pieces, track orders, and answer any questions. How can I assist you today?`, 'bot');
    addQuickReplies(QUICK_REPLIES);
  }

  // ── add to cart (uses existing Cart from app.js) ──────────
  window.lmAddToCart = function(id) {
    const cached = lmProductCache[id];

    const doAdd = (product) => {
      if (typeof Cart !== 'undefined') {
        Cart.add(product);
      }
      addMessage(`✦ **${product.name}** added to your cart! [View Cart →](/cart)`, 'bot');
      scrollBottom();
    };

    if (cached) {
      doAdd(cached);
    } else {
      // Fallback: fetch full product data so image_url is included
      fetch(`/api/products/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.product) {
            lmProductCache[id] = data.product;
            doAdd(data.product);
          }
        })
        .catch(() => {
          addMessage('Sorry, I couldn\'t add that to your cart right now.', 'bot');
        });
    }
  };

  // ── send message ───────────────────────────────────────────

  async function sendMessage(text) {
    const msg = text || input().value.trim();
    if (!msg || isLoading) return;

    // Remove quick replies
    const qr = document.getElementById('lm-quick-replies');
    if (qr) qr.remove();

    addMessage(msg, 'user');
    if (!text) { input().value = ''; input().style.height = 'auto'; }

    isLoading = true;
    sendBtn().disabled = true;
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      hideTyping();
      addMessage(data.reply || 'Sorry, I had trouble with that.', 'bot', data.action);
    } catch (e) {
      hideTyping();
      addMessage('Sorry, I\'m having trouble connecting. Please try again!', 'bot');
    } finally {
      isLoading = false;
      sendBtn().disabled = false;
    }
  }

  // ── toggle ─────────────────────────────────────────────────

  function openChat() {
    isOpen = true;
    win.classList.add('open');
    document.getElementById('lm-notif-badge').style.display = 'none';
    if (!msgs().children.length) showWelcome();
    setTimeout(() => input().focus(), 300);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
  }

  // ── events ─────────────────────────────────────────────────

  btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  document.getElementById('lm-close-btn').addEventListener('click', closeChat);
  document.getElementById('lm-clear-btn').addEventListener('click', () => {
    fetch('/api/chat/history', { method: 'DELETE' }).catch(() => {});
    showWelcome();
  });

  document.getElementById('lm-send-btn').addEventListener('click', () => sendMessage());

  input().addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  input().addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  // Show badge after 3s if not opened
  setTimeout(() => {
    if (!isOpen) document.getElementById('lm-notif-badge').style.display = 'flex';
  }, 3000);

})();
// =====================
// CART (localStorage)
// =====================
const Cart = {
  get() { return JSON.parse(localStorage.getItem('lumiere_cart') || '[]'); },
  save(items) { localStorage.setItem('lumiere_cart', JSON.stringify(items)); Cart.updateUI(); },
  add(product) {
    const items = Cart.get();
    const existing = items.find(i => i.product_id === product.id);
    if (existing) existing.quantity++;
    else items.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      image_url: product.image_url || '',
      category: product.category_name || product.category || '',
      quantity: 1
    });
    Cart.save(items);
    Toast.show('Added to cart ✦');
  },
  remove(productId) {
    const items = Cart.get().filter(i => i.product_id !== productId);
    Cart.save(items);
  },
  updateQty(productId, qty) {
    const items = Cart.get();
    const item = items.find(i => i.product_id === productId);
    if (item) { item.quantity = Math.max(1, qty); Cart.save(items); }
  },
  total() { return Cart.get().reduce((s, i) => s + i.price * i.quantity, 0); },
  count() { return Cart.get().reduce((s, i) => s + i.quantity, 0); },
  clear() { localStorage.removeItem('lumiere_cart'); Cart.updateUI(); },
  updateUI() {
    const count = Cart.count();
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; el.style.display = count ? 'flex' : 'none'; });
  }
};

// =====================
// AUTH STATE
// =====================
const Auth = {
  user: null,
  async load() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      Auth.user = data.user;
      Auth.updateUI();
    } catch(e) {}
  },
  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    Auth.user = null;
    Auth.updateUI();
    window.location.href = '/';
  },
  updateUI() {
    const loggedIn = !!Auth.user;
    document.querySelectorAll('.auth-show').forEach(el => el.style.display = loggedIn ? '' : 'none');
    document.querySelectorAll('.auth-hide').forEach(el => el.style.display = loggedIn ? 'none' : '');
    document.querySelectorAll('.user-name').forEach(el => el.textContent = Auth.user ? Auth.user.name.split(' ')[0] : '');
  }
};

// =====================
// TOAST
// =====================
const Toast = {
  timer: null,
  show(msg, duration = 2200) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(Toast.timer);
    Toast.timer = setTimeout(() => el.classList.remove('show'), duration);
  }
};

// =====================
// API HELPERS
// =====================
const API = {
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return res.json();
  }
};

// =====================
// PRODUCT CARD RENDERER
// =====================
function renderProductCard(p, wishlistIds = []) {
  const isWishlisted = wishlistIds.includes(p.id);
  const altText = `${p.name}${p.category_name ? ' — ' + p.category_name : ''} | Lumière Fine Jewellery`;
  const thumb = p.image_url
    ? `<img class="product-img-photo" src="${String(p.image_url).replace(/"/g, '&quot;')}" alt="${altText.replace(/"/g, '&quot;')}" loading="lazy" decoding="async">`
    : `<span class="product-img-emoji">${p.emoji || '💎'}</span>`;
  return `
    <div class="product-card" onclick="window.location='/product/${p.id}'">
      ${p.badge ? `<div class="product-badge ${p.badge === 'Sale' ? 'sale' : ''}">${p.badge}</div>` : ''}
      <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist(${p.id},this)" title="Wishlist">♡</button>
      <div class="product-img">${thumb}</div>
      <div class="product-info">
        <div class="product-category">${p.category_name || p.category || ''}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-price-row">
          <div class="price">
            ${p.old_price ? `<span class="price-old">Rs ${Number(p.old_price).toLocaleString()}</span>` : ''}
            Rs ${Number(p.price).toLocaleString()}
          </div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation();Cart.add(${JSON.stringify(p).replace(/"/g, '&quot;')})">+ Add</button>
        </div>
      </div>
    </div>
  `;
}

async function toggleWishlist(productId, btn) {
  if (!Auth.user) { window.location.href = '/account'; return; }
  const data = await API.post('/api/products/wishlist/toggle', { product_id: productId });
  btn.classList.toggle('active', data.wishlisted);
  Toast.show(data.wishlisted ? 'Added to wishlist ♡' : 'Removed from wishlist');
}

// Run on every page
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateUI();
  Auth.load();
});

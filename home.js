// ========== home.js - VERSIÓN DEFINITIVA ==========
// NOTA: allProducts ya está declarado en looks.js, solo lo usamos como window.allProducts

const CATEGORIES = [
  { name: '👔 Hombre', icon: '👔', filter: 'HOMBRE', url: 'catalogo.html?gender=HOMBRE' },
  { name: '👗 Mujer', icon: '👗', filter: 'MUJER', url: 'catalogo.html?gender=MUJER' },
  { name: '👟 Tenis', icon: '👟', filter: 'Calzado', url: 'catalogo.html?category=Calzado' },
  { name: '💍 Accesorios', icon: '💍', filter: 'Accesorios', url: 'catalogo.html?category=Accesorios' }
];

const GENDER_BY_CATEGORY = {
  'Playeras': 'HOMBRE', 'Pantalon para Caballero': 'HOMBRE', 'Short para Caballero': 'HOMBRE',
  'Calzado para Caballero': 'HOMBRE', 'Sueter para Caballero': 'HOMBRE', 'Chamarra para Caballero': 'HOMBRE',
  'Blusas': 'MUJER', 'Pantalon para Dama': 'MUJER', 'Short para Dama': 'MUJER',
  'Vestidos': 'MUJER', 'Calzado para Dama': 'MUJER', 'Sueter para Dama': 'MUJER',
  'Chamarra para Dama': 'MUJER', 'Faldas': 'MUJER', 'Accesorios': 'UNISEX'
};

const RECENT_KEY = 'zr_recent_products';
var homeLooks = [];

function addToRecentProducts(productId) {
  if (!productId) return;
  try {
    let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = [String(productId), ...recent.filter(id => String(id) !== String(productId))];
    recent = recent.slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
  } catch(e) {}
}

function renderCategories() {
  const container = document.getElementById('categories-grid');
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => `
    <a href="${cat.url}" class="category-card">
      <span class="category-icon">${cat.icon}</span>
      <span class="category-name">${cat.name}</span>
    </a>
  `).join('');
}

function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;
  
  const products = window.allProducts || [];
  if (!products.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Cargando productos...</p>';
    return;
  }
  
  let featured = products.filter(p => p.Stock > 0 && p.Stock !== "0");
  const withBadge = featured.filter(p => p.Badge);
  const withoutBadge = featured.filter(p => !p.Badge);
  featured = [...withBadge, ...withoutBadge].slice(0, 8);
  
  container.innerHTML = featured.map(product => `
    <div class="product-card" style="cursor: pointer;" onclick="window.location.href='catalogo.html#producto-${product.ID}'">
      <div class="product-slider" style="position: relative;">
        ${product.Badge ? `<span class="product-badge" style="position: absolute; top: 8px; left: 8px; font-size: 10px; padding: 3px 8px;">${escapeHtml(product.Badge)}</span>` : ''}
        <img src="${optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 300)}" alt="${escapeHtml(product.Nombre)}" style="width: 100%; aspect-ratio: 1; object-fit: contain; padding: 16px;">
      </div>
      <div class="product-info" style="padding: 12px;">
        <div class="product-title-row">
          <h3 class="product-name" style="font-size: 14px;">${escapeHtml(product.Nombre)}</h3>
          <div class="product-price" style="font-size: 16px;">${formatCurrency(product.Precio)}</div>
        </div>
        <div class="product-actions" style="margin-top: 8px;">
          <button class="primary-button" style="padding: 8px 12px; font-size: 12px;" onclick="event.stopPropagation(); addToCart({
            ID:'${product.ID}',
            Nombre:'${escapeJsString(product.Nombre)}',
            Precio:${product.Precio},
            Imagen1:'${product.Imagen1 || ''}',
            Talla:'${escapeJsString(product.Talla || '')}'
          })">🛒 Añadir</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getRecentProductIds() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { return []; }
}

function renderRecentProducts() {
  const container = document.getElementById('recent-products');
  if (!container) return;
  
  const products = window.allProducts || [];
  if (!products.length) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Cargando productos...</p>';
    return;
  }
  
  const recentIds = getRecentProductIds();
  const recentProducts = [];
  for (const id of recentIds) {
    const product = products.find(p => String(p.ID) === String(id));
    if (product && product.Stock > 0 && product.Stock !== "0") {
      recentProducts.push(product);
    }
  }
  const displayProducts = recentProducts.slice(0, 8);
  
  if (displayProducts.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 40px;"><span style="font-size: 48px;">🕐</span><p>No has visto productos recientemente</p></div>`;
    return;
  }
  
  container.innerHTML = displayProducts.map(product => `
    <a href="catalogo.html#producto-${product.ID}" class="recent-product-card">
      <img class="recent-product-img" src="${optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 200)}" alt="${escapeHtml(product.Nombre)}" loading="lazy">
      <div class="recent-product-info">
        <div class="recent-product-name">${escapeHtml(product.Nombre)}</div>
        <div class="recent-product-price">${formatCurrency(product.Precio)}</div>
      </div>
    </a>
  `).join('');
}

async function generateHomeLooksFromWishlist() {
  const container = document.getElementById('home-looks-container');
  if (!container) return;
  
  if (typeof LOOKS_CONFIG === 'undefined') {
    setTimeout(() => generateHomeLooksFromWishlist(), 500);
    return;
  }
  
  const products = window.allProducts || [];
  if (!products.length) {
    container.innerHTML = '<p style="text-align: center; padding: 40px;">Cargando productos...</p>';
    return;
  }
  
  container.innerHTML = '<p style="text-align: center;">✨ Looks personalizados ✨</p>';
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    themeBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    };
  }
}

function initCartAndWishlist() {
  if (typeof loadCartFromStorage === 'function') loadCartFromStorage();
  if (typeof renderCart === 'function') renderCart();
  
  const cartBtn = document.getElementById('cart-icon-home');
  if (cartBtn) cartBtn.onclick = () => typeof openCartDrawer === 'function' && openCartDrawer();
  
  const wishlistBtn = document.getElementById('wishlist-icon-home');
  if (wishlistBtn) wishlistBtn.onclick = () => typeof openWishlistDrawer === 'function' && openWishlistDrawer();
  
  const closeCart = document.getElementById('close-cart-btn');
  if (closeCart) closeCart.onclick = () => typeof closeCartDrawer === 'function' && closeCartDrawer();
  
  const closeWishlist = document.getElementById('close-wishlist-btn');
  if (closeWishlist) closeWishlist.onclick = () => typeof closeWishlistDrawer === 'function' && closeWishlistDrawer();
  
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.onclick = () => {
    if (typeof closeCartDrawer === 'function') closeCartDrawer();
    if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
  };
}

function setupEventListeners() {
  window.addEventListener('cartUpdated', () => {
    if (typeof renderCart === 'function') renderCart();
  });
  window.addEventListener('recentProductsUpdated', () => renderRecentProducts());
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart') || '{}');
  const count = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartBtn = document.getElementById('cart-icon-home');
  if (cartBtn && count > 0) {
    let badge = cartBtn.querySelector('.cart-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ff4f81; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
      cartBtn.style.position = 'relative';
      cartBtn.appendChild(badge);
    }
    badge.textContent = count;
  }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏠 Inicializando home...');
  initTheme();
  renderCategories();
  renderFeaturedProducts();
  renderRecentProducts();
  generateHomeLooksFromWishlist();
  initCartAndWishlist();
  setupEventListeners();
  updateCartBadge();
});

window.addToRecentProducts = addToRecentProducts;

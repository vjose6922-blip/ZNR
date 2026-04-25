// ========== home.js - VERSIÓN CORREGIDA ==========

const CATEGORIES = [
  { name: '👔 Hombre', icon: '👔', filter: 'HOMBRE', url: 'catalogo.html?gender=HOMBRE' },
  { name: '👗 Mujer', icon: '👗', filter: 'MUJER', url: 'catalogo.html?gender=MUJER' },
  { name: '👟 Tenis', icon: '👟', filter: 'Calzado', url: 'catalogo.html?category=Calzado' },
  { name: '💍 Accesorios', icon: '💍', filter: 'Accesorios', url: 'catalogo.html?category=Accesorios' }
];

const GENDER_BY_CATEGORY = {
  'Playeras': 'HOMBRE',
  'Pantalon para Caballero': 'HOMBRE',
  'Short para Caballero': 'HOMBRE',
  'Calzado para Caballero': 'HOMBRE',
  'Sueter para Caballero': 'HOMBRE',
  'Chamarra para Caballero': 'HOMBRE',
  'Blusas': 'MUJER',
  'Pantalon para Dama': 'MUJER',
  'Short para Dama': 'MUJER',
  'Vestidos': 'MUJER',
  'Calzado para Dama': 'MUJER',
  'Sueter para Dama': 'MUJER',
  'Chamarra para Dama': 'MUJER',
  'Faldas': 'MUJER',
  'Accesorios': 'UNISEX'
};

const RECENT_KEY = 'zr_recent_products';
window.allProducts = window.allProducts || [];


// Evitar redeclaración
if (typeof window.allProducts !== 'undefined') {
  var allProducts = window.allProducts;
} else {
  var allProducts = [];
  window.allProducts = allProducts;
}

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

function setCachedProducts(products) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: products, timestamp: Date.now() }));
  } catch(e) { console.warn("No se pudo guardar en caché:", e); }
}

function getCachedProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function buildProductIndex(products) {
  if (!products || products.length === 0) return;
  window.allProductsIndexed = products;
  if (typeof window.buildProductIndex === 'function') {
    window.buildProductIndex(products);
  }
}

async function loadProducts() {
  console.log('🏠 Cargando productos para home...');
  
  // 1. Intentar cargar desde caché primero (instantáneo)
  const cached = getCachedProducts();
  if (cached && cached.length > 0) {
    console.log('📦 Productos desde caché local');
    allProducts = cached;
    buildProductIndex(allProducts);
    renderCategories();
    renderFeaturedProducts();
    renderRecentProducts();
    generateHomeLooksFromWishlist();
    return;
  }
  
  // 2. Si no hay caché o expiró, cargar desde red
  if (!navigator.onLine) {
    console.log('📡 Offline - No hay caché disponible');
    const container = document.getElementById('featured-products');
    if (container) {
      container.innerHTML = '<p style="text-align:center; padding:40px;">📡 Sin conexión. Conéctate a internet para ver productos.</p>';
    }
    return;
  }
  
  try {
    console.log('🌐 Cargando productos desde red...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    allProducts = data.products || data || [];
    setCachedProducts(allProducts);
    buildProductIndex(allProducts);
    
    renderCategories();
    renderFeaturedProducts();
    renderRecentProducts();
    generateHomeLooksFromWishlist();
    
    console.log(`✅ Cargados ${allProducts.length} productos`);
  } catch (err) {
    console.error('Error cargando productos:', err);
    const container = document.getElementById('featured-products');
    if (container) {
      container.innerHTML = '<p style="text-align:center; padding:40px;">❌ Error al cargar productos. Intenta nuevamente.</p>';
    }
  }
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
  
  if (!allProducts.length) {
    container.innerHTML = '<p style="text-align:center; padding:40px;">Cargando productos...</p>';
    return;
  }
  
  let featured = allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
  const withBadge = featured.filter(p => p.Badge);
  const withoutBadge = featured.filter(p => !p.Badge);
  featured = [...withBadge, ...withoutBadge].slice(0, 8);
  
  container.innerHTML = featured.map(product => createMiniProductCard(product)).join('');
}

function createMiniProductCard(product) {
  const imgUrl = optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 300);
  const badgeHtml = product.Badge ? `<span class="product-badge" style="position: absolute; top: 8px; left: 8px; font-size: 10px; padding: 3px 8px;">${escapeHtml(product.Badge)}</span>` : '';
  
  return `
    <div class="product-card" style="cursor: pointer;" onclick="window.location.href='catalogo.html#producto-${product.ID}'">
      <div class="product-slider" style="position: relative;">
        ${badgeHtml}
        <img src="${imgUrl}" alt="${escapeHtml(product.Nombre)}" style="width: 100%; aspect-ratio: 1; object-fit: contain; padding: 16px;">
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
  `;
}

function getRecentProductIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch(e) { return []; }
}

function getRecentProductsList() {
  const recentIds = getRecentProductIds();
  const recentProducts = [];
  for (const id of recentIds) {
    const product = allProducts.find(p => String(p.ID) === String(id));
    if (product && product.Stock > 0 && product.Stock !== "0") {
      recentProducts.push(product);
    }
  }
  return recentProducts.slice(0, 8);
}

function renderRecentProducts() {
  const container = document.getElementById('recent-products');
  if (!container) return;
  
  if (!allProducts.length) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Cargando productos...</p>';
    return;
  }
  
  const recentProducts = getRecentProductsList();
  
  if (recentProducts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--color-text-muted); grid-column: span 4; padding: 40px;">
        <span style="font-size: 48px;">🕐</span>
        <p>No has visto productos recientemente</p>
        <p style="font-size: 12px;">Los productos que veas aparecerán aquí</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recentProducts.map(product => `
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
    console.log('⏳ Esperando LOOKS_CONFIG...');
    setTimeout(() => generateHomeLooksFromWishlist(), 500);
    return;
  }
  
  if (!allProducts.length) {
    container.innerHTML = '<p style="text-align: center; padding: 40px;">Cargando productos...</p>';
    return;
  }
  
  container.innerHTML = `<div style="display: flex; justify-content: center; padding: 40px;"><div class="loader-spinner"></div></div>`;
  
  const wishlist = getWishlist();
  const productsWithStock = allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
  
  if (productsWithStock.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Agrega productos a favoritos para ver looks personalizados</p>';
    return;
  }
  
  let productsToUse = [];
  if (wishlist.length > 0) {
    const wishlistProducts = wishlist.map(w => productsWithStock.find(p => String(p.ID) === String(w.id))).filter(p => p);
    productsToUse = wishlistProducts.slice(0, 4);
  }
  
  if (productsToUse.length < 4) {
    const otherProducts = productsWithStock.filter(p => !productsToUse.some(u => String(u.ID) === String(p.ID)));
    const shuffled = [...otherProducts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    productsToUse = [...productsToUse, ...shuffled.slice(0, 4 - productsToUse.length)];
  }
  
  const looks = [];
  homeLooks = [];
  
  for (const baseProduct of productsToUse) {
    const look = generateLookFromProductWithConfig(baseProduct, productsWithStock);
    if (look && Object.keys(look.products).length >= 2) {
      looks.push(look);
      homeLooks.push(look);
    }
  }
  
  if (looks.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No pudimos generar looks personalizados</p>';
    return;
  }
  
  container.innerHTML = looks.map(look => createHomeLookCard(look)).join('');
  
  document.querySelectorAll('.buy-complete-btn').forEach(btn => {
    btn.removeEventListener('click', handleBuyComplete);
    btn.addEventListener('click', handleBuyComplete);
  });
}

function handleBuyComplete(e) {
  e.stopPropagation();
  const lookId = e.currentTarget.dataset.lookId;
  const look = homeLooks.find(l => l.id === lookId);
  if (look) addCompleteLookToCart(look);
}

function generateLookFromProductWithConfig(baseProduct, allProductsWithStock) {
  const baseGender = GENDER_BY_CATEGORY[baseProduct.Categoria] || 'UNISEX';
  const baseCategory = baseProduct.Categoria;
  
  let compatibleLookConfigs = LOOKS_CONFIG.filter(config => {
    if (baseGender !== 'UNISEX' && config.category !== baseGender) return false;
    return config.slots.some(slot => slot.categories.some(cat => cat === baseCategory));
  });
  
  if (compatibleLookConfigs.length === 0) {
    compatibleLookConfigs = LOOKS_CONFIG.filter(config => 
      config.category === baseGender || config.category === 'Mujer' || config.category === 'Hombre'
    );
  }
  
  if (compatibleLookConfigs.length === 0) return null;
  
  const randomConfig = compatibleLookConfigs[Math.floor(Math.random() * compatibleLookConfigs.length)];
  const currentSelection = {};
  
  for (const slot of randomConfig.slots) {
    if (slot.categories.some(cat => cat === baseCategory)) {
      currentSelection[slot.type] = {
        id: baseProduct.ID,
        name: baseProduct.Nombre,
        price: Number(baseProduct.Precio || 0),
        image: baseProduct.Imagen1 || baseProduct.Imagen2 || '',
        stock: baseProduct.Stock,
        category: baseProduct.Categoria,
        size: baseProduct.Talla || ''
      };
      break;
    }
  }
  
  const selectedProducts = selectProductsForLook(randomConfig, allProductsWithStock, currentSelection);
  const hasBaseProduct = Object.values(selectedProducts).some(p => p && String(p.id) === String(baseProduct.ID));
  const productCount = Object.values(selectedProducts).filter(p => p).length;
  
  if (!hasBaseProduct || productCount < 2) return null;
  
  let totalPrice = 0;
  for (const product of Object.values(selectedProducts)) {
    if (product) totalPrice += product.price;
  }
  
  return {
    id: `home_look_${baseProduct.ID}_${Date.now()}`,
    name: randomConfig.name,
    description: randomConfig.description,
    category: randomConfig.category,
    products: selectedProducts,
    totalPrice: totalPrice,
    productCount: productCount
  };
}

function selectProductsForLook(lookConfig, productsWithImages, currentSelection = {}) {
  const selected = {};
  const usedProductIds = [];
  
  for (const slot of lookConfig.slots) {
    const slotKey = slot.type;
    const currentProductId = currentSelection[slotKey]?.id;
    
    if (currentProductId && !currentSelection._reloading) {
      const existingProduct = productsWithImages.find(p => p.ID == currentProductId);
      if (existingProduct && existingProduct.Stock > 0) {
        selected[slotKey] = {
          id: existingProduct.ID,
          name: existingProduct.Nombre,
          price: Number(existingProduct.Precio || 0),
          image: existingProduct.Imagen1 || existingProduct.Imagen2 || "",
          stock: existingProduct.Stock,
          category: existingProduct.Categoria,
          size: existingProduct.Talla || ""
        };
        usedProductIds.push(String(existingProduct.ID));
        continue;
      }
    }
    
    const availableProducts = productsWithImages.filter(p => {
      if (!p.Stock || p.Stock <= 0 || p.Stock === "0") return false;
      return slot.categories.length === 0 || slot.categories.includes(p.Categoria);
    });
    
    const freshProducts = availableProducts.filter(p => !usedProductIds.includes(String(p.ID)));
    
    if (freshProducts.length > 0) {
      const randomIndex = Math.floor(Math.random() * freshProducts.length);
      const product = freshProducts[randomIndex];
      selected[slotKey] = {
        id: product.ID,
        name: product.Nombre,
        price: Number(product.Precio || 0),
        image: product.Imagen1 || product.Imagen2 || "",
        stock: product.Stock,
        category: product.Categoria,
        size: product.Talla ? "Talla: " + product.Talla : "Talla:"
      };
      usedProductIds.push(String(product.ID));
    }
  }
  
  return selected;
}

function createHomeLookCard(look) {
  const slotOrder = ['torso', 'piernas', 'pies'];
  const slotIcons = { torso: '👕', piernas: '👖', pies: '👟' };
  
  const imagesHtml = slotOrder.map(slot => {
    const product = look.products[slot];
    if (!product) return '';
    return `
      <div style="position: relative; flex: 1;">
        <img src="${optimizeDriveUrl(product.image, 150)}" alt="${escapeHtml(product.name)}" style="width: 100%; aspect-ratio: 1; object-fit: contain; background: white; border-radius: 12px;">
        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); border-radius: 20px; padding: 2px 6px; font-size: 10px;">${slotIcons[slot]}</span>
      </div>
    `;
  }).join('');
  
  const productsListHtml = slotOrder.map(slot => {
    const product = look.products[slot];
    if (!product) return '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 6px; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
        <span>${slotIcons[slot]} ${escapeHtml(product.name.length > 30 ? product.name.substring(0, 27) + '...' : product.name)}</span>
        <span style="color: #ff4f81; font-weight: 600;">${formatCurrency(product.price)}</span>
      </div>
    `;
  }).join('');
  
  const categoryBadge = look.category === 'Mujer' ? '👗 Mujer' : look.category === 'Hombre' ? '👔 Hombre' : '✨ Unisex';
  
  return `
    <div class="outfit-card-mini">
      <div class="outfit-images-mini" style="display: flex; gap: 8px; padding: 12px; background: #f5f5f8;">
        ${imagesHtml || '<div style="flex:1; text-align: center; padding: 20px;">Sin imágenes</div>'}
      </div>
      <div class="outfit-info-mini" style="padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="background: #e8e8ff; padding: 2px 8px; border-radius: 20px; font-size: 10px; color: #3b1f5f;">${categoryBadge}</span>
          <span style="font-size: 11px; color: #888;">${look.productCount} prendas</span>
        </div>
        <h4 style="margin: 0 0 8px; font-size: 14px;">✨ ${escapeHtml(look.name)}</h4>
        <p style="font-size: 11px; color: #666; margin-bottom: 8px;">${escapeHtml(look.description || 'Look completo para cualquier ocasión')}</p>
        <div style="max-height: 100px; overflow-y: auto; margin-bottom: 8px;">${productsListHtml}</div>
        <div style="font-size: 16px; font-weight: 700; color: #ff4f81; margin: 8px 0;">Total: ${formatCurrency(look.totalPrice)}</div>
        <button class="buy-complete-btn" data-look-id="${look.id}" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #ff4f81, #ff7a4f); border: none; border-radius: 30px; color: white; font-weight: 600; cursor: pointer;">🛒 Comprar todo</button>
      </div>
    </div>
  `;
}

function addCompleteLookToCart(look) {
  let addedCount = 0;
  for (const product of Object.values(look.products)) {
    if (product) {
      addToCart({
        ID: product.id,
        Nombre: product.name,
        Precio: product.price,
        Imagen1: product.image,
        Talla: product.size || ''
      });
      addedCount++;
    }
  }
  if (typeof showTemporaryMessage === 'function') {
    showTemporaryMessage(`✅ ${addedCount} productos agregados al carrito`, 'success');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
  }
}

function initCartAndWishlist() {
  if (typeof loadCartFromStorage === 'function') loadCartFromStorage();
  if (typeof renderCart === 'function') renderCart();
  if (typeof updateSavedPhoneDisplay === 'function') updateSavedPhoneDisplay();
  
  const cartBtn = document.getElementById('cart-icon-home');
  if (cartBtn) cartBtn.addEventListener('click', () => typeof openCartDrawer === 'function' && openCartDrawer());
  
  const wishlistBtn = document.getElementById('wishlist-icon-home');
  if (wishlistBtn) wishlistBtn.addEventListener('click', () => typeof openWishlistDrawer === 'function' && openWishlistDrawer());
  
  const closeCart = document.getElementById('close-cart-btn');
  if (closeCart) closeCart.addEventListener('click', () => typeof closeCartDrawer === 'function' && closeCartDrawer());
  
  const closeWishlist = document.getElementById('close-wishlist-btn');
  if (closeWishlist) closeWishlist.addEventListener('click', () => typeof closeWishlistDrawer === 'function' && closeWishlistDrawer());
  
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', () => {
    if (typeof closeCartDrawer === 'function') closeCartDrawer();
    if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
    if (typeof closeImageModal === 'function') closeImageModal();
  });
  
  const requestBtn = document.getElementById('request-purchase-btn');
  if (requestBtn && typeof openWhatsAppCheckout === 'function') requestBtn.addEventListener('click', openWhatsAppCheckout);
  
  const addAllBtn = document.getElementById('add-all-wishlist-to-cart');
  if (addAllBtn && typeof addAllWishlistToCart === 'function') addAllBtn.addEventListener('click', addAllWishlistToCart);
  
  const changePhone = document.getElementById('change-phone-btn');
  if (changePhone && typeof changePhoneNumber === 'function') changePhone.addEventListener('click', changePhoneNumber);
}

function setupEventListeners() {
  window.addEventListener('cartUpdated', () => {
    if (typeof renderCart === 'function') renderCart();
    updateCartBadge();
  });
  
  window.addEventListener('wishlistUpdated', () => {
    updateWishlistBadge();
    generateHomeLooksFromWishlist();
  });
  
  window.addEventListener('recentProductsUpdated', () => {
    renderRecentProducts();
  });
  
  window.addEventListener('theme-toggle', () => {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeBtn.textContent = isDark ? '🌙' : '☀️';
    }
  });
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

function updateWishlistBadge() {
  const wishlist = JSON.parse(localStorage.getItem('zr_wishlist') || '[]');
  const count = wishlist.length;
  const wishlistBtn = document.getElementById('wishlist-icon-home');
  if (wishlistBtn && count > 0) {
    let badge = wishlistBtn.querySelector('.wishlist-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'wishlist-badge';
      badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ff4f81; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
      wishlistBtn.style.position = 'relative';
      wishlistBtn.appendChild(badge);
    }
    badge.textContent = count;
  }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏠 Inicializando página de inicio...');
  
  initTheme();
  
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });
  }
  
  await loadProducts();
  initCartAndWishlist();
  setupEventListeners();
});

// Exponer funciones globales
window.addCompleteLookToCart = addCompleteLookToCart;
window.addToRecentProducts = addToRecentProducts;

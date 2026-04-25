
const CATEGORIES = [
  { name: '👔 Hombre', icon: '👔', filter: 'HOMBRE', url: 'catalogo.html?gender=HOMBRE' },
  { name: '👗 Mujer', icon: '👗', filter: 'MUJER', url: 'catalogo.html?gender=MUJER' },
  { name: '👟 Tenis', icon: '👟', filter: 'Calzado', url: 'catalogo.html?category=Calzado' },
  { name: '💍 Accesorios', icon: '💍', filter: 'Accesorios', url: 'catalogo.html?category=Accesorios' },
  { name: '🔥 Ofertas', icon: '🔥', filter: 'Oferta', url: 'catalogo.html?badge=Oferta' },
  { name: '✨ Novedades', icon: '✨', filter: 'Nuevo', url: 'catalogo.html?badge=Nuevo' }
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
let allProducts = [];
let homeLooks = [];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏠 Inicializando página de inicio...');
  
  await loadProducts();
  
  renderCategories();
  renderFeaturedProducts();
  renderRecentProducts();
  await generateHomeLooksFromWishlist();
  
  initCartAndWishlist();
  initThemeAndWeather();
  
  // Configurar eventos
  setupEventListeners();
});

// ========== CARGA DE PRODUCTOS ==========
async function loadProducts() {
  if (!navigator.onLine) {
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      allProducts = cached;
      console.log('📦 Productos desde caché');
      return;
    }
  }
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products || data || [];
    setCachedProducts(allProducts);
    if (typeof buildProductIndex === 'function') {
      buildProductIndex(allProducts);
    }
    console.log(`✅ Cargados ${allProducts.length} productos`);
  } catch (err) {
    console.error('Error cargando productos:', err);
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      allProducts = cached;
    }
  }
}

// ========== RENDERIZAR CATEGORÍAS ==========
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

// ========== PRODUCTOS DESTACADOS ==========
function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container || !allProducts.length) return;
  
  // Seleccionar productos destacados (con badge o los primeros con stock)
  let featured = allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
  
  // Priorizar productos con badge
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

// ========== PRODUCTOS RECIENTES ==========
function getRecentProducts() {
  try {
    const recent = localStorage.getItem(RECENT_KEY);
    if (!recent) return [];
    const ids = JSON.parse(recent);
    return ids.slice(0, 8).map(id => allProducts.find(p => String(p.ID) === String(id))).filter(p => p);
  } catch {
    return [];
  }
}

function saveRecentProduct(productId) {
  try {
    let recent = [];
    const stored = localStorage.getItem(RECENT_KEY);
    if (stored) recent = JSON.parse(stored);
    
    recent = [String(productId), ...recent.filter(id => String(id) !== String(productId))];
    recent = recent.slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch(e) {}
}

// Reemplaza la función renderRecentProducts en home.js con esta versión mejorada:
function renderRecentProducts() {
  const container = document.getElementById('recent-products');
  if (!container) return;
  
  // Esperar a que allProducts esté cargado
  if (!allProducts || allProducts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Cargando productos...</p>';
    return;
  }
  
  const recentProducts = getRecentProducts(allProducts);
  
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
    <a href="catalogo.html#producto-${product.ID}" class="recent-product-card" onclick="saveRecentProductClick('${product.ID}')">
      <img class="recent-product-img" src="${optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 200)}" alt="${escapeHtml(product.Nombre)}" loading="lazy">
      <div class="recent-product-info">
        <div class="recent-product-name">${escapeHtml(product.Nombre)}</div>
        <div class="recent-product-price">${formatCurrency(product.Precio)}</div>
      </div>
    </a>
  `).join('');
}

function saveRecentProductClick(productId) {
  addToRecentProducts(productId);
}

window.addEventListener('recentProductsUpdated', () => {
  if (document.getElementById('recent-products')) {
    renderRecentProducts();
  }
});

async function generateHomeLooksFromWishlist() {
  const container = document.getElementById('home-looks-container');
  if (!container) return;
  
  const wishlist = getWishlist();
  const productsWithStock = allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
  
  if (productsWithStock.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Agrega productos a favoritos para ver looks personalizados</p>';
    return;
  }
  
  let productsToUse = [];
  
  if (wishlist.length > 0) {
    const wishlistProducts = wishlist
      .map(w => productsWithStock.find(p => String(p.ID) === String(w.id)))
      .filter(p => p);
    productsToUse = wishlistProducts.slice(0, 4);
  }
  
  if (productsToUse.length < 4) {
    const otherProducts = productsWithStock.filter(p => !productsToUse.some(u => String(u.ID) === String(p.ID)));
    const needed = 4 - productsToUse.length;
    const randomOthers = otherProducts.sort(() => 0.5 - Math.random()).slice(0, needed);
    productsToUse = [...productsToUse, ...randomOthers];
  }
  
  const looks = [];
  
  for (const baseProduct of productsToUse) {
    const look = await generateLookFromProduct(baseProduct, productsWithStock);
    if (look && Object.keys(look.products).length >= 2) {
      looks.push(look);
    }
  }
  
  if (looks.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No pudimos generar looks personalizados</p>';
    return;
  }
  
  container.innerHTML = looks.map(look => createHomeLookCard(look)).join('');
  
  document.querySelectorAll('.buy-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lookId = btn.dataset.lookId;
      const look = homeLooks.find(l => l.id === lookId);
      if (look) addCompleteLookToCart(look);
    });
  });
}

async function generateLookFromProduct(baseProduct, allProductsWithStock) {
  const baseGender = GENDER_BY_CATEGORY[baseProduct.Categoria] || 'UNISEX';
  const baseCategory = baseProduct.Categoria;
  
  let complementaryTypes = [];
  
  if (baseCategory.includes('Playera') || baseCategory.includes('Blusa') || baseCategory.includes('Sueter')) {
    complementaryTypes = ['piernas', 'pies'];
  } else if (baseCategory.includes('Pantalon') || baseCategory.includes('Short') || baseCategory.includes('Falda')) {
    complementaryTypes = ['torso', 'pies'];
  } else if (baseCategory.includes('Calzado')) {
    complementaryTypes = ['torso', 'piernas'];
  } else {
    complementaryTypes = ['torso', 'piernas', 'pies'];
  }
  
  const selected = { torso: null, piernas: null, pies: null };
  
  if (baseCategory.includes('Playera') || baseCategory.includes('Blusa') || baseCategory.includes('Sueter') || baseCategory.includes('Chamarra')) {
    selected.torso = baseProduct;
  } else if (baseCategory.includes('Pantalon') || baseCategory.includes('Short') || baseCategory.includes('Falda')) {
    selected.piernas = baseProduct;
  } else if (baseCategory.includes('Calzado')) {
    selected.pies = baseProduct;
  }
  
  for (const type of complementaryTypes) {
    if (selected[type]) continue;
    
    let candidates = allProductsWithStock.filter(p => {
      if (String(p.ID) === String(baseProduct.ID)) return false;
      
      const pGender = GENDER_BY_CATEGORY[p.Categoria] || 'UNISEX';
      if (baseGender !== 'UNISEX' && pGender !== 'UNISEX' && pGender !== baseGender) return false;
      
      if (type === 'torso') {
        return p.Categoria.includes('Playera') || p.Categoria.includes('Blusa') || 
               p.Categoria.includes('Sueter') || p.Categoria.includes('Chamarra');
      } else if (type === 'piernas') {
        return p.Categoria.includes('Pantalon') || p.Categoria.includes('Short') || p.Categoria.includes('Falda');
      } else if (type === 'pies') {
        return p.Categoria.includes('Calzado');
      }
      return false;
    });
    
    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      selected[type] = candidates[randomIndex];
    }
  }
  
  let totalPrice = 0;
  const finalProducts = {};
  const slotNames = { torso: '👕 Superior', piernas: '👖 Inferior', pies: '👟 Calzado' };
  
  for (const [slot, product] of Object.entries(selected)) {
    if (product) {
      finalProducts[slot] = {
        id: product.ID,
        name: product.Nombre,
        price: Number(product.Precio || 0),
        image: product.Imagen1 || product.Imagen2 || '',
        size: product.Talla || ''
      };
      totalPrice += finalProducts[slot].price;
    }
  }
  
  const lookId = `look_${baseProduct.ID}_${Date.now()}`;
  const look = {
    id: lookId,
    name: `Look con ${baseProduct.Nombre}`,
    products: finalProducts,
    totalPrice: totalPrice,
    baseProductId: baseProduct.ID
  };
  
  homeLooks.push(look);
  return look;
}

function createHomeLookCard(look) {
  const productsArray = Object.entries(look.products);
  
  const imagesHtml = productsArray.map(([slot, product]) => `
    <img class="outfit-img-mini" src="${optimizeDriveUrl(product.image, 150)}" alt="${escapeHtml(product.name)}" loading="lazy">
  `).join('');
  
  const productsListHtml = productsArray.map(([slot, product]) => `
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 5px;">
      <span>${slot === 'torso' ? '👕' : slot === 'piernas' ? '👖' : '👟'} ${escapeHtml(product.name)}</span>
      <span style="color: #ff4f81;">${formatCurrency(product.price)}</span>
    </div>
  `).join('');
  
  return `
    <div class="outfit-card-mini">
      <div class="outfit-images-mini">
        ${imagesHtml}
      </div>
      <div class="outfit-info-mini">
        <h4 style="margin: 0 0 8px; font-size: 14px;">✨ ${escapeHtml(look.name)}</h4>
        ${productsListHtml}
        <div class="outfit-price-mini">Total: ${formatCurrency(look.totalPrice)}</div>
        <button class="buy-complete-btn" data-look-id="${look.id}">🛒 Comprar todo</button>
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
  showTemporaryMessage(`✅ ${addedCount} productos agregados al carrito`, 'success');
}

async function initThemeAndWeather() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });
  }
  
  try {
    const response = await fetch('https://wttr.in/Nuevo+Laredo?format=j1&lang=es');
    const data = await response.json();
    if (data && data.current_condition) {
      const temp = data.current_condition[0].temp_C;
      const desc = data.current_condition[0].weatherDesc[0].value;
      let icon = '🌡️';
      if (desc.includes('lluvia')) icon = '☔';
      else if (desc.includes('nublado')) icon = '☁️';
      else if (desc.includes('soleado')) icon = '☀️';
      else if (desc.includes('tormenta')) icon = '⛈️';
      
      const widget = document.getElementById('weather-widget-home');
      if (widget) {
        widget.innerHTML = `<span class="weather-icon">${icon}</span><span class="weather-temp">${temp}°C</span>`;
      }
    }
  } catch (err) {
    console.log('Error obteniendo clima:', err);
  }
}

function initCartAndWishlist() {
  loadCartFromStorage();
  if (typeof renderCart === 'function') renderCart();
  updateCartBadge();
  updateWishlistBadge();
  
  const cartBtn = document.getElementById('cart-icon-home');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      if (typeof openCartDrawer === 'function') openCartDrawer();
    });
  }
  
  const wishlistBtn = document.getElementById('wishlist-icon-home');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      if (typeof openWishlistDrawer === 'function') openWishlistDrawer();
    });
  }
  
  const closeCart = document.getElementById('close-cart-btn');
  if (closeCart) closeCart.addEventListener('click', () => {
    if (typeof closeCartDrawer === 'function') closeCartDrawer();
  });
  
  const closeWishlist = document.getElementById('close-wishlist-btn');
  if (closeWishlist) closeWishlist.addEventListener('click', () => {
    if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
  });
  
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (typeof closeCartDrawer === 'function') closeCartDrawer();
      if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
      if (typeof closeImageModal === 'function') closeImageModal();
    });
  }
  
  const requestBtn = document.getElementById('request-purchase-btn');
  if (requestBtn && typeof openWhatsAppCheckout === 'function') {
    requestBtn.addEventListener('click', openWhatsAppCheckout);
  }
  
  const addAllBtn = document.getElementById('add-all-wishlist-to-cart');
  if (addAllBtn && typeof addAllWishlistToCart === 'function') {
    addAllBtn.addEventListener('click', addAllWishlistToCart);
  }
  
  const changePhone = document.getElementById('change-phone-btn');
  if (changePhone && typeof changePhoneNumber === 'function') {
    changePhone.addEventListener('click', changePhoneNumber);
  }
  
  if (typeof updateSavedPhoneDisplay === 'function') updateSavedPhoneDisplay();
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
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart') || '{}');
  const count = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const badge = document.querySelector('.cart-badge');
  if (badge) badge.textContent = count;
  
  const cartBtn = document.getElementById('cart-icon-home');
  if (cartBtn && count > 0) {
    if (!cartBtn.querySelector('.cart-badge')) {
      const newBadge = document.createElement('span');
      newBadge.className = 'cart-badge';
      newBadge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ff4f81; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
      cartBtn.style.position = 'relative';
      cartBtn.appendChild(newBadge);
    }
    const badgeSpan = cartBtn.querySelector('.cart-badge');
    if (badgeSpan) badgeSpan.textContent = count;
  }
}

function updateWishlistBadge() {
  const wishlist = JSON.parse(localStorage.getItem('zr_wishlist') || '[]');
  const count = wishlist.length;
  const wishlistBtn = document.getElementById('wishlist-icon-home');
  if (wishlistBtn && count > 0) {
    if (!wishlistBtn.querySelector('.wishlist-badge')) {
      const newBadge = document.createElement('span');
      newBadge.className = 'wishlist-badge';
      newBadge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ff4f81; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
      wishlistBtn.style.position = 'relative';
      wishlistBtn.appendChild(newBadge);
    }
    const badgeSpan = wishlistBtn.querySelector('.wishlist-badge');
    if (badgeSpan) badgeSpan.textContent = count;
  } else if (wishlistBtn) {
    const existing = wishlistBtn.querySelector('.wishlist-badge');
    if (existing) existing.remove();
  }
}

window.addCompleteLookToCart = addCompleteLookToCart;
window.saveRecentProduct = saveRecentProduct;

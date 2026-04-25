// ========== home.js - VERSIÓN COMPLETA REUTILIZANDO LOOKS.JS ==========

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
let allProducts = [];
let homeLooks = [];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏠 Inicializando página de inicio...');
  
  await loadProducts();
  
  renderCategories();
  renderFeaturedProducts();
  renderRecentProducts();
  
  // Esperar a que LOOKS_CONFIG esté disponible
  await waitForLooksConfig();
  await generateHomeLooksFromWishlist();
  
  initCartAndWishlist();
  initTheme();
  setupEventListeners();
});

// Función para esperar que looks.js cargue
function waitForLooksConfig() {
  return new Promise((resolve) => {
    if (typeof LOOKS_CONFIG !== 'undefined') {
      console.log('✅ LOOKS_CONFIG disponible');
      resolve();
    } else {
      console.log('⏳ Esperando a que looks.js cargue...');
      const checkInterval = setInterval(() => {
        if (typeof LOOKS_CONFIG !== 'undefined') {
          clearInterval(checkInterval);
          console.log('✅ LOOKS_CONFIG disponible después de esperar');
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('⚠️ LOOKS_CONFIG no disponible, usando fallback');
        resolve();
      }, 5000);
    }
  });
}

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
  if (!container || !allProducts.length) return;
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

function renderRecentProducts() {
  const container = document.getElementById('recent-products');
  if (!container) return;
  if (!allProducts || allProducts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Cargando productos...</p>';
    return;
  }
  
  const recentProducts = getRecentProducts();
  
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
  if (typeof addToRecentProducts === 'function') {
    addToRecentProducts(productId);
  }
}

window.addEventListener('recentProductsUpdated', () => {
  if (document.getElementById('recent-products')) {
    renderRecentProducts();
  }
});

// ========== REUTILIZAR LÓGICA DE LOOKS.JS ==========

async function generateHomeLooksFromWishlist() {
  const container = document.getElementById('home-looks-container');
  if (!container) return;
  
  // Verificar que LOOKS_CONFIG existe
  if (typeof LOOKS_CONFIG === 'undefined') {
    console.log('⏳ LOOKS_CONFIG no disponible, reintentando...');
    setTimeout(() => generateHomeLooksFromWishlist(), 500);
    return;
  }
  
  // Mostrar skeleton loading
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 40px;">
      <div class="loader-spinner"></div>
    </div>
  `;
  
  const wishlist = getWishlist();
  const productsWithStock = allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
  
  if (productsWithStock.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Agrega productos a favoritos para ver looks personalizados</p>';
    return;
  }
  
  // Priorizar productos de la wishlist
  let productsToUse = [];
  
  if (wishlist.length > 0) {
    const wishlistProducts = wishlist
      .map(w => productsWithStock.find(p => String(p.ID) === String(w.id)))
      .filter(p => p);
    productsToUse = wishlistProducts.slice(0, 4);
  }
  
  // Completar con productos aleatorios si es necesario
  if (productsToUse.length < 4) {
    const otherProducts = productsWithStock.filter(p => !productsToUse.some(u => String(u.ID) === String(p.ID)));
    const needed = 4 - productsToUse.length;
    const shuffled = [...otherProducts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    productsToUse = [...productsToUse, ...shuffled.slice(0, needed)];
  }
  
  // Generar looks con reintentos
  const looks = [];
  homeLooks = [];
  
  for (const baseProduct of productsToUse) {
    let look = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!look && attempts < maxAttempts) {
      look = generateLookFromProductWithConfig(baseProduct, productsWithStock);
      attempts++;
    }
    
    if (look && look.productCount >= 2) {
      looks.push(look);
      homeLooks.push(look);
    }
  }
  
  if (looks.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No pudimos generar looks personalizados. Agrega más productos a favoritos.</p>';
    return;
  }
  
  container.innerHTML = looks.map(look => createHomeLookCard(look)).join('');
  
  // Agregar event listeners a los botones
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

// Función que usa la lógica de looks.js para generar looks coherentes
function generateLookFromProductWithConfig(baseProduct, allProductsWithStock) {
  // Determinar género del producto base
  const baseGender = GENDER_BY_CATEGORY[baseProduct.Categoria] || 'UNISEX';
  const baseCategory = baseProduct.Categoria;
  
  // Encontrar configuraciones de look compatibles con el género y la categoría
  let compatibleLookConfigs = LOOKS_CONFIG.filter(config => {
    // Coincidir por género
    if (baseGender !== 'UNISEX' && config.category !== baseGender) return false;
    
    // Verificar si el producto base puede encajar en alguno de los slots
    let fitsInSlot = false;
    for (const slot of config.slots) {
      if (slot.categories.some(cat => cat === baseCategory)) {
        fitsInSlot = true;
        break;
      }
    }
    return fitsInSlot;
  });
  
  // Si no hay configuraciones compatibles, usar una por defecto según género
  if (compatibleLookConfigs.length === 0) {
    compatibleLookConfigs = LOOKS_CONFIG.filter(config => 
      config.category === baseGender || 
      (baseGender === 'HOMBRE' && config.category === 'Hombre') ||
      (baseGender === 'MUJER' && config.category === 'Mujer')
    );
  }
  
  if (compatibleLookConfigs.length === 0) return null;
  
  // Seleccionar una configuración aleatoria
  const randomConfig = compatibleLookConfigs[Math.floor(Math.random() * compatibleLookConfigs.length)];
  
  // Preparar selección actual con el producto base
  const currentSelection = {};
  let baseSlotFound = null;
  
  for (const slot of randomConfig.slots) {
    if (slot.categories.some(cat => cat === baseCategory)) {
      baseSlotFound = slot.type;
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
  
  // Usar la función existente de looks.js para seleccionar productos restantes
  // Nota: selectProductsForLook espera un objeto con "products" como segundo parámetro
  const selectedProducts = selectProductsForLook(randomConfig, allProductsWithStock, currentSelection);
  
  // Verificar que el producto base se mantuvo y hay al menos 2 productos
  const hasBaseProduct = Object.values(selectedProducts).some(p => p && String(p.id) === String(baseProduct.ID));
  const productCount = Object.values(selectedProducts).filter(p => p).length;
  
  if (!hasBaseProduct || productCount < 2) return null;
  
  // Calcular precio total
  let totalPrice = 0;
  for (const product of Object.values(selectedProducts)) {
    if (product) totalPrice += product.price;
  }
  
  const lookId = `home_look_${baseProduct.ID}_${Date.now()}`;
  
  return {
    id: lookId,
    name: randomConfig.name,
    description: randomConfig.description,
    category: randomConfig.category,
    products: selectedProducts,
    totalPrice: totalPrice,
    productCount: productCount,
    baseProductId: baseProduct.ID
  };
}

function createHomeLookCard(look) {
  const slotOrder = ['torso', 'piernas', 'pies'];
  const slotIcons = { torso: '👕', piernas: '👖', pies: '👟' };
  
  // Generar imágenes
  const imagesHtml = slotOrder.map(slot => {
    const product = look.products[slot];
    if (!product) return '';
    return `
      <div style="position: relative; flex: 1;">
        <img class="outfit-img-mini" src="${optimizeDriveUrl(product.image, 150)}" 
             alt="${escapeHtml(product.name)}" loading="lazy"
             style="width: 100%; aspect-ratio: 1; object-fit: contain; background: white; border-radius: 12px;">
        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); border-radius: 20px; padding: 2px 6px; font-size: 10px;">${slotIcons[slot]}</span>
      </div>
    `;
  }).join('');
  
  // Generar lista de productos
  const productsListHtml = slotOrder.map(slot => {
    const product = look.products[slot];
    if (!product) return '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 6px; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span>${slotIcons[slot]}</span>
          <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</span>
        </span>
        <span style="color: #ff4f81; font-weight: 600;">${formatCurrency(product.price)}</span>
      </div>
    `;
  }).join('');
  
  // Badge de categoría
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
        <h4 style="margin: 0 0 8px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">✨ ${escapeHtml(look.name)}</h4>
        <p style="font-size: 11px; color: #666; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(look.description || 'Look completo para cualquier ocasión')}</p>
        <div style="max-height: 100px; overflow-y: auto; margin-bottom: 8px;">
          ${productsListHtml}
        </div>
        <div class="outfit-price-mini" style="font-size: 16px; font-weight: 700; color: #ff4f81; margin: 8px 0;">Total: ${formatCurrency(look.totalPrice)}</div>
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

async function initTheme() {
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
}

function initCartAndWishlist() {
  if (typeof loadCartFromStorage === 'function') loadCartFromStorage();
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

// Exponer funciones globales
window.addCompleteLookToCart = addCompleteLookToCart;
window.saveRecentProduct = saveRecentProduct;
window.generateHomeLooksFromWishlist = generateHomeLooksFromWishlist;

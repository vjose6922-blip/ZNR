(function () {
'use strict';
window.allProducts = window.allProducts || [];
const CATEGORIES = [
{ name: 'Caballero', icon: '', filter: 'HOMBRE', url: 'catalogo.html?gender=HOMBRE' },
{ name: 'Dama', icon: '', filter: 'MUJER', url: 'catalogo.html?gender=MUJER' }
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
var homeLooks = [];
function addToRecentProducts(productId) {
if (!productId) return;
try {
let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
recent = [String(productId), ...recent.filter(id =>String(id) !== String(productId))];
recent = recent.slice(0, 12);
localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
} catch(e) {}
}

async function fetchWithRetry(fn, maxAttempts = 3, delays = [2000, 5000, 10000]) {
for (let attempt = 0; attempt < maxAttempts; attempt++) {
try {
return await fn();
} catch(err) {
if (attempt === maxAttempts - 1) throw err;
await new Promise(r => setTimeout(r, delays[attempt]));
}
}
}
async function loadProducts() {
window.loadProductsUnified({
onProducts(products) {
renderCategories();
renderFeaturedProducts();
renderRecentProducts();
generateHomeLooksFromWishlist();
},
onError() {
const container = document.getElementById('featured-products');
if (container) {
container.innerHTML = `
<div style="text-align:center;padding:40px;grid-column:1/-1;">
<p style="margin-bottom:12px;">Error al cargar productos.</p>
<button onclick="loadProducts()" style="padding:10px 24px;border-radius:40px;border:none;background:var(--color-accent,#ff4f81);color:white;font-weight:600;cursor:pointer;font-size:14px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Reintentar</button>
</div>`;
}
const looksContainer = document.getElementById('home-looks-container');
if (looksContainer) {
looksContainer.innerHTML = `
<div style="text-align:center;padding:40px;">
<p style="margin-bottom:12px;color:var(--color-text-muted);">No se pudieron cargar los looks.</p>
<button onclick="loadProducts()" style="padding:10px 24px;border-radius:40px;border:none;background:var(--color-accent,#ff4f81);color:white;font-weight:600;cursor:pointer;font-size:14px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Reintentar</button>
</div>`;
}
}
});
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
if (!window.allProducts.length) {
container.innerHTML = '<p style="text-align:center; padding:40px;">Cargando productos...</p>';
return;
}
let featured = window.allProducts.filter(p => p.Stock > 0 && p.Stock !== "0");
const withBadge = featured.filter(p => p.Badge);
const withoutBadge = featured.filter(p => !p.Badge);
featured = [...withBadge, ...withoutBadge].slice(0, 8);
container.innerHTML = '';
featured.forEach(product => {
container.appendChild(createMiniProductCard(product));
});
const layout = localStorage.getItem('products_layout') || 'grid';
if (layout === 'grid') container.classList.add('layout-grid');
else container.classList.remove('layout-grid');
}
function createMiniProductCard(product) {
const imgUrl = optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 300);
const badgeHtml = product.Badge
? `<span class="product-badge" style="position:absolute;top:8px;left:8px;font-size:10px;padding:3px 8px;">${escapeHtml(product.Badge)}</span>`
: '';
const stockNum = Number(product.Stock || 0);
const hasStock = stockNum > 0;
const stockLabel = !hasStock
? `<span style="color:var(--color-error,#ef4444);font-size:11px;font-weight:600;">Sin stock</span>`
: stockNum <= 3
? `<span style="color:var(--color-warning,#f97316);font-size:11px;">Últimas ${stockNum}</span>`
: `<span style="color:var(--color-success,#22c55e);font-size:11px;">En stock</span>`;
const genderRaw = (GENDER_BY_CATEGORY[product.Categoria] || '').toLowerCase();
const genderLabel = genderRaw === 'hombre' ? ' Caballero' : genderRaw === 'mujer' ? ' Dama' : '';
const sizesHtml = product.Talla
? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">Tallas: ${escapeHtml(product.Talla)}</div>`
: '';
const descHtml = product.Descripcion
? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(product.Descripcion)}</div>`
: '';
const card = document.createElement('div');
card.className = 'product-card';
card.style.cursor = 'pointer';
card.dataset.productId = product.ID;
card.dataset.nombre = product.Nombre || '';
card.dataset.precio = product.Precio || 0;
card.dataset.imagen = product.Imagen1 || '';
card.dataset.talla = product.Talla || '';
card.dataset.descripcion = product.Descripcion || '';
card.dataset.stock = product.Stock || 0;
card.dataset.genero = GENDER_BY_CATEGORY[product.Categoria] || '';
card.innerHTML = `
<div class="product-slider" style="position:relative;">
${badgeHtml}
<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(product.Nombre)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='placeholder.svg'">
</div>
<div class="product-info" style="padding:12px;">
<div class="product-title-row">
<h3 class="product-name" style="font-size:14px;">${escapeHtml(product.Nombre)}</h3>
<div class="product-price" style="font-size:16px;">${formatCurrency(product.Precio)}</div>
</div>
${descHtml}
${sizesHtml}
<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">
${stockLabel}
${genderLabel ? `<span style="font-size:11px;color:var(--color-text-muted);">${genderLabel}</span>` : ''}
<span title="Envío disponible" style="font-size:11px;color:var(--color-info,#3b82f6);"></span>
</div>
<div class="product-actions" style="margin-top:8px;">
<button class="primary-button mini-add-btn" style="padding:8px 12px;font-size:12px;"${!hasStock ? ' disabled style="opacity:0.5;cursor:not-allowed;"' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-plus"/></svg> Añadir</button>
</div>
</div>
`;
card.addEventListener('click', (e) => {
if (!e.target.closest('.mini-add-btn')) {
window.location.href = `catalogo.html#producto-${card.dataset.productId}`;
}
});
card.querySelector('.mini-add-btn').addEventListener('click', (e) => {
e.stopPropagation();
addToCart({
ID: card.dataset.productId,
Nombre: card.dataset.nombre,
Precio: Number(card.dataset.precio),
Imagen1: card.dataset.imagen,
Talla: card.dataset.talla
});
});
card.querySelectorAll('.look-slot-image').forEach(div => {
div.addEventListener('click', () => {
const productData = {
ID:  div.dataset.productId,
Nombre:  div.dataset.nombre  || '',
Precio:  div.dataset.precio  || 0,
Categoria:  div.dataset.categoria  || '',
Talla:  div.dataset.talla  || card.dataset.talla  || '',
Descripcion: div.dataset.descripcion || card.dataset.descripcion || '',
Stock:  div.dataset.stock !== undefined ? Number(div.dataset.stock) : (card.dataset.stock !== undefined ? Number(card.dataset.stock) : -1),
Badge:  div.dataset.badge  || card.dataset.badge  || '',
Imagen1:  div.dataset.imagen1  || '',
Imagen2:  '',
Imagen3:  '',
};
openImageModal(div.dataset.modalUrl, div.dataset.productId, [], productData);
});
});
card.querySelectorAll('.look-product-add').forEach(btn => {
btn.addEventListener('click', () => addToCart({
ID: btn.dataset.id,
Nombre: btn.dataset.nombre,
Precio: Number(btn.dataset.precio),
Imagen1: btn.dataset.imagen,
Talla: btn.dataset.talla
}));
});
card.querySelectorAll('.look-product-reload').forEach(btn => {
btn.addEventListener('click', (e) => reloadHomeLookSlot(btn.dataset.lookId, btn.dataset.slotKey, e));
});
card.querySelector('.buy-look-btn')?.addEventListener('click', () => addHomeLookToCart(card.dataset.lookId));
return card;
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
const product = window.allProducts.find(p =>String(p.ID) === String(id));
if (product && product.Stock > 0 && product.Stock !== "0") {
recentProducts.push(product);
}
}
return recentProducts.slice(0, 8);
}
function clearRecentProducts() {
try {
localStorage.removeItem(RECENT_KEY);
window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
} catch(e) {}
}
function renderRecentProducts() {
const container = document.getElementById('recent-products');
if (!container) return;
const savedLayout = localStorage.getItem('products_layout') || 'list';
container.classList.toggle('layout-grid', savedLayout === 'grid');
container.classList.toggle('layout-list', savedLayout === 'list');
if (!window.allProducts.length) {
container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Cargando productos...</p>';
return;
}
const recentProducts = getRecentProductsList();
const section = container.closest('section');
if (section && !section.querySelector('.clear-recents-btn')) {
const titleEl = section.querySelector('.section-title');
if (titleEl) {
titleEl.style.display = 'flex';
titleEl.style.alignItems = 'center';
titleEl.style.justifyContent = 'center';
titleEl.style.gap = '12px';
const clearBtn = document.createElement('button');
clearBtn.className = 'clear-recents-btn';
clearBtn.textContent = 'Limpiar';
clearBtn.style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;border:1px solid var(--border-header);background:transparent;color:var(--color-text-muted);cursor:pointer;font-weight:500;';
clearBtn.addEventListener('click', clearRecentProducts);
titleEl.appendChild(clearBtn);
}
}
if (recentProducts.length === 0) {
container.innerHTML = `
<div style="text-align: center; color: var(--color-text-muted); grid-column: span 4; padding: 40px;">
<span style="font-size: 48px;"></span>
<p>No has visto productos recientemente</p>
<p style="font-size: 12px;">Los productos que veas aparecerán aquí</p>
</div>
`;
return;
}
container.innerHTML = recentProducts.map(product => {
const stockNum = Number(product.Stock || 0);
const hasStock = stockNum > 0;
const stockLabel = !hasStock
? `<span style="color:var(--color-error,#ef4444);font-size:11px;">Sin stock</span>`
: stockNum <= 3
? `<span style="color:var(--color-warning,#f97316);font-size:11px;">Últimas ${stockNum}</span>`
: `<span style="color:var(--color-success,#22c55e);font-size:11px;">En stock</span>`;
const sizesHtml = product.Talla
? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">Tallas: ${escapeHtml(product.Talla)}</div>`
: '';
const genderRaw = (GENDER_BY_CATEGORY[product.Categoria] || '').toLowerCase();
const genderLabel = genderRaw === 'hombre' ? ' Caballero' : genderRaw === 'mujer' ? ' Dama' : '';
const shippingIcon = `<span title="Envío disponible" style="font-size:11px;color:var(--color-info,#3b82f6);"></span>`;
const descHtml = product.Descripcion
? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(product.Descripcion)}">${escapeHtml(product.Descripcion)}</div>`
: '';
return `
<a href="catalogo.html#producto-${product.ID}" class="recent-product-card">
<img class="recent-product-img" src="${optimizeDriveUrl(product.Imagen1 || product.Imagen2 || '', 200)}" alt="${escapeHtml(product.Nombre)}" loading="lazy" onerror="this.onerror=null;this.src='placeholder.svg'">
<div class="recent-product-info">
<div class="recent-product-name">${escapeHtml(product.Nombre)}</div>
${descHtml}
<div class="recent-product-price">${formatCurrency(product.Precio)}</div>
${sizesHtml}
<div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
${stockLabel}
${genderLabel ? `<span style="font-size:11px;color:var(--color-text-muted);">${genderLabel}</span>` : ''}
${shippingIcon}
</div>
</div>
</a>
`;
}).join('');
}
let homeLooksDelegated = false;
async function generateHomeLooksFromWishlist() {
const container = document.getElementById('home-looks-container');
if (!container) return;
if (typeof window.LOOKS_CONFIG === 'undefined' || typeof window.getProductsForSlot === 'undefined') {
console.log('⏳ Esperando LOOKS_CONFIG / getProductsForSlot...');
setTimeout(() => generateHomeLooksFromWishlist(), 500);
return;
}
if (!window.allProducts.length) {
container.innerHTML = '<p style="text-align: center; padding: 40px;">Cargando productos...</p>';
return;
}
container.innerHTML = `<div style="display: flex; justify-content: center; padding: 40px;"><div class="loader-spinner"></div></div>`;
const productsWithStock = window.allProducts.filter(p =>
(p.Imagen1 || p.Imagen2) && Number(p.Stock || 0) > 0
);
if (typeof window.buildLooksProductIndex === 'function') {
window.buildLooksProductIndex(productsWithStock);
}
if (productsWithStock.length === 0) {
container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No hay productos disponibles</p>';
return;
}
const wishlist = getWishlist();
const wishlistProducts = wishlist
.map(w => productsWithStock.find(p =>String(p.ID) === String(w.id)))
.filter(Boolean);
const anchors = [];
if (wishlistProducts.length > 0) {
anchors.push(...wishlistProducts.slice(0, 2));
}
const usedIds = new Set(anchors.map(p =>String(p.ID)));
const randomPool = productsWithStock.filter(p => !usedIds.has(String(p.ID)));
shuffle(randomPool);
while (anchors.length < 3 && randomPool.length > 0) {
anchors.push(randomPool.shift());
}
const looks = [];
homeLooks = [];
for (const anchor of anchors) {
const look = buildLookFromAnchor(anchor, productsWithStock);
if (look && Object.keys(look.products).length >= 2) {
looks.push(look);
homeLooks.push(look);
}
}
if (looks.length === 0) {
container.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">No pudimos generar looks personalizados</p>';
return;
}
container.innerHTML = '';
const fragment = document.createDocumentFragment();
homeLooks.forEach(look => {
const card = createHomeLookCard(look);
fragment.appendChild(card);
});
container.appendChild(fragment);
if (!homeLooksDelegated) {
container.addEventListener('click', function(e) {
const target = e.target;
const addBtn = target.closest('.look-product-add');
if (addBtn) {
e.stopPropagation();
const { id, nombre, precio, imagen, talla } = addBtn.dataset;
addToCart({
ID: id,
Nombre: nombre,
Precio: Number(precio),
Imagen1: imagen,
Talla: talla || ''
});
return;
}
const reloadBtn = target.closest('.look-product-reload');
if (reloadBtn) {
e.stopPropagation();
const lookId = reloadBtn.dataset.lookId;
const slotKey = reloadBtn.dataset.slotKey;
reloadHomeLookSlot(lookId, slotKey, e);
return;
}
const buyBtn = target.closest('.buy-look-btn');
if (buyBtn) {
e.stopPropagation();
const lookId = buyBtn.dataset.lookId;
addHomeLookToCart(lookId);
return;
}
const wishlistBtn = target.closest('[data-action="wishlist"]');
if (wishlistBtn) {
e.stopPropagation();
const lookId = wishlistBtn.dataset.lookId;
toggleLookWishlist(lookId, e);
return;
}
const slotImage = target.closest('.look-slot-image');
if (slotImage) {
e.stopPropagation();
const url = slotImage.dataset.modalUrl;
const productId = slotImage.dataset.productId;
const productData = {
ID:  productId,
Nombre:  slotImage.dataset.nombre  || '',
Precio:  slotImage.dataset.precio  || 0,
Categoria:  slotImage.dataset.categoria  || '',
Talla:  slotImage.dataset.talla  || '',
Descripcion: slotImage.dataset.descripcion || '',
Stock:  slotImage.dataset.stock !== undefined ? Number(slotImage.dataset.stock) : -1,
Badge:  slotImage.dataset.badge  || '',
Imagen1:  slotImage.dataset.imagen1  || '',
Imagen2:  '',
Imagen3:  '',
};
openImageModal(url, productId, [], productData);
return;
}
});
homeLooksDelegated = true;
}
const lazyImgs = container.querySelectorAll('.lazy');
if ('IntersectionObserver' in window) {
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const img = entry.target;
const src = img.getAttribute('data-src');
if (src) {
img.src = src;
img.removeAttribute('data-src');
img.classList.add('loaded');
}
observer.unobserve(img);
}
});
}, { rootMargin: '100px' });
lazyImgs.forEach(img => observer.observe(img));
} else {
lazyImgs.forEach(img => {
const s = img.getAttribute('data-src');
if (s) img.src = s;
});
}
window.homeLooks = window.homeLooks || [];
window.homeLooks = homeLooks;
}
function shuffle(arr) {
for (let i = arr.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
return arr;
}
function buildLookFromAnchor(anchorProduct, allProductsWithStock) {
const anchorCategory = anchorProduct.Categoria;
const anchorGender = GENDER_BY_CATEGORY[anchorCategory] || 'UNISEX';
let candidateConfigs = window.LOOKS_CONFIG.filter(config => {
const configGender = config.category === 'Mujer' ? 'MUJER' : config.category === 'Hombre' ? 'HOMBRE' : 'UNISEX';
const genderMatch = anchorGender === 'UNISEX' || configGender === anchorGender || configGender === 'UNISEX';
if (!genderMatch) return false;
return config.slots.some(slot => {
if (!slot.categories.includes(anchorCategory)) return false;
const productName = (anchorProduct.Nombre || '').toLowerCase();
if (slot.keywords && slot.keywords.length > 0 && slot.keywords[0] !== '') {
const matches = slot.keywords.some(k => productName.includes(k.toLowerCase()));
if (!matches) return false;
}
if (slot.excludeKeywords && slot.excludeKeywords.length > 0) {
const excluded = slot.excludeKeywords.some(k => productName.includes(k.toLowerCase()));
if (excluded) return false;
}
return true;
});
});
if (candidateConfigs.length === 0) {
candidateConfigs = window.LOOKS_CONFIG.filter(config => {
const configGender = config.category === 'Mujer' ? 'MUJER' : config.category === 'Hombre' ? 'HOMBRE' : 'UNISEX';
return anchorGender === 'UNISEX' || configGender === anchorGender;
});
}
if (candidateConfigs.length === 0) return null;
const config = candidateConfigs[Math.floor(Math.random() * candidateConfigs.length)];
const anchorSlot = config.slots.find(slot => slot.categories.includes(anchorCategory));
const preselection = {};
if (anchorSlot) {
preselection[anchorSlot.type] = { id: anchorProduct.ID };
}
const selected = selectProductsForLookHome(config, allProductsWithStock, preselection, anchorProduct);
const productCount = Object.values(selected).filter(Boolean).length;
if (productCount < 2) return null;
const hasAnchor = Object.values(selected).some(p => p && String(p.id) === String(anchorProduct.ID));
if (!hasAnchor) return null;
const totalPrice = Object.values(selected).reduce((sum, p) => sum + (p ? p.price : 0), 0);
return {
id: `home_look_${anchorProduct.ID}_${Date.now()}`,
name: config.name,
description: config.description,
category: config.category,
products: selected,
totalPrice,
productCount
};
}
function selectProductsForLookHome(lookConfig, productsWithImages, preselection = {}, anchorProduct) {
const selected = {};
const usedIds = [];
for (const slot of lookConfig.slots) {
const slotKey = slot.type;
const preId = preselection[slotKey]?.id;
if (preId) {
const product = productsWithImages.find(p =>String(p.ID) === String(preId));
if (product && Number(product.Stock || 0) > 0) {
selected[slotKey] = toSlotProduct(product);
usedIds.push(String(product.ID));
continue;
}
}
const available = window.getProductsForSlot(productsWithImages, slot)
.filter(p => !usedIds.includes(String(p.ID)));
if (available.length > 0) {
const pick = available[Math.floor(Math.random() * available.length)];
selected[slotKey] = toSlotProduct(pick);
usedIds.push(String(pick.ID));
}
}
return selected;
}
function toSlotProduct(p) {
return {
id: p.ID,
name: p.Nombre,
price: Number(p.Precio || 0),
image: p.Imagen1 || p.Imagen2 || '',
stock: p.Stock,
category: p.Categoria,
size: p.Talla ? 'Talla: ' + p.Talla : 'Talla:'
};
}
function addHomeLookToCart(lookId) {
const look = homeLooks.find(l => l.id === lookId);
if (!look) return;
const products = Object.values(look.products).filter(Boolean);
products.forEach(product => {
if (Number(product.stock || 0) > 0) {
addToCart({
ID: product.id,
Nombre: product.name,
Precio: product.price,
Imagen1: product.image,
Talla: product.size || ''
});
}
});
if (typeof animateCartAdd === 'function') animateCartAdd();
if (typeof showTemporaryMessage === 'function') {
showTemporaryMessage(` ${products.length} productos agregados al carrito`, 'success');
}
}
function reloadHomeLookSlot(lookId, slotType, event) {
if (event) event.stopPropagation();
console.log(` Recargando slot ${slotType} del look ${lookId}`);
const lookIdx = homeLooks.findIndex(l => l.id === lookId);
if (lookIdx === -1) return;
const look = homeLooks[lookIdx];
const config = window.LOOKS_CONFIG.find(c => c.name === look.name || c.id === look.id);
if (!config) return;
const slot = config.slots.find(s => s.type === slotType);
if (!slot) return;
const productsWithStock = window.allProducts.filter(p =>
(p.Imagen1 || p.Imagen2) && Number(p.Stock || 0) > 0
);
const usedIds = Object.entries(look.products)
.filter(([k, p]) => k !== slotType && p)
.map(([, p]) =>String(p.id));
const currentId = look.products[slotType] ? String(look.products[slotType].id) : null;
if (currentId) usedIds.push(currentId);
let available = window.getProductsForSlot(productsWithStock, slot)
.filter(p => !usedIds.includes(String(p.ID)));
if (available.length === 0) {
available = window.getProductsForSlot(productsWithStock, slot)
.filter(p => !currentId || String(p.ID) !== currentId);
}
if (available.length === 0) {
if (typeof showTemporaryMessage === 'function') {
showTemporaryMessage('No hay más opciones para este slot', 'info');
}
return;
}
const pick = available[Math.floor(Math.random() * available.length)];
const newProduct = toSlotProduct(pick);
const oldPrice = look.products[slotType]?.price || 0;
const priceDifference = newProduct.price - oldPrice;
look.products[slotType] = newProduct;
look.totalPrice = Object.values(look.products).reduce((s, p) => s + (p ? p.price : 0), 0);
homeLooks[lookIdx] = look;
const card = document.querySelector(`.look-card[data-look-id="${lookId}"]`);
if (card) {
const slotImageDiv = card.querySelector(`.look-slot-image[data-slot="${slotType}"]`);
if (slotImageDiv) {
const img = slotImageDiv.querySelector('.look-slot-img');
const newImgUrl = optimizeDriveUrl(newProduct.image, 200);
const newModalUrl = optimizeDriveUrl(newProduct.image, 800);
if (img) {
const tempImg = new Image();
tempImg.onload = () => {
img.src = newImgUrl;
img.classList.add('loaded');
};
tempImg.src = newImgUrl;
}
slotImageDiv.dataset.modalUrl = newModalUrl;
slotImageDiv.dataset.productId = newProduct.id;
}
const productItems = card.querySelectorAll('.look-product-item');
const slotOrder = ['torso', 'piernas', 'pies'];
const slotIndex = slotOrder.indexOf(slotType);
let targetProductItem = null;
if (productItems[slotIndex]) {
targetProductItem = productItems[slotIndex];
} else {
for (const item of productItems) {
if (item.getAttribute('data-slot') === slotType) {
targetProductItem = item;
break;
}
}
}
if (targetProductItem) {
const nameEl = targetProductItem.querySelector('.look-product-name');
if (nameEl) nameEl.textContent = escapeHtml(newProduct.name);
const priceEl = targetProductItem.querySelector('.look-product-price');
if (priceEl) {
priceEl.textContent = formatCurrency(newProduct.price);
priceEl.classList.add('price-changed');
setTimeout(() => priceEl.classList.remove('price-changed'), 300);
}
const sizeEl = targetProductItem.querySelector('.look-product-size');
if (sizeEl) sizeEl.textContent = escapeHtml(newProduct.size || 'Talla no especificada');
const addBtn = targetProductItem.querySelector('.look-product-add');
if (addBtn) {
const newOnClick = `addToCart({ID:'${newProduct.id}', Nombre:'${escapeHtml(newProduct.name)}', Precio:${newProduct.price}, Imagen1:'${newProduct.image}', Talla:'${escapeHtml(newProduct.size || '')}'})`;
addBtn.dataset.id  = newProduct.id;
addBtn.dataset.nombre = newProduct.name;
addBtn.dataset.precio = newProduct.price;
addBtn.dataset.imagen = newProduct.image;
addBtn.dataset.talla  = newProduct.size || '';
}
}
const totalPriceEl = card.querySelector('.look-total-price');
if (totalPriceEl) {
totalPriceEl.textContent = formatCurrency(look.totalPrice);
totalPriceEl.classList.add('price-changed');
setTimeout(() => totalPriceEl.classList.remove('price-changed'), 300);
}
if (typeof showTemporaryMessage === 'function') {
showTemporaryMessage(` Prenda actualizada: ${newProduct.name}`, 'success');
}
}
}
function createHomeLookCard(look) {
const slotOrder = ['torso', 'piernas', 'pies'];
let imagesHtml = '';
let productsHtml = '';
let totalPrice = 0;
let productCount = 0;
for (const slotKey of slotOrder) {
const product = look.products[slotKey];
if (!product) continue;
productCount++;
totalPrice += product.price;
const optimizedImg = optimizeDriveUrl(product.image, 200);
const optimizedModalImg = optimizeDriveUrl(product.image, 800);
imagesHtml += `
<div class="look-slot-image" data-slot="${escapeHtml(slotKey)}"
data-modal-url="${escapeHtml(optimizedModalImg)}"
data-product-id="${escapeHtml(String(product.id))}"
data-nombre="${escapeHtml(product.name || '')}"
data-precio="${escapeHtml(String(product.price || 0))}"
data-categoria="${escapeHtml(product.category || '')}"
data-imagen1="${escapeHtml(product.image || '')}"
data-talla="${escapeHtml(product.size || product.talla || '')}"
data-descripcion="${escapeHtml(product.descripcion || product.Descripcion || '')}"
data-stock="${escapeHtml(String(product.stock ?? product.Stock ?? -1))}"
data-badge="${escapeHtml(product.badge || product.Badge || '')}">
<img class="look-slot-img lazy"
data-src="${escapeHtml(optimizedImg)}"
src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
alt="${escapeHtml(product.name)}"
loading="lazy" onerror="this.onerror=null;this.src='placeholder.svg'">
</div>
`;
productsHtml += `
<div class="look-product-item" data-slot="${escapeHtml(slotKey)}">
<div class="look-product-info">
<div class="look-product-name">${escapeHtml(product.name)}</div>
<div class="look-product-price">${formatCurrency(product.price)}</div>
<div class="look-product-size">${escapeHtml(product.size || 'Talla no especificada')}</div>
</div>
<div class="look-product-actions">
<button class="look-product-add"
data-id="${escapeHtml(String(product.id))}"
data-nombre="${escapeHtml(product.name)}"
data-precio="${product.price}"
data-imagen="${escapeHtml(product.image)}"
data-talla="${escapeHtml(product.size || '')}"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-plus"/></svg></button>
<button class="look-product-reload"
data-look-id="${escapeHtml(String(look.id))}"
data-slot-key="${escapeHtml(slotKey)}"
title="Cambiar esta prenda"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-refresh"/></svg></button>
</div>
</div>
`;
}
const categoryLabel = look.category === 'Mujer' ? 'Mujer' : look.category === 'Hombre' ? 'Hombre' : 'Unisex';
const card = document.createElement('div');
card.className = 'look-card';
card.dataset.lookId = look.id;
card.innerHTML = `
<div class="look-images-container">
${imagesHtml || '<div class="look-slot-image empty">Sin imágenes</div>'}
</div>
<div class="look-info">
<div class="look-header">
<span class="look-category">${escapeHtml(categoryLabel)}</span>
<span class="look-item-count">${productCount} prenda${productCount !== 1 ? 's' : ''}</span>
</div>
<h2 class="look-title">${escapeHtml(look.name)}</h2>
<p class="look-description">${escapeHtml(look.description || '')}</p>
<div class="look-products">
<div class="look-products-title"><span>Este outfit incluye:</span></div>
<div class="look-products-list">${productsHtml}</div>
<div class="look-total">
<span class="look-total-label">Precio total:</span>
<span class="look-total-price">${formatCurrency(totalPrice)}</span>
</div>
</div>
<button class="buy-look-btn" data-look-id="${escapeHtml(String(look.id))}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"/></svg> Comprar todo</button>
</div>
`;
return card;
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
showTemporaryMessage(` ${addedCount} productos agregados al carrito`, 'success');
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
overlay.addEventListener('click', () => {
if (typeof closeCartDrawer === 'function') closeCartDrawer();
if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
const looksDrawer = document.getElementById('wishlist-looks-drawer');
if (looksDrawer) looksDrawer.classList.remove('open');
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
window.addEventListener('layoutChanged', (e) => {
const container = document.getElementById('recent-products');
if (!container) return;
const isGrid = e.detail.layout === 'grid';
container.classList.toggle('layout-grid', isGrid);
container.classList.toggle('layout-list', !isGrid);
});
window.addEventListener('theme-toggle', () => {
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
themeBtn.textContent = isDark ? '' : '';
}
});
}
function updateCartBadge() {
const cart = JSON.parse(localStorage.getItem('cart') || '{}');
const count = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);
const cartBtn = document.getElementById('cart-icon-home');
if (!cartBtn) return;
let badge = cartBtn.querySelector('.cart-badge');
if (count > 0) {
if (!badge) {
badge = document.createElement('span');
badge.className = 'cart-badge';
badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background:var(--color-accent,#ff4f81); color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
cartBtn.style.position = 'relative';
cartBtn.appendChild(badge);
}
badge.textContent = count;
} else {
if (badge) badge.remove();
}
}
function updateWishlistBadge() {
const wishlist = JSON.parse(localStorage.getItem('zr_wishlist') || '[]');
const count = wishlist.length;
const wishlistBtn = document.getElementById('wishlist-icon-home');
if (!wishlistBtn) return;
let badge = wishlistBtn.querySelector('.wishlist-badge');
if (count > 0) {
if (!badge) {
badge = document.createElement('span');
badge.className = 'wishlist-badge';
badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background:var(--color-accent,#ff4f81); color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;';
wishlistBtn.style.position = 'relative';
wishlistBtn.appendChild(badge);
}
badge.textContent = count;
} else {
if (badge) badge.remove();
}
}
document.addEventListener('DOMContentLoaded', async () => {
await loadProducts();
initCartAndWishlist();
setupEventListeners();
updateWishlistBadge();
updateCartBadge();
});
window.addCompleteLookToCart = addCompleteLookToCart;
window.addToRecentProducts = addToRecentProducts;
window.addHomeLookToCart = addHomeLookToCart;
window.reloadHomeLookSlot = reloadHomeLookSlot;
window.loadProducts = loadProducts;
})();
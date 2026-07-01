(function () {
'use strict';
let currentPageGlobal = 1;      // página actual (única fuente de verdad)
const PRODUCTS_PER_PAGE = 10;   // límite de productos por página
let totalPagesGlobal = 1;
let currentFilters = {};        // filtros activos para reutilizar en cambio de página
let _suppressFilterEvents = false;
let allProducts = [];
let filteredProducts = [];      // productos de la página actual (ya paginados por backend)
// NOTA: currentPage y PAGE_SIZE eliminados — usar currentPageGlobal y PRODUCTS_PER_PAGE
let isLoading = false;
let sliderState = new Map();
let initialHashHandled = false;
let isBackgroundLoading = false;
let globalSliderInterval = null;
class BackgroundLoadQueue {
constructor() {
this.isLoading = false;
this.pending = false;
}
async request() {
if (this.isLoading) {
this.pending = true;
return;
}
this.isLoading = true;
this.pending = false;
try {
await this.execute();
} finally {
this.isLoading = false;
if (this.pending) {
this.request();
}
}
}
async execute() {
if (!navigator.onLine) {
return;
}
try {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
// En background solo actualizamos la primera página sin filtros
const bgUrl = new URL(API_URL);
bgUrl.searchParams.set('action', 'list');
bgUrl.searchParams.set('page', '1');
bgUrl.searchParams.set('limit', String(PRODUCTS_PER_PAGE));
const res = await fetch(bgUrl.toString(), { signal: controller.signal });
clearTimeout(timeoutId);
const data = await res.json();
const freshProducts = (data.products || []);
if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
allProducts = freshProducts;
setCachedProducts(allProducts);
if (typeof buildProductIndex === "function") {
buildProductIndex(allProducts);
}
const currentGender = document.getElementById("gender-filter")?.value || "";
const currentCategory = document.getElementById("category-filter")?.value || "";
const currentSearch = document.getElementById("search-input")?.value || "";
if (currentGender || currentCategory || currentSearch || currentPageGlobal > 1) {
applyFilters();
} else {
filteredProducts = [...allProducts];
renderProductsPage(true);
populateCategoryFilter(currentGender);
populateSizeFilter(currentGender);
}
showTemporaryMessage(" Catálogo actualizado", "info");
}
} catch (err) {
if (err.name === 'AbortError') {
} else {
console.warn("Error en actualización background:", err.message);
}
}
}
}
const backgroundQueue = new BackgroundLoadQueue();
async function loadProductsInBackground() {
await backgroundQueue.request();
}
function startGlobalSliderInterval() {
if (globalSliderInterval) clearInterval(globalSliderInterval);
globalSliderInterval = setInterval(() => {
const sliders = document.querySelectorAll('.product-slider');
if (sliders.length === 0) return;
sliders.forEach(slider => {
if (isElementInViewport(slider, 200)) {
const productId = slider.dataset.productId;
const currentIndex = sliderState.get(productId) || 0;
const totalSlides = slider.querySelectorAll('.slider-dot').length;
if (totalSlides === 0) return;
const nextIndex = (currentIndex + 1) % totalSlides;
updateSliderPosition(slider, nextIndex);
}
});
}, 6000);
}
function isElementInViewport(el, offset = 100) {
const rect = el.getBoundingClientRect();
const windowHeight = window.innerHeight || document.documentElement.clientHeight;
return rect.top <= windowHeight + offset && rect.bottom >= -offset;
}
function updateSliderPosition(slider, newIndex) {
const track = slider.querySelector(".product-slider-track");
const dots = slider.querySelectorAll(".slider-dot");
if (!track) return;
const totalSlides = dots.length;
const normalizedIndex = ((newIndex % totalSlides) + totalSlides) % totalSlides;
track.style.transform = `translateX(-${normalizedIndex * 100}%)`;
dots.forEach((dot, i) => {
dot.classList.toggle("active", i === normalizedIndex);
});
const productId = slider.dataset.productId;
if (productId) sliderState.set(productId, normalizedIndex);
}
function applyFiltersFromURL() {
const urlParams = new URLSearchParams(window.location.search);
const genderParam = urlParams.get('gender');
const categoryParam = urlParams.get('category');
const badgeParam = urlParams.get('badge');
let filtersApplied = false;
if (genderParam) {
const genderSelect = document.getElementById("gender-filter");
if (genderSelect && (genderParam === 'HOMBRE' || genderParam === 'MUJER')) {
genderSelect.value = genderParam;
filtersApplied = true;
}
}
if (categoryParam) {
setTimeout(() => {
const categorySelect = document.getElementById("category-filter");
if (categorySelect) {
for (let i = 0; i < categorySelect.options.length; i++) {
if (categorySelect.options[i].value.toLowerCase().includes(categoryParam.toLowerCase()) ||
categorySelect.options[i].value === categoryParam) {
categorySelect.value = categorySelect.options[i].value;
break;
}
}
}
if (filtersApplied || categoryParam) {
applyFilters();
}
}, 100);
} else if (filtersApplied) {
applyFilters();
}
if (badgeParam && typeof applyFilters === 'function') {
window._pendingBadgeFilter = badgeParam;
setTimeout(() => {
if (typeof applyFilters === 'function') applyFilters();
}, 100);
}
}
const originalApplyFilters = applyFilters;
window.applyFilters = function() {
if (window._pendingBadgeFilter) {
const badgeValue = window._pendingBadgeFilter;
if (typeof filteredProducts !== 'undefined') {
const badgeFiltered = allProducts.filter(p => p.Badge === badgeValue);
if (badgeFiltered.length > 0) {
filteredProducts = badgeFiltered;
currentPageGlobal = 1;
totalPagesGlobal = 1;
renderProductsPage(true);
window._pendingBadgeFilter = null;
return;
}
}
window._pendingBadgeFilter = null;
}
if (originalApplyFilters) originalApplyFilters();
};
document.addEventListener('DOMContentLoaded', () => {
setTimeout(applyFiltersFromURL, 500);
});
async function checkOfflineOnStart() {
if (!navigator.onLine) {
if (window.ConnectionMonitor && window.ConnectionMonitor.showOfflineBanner) {
window.ConnectionMonitor.showOfflineBanner();
}
showTemporaryMessage(' Modo offline - Mostrando catálogo guardado', 'info');
}
}
window.addEventListener('beforeunload', () => {
sessionStorage.setItem('index_scroll_position', window.scrollY);
});
function getGenderFromCategory(categoria) {
if (!categoria) return null;
const categoriaLower = categoria.toLowerCase().trim();
const genderMap = {
"playeras": "HOMBRE",
"pantalon para caballero": "HOMBRE",
"short para caballero": "HOMBRE",
"calzado para caballero": "HOMBRE",
"sueter para caballero": "HOMBRE",
"chamarra para caballero": "HOMBRE",
"blusas": "MUJER",
"pantalon para dama": "MUJER",
"short para dama": "MUJER",
"vestidos": "MUJER",
"calzado para dama": "MUJER",
"sueter para dama": "MUJER",
"chamarra para dama": "MUJER",
"faldas": "MUJER",
"accesorios": "UNISEX"
};
return genderMap[categoriaLower] || null;
}

// ============================================================
// CATÁLOGO COMPLETO EN CLIENTE — evita pegarle a GAS en cada filtro
// ============================================================
let fullCatalogCache = null;            // catálogo completo en memoria
let catalogFilterOptionsSynced = false; // 🆕 evita re-narrar los selects en cada fetch
const FULL_CATALOG_KEY = 'zr_full_catalog_v1';
const FULL_CATALOG_TTL = 5 * 60 * 1000; // 5 minutos

function getFullCatalogFromStorage() {
  try {
    const raw = localStorage.getItem(FULL_CATALOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > FULL_CATALOG_TTL) return null;
    return parsed.data;
  } catch { return null; }
}

function setFullCatalogToStorage(products) {
  try {
    localStorage.setItem(FULL_CATALOG_KEY, JSON.stringify({ ts: Date.now(), data: products }));
  } catch (e) { console.warn('No se pudo guardar el catálogo completo en localStorage', e); }
}

// Trae TODOS los productos en una sola llamada (limit alto) y los cachea.
// Mientras el catálogo sea de unos cientos de productos, esto es barato.
async function ensureFullCatalog(force = false) {
  if (!force && fullCatalogCache) return fullCatalogCache;

  if (!force) {
    const stored = getFullCatalogFromStorage();
    if (stored && stored.length) {
      fullCatalogCache = stored;
      refreshFullCatalogInBackground(); // refrescar silenciosamente
      return fullCatalogCache;
    }
  }

  try {
    if (!fullCatalogCache) showLoader('Cargando catálogo...');
    const url = new URL(API_URL);
    url.searchParams.set('action', 'list');
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '1000'); // suficiente para todo el catálogo actual
    const res = await fetch(url.toString());
    const data = await res.json();
    const products = data.products || [];
    fullCatalogCache = products;
    setFullCatalogToStorage(products);
    return fullCatalogCache;
  } catch (err) {
    console.error('Error cargando catálogo completo:', err);
    return fullCatalogCache || [];
  } finally {
    hideLoader();
  }
}

function refreshFullCatalogInBackground() {
  if (!navigator.onLine) return;
  const url = new URL(API_URL);
  url.searchParams.set('action', 'list');
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', '1000');
  fetch(url.toString())
    .then(r => r.json())
    .then(data => {
      const fresh = data.products || [];
      if (JSON.stringify(fresh) !== JSON.stringify(fullCatalogCache)) {
        fullCatalogCache = fresh;
        setFullCatalogToStorage(fresh);
        if (!_suppressFilterEvents) fetchProducts(false, currentPageGlobal, currentFilters);
      }
    })
    .catch(() => {});
}

// Replica exactamente la lógica de filtros que antes hacía listProducts() en GAS,
// pero corriendo en el navegador sobre el catálogo ya descargado.
function filterCatalogLocal(products, filters) {
  let result = products;

  if (filters.gender) {
    result = result.filter(p => getGenderFromCategory(p.Categoria) === filters.gender);
  }
  if (filters.category) {
    result = result.filter(p => (p.Categoria || '') === filters.category);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(p => {
      const nombre = (p.Nombre || '').toLowerCase();
      const desc = (p.Descripcion || '').toLowerCase();
      return nombre.includes(s) || desc.includes(s);
    });
  }
  if (filters.size) {
    result = result.filter(p => {
      const talla = (p.Talla || '').trim();
      if (!talla) return false;
      return talla.split(/[,\/]/).map(t => t.trim()).includes(filters.size);
    });
  }
  if (filters.sort === 'price-asc') {
    result = [...result].sort((a, b) => (Number(a.Precio) || 0) - (Number(b.Precio) || 0));
  } else if (filters.sort === 'price-desc') {
    result = [...result].sort((a, b) => (Number(b.Precio) || 0) - (Number(a.Precio) || 0));
  }
  return result;
}

function _renderAfterLoad(products, meta) {
  _suppressFilterEvents = true;
  try {
    // Guardar los productos de la página actual
    allProducts = products;
    // filteredProducts = allProducts (ya están filtrados por el backend)
    filteredProducts = [...allProducts];

    if (meta) {
      totalPagesGlobal = meta.totalPages || 1;
      currentPageGlobal = meta.page || 1;
    }
    // Scroll al top cuando cambia la página (excepto en la carga inicial)
    if (meta && meta.page > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderProductsPage(true);
    renderPagination();  

    updateFilterChips({
      searchValue: document.getElementById("search-input")?.value || '',
      categoryValue: document.getElementById("category-filter")?.value || '',
      genderValue: document.getElementById("gender-filter")?.value || '',
      sortValue: document.getElementById("sort-select")?.value || '',
      sizeValue: document.getElementById("size-filter")?.value || ''
    });

    handleInitialHash();


    const savedScroll = sessionStorage.getItem('index_scroll_position');
    if (savedScroll && !initialHashHandled) {
      setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
      sessionStorage.removeItem('index_scroll_position');
    }
  } catch(err) {
    console.error('Error en _renderAfterLoad:', err);
    mostrarMensajeFlotante('❌ Error: ' + err.message, 15000);
  } finally {
    _suppressFilterEvents = false;
  }
}


async function fetchProducts(force = false, page = 1, filters = {}) {
  currentPageGlobal = page;

  // Si no se pasan filtros, los tomamos de los inputs
  if (Object.keys(filters).length === 0) {
    filters = {
      gender: document.getElementById("gender-filter")?.value || '',
      category: document.getElementById("category-filter")?.value || '',
      search: document.getElementById("search-input")?.value.trim() || '',
      size: document.getElementById("size-filter")?.value || '',
      sort: document.getElementById("sort-select")?.value || ''
    };
    // Eliminar filtros vacíos
    Object.keys(filters).forEach(key => filters[key] === '' && delete filters[key]);
  }
  currentFilters = filters; // guardar para futuras recargas

  try {
    const catalog = await ensureFullCatalog(force);

    // 🆕 En cuanto tenemos el catálogo completo, recalculamos las opciones de
    // categoría/talla según el género/categoría ya seleccionados (antes de esto,
    // los selects mostraban la lista global sin filtrar de fetchFilterOptions).
    if (!catalogFilterOptionsSynced || force) {
      const gv = document.getElementById("gender-filter")?.value || '';
      const cv = document.getElementById("category-filter")?.value || '';
      populateCategoryFilter(gv);
      populateSizeFilter(gv, document.getElementById("category-filter")?.value || cv);
      catalogFilterOptionsSynced = true;
    }

    const allFiltered = filterCatalogLocal(catalog, filters);

    const total = allFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    const pageProducts = allFiltered.slice(start, start + PRODUCTS_PER_PAGE);

    const meta = { page, totalPages, total };
    _renderAfterLoad(pageProducts, meta);

    if (!navigator.onLine) {
      showTemporaryMessage(' Sin conexión - Mostrando productos guardados', 'info');
    }
  } catch (err) {
    if (!fullCatalogCache || fullCatalogCache.length === 0) {
      showTemporaryMessage(' Error al cargar productos', 'error');
    }
    console.error(err);
  }
}

// Pinta el select de categorías. Si se pasa un género, solo muestra las
// categorías que existen para ese género (usando el catálogo completo ya
// descargado en fullCatalogCache). Si el catálogo todavía no está listo,
// usamos como respaldo la lista global sin filtrar (populateCategoryFilterGlobal,
// definida en common.js) para no dejar el select vacío mientras carga.
function populateCategoryFilter(genderFilter) {
  const select = document.getElementById("category-filter");
  if (!select) return;

  if (!fullCatalogCache || !fullCatalogCache.length) {
    populateCategoryFilterGlobal();
    return;
  }

  const currentVal = select.value;
  const set = new Set();
  fullCatalogCache.forEach(p => {
    if (genderFilter && getGenderFromCategory(p.Categoria) !== genderFilter) return;
    if (p.Categoria) set.add(p.Categoria);
  });
  const categories = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));

  select.innerHTML = '<option value="">Categorías</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  select.value = (currentVal && categories.includes(currentVal)) ? currentVal : "";
}

// Pinta el select de tallas, filtrando por género y/o categoría seleccionados.
// Mismo respaldo que arriba mientras el catálogo completo no esté listo.
function populateSizeFilter(genderValue, categoryValue) {
  const select = document.getElementById("size-filter");
  if (!select) return;

  if (!fullCatalogCache || !fullCatalogCache.length) {
    populateSizeFilterGlobal();
    return;
  }

  const currentVal = select.value;
  const set = new Set();
  fullCatalogCache.forEach(p => {
    if (genderValue && getGenderFromCategory(p.Categoria) !== genderValue) return;
    if (categoryValue && (p.Categoria || '') !== categoryValue) return;
    const talla = (p.Talla || '').trim();
    if (!talla) return;
    talla.split(/[,\/]/).map(t => t.trim()).filter(Boolean).forEach(t => set.add(t));
  });

  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const sizes = Array.from(set).sort((a, b) => {
    const ai = sizeOrder.indexOf(a.toUpperCase());
    const bi = sizeOrder.indexOf(b.toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, 'es', { numeric: true });
  });

  select.innerHTML = '<option value="">Tallas</option>';
  sizes.forEach(sz => {
    const opt = document.createElement("option");
    opt.value = sz;
    opt.textContent = sz;
    select.appendChild(opt);
  });
  select.value = (currentVal && sizes.includes(currentVal)) ? currentVal : "";
}


function applyFilters() {
  // Recoger los valores de los filtros
  const searchValue   = document.getElementById("search-input")?.value.trim() || '';
  const categoryValue = document.getElementById("category-filter")?.value || '';
  const genderValue   = document.getElementById("gender-filter")?.value || '';
  const sortValue     = document.getElementById("sort-select")?.value || '';
  const sizeValue     = document.getElementById("size-filter")?.value || '';

  // Construir objeto de filtros (solo los que tienen valor)
  const filters = {};
  if (genderValue) filters.gender = genderValue;
  if (categoryValue) filters.category = categoryValue;
  if (searchValue) filters.search = searchValue;
  if (sizeValue) filters.size = sizeValue;
  if (sortValue) filters.sort = sortValue;

  // Actualizar chips de filtros
  updateFilterChips({ searchValue, categoryValue, genderValue, sortValue, sizeValue });

  // Hacer petición al backend (página 1)
  fetchProducts(false, 1, filters);
}

function updateFilterChips({ searchValue, categoryValue, genderValue, sortValue, sizeValue = '' }) {
const bar = document.getElementById('active-filter-chips');
if (!bar) return;
const chips = [];
const genderLabels = { HOMBRE:' Caballero', MUJER:' Dama' };
const sortLabels  = { 'price-asc':'Precio ↑', 'price-desc':'Precio ↓' };
if (genderValue)  chips.push({ label: genderLabels[genderValue] || genderValue, clear: () => { document.getElementById('gender-filter').value = ''; applyFilters(); } });
if (categoryValue) chips.push({ label: ` ${categoryValue}`, clear: () => { document.getElementById('category-filter').value = ''; applyFilters(); } });
if (sizeValue)    chips.push({ label: ` ${sizeValue}`, clear: () => { document.getElementById('size-filter').value = ''; applyFilters(); } });
if (sortValue)  chips.push({ label: `↕ ${sortLabels[sortValue] || sortValue}`, clear: () => { document.getElementById('sort-select').value = ''; applyFilters(); } });
if (searchValue)  chips.push({ label: ` "${searchValue}"`, clear: () => { document.getElementById('search-input').value = ''; applyFilters(); } });
if (!chips.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
bar.style.display = 'flex';
bar.innerHTML = chips.map((c, i) =>
`<button class="filter-chip" data-chip="${i}">${c.label} <span class="chip-x"></span></button>`
).join('') + (chips.length > 1
? `<button class="filter-chip filter-chip-clear" data-chip="all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Limpiar todo</button>`
: '');
bar.querySelectorAll('.filter-chip').forEach(btn => {
btn.addEventListener('click', () => {
const idx = btn.dataset.chip;
if (idx === 'all') {
['gender-filter','category-filter','sort-select','size-filter'].forEach(id => {
const el = document.getElementById(id); if (el) el.value = '';
});
const si = document.getElementById('search-input'); if (si) si.value = '';
applyFilters();
} else {
chips[Number(idx)].clear();
}
});
});
}


function renderProductsPage(reset = false) {
const container = document.getElementById("products-container");
if (!container) return;
// Los productos ya vienen paginados desde el backend — renderizamos todos
container.innerHTML = "";
if (filteredProducts.length === 0) {
container.innerHTML = '<p class="helper-text">No hay productos para mostrar</p>';
renderPagination();
return;
}
filteredProducts.forEach((product) => {
const card = createProductCard(product);
container.appendChild(card);
});
renderPagination();
startGlobalSliderInterval();
}
function renderPagination() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  const totalPages = totalPagesGlobal || 1;
  const currentPage = currentPageGlobal || 1;

  pagination.innerHTML = "";

  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }
  pagination.style.display = 'flex';

  // Botón Anterior
  if (currentPageGlobal > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Anterior";
    prevBtn.onclick = () => {
      fetchProducts(false, currentPageGlobal - 1, currentFilters);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    pagination.appendChild(prevBtn);
  }

  // Números de página (máximo 5 a la vista)
  let startPage = Math.max(1, currentPageGlobal - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPageGlobal) btn.classList.add("active-page");
    btn.onclick = (function(p) {
      return function() {
        fetchProducts(false, p, currentFilters);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    })(i);
    pagination.appendChild(btn);
  }

  // Botón Siguiente
  if (currentPageGlobal < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente →";
    nextBtn.onclick = () => {
      fetchProducts(false, currentPageGlobal + 1, currentFilters);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    pagination.appendChild(nextBtn);
  }
}


function hasFreeShipping(price) {
const numericPrice = Number(price) || 0;
return numericPrice >= 300;
}
function createProductCard(product) {
const { ID, Nombre, Precio, Stock, Descripcion, Talla, Categoria, Imagen1, Imagen2, Imagen3, Badge } = product;
const safeNombre = escapeHtml(Nombre || "Producto");
const safeDescripcion = escapeHtml(Descripcion || "");
const safeTalla = escapeHtml(Talla || "Única");
const safeCategoria = escapeHtml(Categoria || "");
const safeBadge = Badge ? escapeHtml(Badge) : "";
const stockNum = Number(Stock || 0);
const isOutOfStock = stockNum <= 0;
const card = document.createElement("article");
card.className = "product-card";
card.id = `producto-${ID}`;
const slider = document.createElement("div");
slider.className = "product-slider";
slider.dataset.productId = ID;
const track = document.createElement("div");
track.className = "product-slider-track";
const images = [Imagen1, Imagen2, Imagen3]
.map(u => optimizeDriveUrl(u))
.filter(Boolean);
if (images.length === 0) {
images.push("https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen");
}
images.forEach((url) => {
const slide = document.createElement("div");
slide.className = "product-slide";
const img = document.createElement("img");
img.alt = safeNombre;
img.src = url;
img.loading = "lazy";
img.addEventListener("click", () => openImageModal(url, ID, images, product));
slide.appendChild(img);
track.appendChild(slide);
});
slider.appendChild(track);
const dotsContainer = document.createElement("div");
dotsContainer.className = "slider-dots";
images.forEach((_, index) => {
const dot = document.createElement("div");
dot.className = "slider-dot" + (index === 0 ? " active" : "");
dot.dataset.index = index;
dotsContainer.appendChild(dot);
});
slider.appendChild(dotsContainer);
if (safeBadge) {
const badgeEl = document.createElement("div");
badgeEl.className = "product-badge";
badgeEl.textContent = safeBadge;
slider.appendChild(badgeEl);
}
attachSliderEvents(slider, images.length);
const info = document.createElement("div");
info.className = "product-info";
const titleRow = document.createElement("div");
titleRow.className = "product-title-row";
const nameEl = document.createElement("h2");
nameEl.className = "product-name";
nameEl.textContent = safeNombre;
const priceEl = document.createElement("div");
priceEl.className = "product-price";
priceEl.textContent = formatCurrency(Precio);
titleRow.appendChild(nameEl);
titleRow.appendChild(priceEl);
const metaRow = document.createElement("div");
metaRow.className = "product-meta-row";
if (safeCategoria) {
const categoryEl = document.createElement("span");
categoryEl.className = "category-badge";
categoryEl.textContent = safeCategoria;
metaRow.appendChild(categoryEl);
}
const gender = getGenderFromCategory(Categoria);
if (gender) {
const genderBadge = document.createElement("span");
genderBadge.className = `gender-badge gender-${gender.toLowerCase()}`;
genderBadge.textContent =
gender === "UNISEX" ? "" :
gender === "HOMBRE" ? "" :
"";
metaRow.appendChild(genderBadge);
}
const stockEl = document.createElement("span");
stockEl.className = "stock-badge";
if (isOutOfStock) {
stockEl.classList.add("out-of-stock");
stockEl.textContent = " Sin stock";
} else {
stockEl.textContent = ` Stock: ${stockNum}`;
}
metaRow.appendChild(stockEl);
if (hasFreeShipping(Precio)) {
const shippingEl = document.createElement("span");
shippingEl.className = "shipping-badge";
shippingEl.textContent = "";
shippingEl.title = "Envío a domicilio o punto intermedio";
metaRow.appendChild(shippingEl);
}
const descEl = document.createElement("p");
descEl.className = "product-description";
descEl.textContent = safeDescripcion;
const sizesEl = document.createElement("div");
sizesEl.className = "product-sizes";
sizesEl.textContent = safeTalla;
info.appendChild(titleRow);
info.appendChild(metaRow);
info.appendChild(descEl);
info.appendChild(sizesEl);
const actions = document.createElement("div");
actions.className = "product-actions";
const addBtn = document.createElement("button");
addBtn.className = "primary-button";
addBtn.textContent = isOutOfStock ? "Sin stock" : "Añadir al carrito";
addBtn.disabled = isOutOfStock;
if (!isOutOfStock) {
addBtn.dataset.productId = ID;
addBtn.dataset.productName = Nombre || "Producto";
addBtn.dataset.productPrice = Precio || 0;
addBtn.dataset.productImage = Imagen1 || "";
addBtn.dataset.productTalla = Talla || "";
addBtn.dataset.productStock = Stock || 0;
addBtn.addEventListener("click", (e) => {
e.stopPropagation();
addToCart({
ID: addBtn.dataset.productId,
Nombre: addBtn.dataset.productName,
Precio: Number(addBtn.dataset.productPrice),
Stock: Number(addBtn.dataset.productStock),
Imagen1: addBtn.dataset.productImage,
Talla: addBtn.dataset.productTalla
});
});
}
actions.appendChild(addBtn);

const shareBtn = document.createElement('button');
shareBtn.className = 'share-btn';
shareBtn.setAttribute('aria-label', `Compartir ${safeNombre}`);
shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" aria-hidden="true"><use href="#ic-share"/></svg>';
shareBtn.title = 'Compartir producto';
shareBtn.addEventListener('click', (e) => {
e.stopPropagation();
shareProduct(ID, Nombre, Precio);
});
actions.appendChild(shareBtn);
card.appendChild(slider);
card.appendChild(info);
card.appendChild(actions);
return card;
}
function attachSliderEvents(slider, totalSlides) {
const productId = slider.dataset.productId;
sliderState.set(productId, 0);
const track = slider.querySelector(".product-slider-track");
const dots = slider.querySelectorAll(".slider-dot");
let startX = 0, currentX = 0, isDragging = false;
function updateSliderLocal(index) {
updateSliderPosition(slider, index);
}
function handleStart(x) { isDragging = true; startX = x; currentX = x; }
function handleMove(x) { if (isDragging) currentX = x; }
function handleEnd() {
if (!isDragging) return;
const deltaX = currentX - startX;
const threshold = 40;
let index = sliderState.get(productId) || 0;
if (deltaX < -threshold) index++;
else if (deltaX > threshold) index--;
updateSliderLocal(index);
isDragging = false;
}
slider.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX));
slider.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX));
slider.addEventListener("touchend", handleEnd);
slider.addEventListener("mousedown", (e) => handleStart(e.clientX));
slider.addEventListener("mousemove", (e) => { if (isDragging) handleMove(e.clientX); });
slider.addEventListener("mouseup", handleEnd);
slider.addEventListener("mouseleave", () => { if (isDragging) handleEnd(); });
dots.forEach((dot) => dot.addEventListener("click", () => updateSliderLocal(Number(dot.dataset.index))));
}
function handleInitialHash() {
if (initialHashHandled) return;
initialHashHandled = true;
const hash = window.location.hash;
if (!hash) return;
const id = hash.replace("#", "");
if (id.startsWith("producto-")) {
const productId = id.replace("producto-", "");
const idx = filteredProducts.findIndex(p => String(p.ID ?? p.id) === String(productId));
if (idx !== -1) {
// Con paginación de backend, simplemente recargamos la búsqueda si el producto no está visible
// El backend ya entregó la página correcta; solo hacemos scroll al elemento si está en el DOM
}
}
setTimeout(() => {
const el = document.getElementById(id);
if (!el) return;
if (typeof window.highlightSharedElement === "function") window.highlightSharedElement(el);
else el.scrollIntoView({ behavior: "smooth", block: "center" });
}, 400);
}
async function openWhatsAppCheckout() {
const items = Object.values(localCart);
if (items.length === 0) {
showTemporaryMessage("No hay productos en el carrito", "error");
return;
}
const hasAcceptedPrivacy = localStorage.getItem("privacy_accepted") === "true";
if (!hasAcceptedPrivacy) {
showPrivacyModal(() => continueCheckout());
return;
}
continueCheckout();
}
async function continueCheckout() {
const items = Object.values(localCart);
if (items.length === 0) return;
let clientPhone = localStorage.getItem("client_phone");
if (!clientPhone) {
clientPhone = await prompt(
" Para procesar tu compra, ingresa tu número de WhatsApp (10 dígitos):\n\n Solo números, sin espacios ni código país.\n Tus datos están protegidos",
""
);
if (!clientPhone) {
showTemporaryMessage(" Necesitamos tu número para procesar la compra", "error");
return;
}
clientPhone = clientPhone.replace(/[^0-9]/g, '');
if (clientPhone.length !== 10) {
showTemporaryMessage(" Número inválido. Debe tener 10 dígitos.", "error");
return;
}
localStorage.setItem("client_phone", clientPhone);
}
showLoader("Enviando solicitud...");
const requestId = generateRequestId();
const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const _cAddr  = localStorage.getItem("client_address")  || "";
const _cSchedule = localStorage.getItem("client_schedule") || "";
const _cNote  = localStorage.getItem("client_note")  || "";
const _cLat  = localStorage.getItem("client_gps_lat");
const _cLng  = localStorage.getItem("client_gps_lng");
let adminMessage = "* NUEVA SOLICITUD DE COMPRA*\n";
adminMessage += "\n";
adminMessage += ` *Cliente:* +52 ${clientPhone}\n`;
adminMessage += ` *ID:* ${requestId}\n`;
adminMessage += ` *Fecha:* ${new Date().toLocaleString()}\n`;
if (_cAddr)  adminMessage += ` *Dirección:* ${_cAddr}\n`;
if (_cLat && _cLng) adminMessage += ` *Ubicación:* https://www.google.com/maps?q=${_cLat},${_cLng}\n`;
if (_cSchedule) adminMessage += ` *Horario:* ${_cSchedule}\n`;
if (_cNote)  adminMessage += ` *Instrucciones:* ${_cNote}\n`;
adminMessage += "\n";
adminMessage += "* PRODUCTOS:*\n\n";
items.forEach((item, index) => {
adminMessage += `• *${item.name}*\n`;
adminMessage += `  Cantidad: ${item.quantity} | $${item.price.toLocaleString()} c/u\n`;
adminMessage += `  Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
if (index < items.length - 1) adminMessage += "\n";
});
adminMessage += "\n\n";
adminMessage += ` *TOTAL:* $${total.toLocaleString()} MXN\n`;
adminMessage += "\n";
adminMessage += "Una vez confirmado tu pedido te enviaremos un mensaje por este chat.\n";
const whatsappAdminUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
window.open(whatsappAdminUrl, '_blank');
try {
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "saveClientPhone", requestId: requestId, phone: clientPhone })
});
const notificationItems = items.map(item => ({
productId: item.id,
nombre: item.name,
cantidad: item.quantity,
imagen: item.Imagen1 || "",
talla: item.Talla || "",
precio: item.price || 0
}));
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
});

if (typeof window.saveOrderToHistory === 'function') {
window.saveOrderToHistory({
requestId,
timestamp: Date.now(),
status: 'pendiente',
total,
items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
});
}
localCart = {};
saveCartToStorage();
updateCartBadge();
if (typeof renderCart === 'function') renderCart();
showTemporaryMessage(` ¡Solicitud enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`, "success");
closeCartDrawer();
startSilentPolling(requestId, clientPhone);
} catch(err) {
console.error("Error:", err);
showTemporaryMessage(" Error al enviar la solicitud", "error");
} finally {
hideLoader();
}
}
function startSilentPolling(requestId, clientPhone) {
let interval = setInterval(async () => {
try {
const response = await fetch(`${API_URL}?action=checkRequestStatus&requestId=${requestId}`);
const data = await response.json();
if (data.ok && data.status === 'approved' && data.paymentLink) {
clearInterval(interval);

if (typeof loadOrders === 'function' && typeof saveOrders === 'function') {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.requestId === requestId);
  if (idx !== -1) { orders[idx].status = 'confirmado'; saveOrders(orders); }
}
const itemsFromRequest = data.items || Object.values(localCart);
let message = " *¡PEDIDO CONFIRMADO!*\n";
message += "\n\n";
message += ` *Total a pagar:* $${(data.totalAmount || 0).toLocaleString()} MXN\n\n`;
message += "* Tu pedido:*\n";
itemsFromRequest.forEach((item, idx) => {
message += `${idx+1}. *${item.name || item.Nombre}*\n`;
message += `  Talla: ${item.Talla || item.talla || "N/A"} |  ${item.quantity || item.cantidad || 1} x $${(item.price || item.Precio || 0).toLocaleString()}\n`;
});
message += "\n";
message += "\n";
message += "* OPCIONES DE PAGO:*\n\n";
message += ` *Link de pago seguro* (válido 30 min):\n${data.paymentLink}\n\n`;
message += " *Transferencia directa:*\n";
message += "Banco: BBVA\n";
message += "Cuenta: **** **** **** 1234\n";
message += "CLABE: 0123 4567 8901 2345 67\n\n";
message += "\n";
message += "* INFORMACIÓN DE ENTREGA:*\n";
const hasShippingItems = itemsFromRequest.some(i => hasFreeShipping(i.price || i.Precio || 0));
if (hasShippingItems) {
message += " Tienes productos que califican para envío\n";
message += " Las entregas pueden ser a domicilio o punto intermedio\n";
message += "⏰ Los tiempos varían según la distancia\n\n";
} else {
message += " Los productos seleccionados no califican para envío\n";
message += " Acuerda la recolección o punto de entrega\n\n";
}
message += "\n";
message += " *Importante:*\n";
message += "• Envía tu comprobante de pago por este chat\n";
message += "• Tu pedido se enviará al confirmar el pago\n";
message += "• Cualquier duda, responde a este mensaje\n\n";
message += "¡Gracias por tu compra! ";
let cleanPhone = String(clientPhone).replace(/[^0-9]/g, '');
if (cleanPhone.length === 10) cleanPhone = "52" + cleanPhone;
const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
window.open(whatsappUrl, '_blank');
localStorage.removeItem('pending_purchase_' + requestId);
showTemporaryMessage(" ¡Pago confirmado! Revisa WhatsApp para tu link de pago.", "success");
}
} catch (err) {
console.error("Error en polling:", err);
}
}, 5000);
setTimeout(() => {
clearInterval(interval);
localStorage.removeItem('pending_purchase_' + requestId);
}, 600000);
}
async function pagarConMercadoPago() {
const items = Object.values(localCart).map(item => ({
id: item.id,
title: item.name,
quantity: item.quantity,
unit_price: item.price
}));
if (items.length === 0) {
alert("No hay productos en el carrito");
return;
}
showLoader("Preparando pago...");
try {
const params = new URLSearchParams({ action: "createPreference", items: JSON.stringify(items) });
const response = await fetch(`${API_URL}?${params.toString()}`, { method: "GET" });
const data = await response.json();
if (data.ok && data.initPoint) {
window.location.href = data.initPoint;
} else {
throw new Error(data.error || "Error desconocido");
}
} catch (error) {
console.error("Error:", error);
alert(" Error: " + error.message);
hideLoader();
}
}
function verificarEstadoPago() {
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get("payment");
if (paymentStatus === "success") {
localCart = {};
saveCartToStorage();
updateCartBadge();
if (typeof renderCart === 'function') renderCart();
alert(" ¡Pago completado con éxito!\n\nGracias por tu compra.");
window.history.replaceState({}, document.title, window.location.pathname);
} else if (paymentStatus === "failure") {
alert(" El pago no pudo completarse.\n\nPor favor, intenta nuevamente.");
window.history.replaceState({}, document.title, window.location.pathname);
} else if (paymentStatus === "pending") {
alert("⏳ Tu pago está siendo procesado.\n\nTe notificaremos cuando se confirme.");
window.history.replaceState({}, document.title, window.location.pathname);
}
}
document.addEventListener("DOMContentLoaded", () => {
  // Escalonamos fetchFilterOptions y fetchProducts para no saturar
  // el límite de ejecuciones concurrentes de Apps Script (que devuelve 404
  // desde script.googleusercontent.com/macros/echo cuando se satura).
  fetchFilterOptions();
  setTimeout(() => fetchProducts(), 300);
startGlobalSliderInterval();

      let searchInput = document.getElementById("search-input");
      if (searchInput) {

        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        searchInput = newSearchInput;
        
        let searchDebounceTimeout;
        searchInput.addEventListener("input", function(e) {
  clearTimeout(searchDebounceTimeout);
  _suppressFilterEvents = false;
  

  
  searchDebounceTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
});
      }

      const genderFilter = document.getElementById("gender-filter");
      if (genderFilter) {
        const newGenderFilter = genderFilter.cloneNode(true);
        genderFilter.parentNode.replaceChild(newGenderFilter, genderFilter);
        newGenderFilter.addEventListener("change", () => {
  try {
    _suppressFilterEvents = false;
    const gender = newGenderFilter.value;
    // 🆕 al cambiar género, recalculamos qué categorías y tallas existen para ese género
    populateCategoryFilter(gender);
    const categoryVal = document.getElementById("category-filter")?.value || '';
    populateSizeFilter(gender, categoryVal);
    applyFilters();
  } catch (e) {
    _suppressFilterEvents = false;
    applyFilters();
  }
});
      }

      const categoryFilter = document.getElementById("category-filter");
      if (categoryFilter) {
        const newCategoryFilter = categoryFilter.cloneNode(true);
        categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
        newCategoryFilter.addEventListener("change", () => {
  try {
    _suppressFilterEvents = false;
    const gv = document.getElementById("gender-filter")?.value || '';
    // 🆕 al cambiar categoría, recalculamos qué tallas existen para género+categoría
    populateSizeFilter(gv, newCategoryFilter.value);
    _suppressFilterEvents = false;
    applyFilters();
  } catch (e) {
    _suppressFilterEvents = false;
    applyFilters();
  }
});
      }

const sizeSelect = document.getElementById("size-filter");
if (sizeSelect) {
  sizeSelect.addEventListener("change", () => {
    _suppressFilterEvents = false;
    applyFilters();
  });
}

       const sortSelect = document.getElementById("sort-select");
      if (sortSelect) sortSelect.addEventListener("change", () => applyFilters());

const closeCartBtn = document.getElementById("close-cart-btn");
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
const overlay = document.getElementById("overlay");
if (overlay) overlay.addEventListener("click", () => {
closeCartDrawer();
closeImageModal();
});
const closeImageBtn = document.getElementById("close-image-modal");
if (closeImageBtn) closeImageBtn.addEventListener("click", closeImageModal);
const refreshBtn = document.getElementById("refresh-btn");
if (refreshBtn) refreshBtn.addEventListener("click", () => {
if (!isLoading) fetchProducts(true);
});
const requestBtn = document.getElementById("request-purchase-btn");
if (requestBtn) requestBtn.addEventListener("click", openWhatsAppCheckout);
const mpBtn = document.getElementById("mp-checkout-btn");
if (mpBtn) mpBtn.addEventListener("click", pagarConMercadoPago);
verificarEstadoPago();
const layoutBtn = document.getElementById("layout-toggle-btn");
const productsContainer = document.getElementById("products-container");
if (layoutBtn && productsContainer) {
const savedLayout = localStorage.getItem("products_layout") || "list";
if (savedLayout === "grid") {
productsContainer.classList.add("layout-grid");
layoutBtn.textContent = "";
} else {
layoutBtn.textContent = "≡";
}
layoutBtn.addEventListener("click", () => {
productsContainer.classList.toggle("layout-grid");
const isGrid = productsContainer.classList.contains("layout-grid");
const layout = isGrid ? "grid" : "list";
localStorage.setItem("products_layout", layout);
layoutBtn.textContent = isGrid ? "" : "≡";
window.dispatchEvent(new CustomEvent("layoutChanged", { detail: { layout } }));
});
window.addEventListener("layoutChanged", (e) => {
const isGrid = e.detail.layout === "grid";
productsContainer.classList.toggle("layout-grid", isGrid);
layoutBtn.textContent = isGrid ? "" : "≡";
});
}
checkOfflineOnStart();
});
window.addEventListener('cartUpdated', () => {
if (typeof renderCart === 'function') renderCart();
updateCartBadge();
});
})();

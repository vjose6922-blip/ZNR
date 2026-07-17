(function() {
const COMUNIDAD_CACHE_KEY = 'zr_comunidad_data';
const COMUNIDAD_CACHE_TTL_SESSION = 5 * 60 * 1000;
const COMUNIDAD_CACHE_TTL_LOCAL   = 30 * 60 * 1000;
const renderPage = renderProducts;

function setComunidadCache(products) {
  const payload = JSON.stringify({ data: products, timestamp: Date.now(), version: '1.1' });
  try { sessionStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
  try { localStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
}

function getComunidadCache() {
  try {

    let raw = sessionStorage.getItem(COMUNIDAD_CACHE_KEY);
    let ttl = COMUNIDAD_CACHE_TTL_SESSION;
    let store = 'session';

    if (!raw) {
      raw = localStorage.getItem(COMUNIDAD_CACHE_KEY);
      ttl = COMUNIDAD_CACHE_TTL_LOCAL;
      store = 'local';
    }
    if (!raw) return null;
    const { data, timestamp, version } = JSON.parse(raw);
    if (version !== '1.1') { localStorage.removeItem(COMUNIDAD_CACHE_KEY); return null; }
    if (Date.now() - timestamp > ttl) {
      if (store === 'session') sessionStorage.removeItem(COMUNIDAD_CACHE_KEY);
      else localStorage.removeItem(COMUNIDAD_CACHE_KEY);
      return null;
    }
    console.log(`Comunidad desde caché (${store})`);
    return data;
  } catch(e) { return null; }
}

function invalidateComunidadCache() {
  currentPage = 1;
  totalPagesGlobal = 1;
  allCommunityProducts = [];
  filteredProducts = [];
  communityRandomOrder = null;
  sessionStorage.removeItem(COMUNIDAD_CACHE_KEY);
  localStorage.removeItem(COMUNIDAD_CACHE_KEY);
}
'use strict';
if (typeof window.optimizeDriveUrl !== 'function') {
window.optimizeDriveUrl = function(url, size) { return url; };
console.warn(' optimizeDriveUrl no definida, usando identidad');
}
if (typeof window.formatCurrency !== 'function') {
window.formatCurrency = function(value) { return '$' + Number(value).toLocaleString(); };
console.warn(' formatCurrency no definida, usando función simple');
}
if (typeof window.escapeHtml !== 'function') {
window.escapeHtml = function(str) {
if (!str) return '';
return String(str).replace(/[&<>]/g, function(m) {
if (m === '&') return '&amp;';
if (m === '<') return '&lt;';
if (m === '>') return '&gt;';
return m;
});
};
console.warn(' escapeHtml no definida, usando función simple');
}
if (typeof window.addToCart !== 'function') {
window.addToCart = function(product) { console.warn('addToCart no definida', product); };
console.warn(' addToCart no definida');
}
if (typeof window.openImageModal !== 'function') {
window.openImageModal = function(url, id, images, productData) { console.warn('openImageModal no definida', url); };
console.warn(' openImageModal no definida');
}
if (typeof window.showTemporaryMessage !== 'function') {
window.showTemporaryMessage = function(msg, type) { console.log(msg); };
console.warn(' showTemporaryMessage no definida');
}
const PAGE_SIZE = 15;             // productos por página
let allCommunityProducts = [];    // productos de
let filteredProducts = [];        // alias de allComm000
let currentPage = 1;              // página actual
let totalPagesGlobal = 1;         // total de páginas devuelto por el backend
let currentFilters = {};          // filtros activos (para mantenerlos al cambia00000
let isLoading = false;
let gridContainer, catSelect, vendorSelect, paginationDiv;
let hasLoadedOnce = false; 
let debounceTimer = null;
let inspectorMode = false;
let initialHashHandledComunidad = false;
let comunidadFilterOptionsLoaded = false; 
let communityRandomOrder = null; 
async function initInspectorMode() {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('inspector') !== '1') return;

const tokenFromUrl = urlParams.get('token') || '';
const token = tokenFromUrl || sessionStorage.getItem('admin_token') || '';
if (!token) {
console.log(' Modo inspector: sin token de admin, acceso denegado');
return;
}
if (tokenFromUrl) {
sessionStorage.setItem('admin_token', tokenFromUrl);

const cleanUrl = new URL(window.location.href);
cleanUrl.searchParams.delete('token');
history.replaceState(null, '', cleanUrl.toString());
}
try {
const api = window.API_URL || '';
const res = await fetch(api + "?" + new URLSearchParams({ action: "verificarAdmin", token: token }).toString());
const data = await res.json();
if (data.ok === true) {
inspectorMode = true;
console.log(' Modo inspector activado');
const banner = document.createElement('div');
banner.id = 'inspector-banner';
banner.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
background: linear-gradient(90deg, #3b1f5f, #7c3aed);
color: white; text-align: center; padding: 8px 16px;
font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
box-shadow: 0 2px 10px rgba(0,0,0,0.3);
`;
banner.innerHTML = ' MODO ADMIN';
document.body.prepend(banner);
const header = document.querySelector('.app-header');
if (header) header.style.marginTop = '38px';
} else {
console.warn(' Token de admin inválido, modo inspector desactivado');
}
} catch (err) {
console.error('Error verificando admin:', err);
}
}
function getFiltersFromURL() {
const urlParams = new URLSearchParams(window.location.search);
return {
busqueda: urlParams.get('busqueda') || '',
categoria: urlParams.get('categoria') || '',
vendedor: urlParams.get('vendedor') || '',
orden: urlParams.get('orden') || ''
};
}
function updateURLWithFilters() {
const searchTerm = getSearchValue();
const category = catSelect ? catSelect.value : '';
const vendor = vendorSelect ? vendorSelect.value : '';
const ordenEl = document.getElementById('comunidad-orden');
const orden = ordenEl ? ordenEl.value : '';
const params = new URLSearchParams();
if (new URLSearchParams(window.location.search).get('inspector') === '1') {
params.set('inspector', '1');
}
if (searchTerm) params.set('busqueda', searchTerm);
if (category) params.set('categoria', category);
if (vendor) params.set('vendedor', vendor);
if (orden) params.set('orden', orden);
const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
window.history.replaceState({}, '', newURL);
}
function getSearchValue() {
const input = document.getElementById('comunidad-search');
return input ? input.value.trim().toLowerCase() : '';
}
function safeString(value) {
return (value != null) ? String(value) : '';
}

// fetchWithRetry ahora vive en common.js (se carga antes que este archivo).
function showSkeletonComunidad(container, count = 6) {
const cards = Array.from({length: count}, () => `
<div class="skeleton-product-card">
<div class="sk-img shimmer"></div>
<div class="sk-body">
<div class="sk-line sk-title shimmer"></div>
<div class="sk-line sk-price shimmer"></div>
<div class="sk-line sk-badge shimmer"></div>
</div>
</div>`).join('');
container.innerHTML = cards;
}

// ── Construye la URL de la API con los parámetros actuales ──────────────────
function buildComunidadUrl(page, filters) {
  const u = new URL(window.API_URL);
  u.searchParams.set('action', 'listarComunidad');
  u.searchParams.set('page',   String(page));
  u.searchParams.set('limit',  String(PAGE_SIZE));
  if (filters.categoria)  u.searchParams.set('categoria',    filters.categoria);
  if (filters.busqueda)   u.searchParams.set('busqueda',     filters.busqueda);
  if (filters.vendedor)   u.searchParams.set('vendedor_uid', filters.vendedor);
  if (filters.orden === 'verificados') u.searchParams.set('soloPro', 'true');
  if (filters.orden)      u.searchParams.set('orden',       filters.orden);
  if (inspectorMode)      u.searchParams.set('admin',        'true');
  return u.toString();
}

// ── Carga y renderiza una página de productos vía GAS (respaldo / modo inspector) ──
async function loadComunidadPageGAS(page, filters, opts = {}) {
  if (isLoading && !opts.force) return;
  isLoading = true;

  // isFirstLoad: solo true la primera vez que se carga la página (no en cada cambio de filtro,
  // que también llega con isPageChange:false). Antes esto hacía que CUALQUIER cambio de filtro
  // pintara primero el catálogo completo en caché antes de la respuesta real filtrada.
  const isFirstLoad = !hasLoadedOnce;

  if (!window.API_URL) {
    if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">Error de configuración. Recarga la página.</div>';
    isLoading = false;
    return;
  }

  // En la primera carga mostramos caché mientras llega la red
  if (isFirstLoad && !opts.force) {
    const cached = getComunidadCache();
    if (cached && cached.length > 0) {
      allCommunityProducts = cached;
      filteredProducts     = [...cached];
      totalPagesGlobal     = 1; // caché no tiene meta, asumimos 1 página
      currentPage          = 1;
      renderProducts();
      if (typeof window.hideLoader === 'function') window.hideLoader();
    } else {
      if (gridContainer) showSkeletonComunidad(gridContainer, 6);
      if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
    }
  } else if (opts.isPageChange) {
    if (gridContainer) showSkeletonComunidad(gridContainer, PAGE_SIZE);
  }

  try {
    // Si ya tenemos el orden aleatorio armado en esta sesión (por Algolia o
    // por una llamada GAS previa), solo paginamos en memoria, sin red.
    if (esVistaComunidadPorDefecto(filters) && communityRandomOrder && !opts.force) {
      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
      filteredProducts     = [...allCommunityProducts];
      window.allCommunityProductsIndexed = allCommunityProducts;
      renderProducts();
      handleInitialHashComunidad();
      isLoading = false;
      hasLoadedOnce = true;
      if (typeof window.hideLoader === 'function') window.hideLoader();
      return;
    }

    const url = buildComunidadUrl(page, filters);
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');

    if (data.fullSet) {
      communityRandomOrder = data.products || [];
      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
    } else {
      currentPage      = data.page      || page;
      totalPagesGlobal = data.totalPages || 1;
      allCommunityProducts = data.products || [];
    }
    filteredProducts     = [...allCommunityProducts];
    window.allCommunityProductsIndexed = allCommunityProducts;

    // Poblar dropdowns de filtros solo en la primera carga (el backend los manda en page=1)
    if (data.filterOptions) {
      populateFiltersFromOptions(data.filterOptions);
    }

    // Cachear solo la primera página sin filtros (igual que en script.js)
    if (page === 1 && !filters.categoria && !filters.busqueda && !filters.vendedor && !filters.orden) {
      setComunidadCache(allCommunityProducts);
    }

    // Respaldo: si el backend GAS aún no soporta 'orden' (calificación/precio),
    // reordenamos localmente lo que llegó en esta página (no es un orden global,
    // pero evita que el select quede sin efecto en modo inspector/sin conexión).
    aplicarOrdenLocal(filters.orden);

    renderProducts();
    handleInitialHashComunidad();

  } catch (err) {
    console.error('Error loadComunidadPageGAS:', err);
    if (window.ZRMonitor) ZRMonitor.report('CRÍTICO','comunidad.js','loadComunidadPageGAS', err.message || String(err));
    // Si falla y hay caché, la usamos como respaldo
    const cached = getComunidadCache();
    if (cached && cached.length > 0 && allCommunityProducts.length === 0) {
      allCommunityProducts = cached;
      filteredProducts     = [...cached];
      renderProducts();
      if (typeof window.showTemporaryMessage === 'function') {
        window.showTemporaryMessage('Mostrando datos guardados — sin conexión', 'info');
      }
    } else if (allCommunityProducts.length === 0 && gridContainer) {
      gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">
        Error al cargar productos de la comunidad.<br>
        <small style="color:var(--color-text-muted,#888);font-size:11px;">${err.message || ''}</small><br>
        <button onclick="loadComunidadPage(1,{})" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:#ff4f81; color:white; cursor:pointer; font-weight:600;"  >${Icon('refresh')} Reintentar</button>
      </div>`;
    }
  } finally {
    isLoading = false;
    hasLoadedOnce = true;
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}

// ── Carga las opciones de los selects UNA sola vez, sin filtros aplicados ──
// (si se piden junto con un filtro activo, Algolia solo devuelve el valor ya seleccionado)
async function loadComunidadFilterOptionsAlgolia() {
  if (comunidadFilterOptionsLoaded || !window.algoliaIndex) return;
  try {
    // Traemos hits (no solo facets) para poder mapear vendedor_uid -> vendedor_nombre.
    // Antes se armaba el <select> de vendedores con el facet "vendedor_nombre" como value,
    // pero el filtro de búsqueda filtra por "vendedor_uid" (ver loadComunidadPageAlgolia).
    // Ese desajuste hacía que Algolia no encontrara resultados al elegir un vendedor
    // y el código caía al respaldo de GAS, cuyo filterOptions se calcula SOBRE la lista
    // ya filtrada (ver listarProductosComunidad en el backend) — por eso el select se
    // quedaba solo con la categoría/vendedor ya seleccionado en vez de mostrar todos.
    const r = await window.algoliaIndex.search('', {
      hitsPerPage: 1000,
      attributesToRetrieve: ['vendedor_uid', 'vendedor_nombre'],
      facets: ['categoria']
    });

    const categories = Object.keys((r.facets && r.facets.categoria) || {}).sort();

    const vendorMap = new Map();
    (r.hits || []).forEach(hit => {
      if (hit.vendedor_uid && !vendorMap.has(hit.vendedor_uid)) {
        vendorMap.set(hit.vendedor_uid, hit.vendedor_nombre || hit.vendedor_uid);
      }
    });
    const vendors = Array.from(vendorMap, ([uid, nombre]) => ({ uid, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    populateFiltersFromOptions({ categories, vendors });
    comunidadFilterOptionsLoaded = true;
  } catch (err) {
    console.error('Error cargando opciones de filtro (Algolia):', err);
  }
}

// ── Réplicas de Algolia para el select "Ordenar por" ──────────────────────
// IMPORTANTE: estas réplicas deben existir en el dashboard de Algolia
// (índice znr_comunidad → pestaña Replicas). Mientras no existan, el catch
// de abajo hace que se use el índice normal sin romper nada.
const ALGOLIA_INDEX_BASE = 'znr_comunidad';
const ALGOLIA_REPLICAS = {
  calificacion: 'znr_comunidad_calificacion_desc',
  precio_asc:   'znr_comunidad_precio_asc'
};
let algoliaClientRef = null; // se detecta la primera vez que se usa
const algoliaReplicaCache = {};
function getAlgoliaIndexForOrden(orden) {
  const replicaName = ALGOLIA_REPLICAS[orden];
  if (!replicaName) return window.algoliaIndex; // 'verificados' o sin orden: índice normal + filtro
  if (algoliaReplicaCache[replicaName]) return algoliaReplicaCache[replicaName];
  try {
    if (!algoliaClientRef) {
      // window.algoliaIndex.client existe en algoliasearch-lite v4
      algoliaClientRef = window.algoliaIndex && window.algoliaIndex.client;
    }
    if (!algoliaClientRef) return window.algoliaIndex;
    const idx = algoliaClientRef.initIndex(replicaName);
    algoliaReplicaCache[replicaName] = idx;
    return idx;
  } catch (e) {
    console.warn('Réplica de Algolia no disponible (' + replicaName + '), usando índice normal:', e);
    return window.algoliaIndex;
  }
}

// ── Orden local de respaldo (modo GAS / sin réplicas de Algolia) ──────────
// Solo reordena lo que ya está cargado en memoria, NO es un orden global
// del catálogo completo. Se usa como respaldo cuando el orden real (Algolia
// replica o backend) no está disponible.
function aplicarOrdenLocal(orden) {
  if (!orden || orden === 'verificados' || !Array.isArray(filteredProducts)) return;
  if (orden === 'precio_asc') {
    filteredProducts.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  } else if (orden === 'calificacion') {
    filteredProducts.sort((a, b) => (Number(b.vendedor_calificacion) || 0) - (Number(a.vendedor_calificacion) || 0));
  }
  allCommunityProducts = filteredProducts;
}

// ── Vista por defecto = sin ningún filtro activo (ahí aplica el orden
// aleatorio con la página 1 reservada a verificados + ZNR) ────────────────
function esVistaComunidadPorDefecto(filters) {
  return !filters.categoria && !filters.busqueda && !filters.vendedor && !filters.orden;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Arma el orden completo de la vista por defecto: página 1 = solo verificados
// (plan 'plus') + productos ZNR, mezclados al azar; el resto se mezcla después
// sin repetir nada de la página 1. Se calcula UNA sola vez por sesión.
function construirOrdenAleatorioComunidad(hits) {
  const esVerificadoOZNR = p => p.es_znr === true || p.vendedor_plan === 'plus';
  const verificados = shuffleArray(hits.filter(esVerificadoOZNR));
  const pagina1 = verificados.slice(0, PAGE_SIZE);
  const pagina1Ids = new Set(pagina1.map(p => String(p.id)));
  const resto = shuffleArray(hits.filter(p => !pagina1Ids.has(String(p.id))));
  return pagina1.concat(resto);
}

// ── Carga y renderiza una página de productos vía Algolia (público, rápido) ──
async function loadComunidadPageAlgolia(page, filters, opts = {}) {
  if (isLoading && !opts.force) return;
  isLoading = true;

  // isFirstLoad: solo true la primera vez que se carga la página (no en cada cambio de filtro).
  const isFirstLoad = !hasLoadedOnce;

  if (isFirstLoad && !opts.force) {
    const cached = getComunidadCache();
    if (cached && cached.length > 0) {
      allCommunityProducts = cached;
      filteredProducts     = [...cached];
      totalPagesGlobal     = 1;
      currentPage          = 1;
      renderProducts();
      if (typeof window.hideLoader === 'function') window.hideLoader();
    } else {
      if (gridContainer) showSkeletonComunidad(gridContainer, 6);
      if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
    }
  } else if (opts.isPageChange) {
    if (gridContainer) showSkeletonComunidad(gridContainer, PAGE_SIZE);
  }

  try {
    if (!window.algoliaIndex) throw new Error('Algolia no está configurado');

    // Las opciones del select se cargan aparte y solo una vez, así siempre
    // muestran TODAS las categorías/vendedores, no solo las del filtro activo.
    loadComunidadFilterOptionsAlgolia();

    if (esVistaComunidadPorDefecto(filters)) {
      // ── Vista por defecto: se trae un lote grande UNA sola vez y se pagina
      // en memoria (así la página 1 queda reservada a verificados+ZNR y el
      // resto se mantiene fijo mientras el usuario navega de página) ──────
      if (!communityRandomOrder) {
        const searchResult = await window.algoliaIndex.search('', {
          hitsPerPage: 300,
          facets: ['categoria', 'vendedor_nombre']
        });
        communityRandomOrder = construirOrdenAleatorioComunidad(searchResult.hits || []);
      }

      currentPage      = page;
      totalPagesGlobal = Math.max(1, Math.ceil(communityRandomOrder.length / PAGE_SIZE));
      const start = (page - 1) * PAGE_SIZE;
      allCommunityProducts = communityRandomOrder.slice(start, start + PAGE_SIZE);
      filteredProducts     = [...allCommunityProducts];
      window.allCommunityProductsIndexed = allCommunityProducts;

      if (page === 1) setComunidadCache(allCommunityProducts);

    } else {
      // ── Con filtros/búsqueda/orden activos: paginado normal vía Algolia ──
      const filterParts = [];
      if (filters.categoria) filterParts.push('categoria:"' + String(filters.categoria).replace(/"/g, '') + '"');
      if (filters.vendedor)  filterParts.push('vendedor_uid:"' + String(filters.vendedor).replace(/"/g, '') + '"');
      if (filters.orden === 'verificados') filterParts.push('vendedor_plan:"plus"');
      const filterString = filterParts.join(' AND ');

      const targetIndex = getAlgoliaIndexForOrden(filters.orden);
      let searchResult;
      try {
        searchResult = await targetIndex.search(filters.busqueda || '', {
          filters: filterString,
          hitsPerPage: PAGE_SIZE,
          page: Math.max(0, page - 1),
          facets: ['categoria', 'vendedor_nombre']
        });
      } catch (replicaErr) {
        if (targetIndex !== window.algoliaIndex) {
          console.warn('Réplica de Algolia no encontrada, usando índice base + orden local:', replicaErr);
          searchResult = await window.algoliaIndex.search(filters.busqueda || '', {
            filters: filterString,
            hitsPerPage: PAGE_SIZE,
            page: Math.max(0, page - 1),
            facets: ['categoria', 'vendedor_nombre']
          });
        } else {
          throw replicaErr;
        }
      }

      currentPage      = page;
      totalPagesGlobal = searchResult.nbPages || 1;
      allCommunityProducts = searchResult.hits || [];
      filteredProducts     = [...allCommunityProducts];
      aplicarOrdenLocal(filters.orden);
      window.allCommunityProductsIndexed = allCommunityProducts;
    }

    renderProducts();
    handleInitialHashComunidad();

  } catch (err) {
    console.error('Error loadComunidadPageAlgolia:', err);
    if (window.ZRMonitor) ZRMonitor.report('ERROR','comunidad.js','loadComunidadPageAlgolia', err.message || String(err));
    // Si Algolia falla por cualquier razón, caemos de vuelta a GAS para no dejar la tienda sin buscador
    return loadComunidadPageGAS(page, filters, opts);
  } finally {
    isLoading = false;
    hasLoadedOnce = true;
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}

// ── Punto de entrada: decide si usar Algolia (público) o GAS (modo inspector/admin) ──
async function loadComunidadPage(page, filters, opts = {}) {
  // El modo inspector necesita ver productos pendientes también, que no viven en Algolia
  if (inspectorMode) {
    return loadComunidadPageGAS(page, filters, opts);
  }
  return loadComunidadPageAlgolia(page, filters, opts);
}

// Alias para compatibilidad con llamadas existentes (ej: botón reintentar)
function loadCommunityProducts() {
  const urlFilters = getFiltersFromURL();
  // Aplicar filtros URL a los inputs si existen
  if (urlFilters.busqueda) {
    const el = document.getElementById('comunidad-search');
    if (el) el.value = urlFilters.busqueda;
  }
  if (urlFilters.orden) {
    const el = document.getElementById('comunidad-orden');
    if (el) el.value = urlFilters.orden;
  }
  currentFilters = urlFilters;
  updateComunidadChips(urlFilters);
  return loadComunidadPage(1, urlFilters);
}

// Pobla los dropdowns con las opciones que devuelve el backend en page=1
function populateFiltersFromOptions(filterOptions) {
  if (catSelect && filterOptions.categories) {
    const currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="">Categorías</option>';
    filterOptions.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    if (currentVal) catSelect.value = currentVal;
  }
  if (vendorSelect && filterOptions.vendors) {
    const currentVal = vendorSelect.value;
    vendorSelect.innerHTML = '<option value="">Vendedores</option>';
    filterOptions.vendors.forEach(v => {
      const opt = document.createElement('option');
      // Soporta objetos {uid, nombre} (Algolia) y strings sueltos (respaldo GAS)
      if (v && typeof v === 'object') { opt.value = v.uid; opt.textContent = v.nombre; }
      else { opt.value = v; opt.textContent = v; }
      vendorSelect.appendChild(opt);
    });
    if (currentVal) vendorSelect.value = currentVal;
  }
}

// Alias para cuando el backend no devuelve filterOptions (páginas > 1 o caché)
function populateFilters() {
  // No-op: los filtros se pueblan desde la respuesta del backend (filterOptions en page=1)
  // Si no hay datos aún, no hacemos nada para no romper los selects
}

// Recolecta los filtros de los inputs y dispara una nueva petición al backend (página 1)
function applyFilters() {
  try {
    const busqueda  = getSearchValue();
    const categoria = catSelect    ? catSelect.value    : '';
    const vendedor  = vendorSelect ? vendorSelect.value : '';
    const ordenEl   = document.getElementById('comunidad-orden');
    const orden     = ordenEl ? ordenEl.value : '';
    const filters = { busqueda, categoria, vendedor, orden };
    // Eliminar vacíos
    Object.keys(filters).forEach(k => { if (!filters[k]) delete filters[k]; });
    currentFilters = filters;
    updateComunidadChips(filters);
    loadComunidadPage(1, filters, { isPageChange: false });
    updateURLWithFilters();
  } catch (err) {
    console.error('Error en applyFilters:', err);
  }
}

// ── Chips de filtros activos (mismo patrón visual que catálogo) ──────────
function updateComunidadChips(filters) {
  const bar = document.getElementById('comunidad-filter-chips');
  if (!bar) return;
  const ordenLabels = {
    verificados:  `${Icon('check')} Verificados`,
    calificacion: `${Icon('star')} Mejor calificado`,
    precio_asc:   `${Icon('dollar')} Menor a mayor precio`
  };
  const chips = [];
  if (filters.busqueda)  chips.push({ label: `${Icon('search')} "${filters.busqueda}"`, clear: () => { const el = document.getElementById('comunidad-search'); if (el) el.value = ''; applyFilters(); } });
  if (filters.categoria) chips.push({ label: `${filters.categoria}`, clear: () => { if (catSelect) catSelect.value = ''; applyFilters(); } });
  if (filters.vendedor)  chips.push({ label: `${vendorSelect && vendorSelect.selectedOptions[0] ? vendorSelect.selectedOptions[0].textContent : 'Vendedor'}`, clear: () => { if (vendorSelect) vendorSelect.value = ''; applyFilters(); } });
  if (filters.orden)     chips.push({ label: ordenLabels[filters.orden] || filters.orden, clear: () => { const el = document.getElementById('comunidad-orden'); if (el) el.value = ''; applyFilters(); } });

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
        ['comunidad-cat','comunidad-vendor','comunidad-orden'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        const si = document.getElementById('comunidad-search'); if (si) si.value = '';
        applyFilters();
      } else {
        chips[Number(idx)].clear();
      }
    });
  });
}
function renderProducts() {
if (!gridContainer) return;
try {
  // Los productos ya vienen paginados desde el backend — renderizamos todo el array
  if (filteredProducts.length === 0) {
    gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">No hay productos que coincidan con los filtros.</div>`;
    renderPagination();
    return;
  }
  gridContainer.innerHTML = '';
  filteredProducts.forEach(product => {
    const card = createCommunityCard(product);
    if (card) gridContainer.appendChild(card);
  });
  const savedLayout = localStorage.getItem('products_layout') || 'grid';
  if (savedLayout === 'grid') gridContainer.classList.add('layout-grid');
  else gridContainer.classList.remove('layout-grid');
  renderPagination();
  initLazyImages();
} catch (err) {
  console.error('Error en renderProducts:', err);
  gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:red;">Error al mostrar productos. Revisa la consola.</div>';
}
}

// ── Buscador por foto (ai-busqueda-visual.js) ────────────────────────────
// Reemplaza temporalmente la grilla con productos ordenados por similitud
// visual. El módulo de búsqueda visual ya trae los datos completos de cada
// producto (mismo formato que usa createCommunityCard), así que solo hay
// que sustituir el array y volver a renderizar.
window.aplicarResultadosBusquedaVisual = function (productosOrdenados) {
  filteredProducts = productosOrdenados;
  allCommunityProducts = productosOrdenados;
  totalPagesGlobal = 1;
  currentPage = 1;
  renderProducts();
};

// Vuelve al estado normal de búsqueda/filtros (usado por el botón "quitar
// búsqueda por foto" del módulo de búsqueda visual).
window.restaurarBusquedaNormalComunidad = function () {
  if (typeof applyFilters === 'function') applyFilters();
};

function handleInitialHashComunidad() {
if (initialHashHandledComunidad) return;
const hash = window.location.hash;
if (!hash || !hash.startsWith('#producto-')) return;
initialHashHandledComunidad = true;
const id = hash.replace('#producto-', '');
// Con paginación de backend el producto puede estar en cualquier página.
// Solo hacemos scroll si ya está renderizado en la página actual.
// (Si no está visible, el usuario puede navegar con los botones de paginación)
setTimeout(() => {
const el = document.getElementById('producto-' + id);
if (!el) return;
if (typeof window.highlightSharedElement === 'function') window.highlightSharedElement(el);
else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, 400);
}
async function deleteProductInspector(productId, productName, cardElement) {
const token = sessionStorage.getItem('admin_token') || '';
if (!token) {
window.showTemporaryMessage(' Sin sesión de admin', 'error');
return;
}
showCustomConfirm({
title: ' Eliminar producto',
message: `¿Eliminar "${productName}" de la comunidad? Esta acción no se puede deshacer.`,
icon: '',
confirmText: 'Eliminar',
cancelText: 'Cancelar',
onConfirm: async () => {
try {
if (typeof window.showLoader === 'function') window.showLoader('Eliminando...');
const params = new URLSearchParams({
action: 'deleteComunidad',
id: String(productId),
token: token
});
const res = await fetch(window.API_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
const data = await res.json();
if (!data.ok) throw new Error(data.error || 'Error al eliminar');
cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
cardElement.style.opacity = '0';
cardElement.style.transform = 'scale(0.9)';
setTimeout(() => cardElement.remove(), 320);
invalidateComunidadCache();
// Recargar la página actual para reflejar el cambio
loadComunidadPage(currentPage, currentFilters, { force: true });
window.showTemporaryMessage('Producto eliminado de la comunidad', 'success');
} catch (err) {
console.error('Error eliminando producto:', err);
window.showTemporaryMessage(' Error al eliminar: ' + err.message, 'error');
} finally {
if (typeof window.hideLoader === 'function') window.hideLoader();
}
}
});
}
function showReportDialog(product) {
const modal = document.createElement('div');
modal.className = 'custom-alert-modal';
modal.style.zIndex = '100000';
modal.innerHTML = `
<div class="custom-alert-content" style="max-width:380px; width:90%;">
<div class="custom-alert-header">
<span class="custom-alert-icon"></span>
<h3>Reportar producto</h3>
</div>
<div class="custom-alert-body">
<p style="font-weight:600; margin-bottom:12px; color:var(--color-text-primary,#1a1a2e);">
"${window.escapeHtml(safeString(product.nombre))}"
</p>
<p style="margin-bottom:12px; font-size:13px; color:var(--color-text-muted,#666);">Selecciona el motivo del reporte:</p>
<div style="display:flex; flex-direction:column; gap:8px;">
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
<input type="radio" name="report-reason" value="Producto inapropiado" style="accent-color:#ff4f81;">
<span style="font-size:13px;">Producto inapropiado</span>
</label>
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
<input type="radio" name="report-reason" value="Información falsa o engañosa" style="accent-color:#ff4f81;">
<span style="font-size:13px;">Información falsa / engañosa</span>
</label>
<label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;" id="report-otro-label">
<input type="radio" name="report-reason" value="Otro" style="accent-color:#ff4f81;" id="report-radio-otro">
<span style="font-size:13px;">Otro (especificar)</span>
</label>
<div id="report-otro-field" style="display:none; margin-top:4px;">
<input type="text" id="report-otro-text" placeholder="Describe el problema..." maxlength="200"
style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; font-size:13px; box-sizing:border-box; background:var(--color-input-bg,#f9f9ff);">
</div>
</div>
</div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel" id="report-cancel-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Cancelar</button>
<button class="custom-alert-btn confirm" id="report-confirm-btn" style="background:linear-gradient(135deg,#ff4f81,#ff7a4f);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-flag"/></svg> Enviar reporte</button>
</div>
</div>
`;
document.body.appendChild(modal);
const radioOtro = modal.querySelector('#report-radio-otro');
const otroField = modal.querySelector('#report-otro-field');
modal.querySelectorAll('input[name="report-reason"]').forEach(radio => {
radio.addEventListener('change', () => {
otroField.style.display = radioOtro.checked ? 'block' : 'none';
});
});
const close = () => {
modal.classList.add('closing');
setTimeout(() => { if (modal.parentNode) modal.remove(); }, 150);
};
modal.querySelector('#report-cancel-btn')?.addEventListener('click', close);
modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
modal.querySelector('#report-confirm-btn')?.addEventListener('click', async () => {
const selected = modal.querySelector('input[name="report-reason"]:checked');
if (!selected) {
window.showTemporaryMessage(' Selecciona un motivo', 'error');
return;
}
let motivo = selected.value;
if (motivo === 'Otro') {
const otroText = (modal.querySelector('#report-otro-text').value || '').trim();
if (!otroText) {
window.showTemporaryMessage(' Describe el motivo', 'error');
return;
}
motivo = 'Otro: ' + otroText;
}
const confirmBtn = modal.querySelector('#report-confirm-btn');
const ok = await window.withButtonLoading(confirmBtn, () => sendReport(product, motivo), 'Enviando…');
if (ok) close();
});
}
async function sendReport(product, motivo) {
try {
const telefonoUsuario = localStorage.getItem('client_phone') || '';
const params = new URLSearchParams({
action: 'reportarProducto',
productId: String(product.id),
nombreProducto: safeString(product.nombre),
motivo: motivo,
telefonoUsuario: telefonoUsuario,
fecha: new Date().toISOString()
});
const res = await fetch(window.API_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
const data = await res.json();
if (!data.ok) throw new Error(data.error || 'Error al enviar reporte');
window.showTemporaryMessage(' Reporte enviado. ¡Gracias por ayudarnos a mejorar la comunidad!', 'success');
return true;
} catch (err) {
console.error('Error enviando reporte:', err);
window.showTemporaryMessage(' No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
return false;
}
}
function createCommunityCard(product) {
try {
const esc  = window.escapeHtml || (s =>String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const optUrl  = window.optimizeDriveUrl || (u => u);
const fmtCurr = window.formatCurrency  || (v => '$' + Number(v).toLocaleString('es-MX'));
const card = document.createElement('div');
card.className = 'product-card';
card.id = `producto-${product.id}`;
card.setAttribute('data-id', product.id);
const imgUrl  = product.imagen1 ? optUrl(product.imagen1, 400) : 'https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen';
const allImages = [product.imagen1, product.imagen2, product.imagen3].filter(Boolean).map(u => optUrl(u, 800));
const stockNum  = Number(product.stock) || 0;
const hasStock  = stockNum > 0;
const esDonativo = product.donado === true || product.donado === 'TRUE' || product.donado === 'true';
const vendorName = safeString(product.vendedor_nombre);
const vendorTel  = safeString(product.vendedor_tel);
const vendorLogo = safeString(product.vendedor_logo || '');
const esVendorPlus = product.vendedor_plan === 'plus';
const vendorInitials = vendorName ? vendorName.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() : '?';
const vendorAvatarHtml = (esVendorPlus && vendorLogo)
  ? `<img src="${esc(vendorLogo)}" alt="${esc(vendorName)}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid #a855f744;" onerror="this.style.display='none'">`
  : `<span style="width:18px;height:18px;border-radius:50%;background:#f3e8ff;color:#7c3aed;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e9d5ff;">${esc(vendorInitials)}</span>`;
card.innerHTML = `
<div class="product-slider" style="position:relative;cursor:pointer;">
${product.vendedor_plan === 'plus' ? `<span style="position:absolute;top:8px;right:8px;font-size:9px;padding:2px 8px; background: linear-gradient(135deg, #f7c948, #f0962f);color:#fff;border-radius:20px;font-weight:800;z-index:1;">${Icon('check')}</span>` : ''}
${esDonativo ? '<span style="position:absolute;top:' + (product.vendedor_plan === 'plus' ? '8px' : '8px') + ';left:8px;font-size:11px;padding:2px 8px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;border-radius:20px;font-weight:800;z-index:1;">Donativo</span>' : ''}
${(inspectorMode && !product.es_znr) ? `<span style="position:absolute;top:8px;right:8px;z-index:2;"><button class="btn-inspector-delete" title="Eliminar (Admin)" aria-label="Eliminar producto" style="background:var(--color-error,#ef4444);color:#fff;border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-trash"/></svg></button></span>` : ''}
<img class="product-img-main" src="${esc(imgUrl)}" alt="${esc(safeString(product.nombre))}" loading="lazy"
style="width:100%;height:100%;object-fit:contain;display:block;background:var(--color-surface-2,#f5f5f8);" onerror="this.onerror=null;this.src='placeholder.svg'">
</div>
<div class="product-info" style="padding:12px;">
<div class="product-title-row">
<h3 class="product-name" style="font-size:14px;" title="${esc(safeString(product.nombre))}">${esc(safeString(product.nombre))}</h3>
<div class="product-price" style="font-size:16px;">${fmtCurr(product.precio)}</div>
</div>
${vendorName ? `<div style="font-size:11px;color:var(--color-text-muted,#888);margin-top:2px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;">
<span style="display:flex;align-items:center;gap:5px;">
  ${vendorAvatarHtml}
  <a href="${(product.es_znr || product.vendedor_uid === 'znr_oficial') ? 'catalogo.html' : ('perfil-vendedor.html?vendedor=' + esc(product.vendedor_uid))}" style="color:var(--color-text-main);font-weight:600;text-decoration:none;cursor:pointer;hover:underline;">${esc(vendorName)}</a>
</span>
${esDonativo && product.beneficiario_id ? `<button class="btn-ver-beneficiario" data-ben-id="${esc(safeString(product.beneficiario_id))}" style="background:none;border:none;padding:0;color:#f97316;font-weight:600;font-size:11px;cursor:pointer;text-decoration:underline;">Ver beneficiario</button>` : ''}
</div>` : ''}
${product.talla ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">Info: ${esc(safeString(product.talla))}</div>` : ''}
<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">
${!hasStock
? '<span style="color:var(--color-error,#ef4444);font-size:11px;font-weight:600;">Sin stock</span>'
: `<span style="color:var(--color-success,#22c55e);font-size:11px;">Stock: ${stockNum}</span>`}
${product.categoria ? `<span style="font-size:10px;color:var(--color-text-muted,#aaa);">· ${esc(safeString(product.categoria))}</span>` : ''}
</div>
<div class="product-actions" style="margin-top:8px;display:flex;gap:6px;">
<button class="primary-button comunidad-add-btn"
style="flex:1;padding:8px 10px;font-size:12px;${!hasStock ? 'opacity:.5;cursor:not-allowed;' : ''}"
${!hasStock ? 'disabled' : ''}
data-id="${product.id}"
data-nombre="${esc(safeString(product.nombre))}"
data-precio="${product.precio || 0}"
data-img="${esc(safeString(product.imagen1 || ''))}"
data-talla="${esc(safeString(product.talla || ''))}"
data-vendedor="${esc(vendorName)}"
data-vendortel="${esc(vendorTel)}"
data-vendorlogo="${esc(vendorLogo)}"
data-vendorplan="${esc(safeString(product.vendedor_plan || ''))}"
data-vendoruid="${esc(safeString(product.vendedor_uid || ''))}"
data-donacion="${esDonativo}"
data-benid="${esDonativo && product.beneficiario_id ? esc(safeString(product.beneficiario_id)) : ''}">
${!hasStock ? '-' : 'Añadir'}
</button>
${!product.es_znr ? `<button class="btn-report" title="Reportar" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 8px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-flag"/></svg></button>` : ''}
<button class="btn-share-comunidad" title="Compartir" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 8px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-share"/></svg></button>
</div>
</div>
`;
card.querySelector('.product-slider')?.addEventListener('click', (e) => {
if (!e.target.closest('button')) {
if (window.openImageModal) {
const productData = {
ID:  product.id,
Nombre:  product.nombre  || '',
Precio:  product.precio  || 0,
Categoria:  product.categoria  || '',
Talla:  product.talla  || '',
Descripcion: product.descripcion || '',
Stock:  product.stock !== undefined ? Number(product.stock) : -1,
Badge:  product.badge  || '',
Imagen1:  product.imagen1  || '',
Imagen2:  product.imagen2  || '',
Imagen3:  product.imagen3  || '',
_comunidad:  true,
_vendedorNombre: vendorName || '',
_vendedorUid: product.vendedor_uid || '',
_vendedorTel: vendorTel || '',
_vendedorLogo: vendorLogo || '',
_vendedorPlan: product.vendedor_plan || '',
_donado: esDonativo,
_beneficiarioId: product.beneficiario_id || '',
};
window.openImageModal(imgUrl, product.id, allImages, productData);
}
}
});
const addBtn = card.querySelector('.comunidad-add-btn');
if (addBtn && hasStock && window.addToCart) {
addBtn.addEventListener('click', async (e) => {
e.stopPropagation();
const esDon = addBtn.dataset.donacion === 'true';
const beneficiario = esDon && typeof window.resolveBeneficiario === 'function'
? await window.resolveBeneficiario(addBtn.dataset.benid || '')
: (esDon ? { id: addBtn.dataset.benid || '', nombre: '', cuenta_bancaria: '' } : null);
window.addToCart({
ID: addBtn.dataset.id, Nombre: addBtn.dataset.nombre,
Precio: Number(addBtn.dataset.precio), Imagen1: addBtn.dataset.img,
Talla: addBtn.dataset.talla, _comunidad: true,
_vendedor: addBtn.dataset.vendedor, _vendorTel: addBtn.dataset.vendortel,
_vendorLogo: addBtn.dataset.vendorlogo, _vendorPlan: addBtn.dataset.vendorplan,
_vendorUid: addBtn.dataset.vendoruid,
_donacion: esDon,
_beneficiario: beneficiario
});
if (window.showTemporaryMessage) window.showTemporaryMessage(` ${addBtn.dataset.nombre} agregado`, 'success');
});
}
const reportBtn = card.querySelector('.btn-report');
if (reportBtn) reportBtn.addEventListener('click', (e) => { e.stopPropagation(); showReportDialog(product); });
if (inspectorMode) {
const deleteBtn = card.querySelector('.btn-inspector-delete');
if (deleteBtn) deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteProductInspector(product.id, safeString(product.nombre), card); });
}

const shareBtn = card.querySelector('.btn-share-comunidad');
if (shareBtn) shareBtn.addEventListener('click', (e) => {
e.stopPropagation();
shareProduct(product.id, product.nombre, product.precio);
});

const benBtn = card.querySelector('.btn-ver-beneficiario');
if (benBtn) {
benBtn.addEventListener('click', (e) => {
e.stopPropagation();
if (window.openBeneficiarioModal) window.openBeneficiarioModal(benBtn.dataset.benId);
});
}

return card;
} catch (err) {
console.error('Error creando tarjeta para producto', product.id, err);
return null;
}
}
function renderPagination() {
  if (!paginationDiv) return;
  const totalPages = totalPagesGlobal || 1;
  paginationDiv.innerHTML = '';
  if (totalPages <= 1) { paginationDiv.style.display = 'none'; return; }
  paginationDiv.style.display = 'flex';

  // Botón Anterior
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = Icon('arrow-left') + ' Anterior';
    prevBtn.onclick = () => {
      loadComunidadPage(currentPage - 1, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationDiv.appendChild(prevBtn);
  }

  // Números de página (máximo 5 visibles)
  let startPage = Math.max(1, currentPage - 2);
  let endPage   = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active-page');
    btn.onclick = (function(p) { return function() {
      loadComunidadPage(p, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }; })(i);
    paginationDiv.appendChild(btn);
  }

  // Botón Siguiente
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Siguiente ' + Icon('arrow-right');
    nextBtn.onclick = () => {
      loadComunidadPage(currentPage + 1, currentFilters, { isPageChange: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationDiv.appendChild(nextBtn);
  }
}
function initLazyImages() {
if (!('IntersectionObserver' in window)) return;
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const img = entry.target;
const dataSrc = img.getAttribute('data-src');
if (dataSrc) {
img.src = dataSrc;
img.removeAttribute('data-src');
}
observer.unobserve(img);
}
});
}, { rootMargin: '100px' });
document.querySelectorAll('.comunidad-card-img[data-src]').forEach(img => observer.observe(img));
}
function bindFilterChangeEvents() {
const searchInput = document.getElementById('comunidad-search');
const catSelectEl = document.getElementById('comunidad-cat');
const vendorSelectEl = document.getElementById('comunidad-vendor');
const ordenEl = document.getElementById('comunidad-orden');
const updateHandler = () => {
applyFilters();
updateURLWithFilters();
};
if (searchInput) {
searchInput.addEventListener('input', () => {
if (debounceTimer) clearTimeout(debounceTimer);
debounceTimer = setTimeout(updateHandler, 400);
});
}
if (catSelectEl) catSelectEl.addEventListener('change', updateHandler);
if (vendorSelectEl) vendorSelectEl.addEventListener('change', updateHandler);
if (ordenEl) ordenEl.addEventListener('change', updateHandler);
}
function initCartAndUI() {
if (typeof window.loadCartFromStorage === 'function') window.loadCartFromStorage();
if (typeof window.renderCart === 'function') window.renderCart();
if (typeof window.updateSavedPhoneDisplay === 'function') window.updateSavedPhoneDisplay();
const cartIcon = document.getElementById('cart-icon-home');
if (cartIcon && window.openCartDrawer) cartIcon.addEventListener('click', () => window.openCartDrawer());
const wishlistIcon = document.getElementById('wishlist-icon-home');
if (wishlistIcon && window.openWishlistDrawer) wishlistIcon.addEventListener('click', () => window.openWishlistDrawer());
const closeWishBtn = document.getElementById('close-wishlist-btn');
if (closeWishBtn) closeWishBtn.addEventListener('click', () => {
const d = document.getElementById('wishlist-drawer');
const o = document.getElementById('overlay');
if (d) d.classList.remove('open');
if (o) o.classList.remove('visible');
});
const closeCartBtn = document.getElementById('close-cart-btn');
if (closeCartBtn) closeCartBtn.addEventListener('click', () => {
if (typeof window.closeCartDrawer === 'function') window.closeCartDrawer();
});
const layoutBtn = document.getElementById('layout-toggle-comunidad');
const grid = document.getElementById('comunidad-grid');
function applyComLayout(isGrid) {
if (!grid) return;
if (isGrid) { grid.classList.add('layout-grid'); if (layoutBtn) layoutBtn.textContent = ''; }
else  { grid.classList.remove('layout-grid'); if (layoutBtn) layoutBtn.textContent = ''; }
localStorage.setItem('products_layout', isGrid ? 'grid' : 'list');
}
const savedLayout = localStorage.getItem('products_layout') || 'grid';
applyComLayout(savedLayout === 'grid');
if (layoutBtn) layoutBtn.addEventListener('click', () => {
const isGrid = !grid.classList.contains('layout-grid');
applyComLayout(isGrid);
window.dispatchEvent(new CustomEvent('layoutChanged', { detail: { layout: isGrid ? 'grid' : 'list' } }));
});
window.addEventListener('layoutChanged', (e) => applyComLayout(e.detail.layout === 'grid'));
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
themeBtn.addEventListener('click', () => {
const html = document.documentElement;
const current = html.getAttribute('data-theme');
const newTheme = current === 'dark' ? 'light' : 'dark';
html.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
themeBtn.textContent = newTheme === 'dark' ? '' : '';
});
const savedTheme = localStorage.getItem('theme') || 'dark';
themeBtn.textContent = savedTheme === 'dark' ? '' : '';
}
const overlay = document.getElementById('overlay');
if (overlay) {
overlay.addEventListener('click', () => {
if (typeof window.closeCartDrawer === 'function') window.closeCartDrawer();
if (typeof window.closeWishlistDrawer === 'function') window.closeWishlistDrawer();
if (typeof window.closeImageModal === 'function') window.closeImageModal();
overlay.classList.remove('visible');
});
}
}
function injectStyles() {
if (document.getElementById('comunidad-extra-styles')) return;
const style = document.createElement('style');
style.id = 'comunidad-extra-styles';
style.textContent = `
.comunidad-card-actions {
display: flex;
flex-direction: column;
gap: 8px;
margin-top: 8px;
}
.comunidad-extra-btns {
display: flex;
gap: 8px;
}
.btn-report {
flex: 1;
padding: 8px 12px;
border: 1.5px solid #f97316;
border-radius: 30px;
background: transparent;
color:var(--color-warning,#f97316);
font-size: 12px;
font-weight: 600;
cursor: pointer;
transition: all 0.2s;
white-space: nowrap;
}
.btn-report:hover {
background: #f97316;
color: white;
transform: translateY(-1px);
}
.btn-inspector-delete {
flex: 1;
padding: 8px 12px;
border: 1.5px solid #ef4444;
border-radius: 30px;
background: transparent;
color:var(--color-error,#ef4444);
font-size: 12px;
font-weight: 600;
cursor: pointer;
transition: all 0.2s;
white-space: nowrap;
}
.btn-inspector-delete:hover {
background: #ef4444;
color: white;
transform: translateY(-1px);
}
@media (max-width: 640px) {
.comunidad-extra-btns { flex-direction: column; }
.btn-report, .btn-inspector-delete { font-size: 11px; padding: 7px 10px; }
}
`;
document.head.appendChild(style);
}
async function initComunidad() {
injectStyles();
gridContainer = document.getElementById('comunidad-grid');
catSelect = document.getElementById('comunidad-cat');
vendorSelect = document.getElementById('comunidad-vendor');
paginationDiv = document.getElementById('comunidad-pagination');
if (!gridContainer) {
console.warn('No se encontró #comunidad-grid');
return;
}
await initInspectorMode();
bindFilterChangeEvents();
initCartAndUI();
loadCommunityProducts();
checkLiveBanner();
checkPendingRatings();
initBeneficiariosToggle();
}

// ── Grid de fundaciones/beneficiarios ──────────────────────────────────
let beneficiariosCargados = false;
function initBeneficiariosToggle() {
  const btn = document.getElementById('btn-ver-fundaciones');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const wrap = document.getElementById('comunidad-beneficiarios-wrap');
    const toolbarArea = document.querySelector('.comunidad-toolbar');
    const chipsBar = document.getElementById('comunidad-filter-chips');
    const grid = document.getElementById('comunidad-grid');
    const pagination = document.getElementById('comunidad-pagination');
    if (!wrap) return;
    const showing = wrap.style.display !== 'none';
    if (showing) {
      // Volver a productos
      wrap.style.display = 'none';
      if (grid) grid.style.display = '';
      if (pagination) pagination.style.display = '';
      if (toolbarArea) toolbarArea.style.display = '';
      btn.innerHTML = Icon('heart-fill') + ' Ver fundaciones';
    } else {
      // Mostrar fundaciones
      wrap.style.display = 'block';
      if (grid) grid.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
      if (chipsBar) chipsBar.style.display = 'none';
      if (toolbarArea) toolbarArea.style.display = 'none';
      btn.innerHTML = Icon('shopping-bag') + ' Ver productos';
      if (!beneficiariosCargados) loadBeneficiariosGrid();
    }
  });
}

async function loadBeneficiariosGrid() {
  const grid = document.getElementById('comunidad-beneficiarios-grid');
  if (!grid || !window.API_URL) return;
  try {
    const res = await fetch(window.API_URL + '?' + new URLSearchParams({ action: 'obtenerBeneficiariosAprobados' }));
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    const beneficiarios = data.beneficiarios || [];
    beneficiariosCargados = true;
    if (beneficiarios.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Aún no hay fundaciones aprobadas.</div>';
      return;
    }
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    grid.innerHTML = beneficiarios.map(b => {
      const img = b.imagen1 ? optimizeDriveUrl(b.imagen1, 300) : '';
      return `
        <div class="comunidad-beneficiario-card" data-ben-id="${esc(b.id)}"
          style="background:var(--color-surface,#181820);border-radius:14px;overflow:hidden;cursor:pointer;
          border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;">
          <div style="width:100%;aspect-ratio:1;background:#26262f;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${img ? `<img src="${esc(img)}" alt="${esc(b.nombre)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
                  : `<span style="font-size:2rem;">${Icon('heart-fill',{size:32})}</span>`}
          </div>
          <div style="padding:10px;">
            <div style="font-size:.85rem;font-weight:700;color:var(--color-text-primary,#fff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.nombre)}</div>
            ${b.organizacion ? `<div style="font-size:.72rem;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.organizacion)}</div>` : ''}
            ${b.ubicacion ? `<div style="font-size:.7rem;color:#666;margin-top:2px;">${Icon('map-pin',{size:12})} ${esc(b.ubicacion)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.comunidad-beneficiario-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.benId;
        if (id && window.openBeneficiarioModal) window.openBeneficiarioModal(id);
      });
    });
  } catch (err) {
    console.error('Error cargando fundaciones:', err);
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">
      Error al cargar fundaciones.<br>
      <button onclick="window.__reloadBeneficiariosGrid && window.__reloadBeneficiariosGrid()" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:#ff4f81; color:white; cursor:pointer; font-weight:600;"  >${Icon('refresh')} Reintentar</button>
    </div>`;
    window.__reloadBeneficiariosGrid = () => { beneficiariosCargados = false; loadBeneficiariosGrid(); };
  }
}

async function checkLiveBanner() {
  const slot = document.getElementById('live-banner-slot');
  if (!slot) return;
  try {
    const res = await fetch(window.API_URL + '?' + new URLSearchParams({ action: 'obtenerLivesActivos' }));
    const data = await res.json();
    if (!data.ok || !data.lives || data.lives.length === 0) { slot.innerHTML = ''; return; }

    const n = data.lives.length;
    const nombres = data.lives.slice(0, 2).map(l => l.vendedor_nombre).join(', ');
    slot.innerHTML = `
      <a href="lives.html" style="text-decoration:none; display:block; margin:0 0 4px;
        background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(244,114,182,.10));
        border:1px solid rgba(239,68,68,.35); border-radius:14px; padding:12px 16px;
        display:flex; align-items:center; gap:10px;">
        <span style="width:9px; height:9px; border-radius:50%; background:#ef4444; flex-shrink:0;
          animation: znr-live-pulse 1.4s infinite;"></span>
        <span style="flex:1; color:var(--color-text-primary,#dde1e8); font-size:13px; font-weight:600;">
          ${Icon('signal')} En vivo ahora: ${nombres}${n > 2 ? ` y ${n - 2} más` : ''}
        </span>
        <span style="color:var(--color-accent,#f472b6); font-size:12px; font-weight:700;">Ver ${Icon('arrow-right',{size:12})}</span>
      </a>
      <style>@keyframes znr-live-pulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }</style>
    `;
  } catch (err) {
    slot.innerHTML = '';
  }
}

// ── Sistema de calificaciones: revisa si el comprador tiene compras
// confirmadas (stock ya descontado por el vendedor) que aún no calificó,
// y le muestra un modal para calificar el producto.
async function checkPendingRatings() {
  const phone = (localStorage.getItem('client_phone') || '').replace(/\D/g, '');
  if (!phone) return;
  try {
    // 🆕 Respaldo local: productos que este teléfono ya calificó en este navegador,
    // por si el backend tarda en reflejarlo o el fetch falla por alguna razón.
    let yaCalificadosLocal = [];
    try { yaCalificadosLocal = JSON.parse(localStorage.getItem('rated_products_' + phone) || '[]'); } catch (e) {}

    // 🆕 cache:'no-store' + timestamp para evitar que quede una respuesta vieja cacheada
    const res = await fetch(
      window.API_URL + '?' + new URLSearchParams({ action: 'obtenerCalificacionesPendientes', clientPhone: phone, _t: Date.now() }),
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (data.ok && data.pendientes && data.pendientes.length > 0) {
      const siguiente = data.pendientes.find(p => !yaCalificadosLocal.includes(String(p.productId)));
      if (siguiente) mostrarModalCalificar(siguiente, phone);
    }
  } catch (err) {
    console.warn('Error revisando calificaciones pendientes:', err);
  }
}

function mostrarModalCalificar(item, phone) {
  const old = document.getElementById('modal-calificar');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-calificar';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px;padding:24px;max-width:380px;width:100%;text-align:center;">
      <img src="${item.imagen || ''}" onerror="this.style.display='none'" style="width:80px;height:80px;object-fit:contain;border-radius:12px;background:#f5f5f8;margin:0 auto 12px;">
      <h3 style="margin:0 0 4px;font-size:1rem;">¿Cómo estuvo tu compra?</h3>
      <p style="margin:0 0 16px;font-size:13px;color:#888;">${(item.nombre || 'tu producto')}</p>
      <div id="calif-stars" style="font-size:32px;letter-spacing:6px;margin-bottom:14px;cursor:pointer;"></div>
      <textarea id="calif-comentario" placeholder="Cuéntanos algo (opcional)" maxlength="300"
        style="width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;margin-bottom:14px;resize:none;min-height:60px;"></textarea>
      <div style="display:flex;gap:10px;">
        <button id="calif-omitir" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #ddd;background:#fff;color:#888;font-weight:700;cursor:pointer;">Ahora no</button>
        <button id="calif-enviar" style="flex:1;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff4f81,#ff7a4f);color:#fff;font-weight:700;cursor:pointer;">Enviar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // 🆕 FIX: se crean los 5 <span> UNA sola vez y solo se les cambia el color
  // en cada clic — antes se reemplazaba todo el innerHTML, lo que destruía
  // los listeners después del primer clic y no dejaba cambiar la selección.
  let calificacionSeleccionada = 5;
  const starsEl = modal.querySelector('#calif-stars');
  const spans = [];
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.innerHTML = Icon('star');
    span.dataset.value = String(i + 1);
    spans.push(span);
    starsEl.appendChild(span);
  }
  const pintarEstrellas = (n) => {
    spans.forEach((s, i) => { s.style.color = i < n ? '#f59e0b' : '#ddd'; });
  };
  pintarEstrellas(calificacionSeleccionada);
  starsEl.addEventListener('click', (e) => {
    const span = e.target.closest('span[data-value]');
    if (!span) return;
    calificacionSeleccionada = Number(span.dataset.value);
    pintarEstrellas(calificacionSeleccionada);
  });

  const close = () => { if (modal.parentNode) modal.remove(); };
  modal.querySelector('#calif-omitir').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('#calif-enviar').addEventListener('click', async (e) => {
    const comentario = modal.querySelector('#calif-comentario').value.trim();
    await window.withButtonLoading(e.currentTarget, async () => {
    try {
      const params = new URLSearchParams({
        action: 'calificarProducto',
        productId: String(item.productId),
        clientPhone: phone,
        calificacion: String(calificacionSeleccionada),
        comentario: comentario,
        requestId: item.requestId || ''
      });
      const res = await fetch(window.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo enviar la calificación');

      // 🆕 Marca localmente este producto como ya calificado por este teléfono,
      // así nunca vuelve a pedir calificarlo en este navegador aunque el
      // backend tarde en reflejarlo.
      try {
        const ya = JSON.parse(localStorage.getItem('rated_products_' + phone) || '[]');
        if (!ya.includes(String(item.productId))) {
          ya.push(String(item.productId));
          localStorage.setItem('rated_products_' + phone, JSON.stringify(ya));
        }
      } catch (e) {}

      if (typeof window.showTemporaryMessage === 'function') window.showTemporaryMessage('¡Gracias por tu calificación!', 'success');
      close();
    } catch (err) {
      if (typeof window.showTemporaryMessage === 'function') window.showTemporaryMessage(err.message, 'error');
    }
    }, 'Enviando…');
  });
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initComunidad);
} else {
initComunidad();
}

// ── Modal: Registro de beneficiario (y también edición, ver 2do/3er parámetro) ─
// modoEdicion: true => es una solicitud de edición sobre un beneficiario ya aprobado
// idBeneficiario: id del beneficiario existente (requerido si modoEdicion=true)
// datosActuales: objeto con los valores actuales para prellenar el formulario
window.openBeneficiarioRegister = function(modoEdicion, idBeneficiario, datosActuales) {
  console.log('🔥 openBeneficiarioRegister ejecutada', modoEdicion ? '(edición)' : '(nuevo)');

  // Restaurar sesión desde localStorage si no existe
  if (!window.vendorSession) {
    try {
      const stored = localStorage.getItem('vendor_session');
      if (stored) {
        window.vendorSession = JSON.parse(stored);
        console.log('✅ Sesión restaurada desde localStorage:', window.vendorSession.nombre);
      }
    } catch (e) {
      console.warn('No se pudo restaurar sesión:', e);
    }
  }

  const old = document.getElementById('modal-beneficiario-register');
  if (old) old.remove();

  const d = datosActuales || {};
  const escv = s => String(s || '').replace(/"/g, '&quot;');

  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-register';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%; height:90%;overflow-y:auto;padding:24px 20px 36px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${modoEdicion ? 'Editar tu fundación' : 'Registrate tu Fundacion'}</h2>
        <button id="btn-close-ben-reg" style="background:none;border:none;font-size:22px;cursor:pointer;line-height:1;">×</button>
      </div>
      <p style="font-size:.8rem;color:#888;margin:0 0 14px;">${modoEdicion ? 'Estos cambios se enviarán como solicitud. El administrador comparará tu información actual con la nueva antes de aplicarla.' : 'Completa tu información. El administrador revisará tu solicitud y te contactará por WhatsApp.'}</p>
      <div id="ben-reg-msg" style="display:none;padding:10px;border-radius:10px;margin-bottom:12px;font-size:.82rem;"></div>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Nombre completo *</label>
      <input id="ben-nombre" type="text" value="${escv(d.nombre)}" placeholder="Tu nombre completo" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Organización (opcional)</label>
      <input id="ben-org" type="text" value="${escv(d.organizacion)}" placeholder="Nombre de la organización si aplica" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Ciudad / Estado *</label>
      <input id="ben-ubicacion" type="text" value="${escv(d.ubicacion)}" placeholder="Ej. Nuevo Laredo, Tamaulipas" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Facebook (URL o usuario)</label>
      <input id="ben-facebook" type="text" value="${escv(d.facebook)}" placeholder="https://facebook.com/tu-pagina" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">¿Para qué necesitas las donaciones? *</label>
      <textarea id="ben-historia" rows="3" placeholder="Cuéntanos tu historia o propósito..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;resize:vertical;">${escv(d.historia)}</textarea>
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">CLABE / Número de cuenta *</label>
      <input id="ben-cuenta" type="text" value="${escv(d.cuenta_bancaria)}" placeholder="18 dígitos CLABE o número de cuenta" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">WhatsApp (10 dígitos) *</label>
      <input id="ben-telefono" type="tel" value="${escv(d.telefono)}" placeholder="8671234567" maxlength="10" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:16px;font-size:.88rem;">
      <label style="font-size:.78rem;font-weight:700;color:#888;display:block;margin-bottom:3px;">Fotos (opcional, máx. 3 — puedes elegir varias a la vez)</label>
      <div style="display:flex;gap:8px;margin-bottom:16px;" id="ben-img-previews">
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-1">
          <span id="ben-img-placeholder-1" style="font-size:1.4rem;display:${d.imagen1 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-1" src="${escv(d.imagen1||'')}" style="display:${d.imagen1?'block':'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-1" accept="image/*" multiple style="display:none;">
        </label>
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-2">
          <span id="ben-img-placeholder-2" style="font-size:1.4rem;display:${d.imagen2 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-2" src="${escv(d.imagen2||'')}" style="display:${d.imagen2?'block':'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-2" accept="image/*" multiple style="display:none;">
        </label>
        <label style="flex:1;aspect-ratio:1;border:1.5px dashed #e0e0e0;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fafafa;" id="ben-img-label-3">
          <span id="ben-img-placeholder-3" style="font-size:1.4rem;display:${d.imagen3 ? 'none' : ''};">${Icon('camera',{size:22})}</span>
          <img id="ben-img-preview-3" src="${escv(d.imagen3||'')}" style="display:${d.imagen3?'block':'none'};width:100%;height:100%;object-fit:cover;">
          <input type="file" id="ben-img-3" accept="image/*" multiple style="display:none;">
        </label>
      </div>
      <button id="btn-submit-ben" data-modo="${modoEdicion ? 'editar' : 'nuevo'}" data-id="${escv(idBeneficiario||'')}" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-weight:800;font-size:.92rem;cursor:pointer;">${modoEdicion ? 'Enviar cambios' : 'Enviar solicitud'}</button>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-reg').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Preview de imágenes
  function benUpdatePreview(n, file) {
    const preview = document.getElementById('ben-img-preview-' + n);
    const placeholder = document.getElementById('ben-img-placeholder-' + n);
    if (!preview || !placeholder) return;
    if (!file) {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = '';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  }
  function benSetSlotFile(n, file) {
    const input = document.getElementById('ben-img-' + n);
    if (!input) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) { /* ignore */ }
    benUpdatePreview(n, file);
  }
  [1,2,3].forEach(n => {
    document.getElementById('ben-img-' + n)?.addEventListener('change', function() {
      const files = Array.from(this.files || []);
      if (!files.length) return;
      let slot = n;
      for (const file of files) {
        if (slot > 3) break;
        benSetSlotFile(slot, file);
        slot++;
      }
    });
  });

  // Evento de envío
  document.getElementById('btn-submit-ben')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const modo = this.dataset.modo === 'editar' ? 'editar' : 'nuevo';
    const idBen = this.dataset.id || '';
    const showMsg = (txt, ok) => {
      const el = document.getElementById('ben-reg-msg');
      el.innerHTML = (ok ? Icon('check') : Icon('error')) + ' <span></span>';
      el.querySelector('span').textContent = txt;
      el.style.display = 'block';
      el.style.background = ok ? '#dcfce7' : '#fee2e2';
      el.style.color = ok ? '#166534' : '#991b1b';
    };

    // Validar campos
    const nombre     = document.getElementById('ben-nombre').value.trim();
    const tel        = document.getElementById('ben-telefono').value.replace(/\D/g, '');
    const ubicacion  = document.getElementById('ben-ubicacion').value.trim();
    const historia   = document.getElementById('ben-historia').value.trim();
    const cuenta     = document.getElementById('ben-cuenta').value.trim();

    if (!nombre)           return showMsg('El nombre es requerido.', false);
    if (!ubicacion)        return showMsg('La ciudad/estado es requerida.', false);
    if (!historia)         return showMsg('Cuéntanos tu propósito.', false);
    if (!cuenta)           return showMsg('La cuenta bancaria es requerida.', false);
    if (tel.length !== 10) return showMsg('El WhatsApp debe tener 10 dígitos.', false);

    // Restaurar sesión por si no se hizo antes
    if (!window.vendorSession) {
      try {
        const stored = localStorage.getItem('vendor_session');
        if (stored) window.vendorSession = JSON.parse(stored);
      } catch (e) {}
    }

    const vendor = window.vendorSession;
    if (!vendor || !vendor.token) {
      showMsg('Debes iniciar sesión como vendedor para registrarte como beneficiario. Ve a "Mi cuenta de vendedor".', false);
      // Opcional: agregar un enlace para ir a vendedor.html
      const link = document.createElement('a');
      link.href = 'vendedor.html';
      link.textContent = ' Ir a mi cuenta de vendedor';
      link.style.display = 'block';
      link.style.marginTop = '8px';
      link.style.color = '#ff4f81';
      link.style.textDecoration = 'underline';
      document.getElementById('ben-reg-msg').appendChild(link);
      return;
    }

    // Validar que el teléfono coincida con el de la sesión (opcional)
    if (vendor.telefono && String(vendor.telefono).replace(/\D/g, '') !== tel) {
      showMsg('El teléfono no coincide con tu cuenta de vendedor. Usa el número registrado: ' + vendor.telefono, false);
      return;
    }

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      async function uploadBenImg(file) {
        const reader = new FileReader();
        const base64 = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const params = new URLSearchParams({
          action: 'uploadImageVendedor',
          data: base64,
          mimeType: file.type,
          fileName: file.name,
          vendorToken: vendor.token
        });
        const r = await fetch(window.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Error al subir imagen');
        return j.url || '';
      }

      const imgUrls = ['', '', ''];
      for (let n = 1; n <= 3; n++) {
        const fileInput = document.getElementById('ben-img-' + n);
        if (fileInput && fileInput.files[0]) {
          btn.textContent = `Subiendo foto ${n}…`;
          try {
            imgUrls[n - 1] = await uploadBenImg(fileInput.files[0]);
          } catch (e) {
            showMsg('Error al subir la imagen ' + n + ': ' + e.message, false);
            btn.disabled = false;
            btn.textContent = 'Enviar solicitud';
            return;
          }
        }
      }

      btn.textContent = modo === 'editar' ? 'Enviando cambios…' : 'Enviando solicitud…';
      const payload = {
        action: modo === 'editar' ? 'solicitarEdicionBeneficiario' : 'registrarBeneficiario',
        nombre,
        organizacion: document.getElementById('ben-org').value.trim(),
        ubicacion,
        facebook: document.getElementById('ben-facebook').value.trim(),
        historia,
        cuenta_bancaria: cuenta,
        telefono: tel,
        imagen1: imgUrls[0],
        imagen2: imgUrls[1],
        imagen3: imgUrls[2],
        vendorToken: vendor.token
      };
      if (modo === 'editar') payload.id_beneficiario = idBen;
      const res = await fetch(window.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });

      const data = await res.json();
      if (data.ok) {
        showMsg(modo === 'editar' ? '¡Cambios enviados! El administrador los revisará antes de aplicarlos.' : '¡Solicitud enviada! El administrador te contactará pronto por WhatsApp.', true);
        btn.textContent = 'Enviado';
        setTimeout(() => {
          const modal = document.getElementById('modal-beneficiario-register');
          if (modal) modal.remove();
        }, 3000);
      } else {
        showMsg((data.error || 'Error al enviar'), false);
        btn.disabled = false;
        btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
      }
    } catch (err) {
      console.error('Error en registro beneficiario:', err);
      showMsg('Error de conexión: ' + err.message, false);
      btn.disabled = false;
      btn.textContent = modo === 'editar' ? 'Enviar cambios' : 'Enviar solicitud';
    }
  });
};

// ── Modal: Ver detalle de beneficiario ──────────────────────
window.openBeneficiarioModal = async function(beneficiarioId) {
  if (!beneficiarioId) return;
  const old = document.getElementById('modal-beneficiario-detalle');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-beneficiario-detalle';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--color-surface,#fff);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:24px 20px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;font-size:1rem;font-weight:800;">${Icon('heart-fill')} Beneficiario</h2>
        <button id="btn-close-ben-det" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button>
      </div>
      <div id="ben-det-body"><p style="color:#aaa;text-align:center;padding:24px 0;">Cargando…</p></div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-close-ben-det').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  try {
    const res  = await fetch(window.API_URL + '?' + new URLSearchParams({ action:'obtenerBeneficiario', id: beneficiarioId }));
    const data = await res.json();
    const body = document.getElementById('ben-det-body');
    if (!data.ok || !data.beneficiario) { body.innerHTML = '<p style="color:#ef4444;text-align:center;">No se pudo cargar.</p>'; return; }
    const b = data.beneficiario;
    const esc2 = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const imgs = [b.imagen1, b.imagen2, b.imagen3].filter(Boolean);
    body.innerHTML = `
      ${imgs.length ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:14px;">${imgs.map(u=>`<img src="${esc2(u)}" style="height:120px;border-radius:10px;object-fit:cover;flex-shrink:0;">`).join('')}</div>` : ''}
      <h3 style="margin:0 0 4px;font-size:1.05rem;">${esc2(b.nombre)}</h3>
      ${b.organizacion ? `<p style="margin:0 0 8px;font-size:.8rem;color:#888;">${esc2(b.organizacion)}</p>` : ''}
      <p style="margin:0 0 6px;font-size:.82rem;"><strong>${Icon('map-pin',{size:13})}</strong> ${esc2(b.ubicacion)}</p>
      ${b.facebook ? `<p style="margin:0 0 10px;font-size:.82rem;"><a href="${esc2(b.facebook)}" target="_blank" rel="noopener" style="color:#1877f2;">Facebook ${Icon('arrow-right',{size:12})}</a></p>` : ''}
      <div style="background:#fff7ed;border-radius:10px;padding:12px;margin-bottom:14px;">
        <p style="margin:0;font-size:.85rem;line-height:1.6;">${esc2(b.historia)}</p>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:.8rem;color:#166534;">${Icon('credit-card')} Datos de pago directo</p>
        <p style="margin:0;font-size:.88rem;font-family:monospace;letter-spacing:.05em;">${esc2(b.cuenta_bancaria)}</p>
        <p style="margin:4px 0 0;font-size:.75rem;color:#888;">A nombre de: ${esc2(b.nombre)}</p>
      </div>`;
  } catch(err) {
    const body = document.getElementById('ben-det-body');
    if (body) body.innerHTML = '<p style="color:#ef4444;text-align:center;">Error de conexión.</p>';
  }
};

// Fin del IIFE
})();

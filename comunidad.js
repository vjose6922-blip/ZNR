(function() {
const COMUNIDAD_CACHE_KEY = 'zr_comunidad_data';
const COMUNIDAD_CACHE_TTL_SESSION = 5 * 60 * 1000;   // 5 min — session (fast)
const COMUNIDAD_CACHE_TTL_LOCAL   = 30 * 60 * 1000;  // 30 min — persistent (like catálogo)
const renderPage = renderProducts;

// Write to both session (fast) and local (persistent across visits)
function setComunidadCache(products) {
  const payload = JSON.stringify({ data: products, timestamp: Date.now(), version: '1.1' });
  try { sessionStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
  try { localStorage.setItem(COMUNIDAD_CACHE_KEY, payload); } catch(e) {}
}

// Read: session first (freshest), fall back to localStorage for cold start
function getComunidadCache() {
  try {
    // 1) Try sessionStorage (same-tab, always fresh)
    let raw = sessionStorage.getItem(COMUNIDAD_CACHE_KEY);
    let ttl = COMUNIDAD_CACHE_TTL_SESSION;
    let store = 'session';
    // 2) Cold start: fall back to localStorage
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
const PAGE_SIZE = 15;
let allCommunityProducts = [];
let filteredProducts = [];
let currentPage = 1;
let isLoading = false;
let gridContainer, catSelect, vendorSelect, paginationDiv;
let debounceTimer = null;
let inspectorMode = false;
async function initInspectorMode() {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('inspector') !== '1') return;
const token = sessionStorage.getItem('admin_token') || '';
if (!token) {
console.log(' Modo inspector: sin token de admin, acceso denegado');
return;
}
try {
const api = window.API_URL || '';
const res = await fetch(api, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "verificarAdmin", token: token }) });
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
vendedor: urlParams.get('vendedor') || ''
};
}
function updateURLWithFilters() {
const searchTerm = getSearchValue();
const category = catSelect ? catSelect.value : '';
const vendor = vendorSelect ? vendorSelect.value : '';
const params = new URLSearchParams();
if (new URLSearchParams(window.location.search).get('inspector') === '1') {
params.set('inspector', '1');
}
if (searchTerm) params.set('busqueda', searchTerm);
if (category) params.set('categoria', category);
if (vendor) params.set('vendedor', vendor);
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






async function loadCommunityProducts() {
  if (!window.API_URL) {
    console.error('API_URL no definida');
    if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">Error de configuración. Recarga la página.</div>';
    return;
  }
  if (isLoading) return;
  isLoading = true;

  const cachedProducts = getComunidadCache();

  // --- Helper local para reintentos (por si no existe globalmente) ---
  const localFetchWithRetry = async (fn, maxAttempts = 3, delays = [2000, 5000, 10000]) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        console.log(`⏳ Reintento ${attempt + 1}/${maxAttempts} para listarComunidad`);
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
  };

  async function fetchAndRender(fromCache = false) {
    try {
      const url = window.API_URL;
      console.log("🔍 Cargando comunidad desde:", url);

      // 1) Intentar con POST
      let data;
      let usedGet = false;
      try {
        data = await localFetchWithRetry(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'listarComunidad' }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
        console.log("✅ Respuesta POST recibida:", data);
      } catch (postErr) {
        console.warn("⚠️ Falló POST para listarComunidad, intentando con GET...", postErr);
        // 2) Fallback a GET
        try {
          const getUrl = new URL(url);
          getUrl.searchParams.set('action', 'listarComunidad');
          data = await localFetchWithRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(getUrl.toString(), {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          });
          usedGet = true;
          console.log("✅ Respuesta GET recibida:", data);
        } catch (getErr) {
          console.error("❌ También falló GET para listarComunidad", getErr);
          throw getErr;
        }
      }

      if (!data.ok && data.ok !== undefined) {
        throw new Error(data.error || 'Error devuelto por el servidor');
      }

      const fresh = (data.products || []).filter(p => {
        const estado = (p.estado || '').toLowerCase().trim();
        return estado === 'aprobado' || estado === 'approved' || estado === 'activo';
      });

      if (fromCache && JSON.stringify(fresh) === JSON.stringify(allCommunityProducts)) {
        console.log("📦 Los datos en caché ya están actualizados");
        isLoading = false;
        return;
      }

      setComunidadCache(fresh);
      allCommunityProducts = fresh;
      window.allCommunityProductsIndexed = allCommunityProducts;
      filteredProducts = [...allCommunityProducts];

      if (!fromCache) currentPage = 1;
      populateFilters();
      renderPage();
      if (typeof window.hideLoader === 'function') window.hideLoader();
      isLoading = false;
      return;

    } catch (err) {
      if (!fromCache) throw err;
      console.warn('Actualización background comunidad falló:', err);
      isLoading = false;
    }
  }

  // --- Lógica principal con caché ---
  if (cachedProducts && cachedProducts.length > 0) {
    allCommunityProducts = cachedProducts;
    window.allCommunityProductsIndexed = allCommunityProducts;
    filteredProducts = [...allCommunityProducts];
    currentPage = 1;
    if (typeof window.hideLoader === 'function') window.hideLoader();
    populateFilters();

    const urlFilters = getFiltersFromURL();
    if (urlFilters.busqueda) {
      const searchInput = document.getElementById('comunidad-search');
      if (searchInput) searchInput.value = urlFilters.busqueda;
      filteredProducts = filterProducts(cachedProducts, urlFilters);
    }

    renderPage();
    if (navigator.onLine) fetchAndRender(true);
    isLoading = false;
    return;
  }

  if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
  if (gridContainer) showSkeletonComunidad(gridContainer, 6);

  try {
    await fetchAndRender(false);
    allCommunityProducts = allCommunityProducts;
    window.allCommunityProductsIndexed = allCommunityProducts;
    filteredProducts = [...allCommunityProducts];
    currentPage = 1;
    populateFilters();

    const urlFilters = getFiltersFromURL();
    if (urlFilters.busqueda) {
      const searchInput = document.getElementById('comunidad-search');
      if (searchInput) searchInput.value = urlFilters.busqueda;
    }
    if (urlFilters.categoria && catSelect) {
      const optionExists = Array.from(catSelect.options).some(opt => opt.value === urlFilters.categoria);
      if (optionExists) catSelect.value = urlFilters.categoria;
    }
    if (urlFilters.vendedor && vendorSelect) {
      const optionExists = Array.from(vendorSelect.options).some(opt => opt.value === urlFilters.vendedor);
      if (optionExists) vendorSelect.value = urlFilters.vendedor;
    }
    applyFilters();

  } catch (err) {
    console.error('Error en loadCommunityProducts:', err);
    if(window.ZRMonitor) ZRMonitor.report('CRÍTICO','comunidad.js','loadCommunityProducts', err.message||String(err));
    if (gridContainer) {
      gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-error,#ef4444);">
        Error al cargar productos de la comunidad.<br>
        <small style="color:var(--color-text-muted,#888);font-size:11px;">${err.message || ''}</small><br>
        <button onclick="location.reload()" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:#ff4f81; color:white; cursor:pointer; font-weight:600;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Reintentar</button>
      </div>`;
    }
  } finally {
    isLoading = false;
    if (typeof window.hideLoader === 'function') window.hideLoader();
  }
}








function populateFilters() {
if (catSelect) {
const categories = new Set();
allCommunityProducts.forEach(p => { if (p.categoria) categories.add(safeString(p.categoria)); });
const currentVal = catSelect.value;
catSelect.innerHTML = '<option value="">Todas las categorías</option>';
Array.from(categories).sort().forEach(cat => {
const opt = document.createElement('option');
opt.value = cat;
opt.textContent = cat;
catSelect.appendChild(opt);
});
if (currentVal && categories.has(currentVal)) catSelect.value = currentVal;
else catSelect.value = '';
}
if (vendorSelect) {
const vendors = new Map();
allCommunityProducts.forEach(p => {
if (p.vendedor_nombre) vendors.set(safeString(p.vendedor_nombre), safeString(p.vendedor_nombre));
});
const currentVal = vendorSelect.value;
vendorSelect.innerHTML = '<option value="">Todos los vendedores</option>';
Array.from(vendors.keys()).sort().forEach(v => {
const opt = document.createElement('option');
opt.value = v;
opt.textContent = v;
vendorSelect.appendChild(opt);
});
if (currentVal && vendors.has(currentVal)) vendorSelect.value = currentVal;
else vendorSelect.value = '';
}
}
function applyFilters() {
try {
const searchTerm = getSearchValue();
const category = catSelect ? catSelect.value : '';
const vendor = vendorSelect ? vendorSelect.value : '';
filteredProducts = allCommunityProducts.filter(p => {
const nombre = safeString(p.nombre);
const descripcion = safeString(p.descripcion);
const categoria = safeString(p.categoria);
const vendedorNombre = safeString(p.vendedor_nombre);
const matchSearch = !searchTerm ||
nombre.toLowerCase().includes(searchTerm) ||
descripcion.toLowerCase().includes(searchTerm);
const matchCategory = !category || (categoria === category);
const matchVendor = !vendor || (vendedorNombre === vendor);
return matchSearch && matchCategory && matchVendor;
});
currentPage = 1;
renderProducts();
} catch (err) {
console.error('Error en applyFilters:', err);
}
}
function renderProducts() {
if (!gridContainer) return;
try {
const start = (currentPage - 1) * PAGE_SIZE;
const pageProducts = filteredProducts.slice(start, start + PAGE_SIZE);
if (pageProducts.length === 0) {
gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">No hay productos que coincidan con los filtros.
</div>`;
renderPagination();
return;
}
gridContainer.innerHTML = '';
pageProducts.forEach(product => {
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
allCommunityProducts = allCommunityProducts.filter(p =>String(p.id) !== String(productId));
filteredProducts = filteredProducts.filter(p =>String(p.id) !== String(productId));
invalidateComunidadCache();
window.showTemporaryMessage(' Producto eliminado de la comunidad', 'success');
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
modal.querySelector('#report-cancel-btn').addEventListener('click', close);
modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
modal.querySelector('#report-confirm-btn').addEventListener('click', async () => {
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
close();
await sendReport(product, motivo);
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
} catch (err) {
console.error('Error enviando reporte:', err);
window.showTemporaryMessage(' No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
}
}
function createCommunityCard(product) {
try {
const esc  = window.escapeHtml || (s =>String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const optUrl  = window.optimizeDriveUrl || (u => u);
const fmtCurr = window.formatCurrency  || (v => '$' + Number(v).toLocaleString('es-MX'));
const card = document.createElement('div');
card.className = 'product-card';
card.setAttribute('data-id', product.id);
const imgUrl  = product.imagen1 ? optUrl(product.imagen1, 400) : 'https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen';
const allImages = [product.imagen1, product.imagen2, product.imagen3].filter(Boolean).map(u => optUrl(u, 800));
const stockNum  = Number(product.stock) || 0;
const hasStock  = stockNum > 0;
const vendorName = safeString(product.vendedor_nombre);
const vendorTel  = safeString(product.vendedor_tel);
const waMsg = [
` *Hola ${esc(vendorName || 'vendedor')}!*`,
`Vi tu producto en *Z&R Comunidad* y me interesa:`,
``,
` *${esc(safeString(product.nombre))}*`,
product.precio ? ` Precio: ${fmtCurr(product.precio)}` : '',
product.talla  ? ` Info/Talla: ${esc(safeString(product.talla))}` : '',
``,
`Me gustaría saber más detalles y disponibilidad. `,
].filter(Boolean).join('\n');
const waLink = vendorTel ? `https://wa.me/52${vendorTel}?text=${encodeURIComponent(waMsg)}` : '#';
card.innerHTML = `
<div class="product-slider" style="position:relative;cursor:pointer;">
<span class="product-badge" style="position:absolute;top:8px;left:8px;font-size:9px;padding:2px 8px;background:var(--color-primary,#3b1f5f);color:#fff;border-radius:20px;font-weight:800;z-index:1;">Comunidad</span>
${inspectorMode ? '<span style="position:absolute;top:8px;right:8px;z-index:2;"><button class="btn-inspector-delete" title="Eliminar (Admin)" style="background:var(--color-error,#ef4444);color:#fff;border:none;border-radius:20px;padding:2px 8px;font-size:11px;cursor:pointer;"></button></span>' : ''}
<img class="product-img-main" src="${esc(imgUrl)}" alt="${esc(safeString(product.nombre))}" loading="lazy"
style="width:100%;aspect-ratio:1;object-fit:contain;display:block;background:var(--color-surface-2,#f5f5f8);" onerror="this.onerror=null;this.src='placeholder.svg'">
</div>
<div class="product-info" style="padding:12px;">
<div class="product-title-row">
<h3 class="product-name" style="font-size:14px;" title="${esc(safeString(product.nombre))}">${esc(safeString(product.nombre))}</h3>
<div class="product-price" style="font-size:16px;">${fmtCurr(product.precio)}</div>
</div>
${vendorName ? `<div style="font-size:11px;color:var(--color-text-muted,#888);margin-top:2px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;">
<span> ${esc(vendorName)}</span>
${vendorTel ? `<a href="${waLink}" target="_blank" rel="noopener" style="color:#25d366;font-weight:600;text-decoration:none;font-size:11px;">Contactar</a>` : ''}
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
data-vendortel="${esc(vendorTel)}">
${!hasStock ? 'Sin stock' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-plus"/></svg> Añadir'}
</button>
<button class="btn-report" title="Reportar" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 10px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-flag"/></svg></button>
<button class="btn-share-comunidad" title="Compartir" style="background:var(--color-surface-3);border:none;border-radius:30px;padding:8px 10px;cursor:pointer;color:var(--color-text-muted);display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" aria-hidden="true"><use href="#ic-share"/></svg></button>
</div>
</div>
`;
card.querySelector('.product-slider').addEventListener('click', (e) => {
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
};
window.openImageModal(imgUrl, product.id, allImages, productData);
}
}
});
const addBtn = card.querySelector('.comunidad-add-btn');
if (addBtn && hasStock && window.addToCart) {
addBtn.addEventListener('click', (e) => {
e.stopPropagation();
window.addToCart({
ID: addBtn.dataset.id, Nombre: addBtn.dataset.nombre,
Precio: Number(addBtn.dataset.precio), Imagen1: addBtn.dataset.img,
Talla: addBtn.dataset.talla, _comunidad: true,
_vendedor: addBtn.dataset.vendedor, _vendorTel: addBtn.dataset.vendortel
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
// Botón compartir en cards de comunidad
const shareBtn = card.querySelector('.btn-share-comunidad');
if (shareBtn) shareBtn.addEventListener('click', (e) => {
e.stopPropagation();
shareProduct(product.id, product.nombre, product.precio);
});
return card;
} catch (err) {
console.error('Error creando tarjeta para producto', product.id, err);
return null;
}
}
function renderPagination() {
if (!paginationDiv) return;
const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
paginationDiv.innerHTML = '';
if (totalPages <= 1) return;
if (currentPage > 1) {
const prevBtn = document.createElement('button');
prevBtn.textContent = '← Anterior';
prevBtn.onclick = () => { currentPage--; renderProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
paginationDiv.appendChild(prevBtn);
}
let startPage = Math.max(1, currentPage - 2);
let endPage = Math.min(totalPages, startPage + 4);
if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
for (let i = startPage; i <= endPage; i++) {
const pageBtn = document.createElement('button');
pageBtn.textContent = i;
if (i === currentPage) pageBtn.classList.add('active-page');
pageBtn.onclick = (function(p) { return function() { currentPage = p; renderProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); }; })(i);
paginationDiv.appendChild(pageBtn);
}
if (currentPage < totalPages) {
const nextBtn = document.createElement('button');
nextBtn.textContent = 'Siguiente →';
nextBtn.onclick = () => { currentPage++; renderProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
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
const reqBtn = document.getElementById('request-purchase-btn');
if (reqBtn) reqBtn.addEventListener('click', () => {
if (typeof window.openWhatsAppCheckout === 'function') window.openWhatsAppCheckout();
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
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initComunidad);
} else {
initComunidad();
}
})();
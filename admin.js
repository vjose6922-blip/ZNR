(function () {
'use strict';
window.originalHandleProductFormSubmit = null;
window.originalDeleteProduct = null;
setTimeout(() => {
if (typeof handleProductFormSubmit === 'function') {
window.originalHandleProductFormSubmit = handleProductFormSubmit;
console.log(" Función original handleProductFormSubmit guardada");
}
if (typeof deleteProduct === 'function') {
window.originalDeleteProduct = deleteProduct;
console.log(" Función original deleteProduct guardada");
}
}, 100);
const ADMIN_API_URL = window.API_URL || "";
let adminSession = null;
let adminProducts = [];
let adminCurrentPage = 1;
let adminFilteredProducts = [];
let adminProductsPerPage = 10;
let lastNotifCount = 0;
let notificationInterval = null;
async function apiRequest(method, body) {
try {
const url = window.API_URL || ADMIN_API_URL;
if (!url) throw new Error("API_URL no disponible");
const savedToken = sessionStorage.getItem("admin_token") || "";
let res;
if (method === "GET") {

const params = Object.assign({ action: "list" }, body || {});
if (!params.token && savedToken) params.token = savedToken;
res = await fetch(url + "?" + new URLSearchParams(params).toString());
} else {

const payload = Object.assign({}, body || {});
if (!payload.token && savedToken) payload.token = savedToken;
res = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: new URLSearchParams(payload).toString()
});
}
if (!res.ok) throw new Error("HTTP " + res.status);
return await res.json();
} catch (err) {
console.error("API ERROR:", err);
throw err;
}
}
async function handleAdminLogin(e) {
e.preventDefault();
const password = document.getElementById("admin-password").value;
const token = document.getElementById("admin-token").value;
showLoader("Verificando credenciales...");
try {
const data = await apiRequest("POST", { action: "login", password, token });
if (!data || !data.ok) {
await showCustomAlert({
title: " Acceso denegado",
message: "Credenciales incorrectas. Verifica tu contraseña y token.",
icon: "",
confirmText: "Intentar nuevamente"
});
return;
}
adminSession = data.session || "ok";
sessionStorage.setItem("admin_token", document.getElementById("admin-token").value);
sessionStorage.setItem("admin_session", "true");
document.getElementById("admin-login-view").hidden = true;
document.getElementById("admin-panel-view").hidden = false;
initImageUploads();
loadAdminProducts();
startNotificationMonitoring();
initAdminViewToggle();
} catch (err) {
console.error(err);
await showCustomAlert({
title: " Error",
message: "Error al iniciar sesión. Intenta nuevamente.",
icon: "",
confirmText: "Aceptar"
});
} finally {
hideLoader();
}
}

async function loadAdminProducts() {
showLoader("Cargando productos...");
try {
const data = await apiRequest("GET", { action: "list" });
adminProducts = data.products || data || [];
updateAdminStats();
populateAdminCategoryFilter();
adminCurrentPage = 1;
renderAdminProductsWithFilters();
} catch (err) {
console.error(err);
await showCustomAlert({
title: " Error",
message: "Error al cargar productos. Verifica tu conexión.",
icon: "",
confirmText: "Aceptar"
});
} finally {
hideLoader();
}
}
function renderAdminProductsWithFilters() {
const searchTerm = document.getElementById("admin-search-input")?.value.toLowerCase() || "";
const categoryFilter = document.getElementById("admin-category-filter")?.value || "";
const stockFilter = document.getElementById("admin-stock-filter")?.value || "";
adminFilteredProducts = adminProducts.filter(product => {
const matchesSearch = !searchTerm ||
(product.Nombre || "").toLowerCase().includes(searchTerm) ||
String(product.ID || "").includes(searchTerm);
const matchesCategory = !categoryFilter || (product.Categoria || "") === categoryFilter;
const stock = Number(product.Stock || 0);
let matchesStock = true;
if (stockFilter === "low") matchesStock = stock > 0 && stock <= 5;
else if (stockFilter === "out") matchesStock = stock === 0;
else if (stockFilter === "in") matchesStock = stock > 0;
return matchesSearch && matchesCategory && matchesStock;
});
const totalPages = Math.ceil(adminFilteredProducts.length / adminProductsPerPage);
const start = (adminCurrentPage - 1) * adminProductsPerPage;
const end = start + adminProductsPerPage;
const pageProducts = adminFilteredProducts.slice(start, end);
renderAdminProductsList(pageProducts);
renderAdminPagination(totalPages);
}

const ADMIN_VIEW_KEY = 'admin_product_view';
let adminProductView = localStorage.getItem(ADMIN_VIEW_KEY) || 'list';

function initAdminViewToggle() {
 const btnList = document.getElementById('btn-view-list');
 const btnGrid = document.getElementById('btn-view-grid');
 if (!btnList || !btnGrid) return;

 function applyView(view) {
 adminProductView = view;
 localStorage.setItem(ADMIN_VIEW_KEY, view);
 btnList.classList.toggle('active', view === 'list');
 btnGrid.classList.toggle('active', view === 'grid');

 const list = document.getElementById('admin-products-list');
 if (list) {
   list.className = view === 'grid' ? 'admin-products-grid' : 'admin-products-list';
   list.id = 'admin-products-list';
 }

 if (adminProducts && adminProducts.length > 0) {
   renderAdminProductsWithFilters();
 }
 }

 btnList.addEventListener('click', () => applyView('list'));
 btnGrid.addEventListener('click', () => applyView('grid'));

 applyView(adminProductView);
}

function renderAdminProductsList(products) {
const list = document.getElementById("admin-products-list");
if (!list) return;

if (adminProductView === 'grid') {
list.className = 'admin-products-grid';
renderAdminProductsGrid(products, list);
return;
}
list.className = 'admin-products-list';
list.innerHTML = "";
if (!products || products.length === 0) {
list.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No hay productos que coincidan con los filtros.</div>';
return;
}
products.forEach((p) => {
const row = document.createElement("div");
row.className = "admin-product-row";
const stock = Number(p.Stock || 0);
let stockClass = "";
let stockText = "";
if (stock === 0) {
stockClass = "out-stock";
stockText = " Sin stock";
} else if (stock <= 5) {
stockClass = "low-stock";
stockText = ` ${stock} unidades`;
} else {
stockText = ` ${stock} unidades`;
}
row.innerHTML = `
<div class="admin-product-id">#${escapeHtml(String(p.ID || "N/A"))}</div>
<div class="admin-product-name">${escapeHtml(p.Nombre || "Sin nombre")}</div>
<div class="admin-product-price">${formatCurrency(p.Precio)}</div>
<div class="admin-product-stock ${stockClass}">${escapeHtml(stockText)}</div>
<div class="admin-product-actions">
<button class="edit-product-btn" data-id="${escapeHtml(String(p.ID))}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg> Editar</button>
<button class="delete-product-btn" data-id="${escapeHtml(String(p.ID))}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>
</div>
`;
list.appendChild(row);
});
document.querySelectorAll(".edit-product-btn").forEach(btn => {
btn.addEventListener("click", () => {
const id = btn.getAttribute("data-id");
const product = adminProducts.find(p =>String(p.ID) === id);
if (product) fillFormForEdit(product);
});
});
document.querySelectorAll(".delete-product-btn").forEach(btn => {
btn.addEventListener("click", () => {
const id = btn.getAttribute("data-id");
deleteProduct(id);
});
});
}

function renderAdminProductsGrid(products, list) {
list.innerHTML = '';
if (!products || products.length === 0) {
list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">No hay productos que coincidan con los filtros.</div>';
return;
}
products.forEach(p => {
const stock  = Number(p.Stock || 0);
const id  = escapeHtml(String(p.ID || ''));
const nombre = escapeHtml(p.Nombre || 'Sin nombre');
const cat  = escapeHtml(p.Categoria || '');
const img  = p.Imagen1 ? escapeHtml(p.Imagen1) : '';

let statusClass, statusLabel;
if (stock === 0)  { statusClass = 'status-out';  statusLabel = 'Agotado'; }
else if (stock <= 5) { statusClass = 'status-low';  statusLabel = 'Stock bajo'; }
else  { statusClass = 'status-active';  statusLabel = 'Activo'; }

let stockClass = '';
if (stock === 0)  stockClass = 'stock-zero';
else if (stock <= 5) stockClass = 'stock-low';

const card = document.createElement('div');
card.className = 'admin-product-card';
card.innerHTML = `
<div class="admin-card-img-wrap">
${img
 ? `<img src="${img}" alt="${nombre}" loading="lazy" onerror="this.onerror=null;this.parentNode.innerHTML='<div class=\'admin-card-img-placeholder\'></div>'">`
 : '<div class="admin-card-img-placeholder"></div>'}
<span class="admin-card-badge-status ${statusClass}">${statusLabel}</span>
${cat ? `<span class="admin-card-badge-cat"><span>${cat}</span></span>` : ''}
</div>
<div class="admin-card-body">
<div class="admin-card-name" title="${nombre}">${nombre}</div>
<div class="admin-card-price">${formatCurrency(p.Precio)}</div>
<div class="admin-card-stock ${stockClass}">
 <span>${stock === 0 ? 'Sin stock' : stock + ' uds'}</span>
</div>
</div>
<div class="admin-card-actions">
<button class="btn-edit-card edit-product-btn" data-id="${id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg> Editar</button>
<button class="btn-delete-card delete-product-btn" data-id="${id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>
</div>`;
list.appendChild(card);
});

document.querySelectorAll('.edit-product-btn').forEach(btn => {
btn.addEventListener('click', () => {
const product = adminProducts.find(p =>String(p.ID) === btn.getAttribute('data-id'));
if (product) fillFormForEdit(product);
});
});
document.querySelectorAll('.delete-product-btn').forEach(btn => {
btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-id')));
});

applyCategoryBadgeScroll();
if (scrollObserver) {
 scrollObserver.disconnect();
 initBadgeScrollObserver();
}

}

function renderAdminPagination(totalPages) {
const pagination = document.getElementById("admin-pagination");
if (!pagination) return;
pagination.innerHTML = "";
if (totalPages <= 1) return;
if (adminCurrentPage > 1) {
const prevBtn = document.createElement("button");
prevBtn.textContent = "← Anterior";
prevBtn.onclick = () => { adminCurrentPage--; renderAdminProductsWithFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
pagination.appendChild(prevBtn);
}
let startPage = Math.max(1, adminCurrentPage - 2);
let endPage = Math.min(totalPages, startPage + 4);
if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
for (let i = startPage; i <= endPage; i++) {
const btn = document.createElement("button");
btn.textContent = i;
if (i === adminCurrentPage) btn.classList.add("active-page");
btn.onclick = () => { adminCurrentPage = i; renderAdminProductsWithFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
pagination.appendChild(btn);
}
if (adminCurrentPage < totalPages) {
const nextBtn = document.createElement("button");
nextBtn.textContent = "Siguiente →";
nextBtn.onclick = () => { adminCurrentPage++; renderAdminProductsWithFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
pagination.appendChild(nextBtn);
}
}
function populateAdminCategoryFilter() {
const select = document.getElementById("admin-category-filter");
if (!select) return;
const categories = new Set();
adminProducts.forEach(p => { if (p.Categoria) categories.add(p.Categoria); });
select.innerHTML = '<option value="">Todas las categorías</option>';
Array.from(categories).sort().forEach(cat => {
const opt = document.createElement("option");
opt.value = cat;
opt.textContent = cat;
select.appendChild(opt);
});
}
function updateAdminStats() {
const totalProducts = adminProducts.length;
const totalInventoryValue = adminProducts.reduce((sum, p) => sum + (Number(p.Precio || 0) * Number(p.Stock || 0)), 0);
const outOfStock = adminProducts.filter(p =>Number(p.Stock || 0) <= 0).length;
const totalStockElem = document.getElementById("stat-total-products");
const totalValueElem = document.getElementById("stat-total-stock");
const outStockElem = document.getElementById("stat-out-of-stock");
if (totalStockElem) totalStockElem.textContent = totalProducts;
if (totalValueElem) totalValueElem.textContent = formatCurrency(totalInventoryValue);
if (outStockElem) outStockElem.textContent = outOfStock;
}
function resetProductForm() {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-form-title").textContent = " Crear Producto";
  clearImageUploads();
}

function clearProductFormImages() {

    const imgInputs = ["product-image1", "product-image2", "product-image3"];
    imgInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = "";
    });
    

    const previews = ["preview-image-upload-1", "preview-image-upload-2", "preview-image-upload-3"];
    previews.forEach(id => {
        const preview = document.getElementById(id);
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }
    });
    

    const fileInputs = ["image-upload-1", "image-upload-2", "image-upload-3"];
    fileInputs.forEach(id => {
        const fileInput = document.getElementById(id);
        if (fileInput) fileInput.value = "";
    });
}

function fillFormForEdit(product) {

    clearProductFormImages();
    

    document.getElementById("product-id").value = product.ID || "";
    document.getElementById("product-name").value = product.Nombre || "";
    document.getElementById("product-price").value = product.Precio || "";
    document.getElementById("product-stock").value = product.Stock || "";
    document.getElementById("product-description").value = product.Descripcion || "";
    document.getElementById("product-sizes").value = product.Talla || "";
    document.getElementById("product-category").value = product.Categoria || "";
    document.getElementById("product-badge").value = product.Badge || "";
    

    const img1 = document.getElementById("product-image1");
    if (img1) img1.value = product.Imagen1 || "";
    
    const img2 = document.getElementById("product-image2");
    if (img2) img2.value = product.Imagen2 || "";
    
    const img3 = document.getElementById("product-image3");
    if (img3) img3.value = product.Imagen3 || "";
    

    document.getElementById("product-form-title").textContent = "✏️ Editar Producto";
    

    if (product.Imagen1) {
        const preview1 = document.getElementById("preview-image-upload-1");
        if (preview1) {
            preview1.src = product.Imagen1;
            preview1.style.display = "block";
        }
    }
    
    if (product.Imagen2) {
        const preview2 = document.getElementById("preview-image-upload-2");
        if (preview2) {
            preview2.src = product.Imagen2;
            preview2.style.display = "block";
        }
    }
    
    if (product.Imagen3) {
        const preview3 = document.getElementById("preview-image-upload-3");
        if (preview3) {
            preview3.src = product.Imagen3;
            preview3.style.display = "block";
        }
    }
    

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleProductFormSubmit(e) {
e.preventDefault();
if (!adminSession) { showTemporaryMessage(" Sesión no válida", "error"); return; }
if (window.hasPendingImageUploads && window.hasPendingImageUploads()) {
showTemporaryMessage(" Espera a que terminen de subir las imágenes...", "error");
return;
}
const id = document.getElementById("product-id").value;
const data = {
Nombre: document.getElementById("product-name").value.trim(),
Precio: Number(document.getElementById("product-price").value || 0),
Stock: Number(document.getElementById("product-stock").value || 0),
Descripcion: document.getElementById("product-description").value.trim(),
Talla: document.getElementById("product-sizes").value.trim(),
Categoria: document.getElementById("product-category").value.trim(),
Badge: document.getElementById("product-badge").value,
Imagen1: document.getElementById("product-image1").value.trim(),
Imagen2: document.getElementById("product-image2").value.trim(),
Imagen3: document.getElementById("product-image3").value.trim(),
};
if (!data.Nombre) {
await showCustomAlert({
title: " Campo requerido",
message: "El nombre del producto es obligatorio.",
icon: "",
confirmText: "Aceptar"
});
return;
}
showLoader(id ? "Actualizando producto..." : "Creando producto...");
try {
let res;
if (id) {
res = await apiRequest("POST", { action: "update", id, ...data });
} else {
res = await apiRequest("POST", { action: "create", ...data });
}
if (!res || !res.ok) {
throw new Error(res?.error || "Error desconocido");
}
resetProductForm();
clearImageUploads();
await loadAdminProducts();
await showCustomAlert({
title: id ? " Producto actualizado" : " Producto creado",
message: id ? "El producto se ha actualizado correctamente." : "El producto se ha creado correctamente.",
icon: "",
confirmText: "Aceptar"
});
} catch (err) {
console.error(err);
await showCustomAlert({
title: " Error",
message: "Error al guardar el producto: " + err.message,
icon: "",
confirmText: "Aceptar"
});
} finally {
hideLoader();
}
}
async function deleteProduct(id) {
if (!adminSession) { showTemporaryMessage(" Sesión no válida", "error"); return; }
const confirmDelete = await new Promise((resolve) => {
showCustomConfirm({
title: "Eliminar producto",
message: "¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.",
icon: "",
confirmText: "Sí, eliminar",
cancelText: "Cancelar",
onConfirm: () => resolve(true),
onCancel: () => resolve(false)
});
});
if (!confirmDelete) return;
showLoader("Eliminando producto...");
try {
await apiRequest("POST", { action: "delete", id });
await loadAdminProducts();
} catch (err) {
console.error(err);
} finally  {
hideLoader();
}
}
const UPLOAD_API_URL = ADMIN_API_URL;
let _imageUploadsInitialized = false;
function initImageUploads() {
if (_imageUploadsInitialized) return;
_imageUploadsInitialized = true;
setupImageUpload("image-upload-1", "product-image1", "preview-image-upload-1", "progress-image-upload-1");
setupImageUpload("image-upload-2", "product-image2", "preview-image-upload-2", "progress-image-upload-2");
setupImageUpload("image-upload-3", "product-image3", "preview-image-upload-3", "progress-image-upload-3");
}

function showLogMessage(msg, isError = false) {
  const logDiv = document.getElementById('upload-log');
  if (!logDiv) return;
  logDiv.style.display = 'block';
  logDiv.style.backgroundColor = isError ? '#d32f2f' : '#2e7d32';
  logDiv.innerText = msg;
  setTimeout(() => {
    logDiv.style.display = 'none';
  }, 4000);
}

function setupImageUpload(fileInputId, textInputId, previewId, progressId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;

    fileInput.removeEventListener('change', fileInput._listener);

    const newListener = async function(e) {
        const files = this.files;
        if (!files || files.length === 0) return;

        // Extraer el número de slot del id (ej: image-upload-1 → slot 1)
        const slotMatch = fileInputId.match(/\d+$/);
        const startSlot = slotMatch ? parseInt(slotMatch[0]) : 1;

        // Función de subida para admin (usa token de admin)
        const adminUploadFn = async (file, slot) => {
            // Usamos la función existente uploadImageToDrive que ya tiene la lógica de compresión y token
            return await uploadImageToDrive(file);
        };

        // Callback para actualizar el progreso (opcional)
        const onProgress = (slot, percent) => {
            const prog = document.getElementById(`progress-image-upload-${slot}`);
            if (prog) prog.style.width = percent + '%';
        };

        // Callback para cuando se sube una imagen (puede ser útil)
        const onSuccess = (slot, url) => {
            // Ya se actualiza el campo de texto dentro de uploadImagesInQueue
            // Pero podemos hacer algo adicional si queremos
            console.log(`Imagen ${slot} subida: ${url}`);
        };

        // Llamar a la función central
        await window.uploadImagesInQueue(files, startSlot, adminUploadFn, onProgress, onSuccess);
        // Limpiar input para permitir nueva selección
        this.value = '';
    };

    fileInput._listener = newListener;
    fileInput.addEventListener('change', newListener);
}

async function compressImage(file) {
return new Promise((resolve) => {
const img = new Image();
const reader = new FileReader();
reader.onload = e => img.src = e.target.result;
img.onload = () => {
const canvas = document.createElement("canvas");
const MAX = 1200;
let w = img.width, h = img.height;
if (w >MAX || h >MAX) {
if (w > h) {
h *= MAX / w;
w = MAX;
} else {
w *= MAX / h;
h = MAX;
}
}
canvas.width = w;
canvas.height = h;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, w, h);
resolve(canvas.toDataURL("image/jpeg", 0.8));
};
reader.readAsDataURL(file);
});
}
async function uploadImageToDrive(file) {
    const dataUrl = await compressImage(file); // data:image/jpeg;base64,....
    const base64 = dataUrl.split(',')[1];
    const fileName = (file.name || 'imagen').replace(/\.[^.]+$/, '') + '.jpg';
    const result = await apiRequest('POST', {
        action: 'uploadImage',
        data: base64,
        mimeType: 'image/jpeg',
        fileName: fileName
    });
    if (!result || !result.ok) throw new Error((result && result.error) || 'Error al subir la imagen');
    return result.url;
}
function clearImageUploads() {
  const previews = document.querySelectorAll(".image-preview");
  previews.forEach(img => {
    img.src = "";
    img.style.display = "none";
  });
  const progressBars = document.querySelectorAll(".upload-progress");
  progressBars.forEach(bar => {
    if (bar) bar.style.width = "0%";
  });
    const fileInputs = document.querySelectorAll("input[type=file]");
  fileInputs.forEach(input => {
    if (input) input.value = "";
  });
    const imageTextInputs = ["product-image1", "product-image2", "product-image3"];
  imageTextInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
    const extraPreviews = document.querySelectorAll(".custom-preview"); 
  extraPreviews.forEach(preview => {
    preview.style.backgroundImage = "none";
  });
}

async function checkNotifications() {
try {
const res = await fetch(`${ADMIN_API_URL}?action=notificationsBatch&page=1&pageSize=200&noCache=false`);
const data = await res.json();
if (!data.ok) return;
const groups = data.groups || [];
const count = groups.filter(g => g.notifications && g.notifications.some(n => n.status === 'pending' && n.hasStock)).length;
const badge = document.getElementById("notif-badge");
if (badge) {
badge.textContent = count;
if (count > 0) {
badge.style.animation = "pulse 0.5s ease";
setTimeout(() => {
if (badge) badge.style.animation = "";
}, 500);
}
if (count > lastNotifCount && count > 0 && adminSession) {
const bell = document.querySelector(".admin-notification-bell");
if (bell) {
bell.style.transform = "scale(1.05)";
bell.style.boxShadow = "0 0 20px rgba(255,79,129,0.6)";
setTimeout(() => {
if (bell) {
bell.style.transform = "";
bell.style.boxShadow = "";
}
}, 1000);
}
}
}
lastNotifCount = count;
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('solicitudes', count);
const secBadge = document.getElementById('notif-badge-header');
if (secBadge) { secBadge.textContent = count; secBadge.style.display = count > 0 ? 'inline' : 'none'; }
if (typeof loadNotifPanelCounts === 'function') loadNotifPanelCounts();
else {
const badge = document.getElementById('notif-badge');
if (badge) badge.textContent = count;
}
} catch(err) {
console.log("Error checking notifications:", err);
}
}

function startNotificationMonitoring() {
if (notificationInterval) clearInterval(notificationInterval);
checkNotifications();
notificationInterval = setInterval(checkNotifications, 10000);
}
function stopNotificationMonitoring() {
if (notificationInterval) {
clearInterval(notificationInterval);
notificationInterval = null;
}
}
function openNotifications() {
window.location.href = "notificaciones.html";
}
document.addEventListener("DOMContentLoaded", () => {
const loginForm = document.getElementById("admin-login-form");
if (loginForm) loginForm.addEventListener("submit", handleAdminLogin);
const logoutBtn = document.getElementById("admin-logout-btn");
if (logoutBtn) {
const newLogoutBtn = logoutBtn.cloneNode(true);
logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
newLogoutBtn.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
console.log(" Botón logout clickeado");
doAdminLogout();
});
}
const productForm = document.getElementById("product-form");
if (productForm) productForm.addEventListener("submit", handleProductFormSubmit);

// Mientras haya imágenes subiéndose, bloquear el botón de "Guardar Producto"
// para evitar guardar el producto con campos de imagen aún vacíos.
if (productForm) {
const submitBtn = productForm.querySelector('button[type="submit"]');
if (submitBtn) {
const originalLabel = submitBtn.innerHTML;
window.addEventListener('znr:uploads-status', (e) => {
  const pending = e.detail.pending > 0;
  submitBtn.disabled = pending;
  submitBtn.style.opacity = pending ? '0.6' : '';
  submitBtn.style.cursor = pending ? 'not-allowed' : '';
  if (pending) {
    submitBtn.dataset.originalLabel = submitBtn.dataset.originalLabel || originalLabel;
    submitBtn.innerHTML = ' Subiendo imágenes...';
  } else if (submitBtn.dataset.originalLabel) {
    submitBtn.innerHTML = submitBtn.dataset.originalLabel;
  }
});
}
}
const resetBtn = document.getElementById("reset-form-btn");
if (resetBtn) resetBtn.addEventListener("click", resetProductForm);
const refreshBtn = document.getElementById("admin-refresh-btn");
if (refreshBtn) refreshBtn.addEventListener("click", loadAdminProducts);
const adminSearch = document.getElementById("admin-search-input");
const adminCategory = document.getElementById("admin-category-filter");
const adminStock = document.getElementById("admin-stock-filter");
if (adminSearch) {
adminSearch.addEventListener("input", () => {
adminCurrentPage = 1;
renderAdminProductsWithFilters();
});
}
if (adminCategory) {
adminCategory.addEventListener("change", () => {
adminCurrentPage = 1;
renderAdminProductsWithFilters();
});
}
if (adminStock) {
adminStock.addEventListener("change", () => {
adminCurrentPage = 1;
renderAdminProductsWithFilters();
});
}
const hasSession = sessionStorage.getItem("admin_session");
const savedToken = sessionStorage.getItem("admin_token") || "";
function _forceAdminLogout() {
_imageUploadsInitialized = false;
sessionStorage.removeItem("admin_session");
sessionStorage.removeItem("admin_token");
localStorage.removeItem("admin_token");
adminSession = null;
}
if (hasSession === "true" && savedToken && document.getElementById("admin-panel-view")) {
(async () => {
try {
const apiUrl = window.API_URL;
if (!apiUrl) { _forceAdminLogout(); return; }

const res = await fetch(apiUrl + "?" + new URLSearchParams({ action: "verificarAdmin", token: savedToken }).toString());
const data = await res.json();

if (data && (data.valid === true || data.ok === true)) {
adminSession = "ok";
document.getElementById("admin-login-view").hidden = true;
document.getElementById("admin-panel-view").hidden = false;
setTimeout(() => {
  initImageUploads();
  loadAdminProducts();
  startNotificationMonitoring();
  initAdminViewToggle();
  window.dispatchEvent(new CustomEvent('adminReady'));
}, 200);
} else {
_forceAdminLogout();
showTemporaryMessage(" Sesión expirada, inicia sesión de nuevo", "error");
}
} catch(e) {

console.warn("No se pudo verificar sesión con el servidor, confiando en sessionStorage:", e);
adminSession = "ok";
document.getElementById("admin-login-view").hidden = true;
document.getElementById("admin-panel-view").hidden = false;
initImageUploads();
loadAdminProducts();
startNotificationMonitoring();
initAdminViewToggle();
window.dispatchEvent(new CustomEvent('adminReady'));
}
})();
} else if (hasSession === "true" && !savedToken) {
_forceAdminLogout();
}
});
function doAdminLogout() {
console.log(" Cerrando sesión...");
stopNotificationMonitoring();
adminSession = null;
sessionStorage.removeItem("admin_session");
sessionStorage.removeItem("admin_token");
localStorage.removeItem("admin_token");
const loginView = document.getElementById("admin-login-view");
const panelView = document.getElementById("admin-panel-view");
if (loginView) loginView.hidden = false;
if (panelView) panelView.hidden = true;
const loginForm = document.getElementById("admin-login-form");
if (loginForm) loginForm.reset();
  location.reload();
}
(function () {
'use strict';
function getApi()  { return ADMIN_API_URL; }
function getToken() {
return sessionStorage.getItem('admin_token')
|| '';
}

async function gasGet(params) {
const url = getApi();
const qs = new URLSearchParams(params).toString();
const res = await fetch(url + "?" + qs);
return res.json();
}

async function gasPost(params) {
const url = getApi();
const res = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: new URLSearchParams(params).toString()
});
return res.json();
}
const STYLES = `
<style id="admin-comunidad-styles">
.vendor-row, .pending-product-row {
display: flex; align-items: center; gap: 14px;
padding: 12px 16px; border-radius: 14px;
background: var(--color-bg-secondary, #f5f5f8);
margin-bottom: 10px; flex-wrap: wrap;
}
.vendor-row .info, .pending-product-row .info { flex: 1; min-width: 0; }
.vendor-row .info strong,
.pending-product-row .info strong {
display: block; font-size: 14px;
}
.vendor-row .info span,
.pending-product-row .info span { font-size: 12px; color: #888; }
.vendor-row .actions,
.pending-product-row .actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-approve {
padding: 6px 14px; border: none; border-radius: 20px;
background: #e8f5e9; color: #2e7d32;
font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-reject {
padding: 6px 14px; border: none; border-radius: 20px;
background: #ffebee; color: #c62828;
font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-suspend {
padding: 6px 14px; border: none; border-radius: 20px;
background: #fff3e0; color: #e65100;
font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-stats {
padding: 6px 14px; border: none; border-radius: 20px;
background: #e8e8ff; color: #3b1f5f;
font-size: 12px; font-weight: 600; cursor: pointer;
}
#vendor-stats-modal {
display:none; position:fixed; inset:0; background:rgba(0,0,0,.55);
backdrop-filter:blur(4px); z-index:10000; align-items:center; justify-content:center;
}
#vendor-stats-modal.open { display:flex; }
.vendor-stats-box {
background:#fff; border-radius:20px; padding:28px; max-width:420px; width:90%;
box-shadow:0 20px 60px rgba(0,0,0,.25); position:relative;
}
.vendor-stats-box h3 { margin:0 0 16px; font-size:18px; }
.vstats-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.vstat-card { background:#f5f5f8; border-radius:12px; padding:12px; text-align:center; }
.vstat-val { font-size:22px; font-weight:800; color:#3b1f5f; display:block; }
.vstat-lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.04em; }
.pending-product-row img {
width: 56px; height: 56px; object-fit: contain;
border-radius: 10px; background: #fff; flex-shrink: 0;
}
.vest-pendiente { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#fff8e1;color:#f57f17; }
.vest-activo  { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#e8f5e9;color:#2e7d32; }
.vest-rechazado { display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#ffebee;color:#c62828; }
.reporte-row {
display:flex; align-items:flex-start; gap:14px;
padding:12px 16px; border-radius:14px;
background:var(--color-bg-secondary,#f5f5f8);
margin-bottom:10px; flex-wrap:wrap;
}
.reporte-row .info { flex:1; min-width:0; }
.reporte-row .info strong { display:block; font-size:13px; }
.reporte-row .info span { font-size:12px; color:#888; }
.reporte-row .actions { display:flex; gap:8px; flex-wrap:wrap; flex-shrink:0; }
.btn-ver-producto {
padding:6px 14px; border:none; border-radius:20px;
background:#e8e8ff; color:#3b1f5f;
font-size:12px; font-weight:600; cursor:pointer;
text-decoration:none; display:inline-flex; align-items:center;
}
.btn-del-desde-reporte {
padding:6px 14px; border:none; border-radius:20px;
background:#ffebee; color:#c62828;
font-size:12px; font-weight:600; cursor:pointer;
}
.btn-marcar-revisado {
padding:6px 14px; border:none; border-radius:20px;
background:#e8f5e9; color:#2e7d32;
font-size:12px; font-weight:600; cursor:pointer;
}
#reportes-badge {
display:inline-flex; align-items:center; justify-content:center;
background:#ef4444; color:#fff; border-radius:50%;
width:18px; height:18px; font-size:10px; font-weight:700;
margin-left:6px; vertical-align:middle;
}
</style>
`;
const SECTIONS_HTML = `
<section class="admin-card" id="admin-vendors-section">
<div class="admin-card-header">
<h2>Vendedores Comunidad</h2>
<button class="icon-button" onclick="AdminComunidad.loadVendors()" title="Actualizar"></button>
</div>
<div id="admin-vendors-list" style="margin-top:12px">
<p style="color:#aaa;text-align:center">Cargando...</p>
</div>
</section>
<section class="admin-card" id="admin-pending-products-section">
<div class="admin-card-header">
<h2>⏳ Productos pendientes de aprobación</h2>
<button class="icon-button" onclick="AdminComunidad.loadPendingProducts()" title="Actualizar"></button>
</div>
<div id="admin-pending-list" style="margin-top:12px">
<p style="color:#aaa;text-align:center">Cargando...</p>
</div>
</section>
<section class="admin-card" id="admin-reportes-section">
<div class="admin-card-header">
<h2>Reportes de comunidad <span id="reportes-badge" style="display:none">0</span></h2>
<button class="icon-button" onclick="AdminComunidad.loadReportes()" title="Actualizar"></button>
</div>
<div id="admin-reportes-list" style="margin-top:12px">
<p style="color:#aaa;text-align:center">Cargando...</p>
</div>
</section>
`;
function init() {
const isNotif = window.location.pathname.includes('notificaciones.html');
if (!isNotif) return;
if (!getToken()) return;
if (!document.getElementById('admin-comunidad-styles')) {
document.head.insertAdjacentHTML('beforeend', STYLES);
}
loadVendors();
loadPendingProducts();
loadReportes();
}
async function loadVendors() {
const container = document.getElementById('admin-vendors-list');
if (!container) return;
container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando...</p>';
try {
const data = await gasGet({ action: "vendedoresAdmin", token: getToken() });
if (!data.ok) throw new Error(data.error);
const vendors = data.vendors || [];
if (!vendors.length) {
container.innerHTML = '<p style="color:#aaa;text-align:center">No hay vendedores registrados aún.</p>';
return;
}
window._allVendors = vendors;
container.innerHTML = vendors.map(v => `
<div class="vendor-row" id="vrow-${escapeHtml(v.uid)}">
<div class="info">
<strong>${escapeHtml(v.nombre)}</strong>
<span> ${escapeHtml(v.telefono)}</span><br>
<span class="vest-${escapeHtml(v.estado)}">${escapeHtml(v.estado)}</span>
<span style="font-size:11px;color:#aaa;margin-left:8px">
${v.fecha ? new Date(v.fecha).toLocaleDateString() : ''}
</span>
${v.productos != null ? `<span style="font-size:11px;color:#888;margin-left:8px"> ${v.productos} productos</span>` : ''}
</div>
<div class="actions" style="flex-wrap:wrap;gap:6px;">
${v.estado === 'pendiente'
? `<button class="btn-approve" onclick="AdminComunidad.aprobarVendedor('${escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>
<button class="btn-reject" onclick="AdminComunidad.rechazarVendedor('${escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>`
: ''}
${v.estado === 'activo'
? `<button class="btn-suspend" onclick="AdminComunidad.suspenderVendedor('${escapeHtml(v.uid)}', '${escapeHtml(v.nombre)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender</button>
<button class="btn-stats" onclick="AdminComunidad.verEstadisticas('${escapeHtml(v.uid)}', '${escapeHtml(v.nombre)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-stats"/></svg> Stats</button>`
: ''}
${v.estado === 'suspendido' || v.estado === 'rechazado'
? `<button class="btn-approve" onclick="AdminComunidad.aprobarVendedor('${escapeHtml(v.uid)}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg> Activar</button>`
: ''}
</div>
</div>
`).join('');
const pendingVendors = vendors.filter(v => v.estado === 'pendiente').length;
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('vendors', pendingVendors);
} catch (err) {
container.innerHTML = `<p style="color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
}
}
async function aprobarVendedor(uid) {
await _vendorAction(uid, 'aprobarVendedor', ' Vendedor aprobado');
}
async function rechazarVendedor(uid) {
await _vendorAction(uid, 'rechazarVendedor', ' Vendedor rechazado');
}
async function _vendorAction(uid, action, msg) {
try {
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let waWindow = null;
if (action === 'aprobarVendedor' && !isMobile) {
waWindow = window.open('', '_blank');
if (waWindow) waWindow.document.write('<p style="font-family:sans-serif;padding:20px">⏳ Aprobando vendedor, un momento...</p>');
}
const data = await gasPost({ action, uid, token: getToken() });
if (!data.ok) {
if (waWindow) waWindow.close();
throw new Error(data.error);
}
if (action === 'aprobarVendedor' && data.codigo && data.telefono) {
const vendorRow = document.getElementById(`vrow-${uid}`);
const nombre = vendorRow
? vendorRow.querySelector('.info strong')?.textContent?.trim() || 'Vendedor'
: 'Vendedor';
const mensaje =
` *¡Cuenta aprobada!* \n\n` +
`Hola ${nombre}, tu cuenta de vendedor en Z&R Comunidad ha sido *aprobada*.\n\n` +
`*Tu contraseña temporal es:* ${data.codigo}\n\n` +
`Puedes cambiarla después de iniciar sesión.\n\n` +
` Accede aquí: znr.com/vendedor.html\n\n` +
`¡Bienvenido! `;
if (isMobile) {
if (waWindow) waWindow.close();
window.location.href = `whatsapp://send?phone=52${data.telefono}&text=${encodeURIComponent(mensaje)}`;
} else {
if (waWindow) waWindow.location.href = `https://wa.me/52${data.telefono}?text=${encodeURIComponent(mensaje)}`;
}
}
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(msg, 'success');
loadVendors();
if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
} catch (err) {
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' ' + err.message, 'error');
}
}
async function loadPendingProducts() {
const container = document.getElementById('admin-pending-list');
if (!container) return;
container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando...</p>';
try {
const data = await gasGet({ action: "productosPendientes", token: getToken() });
if (!data.ok) throw new Error(data.error);
const products = data.products || [];
if (!products.length) {
container.innerHTML = '<p style="color:#aaa;text-align:center">Sin productos pendientes </p>';
return;
}
container.innerHTML = products.map(p => `
<div class="pending-product-row" id="prow-${p.id}">
<img src="${escapeHtml(p.imagen1 ? (typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(p.imagen1, 80) : p.imagen1) : '')}"
alt="${escapeHtml(p.nombre)}" onerror="this.style.display='none'">
<div class="info">
<strong>${escapeHtml(p.nombre)}</strong>
<span>$${Number(p.precio).toLocaleString()} · Stock: ${p.stock} · ${escapeHtml(p.categoria || '')}</span><br>
<span> ${escapeHtml(p.vendedor_nombre || '')} ·  ${escapeHtml(p.vendedor_tel || '')}</span><br>
<label style="font-size:11px;color:#666;display:flex;align-items:center;gap:6px;margin-top:6px;">
<span>Aprobación futura:</span>
<select id="confiable-sel-${p.id}" style="font-size:11px;border-radius:8px;border:1px solid #ddd;padding:2px 6px;">
<option value="false">Requiere revisión</option>
<option value="true" ${p.confiable === true || p.confiable === 'true' ? 'selected' : ''}>Auto-aprobar (vendedor confiable)</option>
</select>
</label>
</div>
<div class="actions">
<button class="btn-approve" onclick="AdminComunidad.aprobarProducto('${p.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>
<button class="btn-reject"  onclick="AdminComunidad.rechazarProducto('${p.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>
</div>
</div>
`).join('');
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('pending', products.length);
} catch (err) {
container.innerHTML = `<p style="color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
}
}
async function aprobarProducto(id) {
const sel = document.getElementById(`confiable-sel-${id}`);
const confiableVal = sel ? sel.value : 'false';
await _productAction(id, 'aprobarProductoComunidad', ' Producto aprobado', confiableVal);
}
async function rechazarProducto(id) {
await _productAction(id, 'rechazarProductoComunidad', ' Producto rechazado', null);
}
async function _productAction(id, action, msg, confiable) {
try {
const payload = { action, id, token: getToken() };
if (confiable !== null && confiable !== undefined) payload.confiable = confiable;
const data = await gasPost(payload);
if (!data.ok) throw new Error(data.error);
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(msg, 'success');
const row = document.getElementById(`prow-${id}`);
if (row) { row.style.opacity = '0'; setTimeout(() => { row.remove(); loadPendingProducts(); }, 300); }
if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
} catch (err) {
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' ' + err.message, 'error');
}
}
async function loadReportes() {
const container = document.getElementById('admin-reportes-list');
if (!container) return;
container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando reportes...</p>';
try {
const data = await gasGet({ action: "obtenerReportes", token: getToken() });
if (!data.ok) throw new Error(data.error);
const reportes = data.reportes || [];
updateReportesBadge(reportes.length);
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('reportes', reportes.length);
if (!reportes.length) {
container.innerHTML = '<p style="color:#aaa;text-align:center">Sin reportes pendientes</p>';
return;
}
container.innerHTML = reportes.map(r => {
const imgSrc = r.imagen1 || r.imagen || '';
const imgOpt = imgSrc && typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(imgSrc, 160) : imgSrc;
const vendorUid  = escapeHtml(r.vendedor_uid  || r.vendedorUid  || '');
const vendorNombre= escapeHtml(r.vendedor_nombre || r.nombreVendedor || r.vendedorNombre || '');
const vendorTel  = escapeHtml(r.vendedor_tel  || r.telefonoVendedor || '');
const productId  = escapeHtml(String(r.productId || ''));
const reporteId  = escapeHtml(String(r.reporteId || r.id || ''));
const nombre  = escapeHtml(r.nombreProducto || '—');
const precio  = r.precio ? '$' + Number(r.precio).toLocaleString() : '';
const categoria  = escapeHtml(r.categoria || '');
return `
<div class="reporte-card" id="rrow-${reporteId}">
<div class="reporte-card-top">
${imgSrc ? `<img src="${escapeHtml(imgOpt)}" class="reporte-card-img" onerror="this.src=''" loading="lazy" onclick="window.open('${escapeHtml(imgSrc)}','_blank')">` : '<div class="reporte-card-img-placeholder"></div>'}
<div class="reporte-card-info">
<div class="reporte-card-nombre">${nombre}</div>
<div class="reporte-card-meta">
${precio ? `<span class="rmeta-chip price">${precio}</span>` : ''}
${categoria ? `<span class="rmeta-chip">${categoria}</span>` : ''}
<span class="rmeta-chip motivo"> ${escapeHtml(r.motivo || '—')}</span>
</div>
${vendorNombre ? `
<div class="reporte-card-vendedor">
<span> <strong>${vendorNombre}</strong></span>
${vendorTel ? `<a href="https://wa.me/${vendorTel.replace(/\D/g,'')}" target="_blank" rel="noopener" style="color:#25d366;font-size:12px;"> ${vendorTel}</a>` : ''}
</div>` : ''}
<div style="font-size:11px;color:#aaa;margin-top:4px;">
 ${r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
${r.telefonoUsuario ? ` ·  Reportó: ${escapeHtml(r.telefonoUsuario)}` : ''}
</div>
</div>
</div>
<div class="reporte-card-actions">
<a class="btn-ver-producto" href="comunidad.html?inspector=1#product-${productId}" target="_blank">Ver</a>
${vendorUid ? `<button class="btn-suspend" onclick="AdminComunidad.suspenderVendedor('${vendorUid}', '${vendorNombre}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender</button>` : ''}
<button class="btn-del-desde-reporte"
onclick="AdminComunidad.eliminarProductoDesdeReporte('${productId}', '${nombre}', '${reporteId}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar producto
</button>
<button class="btn-marcar-revisado"
onclick="AdminComunidad.marcarReporteRevisado('${reporteId}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Revisado
</button>
</div>
</div>`;
}).join('');
} catch (err) {
container.innerHTML = `<p style="color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
}
}
function updateReportesBadge(count) {
const badge = document.getElementById('reportes-badge');
if (!badge) return;
if (count > 0) {
badge.textContent = count;
badge.style.display = 'inline-flex';
} else {
badge.style.display = 'none';
}
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('reportes', count);
}
async function eliminarProductoDesdeReporte(productId, nombreProducto, reporteId) {
if (typeof showCustomConfirm !== 'function') return;
showCustomConfirm({
title: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar producto',
message: `¿Eliminar "${nombreProducto}" y marcar todos sus reportes como revisados?`,
icon: '',
confirmText: 'Eliminar',
cancelText: 'Cancelar',
onConfirm: async () => {
try {
const data = await gasPost({ action: 'deleteComunidad', id: String(productId), token: getToken() });
if (!data.ok) throw new Error(data.error);
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' Producto eliminado', 'success');
loadReportes();
} catch (err) {
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' ' + err.message, 'error');
}
}
});
}
async function marcarReporteRevisado(reporteId) {
try {
const data = await gasPost({ action: 'marcarReporteRevisado', reporteId: String(reporteId), token: getToken() });
if (!data.ok) throw new Error(data.error);
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' Reporte archivado', 'success');
const row = document.getElementById(`rrow-${reporteId}`);
if (row) { row.style.opacity = '0'; setTimeout(() => row.remove(), 300); }
const container = document.getElementById('admin-reportes-list');
const currentCards = container ? container.querySelectorAll('.reporte-card').length : 0;
const newCount = Math.max(0, currentCards - 1);
updateReportesBadge(newCount);
if (typeof window._updateNotifTabBadge === 'function') window._updateNotifTabBadge('reportes', newCount);
if (typeof window.refreshAllAdminBadges === 'function') window.refreshAllAdminBadges();
} catch (err) {
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' ' + err.message, 'error');
}
}
async function suspenderVendedor(uid, nombre) {
if (typeof showCustomConfirm !== 'function') return;
showCustomConfirm({
title: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender vendedor',
message: `¿Deseas suspender a "${nombre}"? Podrás reactivarlo en cualquier momento.`,
icon: '',
confirmText: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-suspend"/></svg> Suspender',
cancelText: 'Cancelar',
onConfirm: async () => {
try {
const data = await gasPost({ action: 'rechazarVendedor', uid, token: getToken() });
if (!data.ok) throw new Error(data.error);
if (typeof showTemporaryMessage === 'function') showTemporaryMessage('⏸ Vendedor suspendido', 'success');
loadVendors();
} catch(err) {
if (typeof showTemporaryMessage === 'function') showTemporaryMessage(' ' + err.message, 'error');
}
}
});
}
function verEstadisticas(uid, nombre) {
let modal = document.getElementById('vendor-stats-modal');
if (!modal) {
modal = document.createElement('div');
modal.id = 'vendor-stats-modal';
modal.innerHTML = `
<div class="vendor-stats-box">
<button id="vstats-close" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;"></button>
<h3 id="vstats-title">Estadísticas</h3>
<div class="vstats-grid" id="vstats-grid"><p style="color:#aaa;text-align:center;grid-column:span 2">Cargando...</p></div>
<div id="vstats-products" style="margin-top:8px;max-height:260px;overflow-y:auto;"></div>
</div>`;
document.body.appendChild(modal);
modal.querySelector('#vstats-close').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}
modal.classList.add('open');
document.getElementById('vstats-title').textContent = ` ${nombre}`;
const grid = document.getElementById('vstats-grid');
const prods = document.getElementById('vstats-products');
grid.innerHTML = '<p style="color:#aaa;text-align:center;grid-column:span 2">Cargando...</p>';
prods.innerHTML = '';
gasGet({ action: "listarComunidad", vendedor_uid: uid, admin: "true", token: getToken() })
.then(data => {
const all = (data.products || []).filter(p => p.vendedor_uid === uid);
const totalStock = all.reduce((s,p) => s + (Number(p.stock)||0), 0);
const pendientes = all.filter(p => p.estado === 'pendiente').length;
const aprobados  = all.filter(p => p.estado === 'aprobado').length;
grid.innerHTML = `
<div class="vstat-card"><span class="vstat-val">${all.length}</span><span class="vstat-lbl">Productos</span></div>
<div class="vstat-card"><span class="vstat-val">${totalStock}</span><span class="vstat-lbl">Stock total</span></div>
<div class="vstat-card"><span class="vstat-val">${aprobados}</span><span class="vstat-lbl">Aprobados</span></div>
<div class="vstat-card"><span class="vstat-val">${pendientes}</span><span class="vstat-lbl">Pendientes</span></div>`;
prods.innerHTML = all.length ? all.map(p => `
<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eee;">
<img src="${p.imagen1 || ''}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#f5f5f8;" onerror="this.src=''">
<div style="flex:1;min-width:0;">
<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre || '—'}</div>
<div style="font-size:11px;color:#888;">$${Number(p.precio||0).toLocaleString()} · Stock: ${p.stock||0} · <span style="color:${p.estado==='aprobado'?'#2e7d32':'#f57f17'}">${p.estado||''}</span></div>
</div>
</div>`).join('') : '<p style="color:#aaa;text-align:center;font-size:13px;">Sin productos publicados</p>';
})
.catch(err => {
grid.innerHTML = `<p style="color:#ef4444;grid-column:span 2">Error: ${escapeHtml(err.message)}</p>`;
});
}
window.AdminComunidad = {
init,
loadVendors,
loadPendingProducts,
aprobarVendedor,
rechazarVendedor,
aprobarProducto,
rechazarProducto,
suspenderVendedor,
verEstadisticas,
loadReportes,
eliminarProductoDesdeReporte,
marcarReporteRevisado,
updateReportesBadge
};
window.addEventListener('adminReady', () => {
});
if (window.location.pathname.includes('notificaciones.html')) {
document.addEventListener('DOMContentLoaded', () => {
setTimeout(() => {
init();
const rvBtn = document.getElementById('refresh-vendors-btn');
if (rvBtn) rvBtn.addEventListener('click', () => loadVendors());
const rpBtn = document.getElementById('refresh-pending-btn');
if (rpBtn) rpBtn.addEventListener('click', () => loadPendingProducts());
const rrBtn = document.getElementById('refresh-reportes-btn');
if (rrBtn) rrBtn.addEventListener('click', () => loadReportes());
const rsBtn = document.getElementById('refresh-solicitudes-btn');
if (rsBtn) rsBtn.addEventListener('click', () => {
if (window.NotifManager && typeof window.NotifManager.reload === 'function') {
window.NotifManager.reload();
} else {
checkNotifications();
const notifContainer = document.getElementById('notifications');
if (notifContainer) notifContainer.dispatchEvent(new CustomEvent('zr-reload'));
}
});
}, 400);
});
}
})();

function applyCategoryBadgeScroll() {
 const badges = document.querySelectorAll('.admin-card-badge-cat');
 badges.forEach(badge => {
 const span = badge.querySelector('span');
 if (!span) return;

 span.style.display = 'inline-block';
 span.style.whiteSpace = 'nowrap';
 const needsScroll = span.scrollWidth > badge.clientWidth;
 if (needsScroll) {
 badge.classList.add('scroll');
 } else {
 badge.classList.remove('scroll');
 }
 });
}

let scrollObserver = null;
function initBadgeScrollObserver() {
 if (scrollObserver) scrollObserver.disconnect();
 scrollObserver = new IntersectionObserver((entries) => {
 entries.forEach(entry => {
 if (entry.isIntersecting) {
 const badge = entry.target;
 const span = badge.querySelector('span');
 if (span && span.scrollWidth > badge.clientWidth) {
 badge.classList.add('scroll');
 } else {
 badge.classList.remove('scroll');
 }

 }
 });
 }, { threshold: 0.1 });

 document.querySelectorAll('.admin-card-badge-cat').forEach(badge => {
 scrollObserver.observe(badge);
 });
}

let resizeTimeout;
function handleResizeForBadges() {
 clearTimeout(resizeTimeout);
 resizeTimeout = setTimeout(() => {
 applyCategoryBadgeScroll();

 if (scrollObserver) {
 scrollObserver.disconnect();
 initBadgeScrollObserver();
 }
 }, 200);
}

window.addEventListener('load', () => {
 applyCategoryBadgeScroll();
 initBadgeScrollObserver();
 window.addEventListener('resize', handleResizeForBadges);
});

window.handleAdminLogin  = handleAdminLogin;
window.doAdminLogout  = doAdminLogout;
window.openNotifications  = openNotifications;
window.handleProductFormSubmit = handleProductFormSubmit;
window.deleteProduct  = deleteProduct;
window.resetProductForm  = resetProductForm;
window.clearImageUploads  = clearImageUploads;
window.loadAdminProducts  = loadAdminProducts;
})();

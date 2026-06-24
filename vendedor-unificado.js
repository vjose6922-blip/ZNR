(function() {
'use strict';

// ──────────────────────────────────────────────
// CORRECCIÓN: vendorSession ahora es global dentro de este módulo
// ──────────────────────────────────────────────
let vendorSession = null;

const API_BASE = window.API_URL || ""

function getAdminToken() {
return sessionStorage.getItem('admin_token') || '';
}

async function apiFetch(data, method = 'POST') {
if (method === 'GET') {
const params = new URLSearchParams(data);
const res = await fetch(`${API_BASE}?${params.toString()}`);
return res.json();
}
const params = new URLSearchParams();
Object.entries(data).forEach(([k, v]) => {
if (v !== undefined && v !== null) params.append(k, v);
});
const res = await fetch(API_BASE, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
return res.json();
}

function injectStyles(id, css) {
if (document.getElementById(id)) return;
const style = document.createElement('style');
style.id = id;
style.textContent = css;
document.head.appendChild(style);
}

function initVendorPanel() {
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('register') === '1') {
setTimeout(() => {
const registerTab = document.querySelector('.login-tab[data-tab="register"]');
if (registerTab) registerTab.click();
}, 500);
}

if (!document.getElementById('login-section') && !document.getElementById('panel-section')) return;

// Se ELIMINA la declaración local de vendorSession (ya es global)
// let vendorSession = null;   ← ELIMINADA

let uploadedImages = { 1: null, 2: null, 3: null };
let selectedFiles = { 1: null, 2: null, 3: null };

const loginTab = document.querySelector('.login-tab[data-tab="login"]');
const registerTab = document.querySelector('.login-tab[data-tab="register"]');
const loginContainer = document.getElementById('login-form-container');
const registerContainer = document.getElementById('register-form-container');

if (loginTab && registerTab) {
loginTab.addEventListener('click', () => {
loginTab.classList.add('active');
registerTab.classList.remove('active');
loginContainer.style.display = 'block';
registerContainer.style.display = 'none';
});
registerTab.addEventListener('click', () => {
registerTab.classList.add('active');
loginTab.classList.remove('active');
loginContainer.style.display = 'none';
registerContainer.style.display = 'block';
});

const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
if (switchToRegister) switchToRegister.addEventListener('click', () => registerTab && registerTab.click());
if (switchToLogin) switchToLogin.addEventListener('click', () => loginTab && loginTab.click());
}

async function registerVendor() {
const nombre = document.getElementById('reg-nombre')?.value.trim();
const phone = document.getElementById('reg-phone')?.value.trim().replace(/\D/g, '');
if (!nombre || phone.length !== 10) {
showTemporaryMessage(' Completa todos los campos correctamente', 'error');
return;
}
const btn = document.getElementById('register-btn');
if (btn) {
btn.disabled = true;
btn.textContent = 'Enviando...';
}
try {
const res = await apiFetch({ action: 'registrarVendedor', nombre, telefono: phone });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(' Registro exitoso. Espera a que el administrador active tu cuenta.', 'success');
document.getElementById('reg-nombre').value = '';
document.getElementById('reg-phone').value = '';
const loginTab = document.querySelector('.login-tab[data-tab="login"]');
if (loginTab) loginTab.click();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
} finally {
if (btn) {
btn.disabled = false;
btn.textContent = 'Registrarme';
}
}
}

const registerBtn = document.getElementById('register-btn');
if (registerBtn) registerBtn.addEventListener('click', registerVendor);

async function vendorLogin() {
const firstField  = document.getElementById('login-phone')?.value.trim();
const secondField = document.getElementById('login-password')?.value.trim();

if (!firstField || !secondField) {
showTemporaryMessage('Credenciales incorrectas', 'error');
return;
}

showLoader('Verificando...');

const esAdmin = /^\d{6}$/.test(firstField);

if (esAdmin) {
try {
const api = window.API_URL;
if (!api) throw new Error();
const formData = new URLSearchParams();
formData.append('action', 'login');
formData.append('password', firstField);
formData.append('token', secondField);
const res = await fetch(api, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: formData.toString()
});
const data = await res.json();
if (data && data.ok === true) {
sessionStorage.setItem('admin_token', secondField);
sessionStorage.setItem('admin_session', 'true');
window.location.href = 'admin.html';
return;
}
} catch (_) {}
showTemporaryMessage('Credenciales incorrectas', 'error');
hideLoader();
return;
}

try {
const res = await apiFetch({ action: 'loginVendedor', telefono: firstField, password: secondField });
if (!res.ok) throw new Error();
// AHORA asignamos a la variable global vendorSession
vendorSession = {
token: res.token,
uid: res.uid,
nombre: res.nombre,
confiable: res.confiable,
plan: res.plan || 'free',
planVence: res.planVence || null,
limiteProductos: res.limiteProductos || 20,
productosActuales: res.productosActuales || 0,
logo: res.logo || '',
descripcion: res.descripcion || '',
whatsapp: res.whatsapp || '',
categoria: res.categoria || '',
fechaRegistro: res.fechaRegistro || ''
};
localStorage.setItem('vendor_session', JSON.stringify(vendorSession));
} catch (_) {
showTemporaryMessage('Credenciales incorrectas', 'error');
hideLoader();
return;
}
try {
showPanel();
} catch(e) {
console.error('showPanel error:', e);
} finally {
hideLoader();
}
}

function vendorLogout() {
localStorage.removeItem('vendor_session');
sessionStorage.removeItem('admin_session');
sessionStorage.removeItem('admin_token');
vendorSession = null;
const loginDiv = document.getElementById('login-section');
const panelDiv = document.getElementById('panel-section');
if (loginDiv) loginDiv.style.display = 'block';
if (panelDiv) panelDiv.style.display = 'none';
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.style.display = 'none';

const navGuest = document.getElementById('bottom-nav-guest');
const navVendor = document.getElementById('bottom-nav-vendor');
if (navVendor) navVendor.style.display = 'none';
if (navGuest) navGuest.style.display = '';

closeSettingsModal();
}

function showPanel() {
const loginDiv = document.getElementById('login-section');
const panelDiv = document.getElementById('panel-section');
if (loginDiv) loginDiv.style.display = 'none';
if (panelDiv) panelDiv.style.display = 'block';

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.style.display = 'flex';

const nameHeader = document.getElementById('vendor-name-header');
if (nameHeader && vendorSession) {
nameHeader.textContent = vendorSession.nombre;
}

updateVendorAvatar();

const navGuest = document.getElementById('bottom-nav-guest');
const navVendor = document.getElementById('bottom-nav-vendor');
if (navGuest) navGuest.style.display = 'none';
if (navVendor) navVendor.style.display = '';

const cardName = document.getElementById('vendor-card-name');
if (cardName && vendorSession) cardName.textContent = vendorSession.nombre;

const shareBtn = document.getElementById('share-vendor-link');
if (shareBtn) {
const newBtn = shareBtn.cloneNode(true);
shareBtn.parentNode.replaceChild(newBtn, shareBtn);
newBtn.style.display = 'inline-block';
newBtn.addEventListener('click', () => {
const vendorNameEncoded = encodeURIComponent(vendorSession.nombre);
const baseDir = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
const shareUrl = `${baseDir}comunidad.html?vendedor=${vendorNameEncoded}`;
navigator.clipboard.writeText(shareUrl)
.then(() => {
window.showTemporaryMessage?.(' Enlace copiado (URL completa)', 'success');
})
.catch(() => {
alert('No se pudo copiar. Comparte este enlace:\n' + shareUrl);
});
});
}

loadMyProducts();
renderVendorPlanPanel();
}

function renderVendorPlanPanel() {
const el = document.getElementById('vendor-plan-panel');
if (!el || !vendorSession) return;
const esPlus   = vendorSession.plan === 'plus';
const limite   = vendorSession.limiteProductos || (esPlus ? 200 : 20);
const actuales = vendorSession.productosActuales || 0;
const pct = Math.min(100, Math.round((actuales / limite) * 100));
const diasRestantes = vendorSession.planVence
? Math.ceil((new Date(vendorSession.planVence) - new Date()) / 86400000)
: null;

const planBadge = esPlus
? `<span style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">PLUS</span>`
: `<span style="background:#eee;color:#999;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">FREE</span>`;

let renovacionHTML = '';
if (esPlus && diasRestantes != null && diasRestantes <= 7) {
renovacionHTML = `<div style="margin-top:8px;background:#fff8e1;color:#92702a;font-size:12px;border-radius:10px;padding:8px 12px;">
 Tu plan Plus vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. Contacta al admin para renovarlo y no perder tu visibilidad.
</div>`;
}

let logoHTML = '';
if (esPlus) {
logoHTML = `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
 ${vendorSession.logo
 ? `<img src="${escapeHtml(optimizeDriveUrl(vendorSession.logo, 60))}" alt="Logo" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:1.5px solid #eee;">`
 : `<div style="width:44px;height:44px;border-radius:50%;background:#f3e8ff;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-weight:700;">${escapeHtml((vendorSession.nombre||'?')[0].toUpperCase())}</div>`}
 <button class="btn-secondary" style="font-size:12px;" onclick="document.getElementById('logo-file-input').click()">
 ${vendorSession.logo ? 'Cambiar logo' : 'Subir logo de tu negocio'}
 </button>
</div>`;
} else {
logoHTML = `<div style="margin-top:8px;font-size:12px;color:#999;">Con Plus puedes subir el logo de tu negocio, aparecer destacado y aprobación instantánea.</div>
<div id="vendor-plus-notif-area" style="margin-top:10px;"></div>`;
}

el.innerHTML = `
<div style="background:#f8f8fc;border-radius:14px;padding:12px 14px;">
 <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
 <div style="font-size:13px;font-weight:600;">${actuales}/${limite} productos usados</div>
 ${planBadge}
 </div>
 <div style="background:#e6e6ee;border-radius:999px;height:6px;margin-top:8px;overflow:hidden;">
 <div style="background:${pct >= 100 ? '#c62828' : '#7c3aed'};height:100%;width:${pct}%;"></div>
 </div>
 ${renovacionHTML}
 ${logoHTML}
</div>`;

if (!esPlus) loadPlusSolicitudVendedor();

const logoInput = document.getElementById('logo-file-input');
if (logoInput && !logoInput._wired) {
logoInput._wired = true;
logoInput.addEventListener('change', async (e) => {
const file = e.target.files && e.target.files[0];
if (!file) return;
if (vendorSession.plan !== 'plus') {
showTemporaryMessage('El logo es exclusivo del plan Plus', 'error');
return;
}
showLoader('Subiendo logo...');
try {
await uploadVendorLogo(file);
showTemporaryMessage(' Logo actualizado', 'success');
renderVendorPlanPanel();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
} finally {
hideLoader();
logoInput.value = '';
}
});
}
}

async function uploadVendorLogo(file) {
const url = await uploadImageToDrive(file);
const res = await apiFetch({ action: 'actualizarLogoVendedor', vendorToken: vendorSession.token, logoUrl: url });
if (!res.ok) throw new Error(res.error || 'No se pudo guardar el logo');
vendorSession.logo = url;
localStorage.setItem('vendor_session', JSON.stringify(vendorSession));
return url;
}

async function loadMyProducts() {
const container = document.getElementById('vendor-products-list');
if (!container) return;
container.innerHTML = '<p style="color:#aaa;text-align:center">Cargando...</p>';
try {
const data = await apiFetch({
action: 'listarComunidad',
vendedor_uid: vendorSession.uid,
admin: 'true'
}, 'GET');
if (!data.ok) throw new Error(data.error);
const myProducts = (data.products || []).filter(p => p.vendedor_uid === vendorSession.uid);

const ocupados = myProducts.filter(p => p.estado === 'aprobado' || p.estado === 'pendiente').length;
if (vendorSession) {
vendorSession.productosActuales = ocupados;
localStorage.setItem('vendor_session', JSON.stringify(vendorSession));
}
if (typeof renderVendorPlanPanel === 'function') renderVendorPlanPanel();

if (myProducts.length === 0) {
container.innerHTML = `<p style="color:#aaa;text-align:center">Aún no has publicado productos.<br>
<button class="btn-secondary" onclick="switchTab('form')" style="margin-top:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-publish"/></svg> Publicar ahora</button></p>`;
return;
}
container.innerHTML = myProducts.map(p => {
const imgs = [p.imagen1, p.imagen2, p.imagen3].filter(Boolean);
const thumbs = imgs.map((img, i) => `
<img src="${escapeHtml(optimizeDriveUrl(img, 80))}" alt="foto ${i+1}"
onclick="openVendorImgModal('${escapeHtml(img)}', ${JSON.stringify(imgs).replace(/'/g,"\\'")})"
style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#f5f5f8;cursor:pointer;border:1.5px solid #e0e0e0;flex-shrink:0;"
onerror="this.style.display='none'">
`).join('');
return `
<div class="vendor-product-row" id="vrow-${p.id}">
<div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
${thumbs || '<div style="width:56px;height:56px;background:#f5f5f8;border-radius:8px;"></div>'}
</div>
<div class="info">
<strong>${escapeHtml(p.nombre)}</strong>
<span>$${Number(p.precio).toLocaleString()} · Stock: ${p.stock}</span><br>
<span class="estado-badge estado-${escapeHtml(p.estado)}">${p.estado === 'oculto_limite' ? 'Oculto (límite de plan)' : escapeHtml(p.estado)}</span>
</div>
<div class="actions">
<button class="btn-secondary" onclick="editProduct(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg></button>
<button class="btn-secondary btn-danger" onclick="deleteMyProduct(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg></button>
</div>
</div>`;
}).join('');
if (!window._vendorImgModalReady) {
window._vendorImgModalReady = true;
const mo = document.createElement('div');
mo.id = 'vendor-img-modal';
mo.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
mo.innerHTML = `
<button onclick="document.getElementById('vendor-img-modal').style.display='none'" style="display:flex;align-items:center;justify-content:center;"
style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;"></button>
<img id="vendor-img-modal-img" style="max-width:90vw;max-height:75vh;object-fit:contain;border-radius:12px;">
<div id="vendor-img-modal-thumbs" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;"></div>`;
document.body.appendChild(mo);
mo.addEventListener('click', (e) => { if (e.target === mo) mo.style.display='none'; });
}
window.openVendorImgModal = function(src, imgs) {
const mo = document.getElementById('vendor-img-modal');
const bigImg = document.getElementById('vendor-img-modal-img');
const thumbs = document.getElementById('vendor-img-modal-thumbs');
bigImg.src = src;
thumbs.innerHTML = imgs.map(img => `
<img src="${escapeHtml(optimizeDriveUrl(img, 90))}" onclick="document.getElementById('vendor-img-modal-img').src='${escapeHtml(img)}'"
style="width:64px;height:64px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,.1);cursor:pointer;border:2px solid rgba(255,255,255,.3);"
onerror="this.style.display='none'">`).join('');
mo.style.display = 'flex';
};
window._vendorProducts = myProducts;
} catch (err) {
container.innerHTML = `<p style="color:#ef4444">Error: ${escapeHtml(err.message)}</p>`;
}
}

window.editProduct = function(id) {
const p = (window._vendorProducts || []).find(x =>String(x.id) === String(id));
if (!p) return;
document.getElementById('edit-product-id').value = id;
document.getElementById('pNombre').value = p.nombre || '';
document.getElementById('pPrecio').value = p.precio || '';
document.getElementById('pStock').value = p.stock || '';
document.getElementById('pCategoria').value = p.categoria || '';
document.getElementById('pTalla').value = p.talla || '';
document.getElementById('pDescripcion').value = p.descripcion || '';
[1,2,3].forEach(n => {
const imgUrl = p[`imagen${n}`] || '';
const slot = document.getElementById(`slot-${n}`);
if (imgUrl && slot) {
setSlotPreview(n, imgUrl);
uploadedImages[n] = imgUrl;
} else {
clearSlotPreview(n);
uploadedImages[n] = null;
}
});
document.getElementById('form-title').textContent = ' Editar producto';
document.getElementById('cancel-edit-btn').style.display = 'block';
document.getElementById('submit-product-btn').textContent = ' Guardar cambios';
switchTab('form');
};

window.deleteMyProduct = async function(id) {
const confirmed = await new Promise(resolve => {
if (typeof showCustomConfirm === 'function') {
showCustomConfirm({
title: ' Eliminar producto',
message: '¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.',
icon: '', confirmText: 'Eliminar', cancelText: 'Cancelar',
onConfirm: () => resolve(true), onCancel: () => resolve(false)
});
} else {
resolve(confirm('¿Eliminar este producto?'));
}
});
if (!confirmed) return;
showLoader('Eliminando...');
try {
const res = await apiFetch({ action: 'deleteComunidad', id, vendorToken: vendorSession.token });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(' Producto eliminado', 'info');
loadMyProducts();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
} finally {
hideLoader();
}
};

function cancelEdit() {
document.getElementById('edit-product-id').value = '';
document.getElementById('form-title').textContent = ' Publicar producto';
document.getElementById('cancel-edit-btn').style.display = 'none';
document.getElementById('submit-product-btn').textContent = ' Publicar producto';
resetForm();
switchTab('products');
}

window.cancelEdit = cancelEdit;

function resetForm() {
['pNombre','pPrecio','pStock','pTalla','pDescripcion'].forEach(id => {
const el = document.getElementById(id);
if (el) el.value = '';
});
const cat = document.getElementById('pCategoria');
if (cat) cat.value = '';
[1,2,3].forEach(n => clearSlotPreview(n));
uploadedImages = { 1: null, 2: null, 3: null };
}

window.triggerUpload = function(n) {
document.getElementById(`file-${n}`)?.click();
};

async function compressImage(file) {
return new Promise((resolve) => {
const MAX = 800;
const QUALITY = 0.82;
const img = new Image();
const url = URL.createObjectURL(file);
img.onload = () => {
URL.revokeObjectURL(url);
let { width: w, height: h } = img;
if (w > MAX || h > MAX) {
if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
else        { w = Math.round(w * MAX / h); h = MAX; }
}
const canvas = document.createElement('canvas');
canvas.width = w; canvas.height = h;
canvas.getContext('2d').drawImage(img, 0, 0, w, h);
const mime = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
canvas.toBlob(blob => resolve(blob || file), mime, QUALITY);
};
img.onerror = () => resolve(file);
img.src = url;
});
}

window.handleFileSelect = function(n, input) {
const file = input.files[0];
console.log(`Archivo seleccionado para slot ${n}:`, file ? file.name : 'ninguno');
if (!file) return;
selectedFiles[n] = file;
const reader = new FileReader();
reader.onload = e => {
setSlotPreview(n, e.target.result);
uploadedImages[n] = null;
console.log(`Vista previa actualizada para slot ${n}`);
};
reader.readAsDataURL(file);
};

function setSlotPreview(n, src) {
const slot = document.getElementById(`slot-${n}`);
if (!slot) return;
let previewContainer = slot.querySelector('.slot-preview');
if (!previewContainer) {
previewContainer = document.createElement('div');
previewContainer.className = 'slot-preview';
previewContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.05); pointer-events:none;';
slot.style.position = 'relative';
slot.appendChild(previewContainer);
}
let img = previewContainer.querySelector('img');
if (!img) {
img = document.createElement('img');
img.style.cssText = 'max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;';
previewContainer.appendChild(img);
}
img.src = src;
slot.classList.add('has-img');
}

function clearSlotPreview(n) {
const slot = document.getElementById(`slot-${n}`);
if (!slot) return;
const previewContainer = slot.querySelector('.slot-preview');
if (previewContainer) previewContainer.remove();
slot.classList.remove('has-img');
}

window.removeImg = function(e, n) {
e.stopPropagation();
const fileInput = document.getElementById(`file-${n}`);
if (fileInput) fileInput.value = '';
clearSlotPreview(n);
uploadedImages[n] = null;
selectedFiles[n] = null;
};

async function uploadImageToDrive(file) {
const compressed = await compressImage(file);
const base64 = await fileToBase64(compressed);
const mime = compressed.type || file.type;
console.log(`Subiendo: ${file.name} | Original: ${(file.size/1024).toFixed(0)}KB → Comprimido: ${(compressed.size/1024).toFixed(0)}KB`);
const formData = new URLSearchParams();
formData.append('action', 'uploadImageVendedor');
formData.append('data', base64);
formData.append('mimeType', mime);
formData.append('fileName', file.name.replace(/\.[^.]+$/, '') + (mime === 'image/webp' ? '.webp' : '.jpg'));
formData.append('vendorToken', vendorSession.token);
const res = await fetch(API_BASE, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: formData.toString()
});
const result = await res.json();
console.log(" Respuesta de uploadImageVendedor:", result);
if (!result.ok) throw new Error(result.error || 'Error al subir imagen');
console.log(" URL de imagen obtenida:", result.url);
return result.url || `https://drive.google.com/file/d/${result.id}/view`;
}

function fileToBase64(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result.split(',')[1]);
reader.onerror = reject;
reader.readAsDataURL(file);
});
}

window.submitProduct = async function() {
if (!vendorSession || !vendorSession.token) {
showTemporaryMessage(' Sesión no válida. Vuelve a iniciar sesión.', 'error');
return;
}
const editId = document.getElementById('edit-product-id')?.value;
if (!editId && (vendorSession.productosActuales || 0) >= (vendorSession.limiteProductos || 20)) {
const mensaje = vendorSession.plan === 'plus'
? `Llegaste al límite de ${vendorSession.limiteProductos} productos de tu plan Plus.`
: `Llegaste al límite de ${vendorSession.limiteProductos} productos del plan gratuito. Pide el plan Plus para subir hasta 200.`;
showTemporaryMessage(' ' + mensaje, 'error');
return;
}
const nombre = document.getElementById('pNombre')?.value.trim();
const precio = Number(document.getElementById('pPrecio')?.value);
const stock  = Number(document.getElementById('pStock')?.value);
if (!nombre || isNaN(precio) || precio < 0) {
showTemporaryMessage(' Nombre y precio son requeridos', 'error');
return;
}
showLoader('Subiendo imágenes...');
const btn = document.getElementById('submit-product-btn');
if (btn) btn.disabled = true;
try {
for (const n of [1, 2, 3]) {
const file = selectedFiles[n];
console.log(` Slot ${n}: archivo =`, file ? file.name : 'ninguno', '| uploadedImages previo =', uploadedImages[n]);
if (file && !uploadedImages[n]?.startsWith('http')) {
console.log(` Subiendo imagen ${n}...`);
uploadedImages[n] = await uploadImageToDrive(file);
console.log(` Imagen ${n} subida: ${uploadedImages[n]}`);
} else {
console.log(`⏭ Slot ${n} no requiere subida`);
}
}
console.log(" Estado final de uploadedImages:", uploadedImages);
const productData = {
Nombre: document.getElementById('pNombre')?.value.trim(),
Precio: Number(document.getElementById('pPrecio')?.value),
Stock: Number(document.getElementById('pStock')?.value),
Descripcion: document.getElementById('pDescripcion')?.value.trim() || '',
Talla: document.getElementById('pTalla')?.value.trim() || '',
Categoria: document.getElementById('pCategoria')?.value || '',
Badge: '',
Imagen1: uploadedImages[1] || '',
Imagen2: uploadedImages[2] || '',
Imagen3: uploadedImages[3] || '',
vendorToken: vendorSession.token
};
if (editId) productData.id = editId;
console.log(" Enviando producto a la API:", productData);
showLoader('Guardando...');
const res = await apiFetch(
editId
? { action: 'updateComunidad', ...productData }
: { action: 'createComunidad', ...productData }
);
console.log(" Respuesta del servidor:", res);
if (!res.ok) throw new Error(res.error || 'Error del servidor');
showTemporaryMessage(editId ? ' Producto actualizado' : ' Producto publicado', 'success');
cancelEdit();
loadMyProducts();
} catch (err) {
console.error("Error en submitProduct:", err);
if(window.ZRMonitor) ZRMonitor.report('ERROR','vendedor.js','submitProduct',err.message||String(err));
showTemporaryMessage(' ' + err.message, 'error');
} finally {
hideLoader();
if (btn) btn.disabled = false;
}
};

window.switchTab = function(tab) {
const productsTab = document.getElementById('tab-products');
const formTab = document.getElementById('tab-form');
if (productsTab) productsTab.style.display = tab === 'products' ? 'block' : 'none';
if (formTab) formTab.style.display = tab === 'form' ? 'block' : 'none';
document.querySelectorAll('.vendor-tab').forEach((el, i) => {
el.classList.toggle('active', (tab === 'products' && i === 0) || (tab === 'form' && i === 1));
});
document.querySelectorAll('#bottom-nav-vendor .bottom-nav-item[data-vendor-page]').forEach(el => {
el.classList.toggle('active', el.dataset.vendorPage === tab);
});
};

let stored = localStorage.getItem('vendor_session');
if (!stored) {
// Migración: sesiones antiguas que quedaron guardadas en sessionStorage
stored = sessionStorage.getItem('vendor_session');
if (stored) {
localStorage.setItem('vendor_session', stored);
sessionStorage.removeItem('vendor_session');
}
}
if (stored) {
try {
vendorSession = JSON.parse(stored);
showPanel();
} catch (_) {
localStorage.removeItem('vendor_session');
}
}

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', vendorLogin);

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', vendorLogout);

const passInput = document.getElementById('login-password');
if (passInput) passInput.addEventListener('keypress', e => { if (e.key === 'Enter') vendorLogin(); });

const submitBtn = document.getElementById('submit-product-btn');
if (submitBtn) {
submitBtn.addEventListener('click', window.submitProduct);
}

const cancelBtn = document.getElementById('cancel-edit-btn');
if (cancelBtn) {
cancelBtn.addEventListener('click', window.cancelEdit);
}
}

function initPendingVendors() {
return;
const STYLES = `
<style id="vp-styles">
#vendors-pending-section {
margin: 0 0 24px 0;
}
.vp-card {
background: white;
border-radius: 18px;
padding: 20px;
margin-bottom: 20px;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.vp-card-header {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
background: linear-gradient(135deg, #3b1f5f, #6a3fa5);
color: white;
border-radius: 12px;
padding: 14px 16px;
margin-bottom: 16px;
}
.vp-card-header h2 {
margin: 0;
font-size: 16px;
font-weight: 700;
}
.vp-refresh-btn {
background: rgba(255,255,255,0.2);
border: none;
color: white;
width: 32px;
height: 32px;
border-radius: 50%;
font-size: 16px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: background 0.2s;
flex-shrink: 0;
}
.vp-refresh-btn:hover { background: rgba(255,255,255,0.3); }
.vp-vendor-row {
display: flex;
align-items: center;
gap: 14px;
padding: 14px;
border-radius: 14px;
background: #f8f8fc;
margin-bottom: 10px;
flex-wrap: wrap;
border-left: 4px solid #3b1f5f;
}
.vp-vendor-avatar {
width: 48px;
height: 48px;
border-radius: 50%;
background: linear-gradient(135deg, #3b1f5f, #6a3fa5);
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px;
font-weight: 700;
flex-shrink: 0;
}
.vp-vendor-info { flex: 1; min-width: 0; }
.vp-vendor-name {
font-weight: 700;
font-size: 15px;
margin-bottom: 4px;
color: #1a1a2e;
}
.vp-vendor-meta {
display: flex;
gap: 12px;
flex-wrap: wrap;
font-size: 12px;
color: #666;
align-items: center;
}
.vp-badge-pendiente {
display: inline-block;
padding: 3px 10px;
border-radius: 20px;
font-size: 11px;
font-weight: 700;
background: #fff8e1;
color: #f57f17;
}
.vp-wa-link {
color: #25d366;
font-weight: 600;
text-decoration: none;
font-size: 12px;
}
.vp-actions {
display: flex;
gap: 8px;
flex-shrink: 0;
}
.vp-btn-approve {
padding: 8px 18px;
border: none;
border-radius: 20px;
background: #e8f5e9;
color: #2e7d32;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: background 0.2s;
}
.vp-btn-approve:hover { background: #c8e6c9; }
.vp-btn-reject {
padding: 8px 18px;
border: none;
border-radius: 20px;
background: #ffebee;
color: #c62828;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: background 0.2s;
}
.vp-btn-reject:hover { background: #ffcdd2; }
.vp-empty {
text-align: center;
padding: 20px;
color: #aaa;
font-size: 14px;
}
.vp-btn-confiable {
padding: 8px 14px;
border: 1.5px solid #f0a500;
border-radius: 20px;
background: transparent;
color: #f0a500;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: all 0.2s;
}
.vp-btn-confiable:hover { background: #fff8e1; }
.vp-btn-confiable.is-confiable {
background: #fff8e1;
color: #e65100;
border-color: #e65100;
}
.vp-badge-confiable {
display: inline-block;
padding: 2px 8px;
border-radius: 20px;
font-size: 11px;
font-weight: 700;
background: #fff8e1;
color: #e65100;
}
.vp-badge-count {
background: #ff4f81;
color: white;
border-radius: 20px;
padding: 2px 8px;
font-size: 11px;
font-weight: 700;
margin-left: 6px;
}
@media (max-width: 600px) {
.vp-vendor-row { flex-direction: column; align-items: flex-start; }
.vp-actions { width: 100%; justify-content: flex-end; }
}
</style>
`;
const SECTION_HTML = `
<div id="vendors-pending-section">
<div class="vp-card">
<div class="vp-card-header">
<h2>Vendedores pendientes de aprobación <span id="vp-count-badge" class="vp-badge-count" style="display:none"></span></h2>
<button class="vp-refresh-btn" id="vp-refresh-btn" title="Actualizar"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" aria-hidden="true"><use href="#ic-refresh"/></svg></button>
</div>
<div id="vp-vendors-list">
<div class="vp-empty">Cargando...</div>
</div>
</div>
</div>
`;
injectStyles('vp-styles', STYLES);
const notifContainer = document.getElementById('notifications');
if (notifContainer && !document.getElementById('vendors-pending-section')) {
notifContainer.insertAdjacentHTML('beforebegin', SECTION_HTML);
}
let currentVendors = [];
async function loadVendors() {
const list = document.getElementById('vp-vendors-list');
const badge = document.getElementById('vp-count-badge');
if (!list) return;
list.innerHTML = '<div class="vp-empty">Cargando...</div>';
try {
const token = getAdminToken();
if (!token) {
list.innerHTML = '<div class="vp-empty">Sin token de admin</div>';
return;
}
const data = await apiFetch({ action: 'vendedoresAdmin', token }, 'GET');
if (!data.ok) throw new Error(data.error || 'Error del servidor');
const vendors = data.vendors || [];
currentVendors = vendors;
const pending = vendors.filter(v => v.estado === 'pendiente');
if (badge) {
if (pending.length > 0) {
badge.textContent = pending.length;
badge.style.display = 'inline-block';
} else {
badge.style.display = 'none';
}
}
if (!vendors.length) {
list.innerHTML = '<div class="vp-empty">No hay vendedores registrados aún</div>';
return;
}
const toShow = [...pending, ...vendors.filter(v => v.estado !== 'pendiente')];
list.innerHTML = toShow.map(v => {
const inicial = (v.nombre || '?')[0].toUpperCase();
const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '';
const waUrl = `https://wa.me/52${v.telefono}?text=${encodeURIComponent('Hola ' + v.nombre + ', tu cuenta de vendedor en Z&R ha sido aprobada. Ya puedes ingresar en: znr.com/vendedor.html')}`;
const confiableBadge = v.confiable ? '<span class="vp-badge-confiable">Confiable</span>' : '';
return `
<div class="vp-vendor-row" id="vprow-${escapeHtml(v.uid)}">
<div class="vp-vendor-avatar">${inicial}</div>
<div class="vp-vendor-info">
<div class="vp-vendor-name">${escapeHtml(v.nombre)}</div>
<div class="vp-vendor-meta">
<span> ${escapeHtml(v.telefono)}</span>
<a class="vp-wa-link" href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>
${v.estado === 'pendiente'
? '<span class="vp-badge-pendiente">⏳ pendiente</span>'
: '<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e8f5e9;color:#2e7d32"> activo</span>'
}
${confiableBadge}
${fecha ? `<span> ${fecha}</span>` : ''}
</div>
</div>
<div class="vp-actions">
${v.estado === 'pendiente'
? `<button class="vp-btn-approve" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}" data-tel="${escapeHtml(v.telefono)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aprobar</button>`
: ''}
<button class="vp-btn-reject" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar
</button>
</div>
</div>
`;
}).join('');
document.querySelectorAll('.vp-btn-approve').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
const telefono = btn.dataset.tel;
await aprobarVendor(uid, nombre, telefono);
});
});
document.querySelectorAll('.vp-btn-reject').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
await rechazarVendor(uid, nombre);
});
});
document.querySelectorAll('.vp-btn-confiable').forEach(btn => {
btn.addEventListener('click', async (e) => {
const uid = btn.dataset.uid;
const nombre = btn.dataset.nombre;
const esConfiable = btn.dataset.confiable === 'true';
await toggleConfiableVendor(uid, nombre, esConfiable);
});
});
} catch (err) {
list.innerHTML = `<div class="vp-empty" style="color:#ef4444">Error: ${escapeHtml(err.message)}</div>`;
}
}
async function aprobarVendor(uid, nombre, telefono) {
const row = document.getElementById(`vprow-${uid}`);
if (row) row.style.opacity = '0.5';
try {
const res = await apiFetch({ action: 'aprobarVendedor', uid, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
const codigo = res.codigo;
const telefonoVendedor = res.telefono;
const mensaje = ` *¡Cuenta aprobada!* \n\nHola ${nombre}, tu cuenta de vendedor en Z&R Comunidad ha sido *aprobada*.\n\n*Tu contraseña temporal es:* ${codigo}\n\nPuedes cambiarla después de iniciar sesión.\n\n Accede aquí: znr.com/vendedor.html\n\n¡Bienvenido! `;
const waUrl = `https://wa.me/52${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
window.open(waUrl, '_blank');
row.remove();
} catch (err) {
if (row) row.style.opacity = '1';
showTemporaryMessage(' ' + err.message, 'error');
}
}
async function rechazarVendor(uid, nombre) {
const row = document.getElementById(`vprow-${uid}`);
if (row) row.style.opacity = '0.5';
try {
const res = await apiFetch({ action: 'rechazarVendedor', uid, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
showTemporaryMessage(` ${nombre} rechazado`, 'info');
if (row) {
row.style.transition = 'opacity 0.3s';
row.style.opacity = '0';
setTimeout(() => { row.remove(); updatePendingBadge(); }, 300);
}
} catch (err) {
if (row) row.style.opacity = '1';
showTemporaryMessage(' ' + err.message, 'error');
}
}
async function toggleConfiableVendor(uid, nombre, esConfiableActual) {
try {
const nuevoValor = !esConfiableActual;
const res = await apiFetch({ action: 'marcarVendedorConfiable', uid, confiable: nuevoValor, token: getAdminToken() });
if (!res.ok) throw new Error(res.error);
const msg = nuevoValor
? ` ${nombre} marcado como confiable. Sus próximos productos se publicarán directo.`
: ` ${nombre} ya no es confiable.`;
showTemporaryMessage(msg, 'success');
loadVendors();
} catch (err) {
showTemporaryMessage(' ' + err.message, 'error');
}
}
function updatePendingBadge() {
const remaining = document.querySelectorAll('[id^="vprow-"]').length;
const badge = document.getElementById('vp-count-badge');
if (!badge) return;
if (remaining > 0) {
badge.textContent = remaining;
badge.style.display = 'inline-block';
} else {
badge.style.display = 'none';
const list = document.getElementById('vp-vendors-list');
if (list && list.innerHTML.includes('pendientes')) {
list.innerHTML = '<div class="vp-empty">No hay vendedores pendientes de aprobación</div>';
}
}
}
const refreshBtn = document.getElementById('vp-refresh-btn');
if (refreshBtn) refreshBtn.addEventListener('click', loadVendors);
loadVendors();
}

document.addEventListener('DOMContentLoaded', () => {
initVendorPanel();
initPendingVendors();
});

// ──────────────────────────────────────────────
// Funciones expuestas globalmente (onclick en HTML)
// ──────────────────────────────────────────────

window.openSettingsModal  = function() { openSettingsModal(); };
window.closeSettingsModal = function() { closeSettingsModal(); };
window.guardarPerfil      = function() { guardarPerfil(); };
window.guardarPassword    = function() { guardarPassword(); };
window.solicitarPlanPlus  = function() { solicitarPlanPlus(); };

// ──────────────────────────────────────────────
// Funciones de perfil / configuración
// ──────────────────────────────────────────────

function getInitials(nombre) {
if (!nombre) return '?';
const words = nombre.trim().split(/\s+/);
if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function updateVendorAvatar() {
if (!vendorSession) return;
const btn = document.getElementById('vendor-avatar-btn');
const initEl = document.getElementById('vendor-avatar-initials');
const imgEl  = document.getElementById('vendor-avatar-img');
if (!btn || !initEl || !imgEl) return;

btn.style.display = 'flex';
const esPlus = vendorSession.plan === 'plus';
const logo   = vendorSession.logo;

if (esPlus && logo) {
imgEl.src = logo;
imgEl.style.display = 'block';
initEl.style.display = 'none';
} else {
imgEl.style.display = 'none';
initEl.style.display = 'flex';
initEl.textContent = getInitials(vendorSession.nombre);
}
}

function openSettingsModal() {
if (!vendorSession) return;
const modal = document.getElementById('settings-modal');
if (!modal) return;

document.getElementById('settings-nombre').value      = vendorSession.nombre || '';
document.getElementById('settings-descripcion').value = vendorSession.descripcion || '';
document.getElementById('settings-whatsapp').value    = vendorSession.whatsapp || '';
const catSel = document.getElementById('settings-categoria');
if (catSel) catSel.value = vendorSession.categoria || '';

document.getElementById('settings-pwd-old').value     = '';
document.getElementById('settings-pwd-new').value     = '';
document.getElementById('settings-pwd-confirm').value = '';
document.getElementById('settings-perfil-msg').textContent = '';
document.getElementById('settings-pwd-msg').textContent    = '';

const esPlus = vendorSession.plan === 'plus';

const placeholderEl = document.getElementById('settings-avatar-placeholder');
const photoEl       = document.getElementById('settings-avatar-photo');
const changeBtn     = document.getElementById('settings-change-photo-btn');

if (esPlus && vendorSession.logo) {
photoEl.src = vendorSession.logo;
photoEl.style.display = 'block';
placeholderEl.style.display = 'none';
} else {
placeholderEl.style.display = 'flex';
placeholderEl.textContent   = getInitials(vendorSession.nombre);
photoEl.style.display       = 'none';
}
if (changeBtn) changeBtn.style.display = esPlus ? 'flex' : 'none';

document.getElementById('settings-header-name').textContent = vendorSession.nombre || '';
const planEl = document.getElementById('settings-header-plan');
if (esPlus) {
const vence = vendorSession.planVence ? new Date(vendorSession.planVence).toLocaleDateString('es-MX', {day:'2-digit',month:'short',year:'numeric'}) : '—';
planEl.innerHTML = '<span style="background:#a855f7;color:#fff;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700;">⭐ Plus</span> <span style="color:#aaa;font-size:.75rem;">· vence ' + vence + '</span>';
} else {
planEl.innerHTML = '<span style="background:#e5e7eb;color:#555;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;">Free</span>';
}

const planInfoEl = document.getElementById('settings-plan-info');
if (planInfoEl) {
if (esPlus) {
const vence = vendorSession.planVence ? new Date(vendorSession.planVence).toLocaleDateString('es-MX', {day:'2-digit',month:'long',year:'numeric'}) : '—';
planInfoEl.innerHTML = '<div style="background:#f5f3ff;border-radius:10px;padding:12px 14px;">' +
'<p style="margin:0;font-weight:700;color:#7c3aed;">⭐ Plan Plus activo</p>' +
'<p style="margin:4px 0 0;color:#6b7280;font-size:.82rem;">Vence el ' + vence + '</p></div>';
} else {
planInfoEl.innerHTML = '<div style="background:#f9f9f9;border-radius:10px;padding:12px 14px;">' +
'<p style="margin:0;color:#374151;font-size:.85rem;">Estás en el plan <strong>Free</strong>.</p>' +
'<p style="margin:4px 0 0;font-size:.82rem;color:#6b7280;">Con Plus obtienes foto de perfil, destacado, logo y aprobación instantánea.</p>' +
'<div id="settings-plus-notif" style="margin-top:10px;"></div></div>';
setTimeout(() => {
const area = document.getElementById('settings-plus-notif');
if (area) {
area.innerHTML = document.getElementById('vendor-plus-notif-area')?.innerHTML || '';
}
}, 50);
}
}

document.getElementById('si-productos').textContent = vendorSession.productosActuales ?? '—';
document.getElementById('si-limite').textContent    = vendorSession.limiteProductos ?? '—';
document.getElementById('si-uid').textContent       = vendorSession.uid || '—';
const fechaEl = document.getElementById('si-fecha');
if (fechaEl) {
fechaEl.textContent = vendorSession.fechaRegistro
? new Date(vendorSession.fechaRegistro).toLocaleDateString('es-MX', {day:'2-digit',month:'short',year:'numeric'})
: '—';
}

modal.style.display = 'flex';
document.body.style.overflow = 'hidden';

const photoInput = document.getElementById('settings-photo-input');
if (photoInput && !photoInput._wiredSettings) {
photoInput._wiredSettings = true;
photoInput.addEventListener('change', async (e) => {
const file = e.target.files && e.target.files[0];
if (!file) return;
showLoader('Subiendo foto...');
try {
await uploadVendorLogo(file);
showTemporaryMessage('✅ Foto actualizada', 'success');
updateVendorAvatar();
openSettingsModal();
} catch(err) {
showTemporaryMessage('⚠️ ' + err.message, 'error');
} finally {
hideLoader();
photoInput.value = '';
}
});
}
}

function closeSettingsModal() {
const modal = document.getElementById('settings-modal');
if (modal) modal.style.display = 'none';
document.body.style.overflow = '';
}

document.getElementById('settings-modal')?.addEventListener('click', function(e) {
if (e.target === this) closeSettingsModal();
});

async function guardarPerfil() {
  const btn = document.getElementById('btn-guardar-perfil');
  const msg = document.getElementById('settings-perfil-msg');
  if (!vendorSession) return;

  const nombre     = document.getElementById('settings-nombre').value.trim();
  const descripcion = document.getElementById('settings-descripcion').value.trim();
  const whatsapp   = document.getElementById('settings-whatsapp').value.trim();
  const categoria  = document.getElementById('settings-categoria').value;

  // 🔽 NUEVO: leer redes sociales
  const facebook  = document.getElementById('settings-facebook').value.trim();
  const twitter   = document.getElementById('settings-twitter').value.trim();
  const instagram = document.getElementById('settings-instagram').value.trim();
  const tiktok    = document.getElementById('settings-tiktok').value.trim();

  if (!nombre || nombre.length < 2) {
    msg.style.color = '#dc2626'; msg.textContent = 'El nombre debe tener al menos 2 caracteres.';
    return;
  }

  btn.disabled = true; btn.textContent = 'Guardando...';
  msg.textContent = '';

  try {
    const res = await apiCall({
      action: 'actualizarPerfilVendedor',
      vendorToken: vendorSession.token,
      nombre,
      descripcion,
      whatsapp,
      categoria,
      facebook,    // ← enviar
      twitter,     // ← enviar
      instagram,   // ← enviar
      tiktok       // ← enviar
    });

    if (!res.ok) {
      msg.style.color = '#dc2626';
      msg.textContent = res.error || 'Error al guardar.';
      return;
    }

    // Actualizar la sesión local
    vendorSession.nombre      = nombre;
    vendorSession.descripcion = descripcion;
    vendorSession.whatsapp    = whatsapp;
    vendorSession.categoria   = categoria;
    vendorSession.facebook    = facebook;   // ← guardar en sesión
    vendorSession.twitter     = twitter;
    vendorSession.instagram   = instagram;
    vendorSession.tiktok      = tiktok;

    try { localStorage.setItem('vendor_session', JSON.stringify(vendorSession)); } catch(e) {}

    // Actualizar UI
    const nameHeader = document.getElementById('vendor-name-header');
    if (nameHeader) nameHeader.textContent = nombre;
    updateVendorAvatar();
    document.getElementById('settings-header-name').textContent = nombre;

    msg.style.color = '#16a34a';
    msg.textContent = '✅ Cambios guardados';

  } catch(e) {
    msg.style.color = '#dc2626';
    msg.textContent = 'Error de red.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
}
async function guardarPassword() {
const btn  = document.getElementById('btn-guardar-pwd');
const msg  = document.getElementById('settings-pwd-msg');
const oldP = document.getElementById('settings-pwd-old').value;
const newP = document.getElementById('settings-pwd-new').value;
const conf = document.getElementById('settings-pwd-confirm').value;

msg.textContent = '';
if (!oldP || !newP || !conf) { msg.style.color = '#dc2626'; msg.textContent = 'Completa todos los campos.'; return; }
if (newP.length < 6)         { msg.style.color = '#dc2626'; msg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; return; }
if (newP !== conf)           { msg.style.color = '#dc2626'; msg.textContent = 'Las contraseñas no coinciden.'; return; }

btn.disabled = true; btn.textContent = 'Cambiando...';
try {
const res = await apiCall({ action: 'cambiarPasswordVendedor', vendorToken: vendorSession.token, vendorUid: vendorSession.uid, oldPassword: oldP, newPassword: newP });
if (!res.ok) { msg.style.color = '#dc2626'; msg.textContent = res.error || 'Error al cambiar contraseña.'; return; }
msg.style.color = '#16a34a'; msg.textContent = '✅ Contraseña actualizada';
document.getElementById('settings-pwd-old').value = '';
document.getElementById('settings-pwd-new').value = '';
document.getElementById('settings-pwd-confirm').value = '';
} catch(e) {
msg.style.color = '#dc2626'; msg.textContent = 'Error de red.';
} finally {
btn.disabled = false; btn.textContent = 'Cambiar contraseña';
}
}

async function loadPlusSolicitudVendedor() {
const area = document.getElementById('vendor-plus-notif-area');
if (!area || !vendorSession) return;

try {
const res = await apiCall({ action: 'getPlusSolicitudVendedor', vendorToken: vendorSession.token });
const sol = res.solicitud;

if (!sol) {
area.innerHTML = `<button onclick="solicitarPlanPlus()" id="btn-solicitar-plus"
style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;border:none;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
⭐ Solicitar plan Plus
</button>`;
return;
}

if (sol.estado === 'pending') {
area.innerHTML = `<div style="background:#f3e8ff;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#7c3aed;font-weight:600;">
⏳ Solicitud enviada — en espera de aprobación del administrador.
</div>`;
return;
}

if (sol.estado === 'approved') {
let mpBtn = sol.mp_link
? `<a href="${sol.mp_link}" target="_blank" rel="noopener"
style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:8px 16px;border-radius:999px;background:#00b1ea;color:#fff;font-size:12.5px;font-weight:700;text-decoration:none;">
💳 Pagar $49 con Mercado Pago
</a>` : '';
area.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px 14px;">
<p style="margin:0 0 4px;color:#16a34a;font-weight:700;font-size:13px;">✅ ¡Plan Plus aprobado!</p>
<p style="margin:0 0 8px;color:#374151;font-size:12px;">Realiza tu pago para activarlo. El admin lo confirmará.</p>
<p style="margin:0 0 2px;color:#555;font-size:12px;">Clabe interbancaria:</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:700;letter-spacing:.05em;color:#111;font-family:monospace;">${sol.clabe}</p>
<p style="margin:0;color:#888;font-size:11px;">Importe: $49 MXN · ${sol.dias} días</p>
${mpBtn}
</div>`;
return;
}

if (sol.estado === 'denied') {
const motivo = sol.motivo ? `<p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Motivo: ${escapeHtml(sol.motivo)}</p>` : '';
area.innerHTML = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:12px 14px;">
<p style="margin:0;color:#dc2626;font-weight:700;font-size:13px;">❌ Solicitud rechazada</p>
${motivo}
<button onclick="solicitarPlanPlus()" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;border:none;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
Volver a solicitar
</button>
</div>`;
}
} catch(e) {
console.warn('loadPlusSolicitudVendedor:', e);
}
}

async function solicitarPlanPlus() {
const btn = document.getElementById('btn-solicitar-plus');
if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
try {
const res = await apiCall({ action: 'solicitarPlanPlus', vendorToken: vendorSession.token });
if (!res.ok) {
showTemporaryMessage('⚠️ ' + (res.error || 'Error al enviar'), 'error');
if (btn) { btn.disabled = false; btn.innerHTML = '⭐ Solicitar plan Plus'; }
return;
}
showTemporaryMessage('✅ Solicitud enviada', 'success');
loadPlusSolicitudVendedor();
} catch(e) {
showTemporaryMessage('⚠️ Error de red', 'error');
if (btn) { btn.disabled = false; btn.innerHTML = '⭐ Solicitar plan Plus'; }
}
}

// Función auxiliar apiCall (diferente a apiFetch para compatibilidad)
async function apiCall(data) {
const params = new URLSearchParams();
Object.entries(data).forEach(([k, v]) => {
if (v !== undefined && v !== null) params.append(k, v);
});
const res = await fetch(API_BASE, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: params.toString()
});
return res.json();
}

})();
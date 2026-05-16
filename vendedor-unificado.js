(function() {
  'use strict';


  const API_BASE = window.API_URL || "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";

  function getAdminToken() {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || '';
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

  // Función para inyectar estilos solo una vez
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

    let vendorSession = null;
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
}

async function registerVendor() {
  const nombre = document.getElementById('reg-nombre')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim().replace(/\D/g, '');
  if (!nombre || phone.length !== 10) {
    showTemporaryMessage('⚠️ Completa todos los campos correctamente', 'error');
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
    showTemporaryMessage('✅ Registro exitoso. Espera a que el administrador active tu cuenta.', 'success');
    // Limpiar campos
    document.getElementById('reg-nombre').value = '';
    document.getElementById('reg-phone').value = '';
    const loginTab = document.querySelector('.login-tab[data-tab="login"]');
    if (loginTab) loginTab.click();
  } catch (err) {
    showTemporaryMessage('❌ ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Registrarme';
    }
  }
}
const registerBtn = document.getElementById('register-btn');
if (registerBtn) registerBtn.addEventListener('click', registerVendor);















    // ------- Autenticación -------
    async function vendorLogin() {
      const phone    = document.getElementById('login-phone')?.value.trim().replace(/\D/g, '');
      const password = document.getElementById('login-password')?.value;
      if (!phone || phone.length !== 10 || !password) {
        showTemporaryMessage('Ingresa teléfono (10 dígitos) y contraseña', 'error');
        return;
      }
      showLoader('Verificando...');
      try {
        const res = await apiFetch({ action: 'loginVendedor', telefono: phone, password });
        if (!res.ok) throw new Error(res.error || 'Credenciales incorrectas');
        vendorSession = { token: res.token, uid: res.uid, nombre: res.nombre };
        sessionStorage.setItem('vendor_session', JSON.stringify(vendorSession));
        showPanel();
      } catch (err) {
        showTemporaryMessage('❌ ' + err.message, 'error');
      } finally {
        hideLoader();
      }
    }

    function vendorLogout() {
      sessionStorage.removeItem('vendor_session');
      vendorSession = null;
      const loginDiv = document.getElementById('login-section');
      const panelDiv = document.getElementById('panel-section');
      if (loginDiv) loginDiv.style.display = 'block';
      if (panelDiv) panelDiv.style.display = 'none';
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.style.display = 'none';
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

  // Botón de compartir
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
          window.showTemporaryMessage?.('✅ Enlace copiado (URL completa)', 'success');
        })
        .catch(() => {
          alert('No se pudo copiar. Comparte este enlace:\n' + shareUrl);
        });
    });
  }

  // Botón cambiar contraseña
  const header = document.querySelector('#tab-products .vendor-section h2');
  if (header && !document.getElementById('change-pwd-btn')) {
    const btn = document.createElement('button');
    btn.id = 'change-pwd-btn';
    btn.textContent = '🔐 Cambiar contraseña';
    btn.className = 'btn-secondary';
    btn.style.marginLeft = '15px';
    btn.style.fontSize = '12px';
    btn.addEventListener('click', showChangePasswordModal);
    header.appendChild(btn);
  }


  loadMyProducts();
}




function showChangePasswordModal() {
  if (!vendorSession || !vendorSession.token) {
    showTemporaryMessage('No hay sesión activa', 'error');
    return;
  }

  showCustomPrompt({
    title: 'Contraseña actual',
    message: 'Ingresa tu contraseña actual:',
    icon: '🔒',
    defaultValue: '',
    confirmText: 'Siguiente',
    cancelText: 'Cancelar',
    onConfirm: async (oldPwd) => {
      if (!oldPwd) return;
      showCustomPrompt({
        title: 'Nueva contraseña',
        message: 'Escribe tu nueva contraseña (mínimo 6 caracteres):',
        icon: '🔑',
        defaultValue: '',
        confirmText: 'Guardar',
        cancelText: 'Cancelar',
        onConfirm: async (newPwd) => {
          if (!newPwd || newPwd.length < 6) {
            showTemporaryMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
          }
          try {
            showLoader('Actualizando...');
           const res = await apiFetch({
  action: 'cambiarPasswordVendedor',
  vendorUid: vendorSession.uid,   // ← clave
  oldPassword: oldPwd,
  newPassword: newPwd
});
            if (!res.ok) throw new Error(res.error);
            showTemporaryMessage('✅ Contraseña cambiada correctamente', 'success');
          } catch (err) {
            showTemporaryMessage('❌ ' + err.message, 'error');
          } finally {
            hideLoader();
          }
        }
      });
    }
  });
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
        if (myProducts.length === 0) {
          container.innerHTML = `<p style="color:#aaa;text-align:center">Aún no has publicado productos.<br>
            <button class="btn-secondary" onclick="switchTab('form')" style="margin-top:12px">➕ Publicar ahora</button></p>`;
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
              <span class="estado-badge estado-${escapeHtml(p.estado)}">${escapeHtml(p.estado)}</span>
            </div>
            <div class="actions">
              <button class="btn-secondary" onclick="editProduct(${p.id})">✏️</button>
              <button class="btn-secondary btn-danger" onclick="deleteMyProduct(${p.id})">🗑</button>
            </div>
          </div>`;
        }).join('');
        // Inyectar función de modal si no existe
        if (!window._vendorImgModalReady) {
          window._vendorImgModalReady = true;
          const mo = document.createElement('div');
          mo.id = 'vendor-img-modal';
          mo.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
          mo.innerHTML = `
            <button onclick="document.getElementById('vendor-img-modal').style.display='none'"
              style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;">✕</button>
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

    // ------- Edición y borrado -------
    window.editProduct = function(id) {
      const p = (window._vendorProducts || []).find(x => String(x.id) === String(id));
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
      document.getElementById('form-title').textContent = '✏️ Editar producto';
      document.getElementById('cancel-edit-btn').style.display = 'block';
      document.getElementById('submit-product-btn').textContent = '💾 Guardar cambios';
      switchTab('form');
    };

    window.deleteMyProduct = async function(id) {
      const confirmed = await new Promise(resolve => {
        if (typeof showCustomConfirm === 'function') {
          showCustomConfirm({
            title: '🗑 Eliminar producto',
            message: '¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.',
            icon: '⚠️', confirmText: 'Eliminar', cancelText: 'Cancelar',
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
        showTemporaryMessage('🗑 Producto eliminado', 'info');
        loadMyProducts();
      } catch (err) {
        showTemporaryMessage('❌ ' + err.message, 'error');
      } finally {
        hideLoader();
      }
    };

    function cancelEdit() {
      document.getElementById('edit-product-id').value = '';
      document.getElementById('form-title').textContent = '➕ Publicar producto';
      document.getElementById('cancel-edit-btn').style.display = 'none';
      document.getElementById('submit-product-btn').textContent = '💾 Publicar producto';
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

    // ------- Subida de imágenes -------
    window.triggerUpload = function(n) {
      document.getElementById(`file-${n}`)?.click();
    };



  window.handleFileSelect = function(n, input) {
  const file = input.files[0];
  console.log(`🖱️ Archivo seleccionado para slot ${n}:`, file ? file.name : 'ninguno');
  if (!file) return;
  
  // Guardar el archivo en la variable global
  selectedFiles[n] = file;
  
  const reader = new FileReader();
  reader.onload = e => {
    setSlotPreview(n, e.target.result);
    uploadedImages[n] = null; // marca pendiente de subir
    console.log(`👁️ Vista previa actualizada para slot ${n}`);
  };
  reader.readAsDataURL(file);
};





    function setSlotPreview(n, src) {
  const slot = document.getElementById(`slot-${n}`);
  if (!slot) return;
  
  // Buscar o crear contenedor de vista previa
  let previewContainer = slot.querySelector('.slot-preview');
  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.className = 'slot-preview';
    previewContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.05); pointer-events:none;';
    slot.style.position = 'relative';
    slot.appendChild(previewContainer);
  }
  
  // Crear o actualizar imagen
  let img = previewContainer.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    img.style.cssText = 'max-width:90%; max-height:90%; object-fit:contain; border-radius:8px;';
    previewContainer.appendChild(img);
  }
  img.src = src;
  
  // Marcar slot como con imagen
  slot.classList.add('has-img');
}

function clearSlotPreview(n) {
  const slot = document.getElementById(`slot-${n}`);
  if (!slot) return;
  const previewContainer = slot.querySelector('.slot-preview');
  if (previewContainer) previewContainer.remove();
  slot.classList.remove('has-img');
  // No eliminar el input, solo la vista previa
}

window.removeImg = function(e, n) {
  e.stopPropagation();
  const fileInput = document.getElementById(`file-${n}`);
  if (fileInput) fileInput.value = '';
  clearSlotPreview(n);
  uploadedImages[n] = null;
  selectedFiles[n] = null;   // Limpiar también el archivo guardado
};



    async function uploadImageToDrive(file) {
  const base64 = await fileToBase64(file);
  console.log(`📤 Subiendo archivo: ${file.name}, tamaño: ${file.size} bytes`);
  
  const formData = new URLSearchParams();
  formData.append('action', 'uploadImageVendedor');
  formData.append('data', base64);
  formData.append('mimeType', file.type);
  formData.append('fileName', file.name);
  formData.append('vendorToken', vendorSession.token);
  
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
  const result = await res.json();
  console.log("📥 Respuesta de uploadImageVendedor:", result);
  if (!result.ok) throw new Error(result.error || 'Error al subir imagen');
  console.log("✅ URL de imagen obtenida:", result.url);
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
  // Validación de sesión
  if (!vendorSession || !vendorSession.token) {
    showTemporaryMessage('❌ Sesión no válida. Vuelve a iniciar sesión.', 'error');
    return;
  }

  const nombre = document.getElementById('pNombre')?.value.trim();
  const precio = Number(document.getElementById('pPrecio')?.value);
  const stock  = Number(document.getElementById('pStock')?.value);
  if (!nombre || isNaN(precio) || precio < 0) {
    showTemporaryMessage('⚠️ Nombre y precio son requeridos', 'error');
    return;
  }

  showLoader('Subiendo imágenes...');
  const btn = document.getElementById('submit-product-btn');
  if (btn) btn.disabled = true;

  try {
    for (const n of [1, 2, 3]) {
  const file = selectedFiles[n];   // Usar la variable global en lugar de fileInput.files[0]
  console.log(`🔍 Slot ${n}: archivo =`, file ? file.name : 'ninguno', '| uploadedImages previo =', uploadedImages[n]);
  if (file && !uploadedImages[n]?.startsWith('http')) {
    console.log(`⬆️ Subiendo imagen ${n}...`);
    uploadedImages[n] = await uploadImageToDrive(file);
    console.log(`✅ Imagen ${n} subida: ${uploadedImages[n]}`);
  } else {
    console.log(`⏭️ Slot ${n} no requiere subida`);
  }
}

    // Verificar estado final de las imágenes
    console.log("📸 Estado final de uploadedImages:", uploadedImages);

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

    const editId = document.getElementById('edit-product-id')?.value;
    if (editId) productData.id = editId;

    console.log("📦 Enviando producto a la API:", productData);

    showLoader('Guardando...');
    const res = await apiFetch(
      editId
        ? { action: 'updateComunidad', ...productData }
        : { action: 'createComunidad', ...productData }
    );

    console.log("📨 Respuesta del servidor:", res);

    if (!res.ok) throw new Error(res.error || 'Error del servidor');

    showTemporaryMessage(editId ? '✅ Producto actualizado' : '✅ Producto publicado', 'success');
    cancelEdit();
    loadMyProducts();
  } catch (err) {
    console.error("❌ Error en submitProduct:", err);
    showTemporaryMessage('❌ ' + err.message, 'error');
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
    };


    const stored = sessionStorage.getItem('vendor_session');
    if (stored) {
      vendorSession = JSON.parse(stored);
      showPanel();
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
    return; // Manejado por admin.js

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
            <h2>🏪 Vendedores pendientes de aprobación <span id="vp-count-badge" class="vp-badge-count" style="display:none"></span></h2>
            <button class="vp-refresh-btn" id="vp-refresh-btn" title="Actualizar">⟳</button>
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
          list.innerHTML = '<div class="vp-empty">⚠️ Sin token de admin</div>';
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
          list.innerHTML = '<div class="vp-empty">✅ No hay vendedores registrados aún</div>';
          return;
        }
        const toShow = [...pending, ...vendors.filter(v => v.estado !== 'pendiente')];
        list.innerHTML = toShow.map(v => {
          const inicial = (v.nombre || '?')[0].toUpperCase();
          const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '';
          const waUrl = `https://wa.me/52${v.telefono}?text=${encodeURIComponent('Hola ' + v.nombre + ', tu cuenta de vendedor en Z&R ha sido aprobada. Ya puedes ingresar en: znr.com/vendedor.html')}`;
          const confiableBadge = v.confiable ? '<span class="vp-badge-confiable">⭐ Confiable</span>' : '';
          return `
            <div class="vp-vendor-row" id="vprow-${escapeHtml(v.uid)}">
              <div class="vp-vendor-avatar">${inicial}</div>
              <div class="vp-vendor-info">
                <div class="vp-vendor-name">${escapeHtml(v.nombre)}</div>
                <div class="vp-vendor-meta">
                  <span>📱 ${escapeHtml(v.telefono)}</span>
                  <a class="vp-wa-link" href="${waUrl}" target="_blank" rel="noopener">💬 WhatsApp</a>
                  ${v.estado === 'pendiente'
                    ? '<span class="vp-badge-pendiente">⏳ pendiente</span>'
                    : '<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#e8f5e9;color:#2e7d32">✅ activo</span>'
                  }
                  ${confiableBadge}
                  ${fecha ? `<span>📅 ${fecha}</span>` : ''}
                </div>
              </div>
              <div class="vp-actions">
                ${v.estado === 'pendiente'
                  ? `<button class="vp-btn-approve" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}" data-tel="${escapeHtml(v.telefono)}">✅ Aprobar</button>`
                  : ''}
                <button class="vp-btn-reject" data-uid="${escapeHtml(v.uid)}" data-nombre="${escapeHtml(v.nombre)}">
                  ❌ Rechazar
                </button>
              </div>
            </div>
          `;
        }).join('');

        // Asignar eventos después de inyectar HTML
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
    const mensaje = `🎉 *¡Cuenta aprobada!* 🎉\n\nHola ${nombre}, tu cuenta de vendedor en Z&R Comunidad ha sido *aprobada*.\n\n*Tu contraseña temporal es:* ${codigo}\n\nPuedes cambiarla después de iniciar sesión.\n\n👉 Accede aquí: znr.com/vendedor.html\n\n¡Bienvenido! 🚀`;
    const waUrl = `https://wa.me/52${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
    window.open(waUrl, '_blank');
    row.remove();
  } catch (err) {
    if (row) row.style.opacity = '1';
    showTemporaryMessage('❌ ' + err.message, 'error');
  }
}



    async function rechazarVendor(uid, nombre) {
      const row = document.getElementById(`vprow-${uid}`);
      if (row) row.style.opacity = '0.5';
      try {
        const res = await apiFetch({ action: 'rechazarVendedor', uid, token: getAdminToken() });
        if (!res.ok) throw new Error(res.error);
        showTemporaryMessage(`❌ ${nombre} rechazado`, 'info');
        if (row) {
          row.style.transition = 'opacity 0.3s';
          row.style.opacity = '0';
          setTimeout(() => { row.remove(); updatePendingBadge(); }, 300);
        }
      } catch (err) {
        if (row) row.style.opacity = '1';
        showTemporaryMessage('❌ ' + err.message, 'error');
      }
    }

    async function toggleConfiableVendor(uid, nombre, esConfiableActual) {
      try {
        const nuevoValor = !esConfiableActual;
        const res = await apiFetch({ action: 'marcarVendedorConfiable', uid, confiable: nuevoValor, token: getAdminToken() });
        if (!res.ok) throw new Error(res.error);
        const msg = nuevoValor
          ? `⭐ ${nombre} marcado como confiable. Sus próximos productos se publicarán directo.`
          : `☆ ${nombre} ya no es confiable.`;
        showTemporaryMessage(msg, 'success');
        loadVendors(); // refrescar
      } catch (err) {
        showTemporaryMessage('❌ ' + err.message, 'error');
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
          list.innerHTML = '<div class="vp-empty">✅ No hay vendedores pendientes de aprobación</div>';
        }
      }
    }

    const refreshBtn = document.getElementById('vp-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadVendors);
    loadVendors();
  }

  // --------------------------------------------------------------------------
  // 4.  Inicialización según la página
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initVendorPanel();      // para vendedor.html
    initPendingVendors();   // para notificaciones.html (si existe #notifications)
  });

})();
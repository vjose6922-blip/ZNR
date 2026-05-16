(function() {
  'use strict';

  // ========== Verificación y respaldo de funciones globales ==========
  if (typeof window.optimizeDriveUrl !== 'function') {
    window.optimizeDriveUrl = function(url, size) { return url; };
    console.warn('⚠️ optimizeDriveUrl no definida, usando identidad');
  }
  if (typeof window.formatCurrency !== 'function') {
    window.formatCurrency = function(value) { return '$' + Number(value).toLocaleString(); };
    console.warn('⚠️ formatCurrency no definida, usando función simple');
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
    console.warn('⚠️ escapeHtml no definida, usando función simple');
  }
  if (typeof window.addToCart !== 'function') {
    window.addToCart = function(product) { console.warn('addToCart no definida', product); };
    console.warn('⚠️ addToCart no definida');
  }
  if (typeof window.openImageModal !== 'function') {
    window.openImageModal = function(url, id, images) { console.warn('openImageModal no definida', url); };
    console.warn('⚠️ openImageModal no definida');
  }
  if (typeof window.showTemporaryMessage !== 'function') {
    window.showTemporaryMessage = function(msg, type) { console.log(msg); };
    console.warn('⚠️ showTemporaryMessage no definida');
  }

  // ========== Constantes y variables ==========
  const PAGE_SIZE = 15;
  let allCommunityProducts = [];
  let filteredProducts = [];
  let currentPage = 1;
  let isLoading = false;
  let gridContainer, catSelect, vendorSelect, paginationDiv;
  let debounceTimer = null;

  // ========== Modo Inspector ==========
  let inspectorMode = false;

  async function initInspectorMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('inspector') !== '1') return;

    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || '';
    if (!token) {
      console.log('🔒 Modo inspector: sin token de admin, acceso denegado');
      return;
    }

    try {
      const api = window.API_URL || '';
      const res = await fetch(`${api}?action=verificarAdmin&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.ok === true) {
        inspectorMode = true;
        console.log('🛡️ Modo inspector activado');
        // Añadir banner visible
        const banner = document.createElement('div');
        banner.id = 'inspector-banner';
        banner.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
          background: linear-gradient(90deg, #3b1f5f, #7c3aed);
          color: white; text-align: center; padding: 8px 16px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        banner.innerHTML = '🛡️ MODO INSPECTOR ADMIN — Puedes eliminar cualquier producto';
        document.body.prepend(banner);
        // Compensar el banner en el header
        const header = document.querySelector('.app-header');
        if (header) header.style.marginTop = '38px';
      } else {
        console.warn('🔒 Token de admin inválido, modo inspector desactivado');
      }
    } catch (err) {
      console.error('Error verificando admin:', err);
    }
  }

  // ========== Funciones para filtros desde URL ==========
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
    // Preservar parámetro inspector si está activo
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

  // ========== Carga de productos ==========
  async function loadCommunityProducts() {
    if (!window.API_URL) {
      console.error('API_URL no definida');
      if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">❌ Error de configuración. Recarga la página.</div>';
      return;
    }
    if (isLoading) return;
    isLoading = true;

    if (typeof window.showLoader === 'function') window.showLoader('Cargando comunidad...');
    if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;">🔄 Cargando productos de la comunidad...</div>';

    try {
      const url = `${window.API_URL}?action=listarComunidad`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al cargar');

      allCommunityProducts = data.products || [];
      allCommunityProducts = allCommunityProducts.filter(p => p.estado === 'aprobado');
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
      if (gridContainer) {
        gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">
          ❌ Error al cargar productos de la comunidad.<br>
          <button onclick="location.reload()" style="margin-top:12px; padding:8px 20px; border-radius:30px; border:none; background:#ff4f81; color:white; cursor:pointer;">Reintentar</button>
        </div>`;
      }
    } finally {
      isLoading = false;
      if (typeof window.hideLoader === 'function') window.hideLoader();
    }
  }

  // ========== Llenar selects ==========
  function populateFilters() {
    if (catSelect) {
      const categories = new Set();
      allCommunityProducts.forEach(p => { if (p.categoria) categories.add(safeString(p.categoria)); });
      const currentVal = catSelect.value;
      catSelect.innerHTML = '<option value="">📁 Todas las categorías</option>';
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
      vendorSelect.innerHTML = '<option value="">🏪 Todos los vendedores</option>';
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

  // ========== Aplicar filtros ==========
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

  // ========== Renderizar productos ==========
  function renderProducts() {
    if (!gridContainer) return;
    try {
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageProducts = filteredProducts.slice(start, start + PAGE_SIZE);

      if (pageProducts.length === 0) {
        gridContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">
          😕 No hay productos que coincidan con los filtros.
        </div>`;
        renderPagination();
        return;
      }

      gridContainer.innerHTML = '';
      pageProducts.forEach(product => {
        const card = createCommunityCard(product);
        if (card) gridContainer.appendChild(card);
      });

      renderPagination();
      initLazyImages();
    } catch (err) {
      console.error('Error en renderProducts:', err);
      gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:red;">Error al mostrar productos. Revisa la consola.</div>';
    }
  }

  // ========== Eliminar producto (inspector) ==========
  async function deleteProductInspector(productId, productName, cardElement) {
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || '';
    if (!token) {
      window.showTemporaryMessage('❌ Sin sesión de admin', 'error');
      return;
    }

    showCustomConfirm({
      title: '🗑️ Eliminar producto',
      message: `¿Eliminar "${productName}" de la comunidad? Esta acción no se puede deshacer.`,
      icon: '⚠️',
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

          // Remover del DOM con animación
          cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
          cardElement.style.opacity = '0';
          cardElement.style.transform = 'scale(0.9)';
          setTimeout(() => cardElement.remove(), 320);

          // Remover del array local
          allCommunityProducts = allCommunityProducts.filter(p => String(p.id) !== String(productId));
          filteredProducts = filteredProducts.filter(p => String(p.id) !== String(productId));

          window.showTemporaryMessage('✅ Producto eliminado de la comunidad', 'success');
        } catch (err) {
          console.error('Error eliminando producto:', err);
          window.showTemporaryMessage('❌ Error al eliminar: ' + err.message, 'error');
        } finally {
          if (typeof window.hideLoader === 'function') window.hideLoader();
        }
      }
    });
  }

  // ========== Reportar producto ==========
  function showReportDialog(product) {
    // Crear modal de reporte personalizado
    const modal = document.createElement('div');
    modal.className = 'custom-alert-modal';
    modal.style.zIndex = '100000';
    modal.innerHTML = `
      <div class="custom-alert-content" style="max-width:380px; width:90%;">
        <div class="custom-alert-header">
          <span class="custom-alert-icon">🚩</span>
          <h3>Reportar producto</h3>
        </div>
        <div class="custom-alert-body">
          <p style="font-weight:600; margin-bottom:12px; color:var(--color-text-primary,#1a1a2e);">
            "${window.escapeHtml(safeString(product.nombre))}"
          </p>
          <p style="margin-bottom:12px; font-size:13px; color:#666;">Selecciona el motivo del reporte:</p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
              <input type="radio" name="report-reason" value="Producto inapropiado" style="accent-color:#ff4f81;">
              <span style="font-size:13px;">🚫 Producto inapropiado</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;">
              <input type="radio" name="report-reason" value="Información falsa o engañosa" style="accent-color:#ff4f81;">
              <span style="font-size:13px;">❗ Información falsa / engañosa</span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; transition:border-color 0.2s;" id="report-otro-label">
              <input type="radio" name="report-reason" value="Otro" style="accent-color:#ff4f81;" id="report-radio-otro">
              <span style="font-size:13px;">💬 Otro (especificar)</span>
            </label>
            <div id="report-otro-field" style="display:none; margin-top:4px;">
              <input type="text" id="report-otro-text" placeholder="Describe el problema..." maxlength="200"
                style="width:100%; padding:10px 12px; border-radius:10px; border:1.5px solid #e0e0e0; font-size:13px; box-sizing:border-box; background:var(--color-input-bg,#f9f9ff);">
            </div>
          </div>
        </div>
        <div class="custom-alert-footer">
          <button class="custom-alert-btn cancel" id="report-cancel-btn">Cancelar</button>
          <button class="custom-alert-btn confirm" id="report-confirm-btn" style="background:linear-gradient(135deg,#ff4f81,#ff7a4f);">Enviar reporte</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Mostrar campo "otro" al seleccionarlo
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
        window.showTemporaryMessage('⚠️ Selecciona un motivo', 'error');
        return;
      }
      let motivo = selected.value;
      if (motivo === 'Otro') {
        const otroText = (modal.querySelector('#report-otro-text').value || '').trim();
        if (!otroText) {
          window.showTemporaryMessage('⚠️ Describe el motivo', 'error');
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

      window.showTemporaryMessage('🚩 Reporte enviado. ¡Gracias por ayudarnos a mejorar la comunidad!', 'success');
    } catch (err) {
      console.error('Error enviando reporte:', err);
      window.showTemporaryMessage('❌ No se pudo enviar el reporte. Inténtalo de nuevo.', 'error');
    }
  }

  // ========== Crear tarjeta de producto ==========
  function createCommunityCard(product) {
    try {
      const card = document.createElement('div');
      card.className = 'comunidad-card';
      card.setAttribute('data-id', product.id);

      const imgUrl = product.imagen1 ? window.optimizeDriveUrl(product.imagen1, 400) : 'https://placehold.co/400x400/3b1f5f/white?text=Sin+Imagen';
      const allImages = [product.imagen1, product.imagen2, product.imagen3].filter(Boolean).map(url => window.optimizeDriveUrl(url, 800));
      const stockNum = Number(product.stock) || 0;
      const hasStock = stockNum > 0;
      const stockClass = !hasStock ? 'out-stock' : (stockNum <= 5 ? 'low-stock' : '');
      const stockText = !hasStock ? '❌ Sin stock' : (stockNum <= 5 ? `⚠️ Últimas ${stockNum}` : `✅ ${stockNum} disponibles`);
      const vendorName = safeString(product.vendedor_nombre);
      const vendorTel = safeString(product.vendedor_tel);
      const waLink = vendorTel ? `https://wa.me/52${vendorTel}?text=${encodeURIComponent('Hola, vi tu producto "' + safeString(product.nombre) + '" en Z&R Comunidad')}` : '#';

      card.innerHTML = `
        <div class="comunidad-card-img-wrapper" style="cursor:pointer; position:relative;">
          <img class="comunidad-card-img" src="${window.escapeHtml(imgUrl)}" alt="${window.escapeHtml(safeString(product.nombre))}" loading="lazy">
        </div>
        <div class="comunidad-card-body">
          <span class="comunidad-label">COMUNIDAD</span>
          <div class="comunidad-card-name" title="${window.escapeHtml(safeString(product.nombre))}">${window.escapeHtml(safeString(product.nombre))}</div>
          <div class="comunidad-card-price">${window.formatCurrency(product.precio)}</div>
          <div class="comunidad-card-meta">
            ${product.categoria ? `📂 ${window.escapeHtml(safeString(product.categoria))} · ` : ''}
            <span class="stock-badge ${stockClass}">${stockText}</span>
            ${product.talla ? ` · 📏 ${window.escapeHtml(safeString(product.talla))}` : ''}
          </div>
          ${vendorName ? `
            <div class="comunidad-vendor-line">
              🏪 ${window.escapeHtml(vendorName)}
              ${vendorTel ? `<a href="${waLink}" target="_blank" rel="noopener" style="color:#25d366; font-weight:600; text-decoration:none;">💬 Contactar</a>` : ''}
              <button class="btn-report" title="Reportar producto" aria-label="Reportar" style="background:none;border:none;cursor:pointer;font-size:15px;padding:2px 4px;color:#aaa;line-height:1;flex-shrink:0;" >🚩</button>
            </div>
          ` : `
            <div class="comunidad-vendor-line">
              <button class="btn-report" title="Reportar producto" aria-label="Reportar" style="background:none;border:none;cursor:pointer;font-size:15px;padding:2px 4px;color:#aaa;line-height:1;flex-shrink:0;">🚩</button>
            </div>
          `}
          <div class="comunidad-card-actions">
            <button class="comunidad-add-btn" ${!hasStock ? 'disabled' : ''}
              data-id="${product.id}"
              data-nombre="${window.escapeHtml(safeString(product.nombre))}"
              data-precio="${product.precio || 0}"
              data-img="${window.escapeHtml(safeString(product.imagen1 || ''))}"
              data-talla="${window.escapeHtml(safeString(product.talla || ''))}"
              data-vendedor="${window.escapeHtml(vendorName)}"
              data-vendortel="${window.escapeHtml(vendorTel)}">
              ${!hasStock ? 'Sin stock' : '🛒 Añadir al carrito'}
            </button>
            <div class="comunidad-extra-btns">
              ${inspectorMode ? `<button class="btn-inspector-delete" title="Eliminar (Admin)" aria-label="Eliminar producto">🗑️ Eliminar</button>` : ''}
            </div>
          </div>
        </div>
      `;

      // Evento: abrir modal de imagen
      const imgWrapper = card.querySelector('.comunidad-card-img-wrapper');
      if (imgWrapper && window.openImageModal) {
        imgWrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          window.openImageModal(imgUrl, product.id, allImages);
        });
      }

      // Evento: añadir al carrito
      const addBtn = card.querySelector('.comunidad-add-btn');
      if (addBtn && hasStock && window.addToCart) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.addToCart({
            ID: addBtn.dataset.id,
            Nombre: addBtn.dataset.nombre,
            Precio: Number(addBtn.dataset.precio),
            Imagen1: addBtn.dataset.img,
            Talla: addBtn.dataset.talla,
            _comunidad: true,
            _vendedor: addBtn.dataset.vendedor,
            _vendorTel: addBtn.dataset.vendortel
          });
          if (window.showTemporaryMessage) {
            window.showTemporaryMessage(`✅ ${addBtn.dataset.nombre} agregado al carrito`, 'success');
          }
        });
      }

      // Evento: reportar
      const reportBtn = card.querySelector('.btn-report');
      if (reportBtn) {
        reportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showReportDialog(product);
        });
      }

      // Evento: eliminar (inspector)
      if (inspectorMode) {
        const deleteBtn = card.querySelector('.btn-inspector-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProductInspector(product.id, safeString(product.nombre), card);
          });
        }
      }

      return card;
    } catch (err) {
      console.error('Error creando tarjeta para producto', product.id, err);
      return null;
    }
  }

  // ========== Paginación ==========
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

  // ========== Lazy loading de imágenes ==========
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

  // ========== Eventos de filtros ==========
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

  // ========== Inicializar carrito y UI común ==========
  function initCartAndUI() {
    if (typeof window.loadCartFromStorage === 'function') window.loadCartFromStorage();
    if (typeof window.renderCart === 'function') window.renderCart();
    if (typeof window.updateSavedPhoneDisplay === 'function') window.updateSavedPhoneDisplay();

    const cartIcon = document.getElementById('cart-icon-home');
    if (cartIcon && window.openCartDrawer) cartIcon.addEventListener('click', () => window.openCartDrawer());

    const wishlistIcon = document.getElementById('wishlist-icon-home');
    if (wishlistIcon && window.openWishlistDrawer) wishlistIcon.addEventListener('click', () => window.openWishlistDrawer());

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
      });
      const savedTheme = localStorage.getItem('theme') || 'dark';
      themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
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

  // ========== Estilos para botones nuevos ==========
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
        color: #f97316;
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
        color: #ef4444;
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

  // ========== Punto de entrada ==========
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

    // Inicializar inspector (async, antes de cargar productos)
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
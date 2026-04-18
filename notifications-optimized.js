// ========== NOTIFICACIONES OPTIMIZADAS ==========
// Usar API_URL desde common.js
const NOTIF_CACHE_KEY = 'zr_notifications_v2';
const NOTIF_CACHE_TTL = 30000; // 30 segundos

// Estado global
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let autoRefreshInterval = null;
let refreshTimeout = null;
let lazyImageObserver = null;

// ========== CACHÉ LOCAL ==========
function getCachedNotifications() {
  try {
    const cached = localStorage.getItem(NOTIF_CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp, version } = JSON.parse(cached);
    
    if (version !== '2.0') return null;
    if (Date.now() - timestamp > NOTIF_CACHE_TTL) {
      localStorage.removeItem(NOTIF_CACHE_KEY);
      return null;
    }
    
    console.log("📦 Notificaciones desde caché local");
    return data;
  } catch(e) { 
    console.warn("Error leyendo caché:", e);
    return null; 
  }
}

function setCachedNotifications(data) {
  try {
    localStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify({
      data: data,
      timestamp: Date.now(),
      version: '2.0'
    }));
    console.log("💾 Notificaciones guardadas en caché");
  } catch(e) { 
    console.warn("Error guardando caché:", e);
  }
}

function invalidateNotificationsCache() {
  localStorage.removeItem(NOTIF_CACHE_KEY);
  console.log("🗑️ Caché de notificaciones invalidado");
}

// ========== CARGA PRINCIPAL CON CACHÉ ==========
async function loadNotificationsOptimized(forceRefresh = false, targetPage = 1) {
  if (typeof API_URL === 'undefined') {
    console.error("❌ API_URL no está definida");
    const container = document.getElementById("notifications");
    if (container) {
      container.innerHTML = '<div class="empty">❌ Error de configuración. Recarga la página.</div>';
    }
    return;
  }
  
  if (isLoading) {
    console.log("⏭️ Carga en progreso, omitiendo...");
    return;
  }
  
  isLoading = true;
  currentPage = targetPage;
  
  showSkeletonNotifications();
  
  try {
    let data;
    
    if (!forceRefresh && targetPage === 1) {
      const cached = getCachedNotifications();
      if (cached) {
        data = cached;
        renderNotificationsFromData(data);
        refreshInBackground();
        isLoading = false;
        return;
      }
    }
    
    if (typeof showLoader === 'function') showLoader("Cargando solicitudes...");
    
    const url = `${API_URL}?action=notificationsBatch&page=${targetPage}&pageSize=20&noCache=${forceRefresh ? 'true' : 'false'}`;
    console.log("📡 Cargando desde:", url);
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || "Error al cargar");
    }
    
    data = result;
    
    if (targetPage === 1) {
      setCachedNotifications(data);
    }
    
    renderNotificationsFromData(data);
    
  } catch (err) {
    console.error("Error:", err);
    
    const fallbackCache = getCachedNotifications();
    if (fallbackCache) {
      console.log("⚠️ Usando caché de respaldo por error");
      renderNotificationsFromData(fallbackCache);
      if (typeof showTemporaryMessage === 'function') {
        showTemporaryMessage("⚠️ Usando datos guardados - Error de conexión", "error");
      }
    } else {
      const container = document.getElementById("notifications");
      if (container) {
        container.innerHTML = `<div class="empty">❌ Error cargando solicitudes: ${err.message}</div>`;
      }
    }
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
    isLoading = false;
    hideSkeletonNotifications();
  }
}

// ========== RENDERIZADO OPTIMIZADO ==========
function renderNotificationsFromData(data) {
  const container = document.getElementById("notifications");
  if (!container) return;
  
  totalPages = data.pagination?.totalPages || 1;
  
  if (!data.groups || data.groups.length === 0) {
    container.innerHTML = '<div class="empty">✅ No hay solicitudes pendientes</div>';
    renderPagination();
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  for (const group of data.groups) {
    const card = createOptimizedNotificationCard(group);
    fragment.appendChild(card);
  }
  
  container.innerHTML = '';
  container.appendChild(fragment);
  
  renderPagination();
  initLazyImagesInNotifications();
}

// ========== TARJETA OPTIMIZADA ==========
function createOptimizedNotificationCard(group) {
  const card = document.createElement("div");
  card.className = "request-card";
  card.setAttribute("data-request-id", group.requestId);
  
  const firstDate = new Date(group.firstDate);
  const formattedDate = firstDate.toLocaleString();
  const totalAmount = group.totalAmount || 0;
  
  const getOptimizedThumbnail = (imagenUrl) => {
    if (!imagenUrl) return 'https://placehold.co/70x70/eee/999?text=No+img';
    if (imagenUrl.includes('lh3.googleusercontent.com')) {
      return imagenUrl.replace(/=w[0-9]+/, '=w100');
    }
    return imagenUrl;
  };
  
  card.innerHTML = `
    <div class="request-header">
      <div class="request-header-left">
        <strong>Solicitud:</strong> 
        <span class="request-id">${escapeHtml(group.requestId)}</span>
      </div>
      <div class="request-header-right">
        <div class="request-date">📅 ${formattedDate}</div>
        ${group.clientPhone ? `<div class="client-phone">📱 +52 ${escapeHtml(group.clientPhone)}</div>` : ''}
      </div>
    </div>
    
    <div class="request-summary">
      <div class="summary-stats">
        <span class="stat-badge available">✅ ${group.availableCount} disponibles</span>
        <span class="stat-badge unavailable">❌ ${group.unavailableCount} sin stock</span>
        <span class="stat-badge total">💰 $${totalAmount.toLocaleString()}</span>
      </div>
    </div>
    
    <div class="request-products-container">
      ${group.notifications.map((notif, idx) => `
        <div class="request-product-item ${!notif.hasStock ? 'out-of-stock' : ''}" data-product-id="${notif.productId}">
          <div class="request-product-image">
            <img class="lazy-notif" data-src="${escapeHtml(getOptimizedThumbnail(notif.imagen))}" 
                 src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                 alt="${escapeHtml(notif.nombre)}"
                 onerror="this.src='https://placehold.co/70x70/eee/999?text=No+img'">
          </div>
          <div class="request-product-info">
            <div class="request-product-name">${escapeHtml(notif.nombre)}</div>
            <div class="request-product-meta">
              <span class="meta-item">🔑 ID: ${notif.productId}</span>
              <span class="meta-item">📦 Cantidad: ${notif.cantidad}</span>
              ${!notif.hasStock ? `<span class="meta-item stock-warning">⚠️ Stock: ${notif.currentStock}</span>` : ''}
              <span class="meta-item price">💰 $${notif.precio.toLocaleString()} c/u</span>
            </div>
          </div>
          <div class="request-product-status ${notif.hasStock ? 'status-pending' : 'status-outofstock'}">
            ${notif.hasStock ? '⏳ Pendiente' : '❌ Sin stock'}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="request-actions">
      ${group.unavailableCount > 0 ? 
        `<button class="btn btn-secondary" onclick="removeOutOfStockNotifications('${group.requestId}')">
           🗑️ Eliminar sin stock (${group.unavailableCount})
         </button>` : ''}
      ${group.availableCount > 0 ? 
        `<button class="btn btn-confirm" onclick="confirmGroupPurchase('${group.requestId}')">
           ✅ Confirmar compra (${group.availableCount})
         </button>` : ''}
      <button class="btn btn-cancel" onclick="cancelGroupPurchase('${group.requestId}')">
        ❌ Cancelar solicitud
      </button>
    </div>
  `;
  
  return card;
}

// ========== PAGINACIÓN ==========
function renderPagination() {
  const container = document.getElementById("notifications");
  if (!container) return;
  
  const existingPagination = document.querySelector(".notifications-pagination");
  if (existingPagination) existingPagination.remove();
  
  if (totalPages <= 1) return;
  
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "notifications-pagination";
  paginationDiv.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
    flex-wrap: wrap;
  `;
  
  if (currentPage > 1) {
    const prevBtn = createPaginationButton("← Anterior", () => {
      loadNotificationsOptimized(false, currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(prevBtn);
  }
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4 && startPage > 1) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i.toString(), () => {
      loadNotificationsOptimized(false, i);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (i === currentPage) pageBtn.classList.add("active-page");
    paginationDiv.appendChild(pageBtn);
  }
  
  if (currentPage < totalPages) {
    const nextBtn = createPaginationButton("Siguiente →", () => {
      loadNotificationsOptimized(false, currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationDiv.appendChild(nextBtn);
  }
  
  container.parentNode.insertBefore(paginationDiv, container.nextSibling);
}

function createPaginationButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.onclick = onClick;
  btn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid var(--color-border-subtle);
    background: white;
    border-radius: 30px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  return btn;
}

// ========== BACKGROUND REFRESH ==========
function refreshInBackground() {
  if (refreshTimeout) clearTimeout(refreshTimeout);
  
  refreshTimeout = setTimeout(async () => {
    if (document.hidden) {
      refreshTimeout = setTimeout(() => refreshInBackground(), 5000);
      return;
    }
    
    console.log("🔄 Actualización en background...");
    try {
      const url = `${API_URL}?action=notificationsBatch&page=1&pageSize=20&noCache=true`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.ok) {
        const currentGroups = document.querySelectorAll('.request-card');
        if (currentGroups.length !== result.groups?.length) {
          console.log("✨ Cambios detectados, actualizando vista");
          setCachedNotifications(result);
          
          if (currentPage === 1) {
            renderNotificationsFromData(result);
            if (typeof showTemporaryMessage === 'function') {
              showTemporaryMessage("✨ Solicitudes actualizadas", "info");
            }
          } else {
            showRefreshIndicator();
          }
        }
      }
    } catch (err) {
      console.log("Background refresh falló:", err);
    }
  }, 5000);
}

function showRefreshIndicator() {
  let indicator = document.querySelector('.refresh-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'refresh-indicator';
    indicator.innerHTML = `
      <span>🔄 Hay nuevas solicitudes</span>
      <button onclick="loadNotificationsOptimized(true, 1)">Actualizar</button>
    `;
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #3b1f5f;
      color: white;
      padding: 12px 20px;
      border-radius: 50px;
      display: flex;
      gap: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator && indicator.parentNode) indicator.remove();
    }, 10000);
  }
}

// ========== SKELETON LOADING ==========
function showSkeletonNotifications() {
  const container = document.getElementById("notifications");
  if (!container) return;
  
  if (container.children.length > 0 && container.querySelector('.request-card')) return;
  
  const skeletonCards = [];
  for (let i = 0; i < 3; i++) {
    skeletonCards.push(`
      <div class="request-card skeleton-notif">
        <div class="skeleton-header shimmer"></div>
        <div class="skeleton-products">
          <div class="skeleton-product shimmer"></div>
          <div class="skeleton-product shimmer"></div>
        </div>
        <div class="skeleton-actions shimmer"></div>
      </div>
    `);
  }
  
  container.innerHTML = skeletonCards.join('');
}

function hideSkeletonNotifications() {
  const skeletons = document.querySelectorAll('.skeleton-notif');
  skeletons.forEach(s => {
    s.style.opacity = '0';
    setTimeout(() => {
      if (s && s.parentNode) s.remove();
    }, 200);
  });
}

// ========== LAZY LOADING ==========
function initLazyImagesInNotifications() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.lazy-notif').forEach(img => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) img.src = dataSrc;
    });
    return;
  }
  
  if (lazyImageObserver) lazyImageObserver.disconnect();
  
  lazyImageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) {
          img.src = dataSrc;
          img.classList.add('loaded');
        }
        lazyImageObserver.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  
  document.querySelectorAll('.lazy-notif').forEach(img => {
    lazyImageObserver.observe(img);
  });
}

// ========== AUTO REFRESH ==========
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  
  autoRefreshInterval = setInterval(() => {
    if (!document.hidden && currentPage === 1) {
      refreshInBackground();
    }
  }, 30000);
  
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentPage === 1) {
      refreshInBackground();
    }
  });
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ========== FUNCIONES DE ACCIÓN ==========
async function removeOutOfStockNotifications(requestId) {
  if (!confirm("¿Eliminar los productos sin stock de esta solicitud?")) return;
  
  if (typeof showLoader === 'function') showLoader("Eliminando...");
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "removeOutOfStockNotifications", requestId: requestId })
    });
    const data = await response.json();
    
    if (data.ok) {
      alert(`✅ Eliminados ${data.removedCount} producto(s) sin stock`);
      invalidateNotificationsCache();
      loadNotificationsOptimized(true, 1);
    } else {
      throw new Error(data.error || "Error");
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
}

async function confirmGroupPurchase(requestId) {
  if (!confirm(`¿Confirmar TODOS los productos con stock disponible de esta solicitud?`)) return;
  
  if (typeof showLoader === 'function') showLoader("Procesando solicitud completa...");
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "confirmGroupPurchase", requestId: requestId })
    });
    const data = await response.json();
    
    if (!data.ok) throw new Error(data.error || "Error al confirmar");
    
    let summary = `✅ ${data.message}\n\n`;
    if (data.approvedCount > 0) {
      summary += `💰 Total a pagar: $${(data.totalAmount || 0).toLocaleString()}\n`;
    }
    if (data.paymentLink) {
      summary += `\n🔗 Link de pago generado. Se enviará al cliente por WhatsApp.`;
    }
    
    alert(summary);
    
    if (data.whatsappUrl) {
      window.open(data.whatsappUrl, '_blank');
    }
    
    setTimeout(() => {
      invalidateNotificationsCache();
      loadNotificationsOptimized(true, 1);
    }, 2000);
    
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
    if (typeof hideLoader === 'function') hideLoader();
  }
}

async function cancelGroupPurchase(requestId) {
  if (!confirm("¿Cancelar TODA la solicitud de compra?")) return;
  
  if (typeof showLoader === 'function') showLoader("Cancelando...");
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "cancelGroupPurchase", requestId: requestId })
    });
    const data = await response.json();
    
    if (data.ok) {
      alert(`✅ Solicitud cancelada (${data.cancelledCount} productos)`);
      invalidateNotificationsCache();
      loadNotificationsOptimized(true, 1);
    } else {
      throw new Error(data.error || "Error");
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof API_URL !== 'undefined') {
      loadNotificationsOptimized();
      startAutoRefresh();
    } else {
      console.error("❌ API_URL no disponible");
      const container = document.getElementById("notifications");
      if (container) {
        container.innerHTML = '<div class="empty">❌ Error de carga. Recarga la página.</div>';
      }
    }
  }, 100);
  
  const refreshBtn = document.querySelector('.refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      invalidateNotificationsCache();
      loadNotificationsOptimized(true, 1);
    });
  }
});

window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
  if (lazyImageObserver) lazyImageObserver.disconnect();
});

// Exportar funciones globalmente para que onclick las encuentre
window.removeOutOfStockNotifications = removeOutOfStockNotifications;
window.confirmGroupPurchase = confirmGroupPurchase;
window.cancelGroupPurchase = cancelGroupPurchase;
window.loadNotificationsOptimized = loadNotificationsOptimized;
window.invalidateNotificationsCache = invalidateNotificationsCache;

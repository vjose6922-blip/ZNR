// ============================================
// SCRIPT.JS - Tienda principal
// ============================================

const PAGE_SIZE = 10;
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let isLoading = false;
let sliderState = new Map();
let initialHashHandled = false;
const SECRET_TAPS_REQUIRED = 5;
let secretTapCount = 0;
let secretTapTimeout = null;

// ========== MAPEO DE GÉNERO ==========
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

// ========== FUNCIONES DE PRODUCTOS ==========
async function fetchProducts(force = false) {
  if (!force) {
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      allProducts = cached;
      filteredProducts = [...allProducts];
      currentPage = 1;
      renderProductsPage(true);
      populateCategoryFilter(document.getElementById("gender-filter")?.value);
      handleInitialHash();
      loadProductsInBackground();
      return;
    }
  }
  
  isLoading = true;
  showLoader("Cargando productos...");
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = (data.products || data || []).slice(0, 500);
    setCachedProducts(allProducts);
    filteredProducts = [...allProducts];
    currentPage = 1;
    renderProductsPage(true);
    populateCategoryFilter(document.getElementById("gender-filter")?.value);
    handleInitialHash();
  } catch (err) {
    console.error(err);
    const staleCache = localStorage.getItem(CACHE_KEY);
    if (staleCache) {
      const { data } = JSON.parse(staleCache);
      if (data && data.length > 0) {
        allProducts = data;
        filteredProducts = [...allProducts];
        renderProductsPage(true);
        populateCategoryFilter(document.getElementById("gender-filter")?.value);
      }
    }
  } finally {
    isLoading = false;
    hideLoader();
  }
}

async function loadProductsInBackground() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const freshProducts = (data.products || data || []).slice(0, 500);
    if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
      allProducts = freshProducts;
      setCachedProducts(allProducts);
      filteredProducts = [...allProducts];
      renderProductsPage(true);
      populateCategoryFilter(document.getElementById("gender-filter")?.value);
    }
  } catch (err) {
    console.error("Error en carga background:", err);
  }
}

function applyFilters() {
  const searchValue = document.getElementById("search-input")?.value.trim().toLowerCase() || "";
  const categoryValue = document.getElementById("category-filter")?.value || "";
  const genderValue = document.getElementById("gender-filter")?.value || "";
  const sortValue = document.getElementById("sort-select")?.value || "";

  populateCategoryFilter(genderValue);

  filteredProducts = allProducts.filter((p) => {
    const matchesSearch = !searchValue ||
      (p.Nombre || "").toLowerCase().includes(searchValue) ||
      (p.Descripcion || "").toLowerCase().includes(searchValue);
    const matchesCategory = !categoryValue || (p.Categoria || "") === categoryValue;
    let matchesGender = true;
    if (genderValue) {
      const productGender = getGenderFromCategory(p.Categoria);
      matchesGender = productGender === genderValue;
    }
    return matchesSearch && matchesCategory && matchesGender;
  });

  if (sortValue === "price-asc") {
    filteredProducts.sort((a, b) => Number(a.Precio || 0) - Number(b.Precio || 0));
  } else if (sortValue === "price-desc") {
    filteredProducts.sort((a, b) => Number(b.Precio || 0) - Number(a.Precio || 0));
  }

  currentPage = 1;
  renderProductsPage(true);
}

function populateCategoryFilter(genderFilter = null) {
  const select = document.getElementById("category-filter");
  if (!select) return;
  const currentValue = select.value;
  if (genderFilter === null) {
    const genderSelect = document.getElementById("gender-filter");
    if (genderSelect) genderFilter = genderSelect.value;
  }
  const categories = new Set();
  allProducts.forEach((p) => {
    if (p.Categoria) {
      if (genderFilter) {
        const productGender = getGenderFromCategory(p.Categoria);
        if (productGender === genderFilter) categories.add(p.Categoria);
      } else {
        categories.add(p.Categoria);
      }
    }
  });
  select.innerHTML = '<option value="">Todas las categorías</option>';
  Array.from(categories).sort().forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (currentValue && categories.has(currentValue)) select.value = currentValue;
  else select.value = "";
}

function renderProductsPage(reset = false) {
  const container = document.getElementById("products-container");
  if (!container) return;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredProducts.slice(start, end);
  container.innerHTML = "";
  if (pageItems.length === 0) {
    container.innerHTML = '<p class="helper-text">No hay productos para mostrar</p>';
    renderPagination();
    return;
  }
  pageItems.forEach((product) => {
    const card = createProductCard(product);
    container.appendChild(card);
  });
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagination = document.getElementById("pagination");
  if (!pagination) return;
  pagination.innerHTML = "";
  if (totalPages <= 1) return;
  
  if (currentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Anterior";
    prevBtn.onclick = () => { currentPage--; renderProductsPage(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    pagination.appendChild(prevBtn);
  }
  
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active-page");
    btn.onclick = (function(page) { return function() { currentPage = page; renderProductsPage(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }; })(i);
    pagination.appendChild(btn);
  }
  
  if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente →";
    nextBtn.onclick = () => { currentPage++; renderProductsPage(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    pagination.appendChild(nextBtn);
  }
}

function createProductCard(product) {
  const { ID, Nombre, Precio, Stock, Descripcion, Talla, Categoria, Imagen1, Imagen2, Imagen3, Badge } = product;
  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `producto-${ID}`;
  
  // Slider
  const slider = document.createElement("div");
  slider.className = "product-slider";
  slider.dataset.productId = ID;
  const track = document.createElement("div");
  track.className = "product-slider-track";
  const images = [Imagen1, Imagen2, Imagen3].map(u => optimizeDriveUrl(u)).filter(Boolean);
  if (images.length === 0) images.push("https://via.placeholder.com/600x800/3b1f5f/ffffff?text=Sin+imagen");
  images.forEach((url) => {
    const slide = document.createElement("div");
    slide.className = "product-slide";
    const img = document.createElement("img");
    img.alt = Nombre || "Producto";
    img.src = url; // Carga directa sin lazy loading para asegurar que se vean
    img.loading = "lazy";
    img.addEventListener("click", () => openImageModal(url));
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
  if (Badge) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "product-badge";
    badgeEl.textContent = Badge;
    slider.appendChild(badgeEl);
  }
  attachSliderEvents(slider, images.length);
  
  // Info
  const info = document.createElement("div");
  info.className = "product-info";
  const titleRow = document.createElement("div");
  titleRow.className = "product-title-row";
  const nameEl = document.createElement("h2");
  nameEl.className = "product-name";
  nameEl.textContent = Nombre || "Producto";
  const priceEl = document.createElement("div");
  priceEl.className = "product-price";
  priceEl.textContent = formatCurrency(Precio);
  titleRow.appendChild(nameEl);
  titleRow.appendChild(priceEl);
  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";
  if (Categoria) {
    const categoryEl = document.createElement("span");
    categoryEl.className = "category-badge";
    categoryEl.textContent = Categoria;
    metaRow.appendChild(categoryEl);
  }
  const gender = getGenderFromCategory(Categoria);
  if (gender) {
    const genderBadge = document.createElement("span");
    genderBadge.className = `gender-badge gender-${gender.toLowerCase()}`;
    if (gender === "UNISEX") { genderBadge.textContent = "⚪"; genderBadge.style.background = "#9b59b6"; }
    else if (gender === "HOMBRE") genderBadge.textContent = "👔";
    else if (gender === "MUJER") genderBadge.textContent = "👗";
    metaRow.appendChild(genderBadge);
  }
  const stockNum = Number(Stock || 0);
  const stockEl = document.createElement("span");
  stockEl.className = "stock-badge";
  if (stockNum <= 0) {
    stockEl.classList.add("out-of-stock");
    stockEl.innerHTML = "❌ Sin stock";
  } else {
    stockEl.innerHTML = `📦 Stock: ${stockNum}`;
  }
  metaRow.appendChild(stockEl);
  const descEl = document.createElement("p");
  descEl.className = "product-description";
  descEl.textContent = Descripcion || "";
  const sizesEl = document.createElement("div");
  sizesEl.className = "product-sizes";
  sizesEl.textContent = Talla || "Única";
  info.appendChild(titleRow);
  info.appendChild(metaRow);
  info.appendChild(descEl);
  info.appendChild(sizesEl);
  
  // Acciones
  const actions = document.createElement("div");
  actions.className = "product-actions";
  const leftActions = document.createElement("div");
  leftActions.className = "product-actions-left";
  const shareBtn = document.createElement("button");
  shareBtn.className = "share-button";
  shareBtn.textContent = "Compartir";
  shareBtn.addEventListener("click", () => shareProduct(ID));
  leftActions.appendChild(shareBtn);
  const isOutOfStock = stockNum <= 0;
  const addBtn = document.createElement("button");
  addBtn.className = "primary-button";
  addBtn.textContent = isOutOfStock ? "Sin stock" : "Añadir al carrito";
  if (!isOutOfStock) addBtn.addEventListener("click", () => addToCart(product));
  else addBtn.disabled = true;
  actions.appendChild(leftActions);
  actions.appendChild(addBtn);
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
  function updateSlider(index) {
    const normalizedIndex = ((index % totalSlides) + totalSlides) % totalSlides;
    sliderState.set(productId, normalizedIndex);
    track.style.transform = `translateX(-${normalizedIndex * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("active", i === normalizedIndex));
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
    updateSlider(index);
    isDragging = false;
  }
  slider.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX));
  slider.addEventListener("touchmove", (e) => handleMove(e.touches[0].clientX));
  slider.addEventListener("touchend", handleEnd);
  slider.addEventListener("mousedown", (e) => handleStart(e.clientX));
  slider.addEventListener("mousemove", (e) => { if (isDragging) handleMove(e.clientX); });
  slider.addEventListener("mouseup", handleEnd);
  slider.addEventListener("mouseleave", () => { if (isDragging) handleEnd(); });
  dots.forEach((dot) => dot.addEventListener("click", () => updateSlider(Number(dot.dataset.index))));
  setInterval(() => updateSlider((sliderState.get(productId) || 0) + 1), 6000);
}

// ========== FUNCIONES DE IMAGEN ==========
function openImageModal(url) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const overlay = document.getElementById("overlay");
  if (modal && img) {
    img.src = url;
    modal.classList.add("open");
    if (overlay) overlay.classList.add("visible");
  }
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  const overlay = document.getElementById("overlay");
  if (modal) modal.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

function shareProduct(id) {
  const url = `${window.location.origin}${window.location.pathname}#producto-${id}`;
  if (navigator.share) {
    navigator.share({ title: "Producto", text: "Mira este producto", url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => alert("Enlace copiado")).catch(() => {});
  }
}

function handleInitialHash() {
  if (initialHashHandled) return;
  initialHashHandled = true;
  const hash = window.location.hash;
  if (!hash) return;
  const id = hash.replace("#", "");
  const el = document.getElementById(id);
  if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
}

function handleSecretTap() {
  secretTapCount++;
  if (secretTapTimeout) clearTimeout(secretTapTimeout);
  secretTapTimeout = setTimeout(() => secretTapCount = 0, 2000);
  if (secretTapCount >= SECRET_TAPS_REQUIRED) {
    secretTapCount = 0;
    window.location.href = "admin.html";
  }
}

// ========== CHECKOUT ==========
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
      "📱 Para procesar tu compra, ingresa tu número de WhatsApp (10 dígitos):\n\n⚠️ Solo números, sin espacios ni código país.\n🔒 Tus datos están protegidos (aceptaste el aviso de privacidad)",
      ""
    );
    if (!clientPhone) {
      showTemporaryMessage("❌ Necesitamos tu número para procesar la compra", "error");
      return;
    }
    clientPhone = clientPhone.replace(/[^0-9]/g, '');
    if (clientPhone.length !== 10) {
      showTemporaryMessage("❌ Número inválido. Debe tener 10 dígitos.", "error");
      return;
    }
    localStorage.setItem("client_phone", clientPhone);
  }
  showLoader("Enviando solicitud...");
  const requestId = generateRequestId();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let adminMessage = "*🛍️ NUEVA SOLICITUD DE COMPRA*\n\n";
  adminMessage += `*Cliente:* +52 ${clientPhone}\n`;
  adminMessage += `*Solicitud ID:* ${requestId}\n`;
  adminMessage += "━━━━━━━━━━━━━━━━━━━━\n";
  adminMessage += "*📦 Productos:*\n";
  items.forEach((item) => {
    adminMessage += `• ${item.name}\n`;
    adminMessage += `  Cantidad: ${item.quantity}\n`;
    adminMessage += `  Precio unitario: $${item.price.toLocaleString()}\n`;
    adminMessage += `  Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
    adminMessage += "------------------------\n";
  });
  adminMessage += `*💰 Total: $${total.toLocaleString()} MXN*\n\n`;
  adminMessage += `_✅ Para continuar con el pago espera el mensaje de confirmacion\n`;
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
      talla: item.Talla || ""
    }));
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
    });
    localCart = {};
    saveCartToStorage();
    updateCartBadge();
    if (typeof renderCart === 'function') renderCart();
    showTemporaryMessage(`✅ ¡Solicitud enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`, "success");
    closeCartDrawer();
    startSilentPolling(requestId, clientPhone);
  } catch(err) {
    console.error("Error:", err);
    showTemporaryMessage("❌ Error al enviar la solicitud", "error");
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
        let message = `✅ *¡TU PEDIDO HA SIDO CONFIRMADO!*\n\n`;
        message += `*💰 TOTAL A PAGAR: $${(data.totalAmount || 0).toLocaleString()} MXN*\n\n`;
        message += `🔗 *LINK DE PAGO SEGURO:*\n${data.paymentLink}\n\n`;
        message += `⚠️ *El enlace expira en 30 minutos*\n`;
        message += `¡Gracias por tu compra! 🛍️`;
        let cleanPhone = String(clientPhone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = "52" + cleanPhone;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        localStorage.removeItem('pending_purchase_' + requestId);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }, 5000);
  setTimeout(() => { clearInterval(interval); localStorage.removeItem('pending_purchase_' + requestId); }, 600000);
}

// ========== MERCADO PAGO ==========
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
    alert("❌ Error: " + error.message);
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
    alert("🎉 ¡Pago completado con éxito!\n\nGracias por tu compra.");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentStatus === "failure") {
    alert("❌ El pago no pudo completarse.\n\nPor favor, intenta nuevamente.");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentStatus === "pending") {
    alert("⏳ Tu pago está siendo procesado.\n\nTe notificaremos cuando se confirme.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();

  let searchDebounceTimeout;
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => applyFilters(), 300);
    });
  }

  const genderFilter = document.getElementById("gender-filter");
  if (genderFilter) genderFilter.addEventListener("change", () => { populateCategoryFilter(genderFilter.value); applyFilters(); });
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) categoryFilter.addEventListener("change", () => applyFilters());
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.addEventListener("change", () => applyFilters());

  const closeCartBtn = document.getElementById("close-cart-btn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.addEventListener("click", () => { closeCartDrawer(); closeImageModal(); });
  const closeImageBtn = document.getElementById("close-image-modal");
  if (closeImageBtn) closeImageBtn.addEventListener("click", closeImageModal);
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", () => { if (!isLoading) fetchProducts(true); });
  const secretLogo = document.getElementById("secret-logo");
  if (secretLogo) secretLogo.addEventListener("click", handleSecretTap);
  const requestBtn = document.getElementById("request-purchase-btn");
  if (requestBtn) requestBtn.addEventListener("click", openWhatsAppCheckout);
  const mpBtn = document.getElementById("mp-checkout-btn");
  if (mpBtn) mpBtn.addEventListener("click", pagarConMercadoPago);
  verificarEstadoPago();

  // Layout toggle
  const layoutBtn = document.getElementById("layout-toggle-btn");
  const productsContainer = document.getElementById("products-container");
  if (layoutBtn && productsContainer) {
    const savedLayout = localStorage.getItem("products_layout");
    if (savedLayout === "grid") {
      productsContainer.classList.add("layout-grid");
      layoutBtn.textContent = "🟦🟦";
    } else {
      layoutBtn.textContent = "📱";
    }
    layoutBtn.addEventListener("click", () => {
      productsContainer.classList.toggle("layout-grid");
      const isGrid = productsContainer.classList.contains("layout-grid");
      localStorage.setItem("products_layout", isGrid ? "grid" : "list");
      layoutBtn.textContent = isGrid ? "🟦🟦" : "📱";
    });
  }
});

// Escuchar cambios en el carrito
window.addEventListener('cartUpdated', () => {
  if (typeof renderCart === 'function') renderCart();
  updateCartBadge();
});

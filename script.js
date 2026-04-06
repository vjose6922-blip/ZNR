const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const WHATSAPP_NUMBER = "528671781272";

const PAGE_SIZE = 10;
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let isLoading = false;
let localCart = {};
let imageObserver = null;
const sliderState = new Map();
let initialHashHandled = false;
const SECRET_TAPS_REQUIRED = 5;
let secretTapCount = 0;
let secretTapTimeout = null;
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000;

// ========== FUNCIONES DE CACHÉ ==========
function getCachedProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedProducts(products) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: products,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("No se pudo guardar en caché:", e);
  }
}

// ========== FUNCIONES DE UTILIDAD ==========
function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoader(text = "Cargando...") {
  let loader = document.getElementById("global-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "global-loader";
    loader.className = "global-loader";
    loader.innerHTML = `<div class="loader-spinner"></div><div class="loader-text">${text}</div>`;
    document.body.appendChild(loader);
  } else {
    const txt = loader.querySelector(".loader-text");
    if (txt) txt.textContent = text;
    loader.classList.remove("hidden");
  }
}

function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) loader.classList.add("hidden");
}

function showTemporaryMessage(text, type = "info") {
  const existing = document.querySelector('.temporary-message');
  if (existing) existing.remove();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `temporary-message ${type}`;
  messageDiv.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#ef4444" : "#22c55e"};
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
  `;
  messageDiv.textContent = text;
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = "slideDown 0.3s ease";
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// ========== MAPEO DE GÉNERO ==========
function getGenderFromCategory(categoria) {
  if (!categoria) return null;
  const categoriaLower = categoria.toLowerCase().trim();
  
  if (categoriaLower === "playeras") return "HOMBRE";
  if (categoriaLower === "pantalon para caballero") return "HOMBRE";
  if (categoriaLower === "short para caballero") return "HOMBRE";
  if (categoriaLower === "calzado para caballero") return "HOMBRE";
  if (categoriaLower === "sueter para caballero") return "HOMBRE";
  if (categoriaLower === "chamarra para caballero") return "HOMBRE";
  if (categoriaLower === "blusas") return "MUJER";
  if (categoriaLower === "pantalon para dama") return "MUJER";
  if (categoriaLower === "short para dama") return "MUJER";
  if (categoriaLower === "vestidos") return "MUJER";
  if (categoriaLower === "calzado para dama") return "MUJER";
  if (categoriaLower === "sueter para dama") return "MUJER";
  if (categoriaLower === "chamarra para dama") return "MUJER";
  if (categoriaLower === "faldas") return "MUJER";
  if (categoriaLower === "accesorios") return "UNISEX";
  
  return null;
}

function optimizeDriveUrl(url, size = 500) {
  if (!url) return "";
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    const id = match[0];
    const actualSize = window.innerWidth < 768 ? 400 : 800;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${actualSize}`;
  }
  return url;
}

// ========== IMAGE OBSERVER ==========
function createImageObserver() {
  if ("IntersectionObserver" in window) {
    imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.getAttribute("data-src");
          if (dataSrc) {
            const newImg = new Image();
            newImg.onload = () => {
              img.src = dataSrc;
              img.removeAttribute("data-src");
            };
            newImg.src = dataSrc;
          }
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: "50px 0px", threshold: 0.01 });
  }
}

function observeImage(img) {
  if (imageObserver && img) {
    imageObserver.observe(img);
  } else if (img && img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  }
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
    const res = await fetch(SHEET_API_URL);
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
    const res = await fetch(SHEET_API_URL);
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
  
  if (currentValue && categories.has(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "";
  }
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
    prevBtn.onclick = () => {
      currentPage--;
      renderProductsPage(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    pagination.appendChild(prevBtn);
  }
  
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active-page");
    btn.onclick = (function(page) {
      return function() {
        currentPage = page;
        renderProductsPage(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    })(i);
    pagination.appendChild(btn);
  }
  
  if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente →";
    nextBtn.onclick = () => {
      currentPage++;
      renderProductsPage(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
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
    img.setAttribute("data-src", url);
    img.loading = "lazy";
    img.addEventListener("click", () => openImageModal(url));
    slide.appendChild(img);
    track.appendChild(slide);
    observeImage(img);
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
    if (gender === "UNISEX") {
      genderBadge.textContent = "⚪";
      genderBadge.style.background = "#9b59b6";
    } else if (gender === "HOMBRE") {
      genderBadge.textContent = "👔";
    } else if (gender === "MUJER") {
      genderBadge.textContent = "👗";
    }
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
  sizesEl.textContent = product.Talla || "Única";

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
  if (!isOutOfStock) {
    addBtn.addEventListener("click", () => addToCart(product));
  } else {
    addBtn.disabled = true;
  }

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

// ========== FUNCIONES DE CARRITO (localCart) ==========
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem("cart");
    localCart = raw ? JSON.parse(raw) : {};
  } catch {
    localCart = {};
  }
  updateCartBadge();
}

function saveCartToStorage() {
  localStorage.setItem("cart", JSON.stringify(localCart));
}

function updateCartBadge() {
  const countEl = document.getElementById("cart-count");
  if (countEl) {
    const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0);
    countEl.textContent = totalQty;
  }
}

function addToCart(product) {
  const id = product.ID;
  if (!id) {
    console.error("Producto sin ID:", product);
    return;
  }
  
  if (!localCart[id]) {
    localCart[id] = {
      id: id,
      name: product.Nombre || "Producto",
      price: Number(product.Precio || 0),
      quantity: 0,
      Imagen1: product.Imagen1 || "",
      Talla: product.Talla || ""
    };
  }
  localCart[id].quantity += 1;
  saveCartToStorage();
  updateCartBadge();
  animateCartAdd();
  renderCart();
}

window.changeCartQty = function(id, delta) {
  if (!localCart[id]) return;
  localCart[id].quantity += delta;
  if (localCart[id].quantity <= 0) {
    delete localCart[id];
  }
  saveCartToStorage();
  updateCartBadge();
  renderCart();
};

window.removeFromCart = function(id) {
  if (localCart[id]) {
    delete localCart[id];
    saveCartToStorage();
    updateCartBadge();
    renderCart();
  }
};

function renderCart() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = "";
  const items = Object.values(localCart);
  
  if (items.length === 0) {
    container.innerHTML = '<p class="helper-text">Tu carrito está vacío.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name || `ID ${item.id}`)}</div>
          <div class="cart-item-meta">${formatCurrency(item.price)} c/u</div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="changeCartQty('${item.id}', -1)">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeCartQty('${item.id}', 1)">+</button>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Eliminar</button>
          </div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (totalEl) totalEl.textContent = formatCurrency(subtotal);
}

function animateCartAdd() {
  const btn = document.getElementById("floating-cart-btn");
  if (btn) {
    btn.style.transform = "translateY(-4px) scale(1.05)";
    setTimeout(() => btn.style.transform = "", 180);
  }
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("visible");
  
  // 🔥 Actualizar display cada vez que se abre el carrito
  updateSavedPhoneDisplay();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

let privacyModalInstance = null;

async function openWhatsAppCheckout() {
  const items = Object.values(localCart);
  if (items.length === 0) {
    showTemporaryMessage("No hay productos en el carrito", "error");
    return;
  }
  
  // 🔥 VERIFICAR SI YA ACEPTÓ EL AVISO DE PRIVACIDAD
  const hasAcceptedPrivacy = localStorage.getItem("privacy_accepted") === "true";
  
  if (!hasAcceptedPrivacy) {
    // Mostrar modal de privacidad
    showPrivacyModal(() => {
      // Después de aceptar, continuar con el checkout
      continueCheckout();
    });
    return;
  }
  
  continueCheckout();
}

// Función que continúa con el checkout después de aceptar privacidad
async function continueCheckout() {
  const items = Object.values(localCart);
  if (items.length === 0) return;
  
  let clientPhone = localStorage.getItem("client_phone");
  
  if (!clientPhone) {
    clientPhone = prompt(
      "📱 Para procesar tu compra, ingresa tu número de WhatsApp (10 dígitos):\n\n" +
      "⚠️ Solo números, sin espacios ni código país.\n" +
      "🔒 Tus datos están protegidos (aceptaste el aviso de privacidad)",
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
  
  const requestId = 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
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
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveClientPhone",
        requestId: requestId,
        phone: clientPhone
      })
    });
    
    const notificationItems = items.map(item => ({
      productId: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      imagen: item.Imagen1 || "",
      talla: item.Talla || ""
    }));
    
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createNotification",
        items: notificationItems,
        requestId: requestId
      })
    });
    
    // Limpiar carrito inmediatamente
    localCart = {};
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    
    showTemporaryMessage(`✅ ¡Solicitud enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`, "success");
    
    closeCartDrawer();
    
    // Polling silencioso
    startSilentPolling(requestId, clientPhone);
    
  } catch(err) {
    console.error("Error:", err);
    showTemporaryMessage("❌ Error al enviar la solicitud", "error");
  } finally {
    hideLoader();
  }
}

// Función para mostrar el modal de privacidad
function showPrivacyModal(onAccept) {
  // Verificar si ya existe el modal en el DOM
  let modal = document.getElementById("privacy-modal");
  
  if (!modal) {
    // Crear el modal dinámicamente
    modal = document.createElement("div");
    modal.id = "privacy-modal";
    modal.className = "privacy-modal";
    modal.innerHTML = `
      <div class="privacy-modal-content">
        <div class="privacy-modal-header">
          <span class="privacy-icon">🔒</span>
          <h2>Aviso de Privacidad</h2>
        </div>
        <div class="privacy-modal-body">
          <p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
          
          <h3>📱 Datos recopilados</h3>
          <p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp).</p>
          
          <h3>🎯 Finalidad</h3>
          <p>Tu número será utilizado EXCLUSIVAMENTE para:</p>
          <ul>
            <li>✓ Confirmar tu identidad en las solicitudes de compra</li>
            <li>✓ Enviarte el link de pago cuando el administrador confirme tu pedido</li>
            <li>✓ Comunicarme contigo sobre el estado de tu compra</li>
          </ul>
          
          <h3>🚫 No compartimos tus datos</h3>
          <p>Tu número de teléfono NO será vendido, cedido ni compartido con terceros. Solo será visible para el administrador de Z&R para procesar tu pedido.</p>
          
          <h3>⏰ Conservación</h3>
          <p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas.</p>
          
          <h3>✋ Tus derechos (ARCO)</h3>
          <p>Puedes solicitar acceso, rectificación, cancelación u oposición de tus datos escribiendo a: <strong>zrstore@email.com</strong></p>
          
          <p class="privacy-date">Última actualización: Abril 2026</p>
        </div>
        <div class="privacy-modal-footer">
          <button id="reject-privacy-btn" class="privacy-btn reject">❌ Rechazar</button>
          <button id="accept-privacy-btn" class="privacy-btn accept">✅ Aceptar y continuar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.style.display = "flex";
  
  const acceptBtn = document.getElementById("accept-privacy-btn");
  const rejectBtn = document.getElementById("reject-privacy-btn");
  
  const handleAccept = () => {
    localStorage.setItem("privacy_accepted", "true");
    modal.style.display = "none";
    if (onAccept) onAccept();
    cleanup();
  };
  
  const handleReject = () => {
    modal.style.display = "none";
    showTemporaryMessage("❌ Debes aceptar el aviso de privacidad para continuar", "error");
    cleanup();
  };
  
  const cleanup = () => {
    if (acceptBtn) acceptBtn.removeEventListener("click", handleAccept);
    if (rejectBtn) rejectBtn.removeEventListener("click", handleReject);
  };
  
  if (acceptBtn) acceptBtn.addEventListener("click", handleAccept);
  if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
}

function startSilentPolling(requestId, clientPhone) {
  let interval = setInterval(async () => {
    try {
      const response = await fetch(`${SHEET_API_URL}?action=checkRequestStatus&requestId=${requestId}`);
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
  
  setTimeout(() => {
    clearInterval(interval);
    localStorage.removeItem('pending_purchase_' + requestId);
  }, 600000);
}

// ========== MODALES Y COMPARTIR ==========
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
    const params = new URLSearchParams({
      action: "createPreference",
      items: JSON.stringify(items)
    });
    
    const response = await fetch(`${SHEET_API_URL}?${params.toString()}`, { method: "GET" });
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
    renderCart();
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
  createImageObserver();
  loadCartFromStorage();
  renderCart();
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

  const floatingCartBtn = document.getElementById("floating-cart-btn");
  if (floatingCartBtn) floatingCartBtn.addEventListener("click", openCartDrawer);

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
});

// Estilos para toast
if (!document.querySelector('#toast-styles')) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes slideDown {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);
}


// Botón para cambiar layout en móvil (2 columnas)
const layoutBtn = document.getElementById("layout-toggle-btn");
const productsContainer = document.getElementById("products-container");

if (layoutBtn && productsContainer) {
  // Cargar preferencia guardada
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

// Botón para cambiar número dentro del carrito
const changePhoneBtn = document.getElementById("change-phone-btn");
if (changePhoneBtn) {
  changePhoneBtn.addEventListener("click", changePhoneNumber);
}

// Actualizar display al cargar la página
updateSavedPhoneDisplay();







// Función para mostrar el número guardado en el carrito
function updateSavedPhoneDisplay() {
  const container = document.getElementById("saved-phone-container");
  const display = document.getElementById("saved-phone-display");
  const savedPhone = localStorage.getItem("client_phone");
  
  if (container && display) {
    if (savedPhone && savedPhone.length === 10) {
      // Formatear número: XX-XXXX-XXXX
      const formatted = `${savedPhone.slice(0,2)}-${savedPhone.slice(2,6)}-${savedPhone.slice(6)}`;
      display.textContent = formatted;
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }
}

// Función para cambiar el número (con modal personalizado)
function changePhoneNumber() {
  const modal = document.getElementById("change-phone-modal");
  const currentPhoneDisplay = document.getElementById("current-phone-display");
  const newPhoneInput = document.getElementById("new-phone-input");
  const errorMessage = document.getElementById("phone-error-message");
  const saveBtn = document.getElementById("save-phone-btn");
  const closeBtn = document.getElementById("close-phone-modal-btn");
  
  if (!modal) return;
  
  // Obtener número actual y formatearlo
  const currentPhone = localStorage.getItem("client_phone") || "";
  const formattedCurrent = currentPhone && currentPhone.length === 10 
    ? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}` 
    : "No guardado";
  
  // Mostrar número actual
  if (currentPhoneDisplay) {
    currentPhoneDisplay.value = formattedCurrent;
  }
  
  // Limpiar input y errores
  if (newPhoneInput) {
    newPhoneInput.value = "";
    newPhoneInput.focus();
  }
  if (errorMessage) {
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
  }
  
  // Mostrar modal
  modal.style.display = "flex";
  
  // Función para guardar
  const handleSave = () => {
    const newPhone = newPhoneInput.value.trim();
    
    // Validar que no esté vacío
    if (newPhone === "") {
      if (errorMessage) {
        errorMessage.textContent = "❌ Por favor ingresa un número de teléfono";
        errorMessage.style.display = "block";
      }
      return;
    }
    
    // Limpiar solo números
    let cleanPhone = newPhone.replace(/[^0-9]/g, '');
    
    // Validar longitud
    if (cleanPhone.length !== 10) {
      if (errorMessage) {
        errorMessage.textContent = "❌ Número inválido. Debe tener exactamente 10 dígitos.";
        errorMessage.style.display = "block";
      }
      return;
    }
    
    // Guardar número
    localStorage.setItem("client_phone", cleanPhone);
    updateSavedPhoneDisplay();
    showTemporaryMessage("✅ ¡Número actualizado correctamente!", "success");
    
    // Cerrar modal
    modal.style.display = "none";
    cleanup();
  };
  
  // Función para cerrar sin guardar
  const handleClose = () => {
    modal.style.display = "none";
    cleanup();
  };
  
  // Limpiar event listeners
  const cleanup = () => {
    saveBtn.removeEventListener("click", handleSave);
    closeBtn.removeEventListener("click", handleClose);
    // También remover el evento de tecla Enter
    newPhoneInput.removeEventListener("keypress", handleKeyPress);
  };
  
  // Evento de tecla Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  
  // Agregar event listeners
  saveBtn.addEventListener("click", handleSave);
  closeBtn.addEventListener("click", handleClose);
  newPhoneInput.addEventListener("keypress", handleKeyPress);
  
  // Cerrar al hacer clic fuera del modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      handleClose();
    }
  }, { once: true });
}

// Función para eliminar el número (opcional, si quieres mantener la opción)
function deletePhoneNumber() {
  if (confirm("¿Eliminar tu número guardado? Deberás ingresarlo nuevamente en tu próxima compra.")) {
    localStorage.removeItem("client_phone");
    updateSavedPhoneDisplay();
    showTemporaryMessage("📱 Número eliminado", "success");
  }
}

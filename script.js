const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";
const WHATSAPP_NUMBER = "528671781272"; 

const PAGE_SIZE = 10;

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 10;
let isLoading = false;

let cart = {};
let imageObserver = null;

const sliderState = new Map(); // productId -> index actual

let initialHashHandled = false;

const SECRET_TAPS_REQUIRED = 5;
let secretTapCount = 0;
let secretTapTimeout = null;
const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; 




const API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";

async function pagarConMercadoPago() {
  const items = Object.values(cart).map(item => ({
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
    // ✅ Usar GET en lugar de POST (evita problemas de CORS)
    const params = new URLSearchParams({
      action: "createPreference",
      items: JSON.stringify(items)
    });
    
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET"  // Cambiado a GET
    });
    
    const data = await response.json();
    console.log("Respuesta:", data);
    
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






/**
 * Verificar estado de pago al cargar la página
 */
function verificarEstadoPago() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get("payment");
  
  if (paymentStatus === "success") {
    // Vaciar carrito
    cart = {};
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    
    // Mostrar mensaje de éxito
    alert("🎉 ¡Pago completado con éxito!\n\nGracias por tu compra. Recibirás un correo de confirmación.");
    
    // Limpiar URL (remover parámetros)
    window.history.replaceState({}, document.title, window.location.pathname);
    
  } else if (paymentStatus === "failure") {
    alert("❌ El pago no pudo completarse.\n\nPor favor, intenta nuevamente o usa otro método de pago.");
    window.history.replaceState({}, document.title, window.location.pathname);
    
  } else if (paymentStatus === "pending") {
    alert("⏳ Tu pago está siendo procesado.\n\nTe notificaremos por correo cuando se confirme.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Función auxiliar para mostrar loader (si no existe)
 */
function showLoader(message = "Procesando...") {
  let loader = document.getElementById("global-loader");
  if (!loader) {
    // Crear loader si no existe
    loader = document.createElement("div");
    loader.id = "global-loader";
    loader.className = "global-loader";
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <div class="loader-text">${message}</div>
    `;
    document.body.appendChild(loader);
  } else {
    const textEl = loader.querySelector(".loader-text");
    if (textEl) textEl.textContent = message;
    loader.classList.remove("hidden");
  }
}

function hideLoader() {
  const loader = document.getElementById("global-loader");
  if (loader) loader.classList.add("hidden");
}









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
// Mapeo de categorías a género
function getGenderFromCategory(categoria) {
  if (!categoria) return null;
  
  const categoriaLower = categoria.toLowerCase().trim();
  
  // HOMBRE
  if (categoriaLower === "playeras") return "HOMBRE";
  if (categoriaLower === "pantalon para caballero") return "HOMBRE";
  if (categoriaLower === "short para caballero") return "HOMBRE";
  if (categoriaLower === "calzado para caballero") return "HOMBRE";
  if (categoriaLower === "sueter para caballero") return "HOMBRE";
  if (categoriaLower === "chamarra para caballero") return "HOMBRE";
  
  // MUJER
  if (categoriaLower === "blusas") return "MUJER";
  if (categoriaLower === "pantalon para dama") return "MUJER";
  if (categoriaLower === "short para dama") return "MUJER";
  if (categoriaLower === "vestidos") return "MUJER";
  if (categoriaLower === "calzado para dama") return "MUJER";
  if (categoriaLower === "sueter para dama") return "MUJER";
  if (categoriaLower === "chamarra para dama") return "MUJER";
  
  return null;
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}

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
    }, {
      rootMargin: "50px 0px",
      threshold: 0.01,
    });
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

let productsCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutos
};

async function fetchProducts(force = false) {
  // 1. Mostrar productos del caché inmediatamente
  if (!force) {
    const cached = getCachedProducts();
    if (cached && cached.length > 0) {
      allProducts = cached;
      filteredProducts = [...allProducts];
      currentPage = 1;
      renderProductsPage(true);
      populateCategoryFilter(document.getElementById("gender-filter").value);
      handleInitialHash();
      // Seguir cargando en segundo plano para actualizar
      loadProductsInBackground();
      return;
    }
  }
  
  // 2. Si no hay caché, cargar con loader
  isLoading = true;
  showLoader("Cargando productos...");
  
  try {
    const res = await fetch(SHEET_API_URL);
    const data = await res.json();
    allProducts = (data.products || data || []).slice(0, 500);
    
    // Guardar en caché
    setCachedProducts(allProducts);
    
    filteredProducts = [...allProducts];
    currentPage = 1;
    renderProductsPage(true);
    populateCategoryFilter(document.getElementById("gender-filter").value);
    handleInitialHash();
  } catch (err) {
    console.error(err);
    // Si falla, intentar usar caché aunque esté expirado
    const staleCache = localStorage.getItem(CACHE_KEY);
    if (staleCache) {
      const { data } = JSON.parse(staleCache);
      if (data && data.length > 0) {
        allProducts = data;
        filteredProducts = [...allProducts];
        renderProductsPage(true);
        populateCategoryFilter(document.getElementById("gender-filter").value);
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
    
    // Solo actualizar si hay cambios
    if (JSON.stringify(freshProducts) !== JSON.stringify(allProducts)) {
      allProducts = freshProducts;
      setCachedProducts(allProducts);
      filteredProducts = [...allProducts];
      renderProductsPage(true);
      populateCategoryFilter(document.getElementById("gender-filter").value);
    }
  } catch (err) {
    console.error("Error en carga background:", err);
  }
}



function applyFilters() {
  const searchValue = document
    .getElementById("search-input")
    .value.trim()
    .toLowerCase();
  const categoryValue = document.getElementById("category-filter").value;
  const genderValue = document.getElementById("gender-filter").value;
  const sortValue = document.getElementById("sort-select").value;

  // Actualizar las opciones de categorías según el género seleccionado
  populateCategoryFilter(genderValue);

  filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      !searchValue ||
      (p.Nombre || "").toLowerCase().includes(searchValue) ||
      (p.Descripcion || "").toLowerCase().includes(searchValue);
    
    const matchesCategory =
      !categoryValue || (p.Categoria || "") === categoryValue;
    
    // Filtrar por género basado en la categoría
    let matchesGender = true;
    if (genderValue) {
      const productGender = getGenderFromCategory(p.Categoria);
      matchesGender = productGender === genderValue;
    }
    
    return matchesSearch && matchesCategory && matchesGender;
  });

  if (sortValue === "price-asc") {
    filteredProducts.sort(
      (a, b) => Number(a.Precio || 0) - Number(b.Precio || 0)
    );
  } else if (sortValue === "price-desc") {
    filteredProducts.sort(
      (a, b) => Number(b.Precio || 0) - Number(a.Precio || 0)
    );
  }

  currentPage = 1;
  renderProductsPage(true);
}


// Reemplaza la función populateCategoryFilter con esta versión:
function populateCategoryFilter(genderFilter = null) {
  const select = document.getElementById("category-filter");
  if (!select) return;
  
  // Guardar el valor actualmente seleccionado
  const currentValue = select.value;
  
  // Obtener el género seleccionado (si no se pasa, obtener del selector)
  if (genderFilter === null) {
    const genderSelect = document.getElementById("gender-filter");
    if (genderSelect) {
      genderFilter = genderSelect.value;
    }
  }
  
  const categories = new Set();
  
  allProducts.forEach((p) => {
    if (p.Categoria) {
      // Si hay filtro de género, solo incluir categorías que pertenezcan a ese género
      if (genderFilter) {
        const productGender = getGenderFromCategory(p.Categoria);
        if (productGender === genderFilter) {
          categories.add(p.Categoria);
        }
      } else {
        categories.add(p.Categoria);
      }
    }
  });
  
  select.innerHTML = '<option value="">Todas las categorías</option>';
  Array.from(categories)
    .sort()
    .forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  
  // Restaurar el valor seleccionado si aún existe en las nuevas opciones
  if (currentValue && categories.has(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = ""; // Si no existe, seleccionar "Todas"
  }
}

function renderProductsPage(reset = false) {
  const container = document.getElementById("products-container");
  
  if (!container) {
    console.error("Container no encontrado");
    return;
  }

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
    if (i === currentPage) {
      btn.classList.add("active-page");
    }
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
  const {
    ID,
    Nombre,
    Precio,
    Stock,
    Descripcion,
    Talla,
    Categoria,
    Imagen1,
    Imagen2,
    Imagen3,
    Badge,
  } = product;

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `producto-${ID}`;

  const cleanup = () => {
    if (imageObserver) {
      const images = card.querySelectorAll('img');
      images.forEach(img => imageObserver.unobserve(img));
    }
  };
  card.addEventListener('remove', cleanup);

  // ========== SLIDER DE IMÁGENES ==========
  const slider = document.createElement("div");
  slider.className = "product-slider";
  slider.dataset.productId = ID;

  const track = document.createElement("div");
  track.className = "product-slider-track";

  const images = [Imagen1, Imagen2, Imagen3]
    .map((u) => optimizeDriveUrl(u))
    .filter(Boolean);

  if (images.length === 0) {
    images.push(
      "https://via.placeholder.com/600x800/3b1f5f/ffffff?text=Sin+imagen"
    );
  }

  images.forEach((url, index) => {
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

  // Badge (Nuevo, Oferta, etc.)
  if (Badge) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "product-badge";
    badgeEl.textContent = Badge;
    slider.appendChild(badgeEl);
  }

  attachSliderEvents(slider, images.length);

  // ========== INFO DEL PRODUCTO ==========
  const info = document.createElement("div");
  info.className = "product-info";

  // Fila: Título + Precio
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

  // Meta: Categoría, Género, Stock (simplificado)
  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";

  // Categoría
  if (Categoria) {
    const categoryEl = document.createElement("span");
    categoryEl.className = "category-badge";
    categoryEl.textContent = Categoria;
    metaRow.appendChild(categoryEl);
  }
  
  // Género
  // En createProductCard, busca esta sección (aproximadamente línea 280-300):

// Género
const gender = getGenderFromCategory(Categoria);
if (gender) {
  const genderBadge = document.createElement("span");
  genderBadge.className = `gender-badge gender-${gender.toLowerCase()}`;
  
  // Modificar aquí: si es UNISEX, no mostrar ícono o mostrar uno diferente
  if (gender === "UNISEX") {
    genderBadge.textContent = ""; // O puedes dejarlo vacío: ""
    genderBadge.style.background = "#9b59b6"; // Color morado para unisex
  } else if (gender === "HOMBRE") {
    genderBadge.textContent = "👔";
  } else if (gender === "MUJER") {
    genderBadge.textContent = "👗";
  }
  
  metaRow.appendChild(genderBadge);
}

  // Stock - Solo muestra el número real
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

  // Descripción
  const descEl = document.createElement("p");
  descEl.className = "product-description";
  descEl.textContent = Descripcion || "";

  // Talla
  const sizesEl = document.createElement("div");
  sizesEl.className = "product-sizes";
  sizesEl.textContent = product.Talla || "Única";

  // Ensamblar info
  info.appendChild(titleRow);
  info.appendChild(metaRow);
  info.appendChild(descEl);
  info.appendChild(sizesEl);

  // ========== ACCIONES ==========
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

  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  function updateSlider(index) {
    const normalizedIndex = ((index % totalSlides) + totalSlides) % totalSlides;
    sliderState.set(productId, normalizedIndex);
    track.style.transform = `translateX(-${normalizedIndex * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === normalizedIndex);
    });
  }

  function handleStart(x) {
    isDragging = true;
    startX = x;
    currentX = x;
  }

  function handleMove(x) {
    if (!isDragging) return;
    currentX = x;
  }

  function handleEnd() {
    if (!isDragging) return;
    const deltaX = currentX - startX;
    const threshold = 40;
    let index = sliderState.get(productId) || 0;
    if (deltaX < -threshold) {
      index += 1;
    } else if (deltaX > threshold) {
      index -= 1;
    }
    updateSlider(index);
    isDragging = false;
  }

  slider.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX);
  });

  slider.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX);
  });

  slider.addEventListener("touchend", handleEnd);

  slider.addEventListener("mousedown", (e) => {
    handleStart(e.clientX);
  });

  slider.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  });

  slider.addEventListener("mouseup", handleEnd);
  slider.addEventListener("mouseleave", () => {
    if (isDragging) handleEnd();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.index);
      updateSlider(index);
    });
  });

  setInterval(() => {
    const currentIndex = sliderState.get(productId) || 0;
    updateSlider(currentIndex + 1);
  }, 6000);
}

function openImageModal(url) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const overlay = document.getElementById("overlay");
  img.src = url;
  modal.classList.add("open");
  overlay.classList.add("visible");
}

function closeImageModal() {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const overlay = document.getElementById("overlay");
  modal.classList.remove("open");
  overlay.classList.remove("visible");
  img.src = "";
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem("cart");
    cart = raw ? JSON.parse(raw) : {};
  } catch {
    cart = {};
  }
  updateCartBadge();
}

function saveCartToStorage() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartBadge() {
  const countEl = document.getElementById("cart-count");
  const totalQty = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  countEl.textContent = totalQty;
}

function addToCart(product) {
  const id = product.ID;

  if (!cart[id]) {
    cart[id] = {
      id: product.ID,
      name: product.Nombre,
      price: Number(product.Precio || 0),
      quantity: 0,
      Imagen1: product.Imagen1 || ""
    };
  }
  cart[id].quantity += 1;
  saveCartToStorage();
  updateCartBadge();
  animateCartAdd();
  scheduleCartRender();
}

function animateCartAdd() {
  const btn = document.getElementById("floating-cart-btn");
  btn.style.transform = "translateY(-4px) scale(1.05)";
  btn.style.boxShadow = "0 18px 32px rgba(0,0,0,0.5)";
  setTimeout(() => {
    btn.style.transform = "";
    btn.style.boxShadow = "";
  }, 180);
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  drawer.classList.add("open");
  overlay.classList.add("visible");
  drawer.setAttribute("aria-hidden", "false");
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  drawer.classList.remove("open");
  overlay.classList.remove("visible");
  drawer.setAttribute("aria-hidden", "true");
}

function renderCart() {
  const container = document.getElementById("cart-items-container");
  container.innerHTML = "";
  const items = Object.values(cart);
  if (items.length === 0) {
    container.innerHTML =
      '<p class="helper-text">Tu carrito está vacío.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";

      const info = document.createElement("div");
      info.className = "cart-item-info";

      const title = document.createElement("div");
      title.className = "cart-item-title";
      title.textContent = item.name || `ID ${item.id}`;

      const meta = document.createElement("div");
      meta.className = "cart-item-meta";
      meta.textContent = `${formatCurrency(item.price)} c/u`;

      const actions = document.createElement("div");
      actions.className = "cart-item-actions";

      const minusBtn = document.createElement("button");
      minusBtn.className = "qty-btn";
      minusBtn.textContent = "−";
      minusBtn.addEventListener("click", () => changeCartQty(item.id, -1));

      const qtyValue = document.createElement("span");
      qtyValue.className = "qty-value";
      qtyValue.textContent = item.quantity;

      const plusBtn = document.createElement("button");
      plusBtn.className = "qty-btn";
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () => changeCartQty(item.id, 1));

      const removeBtn = document.createElement("button");
      removeBtn.className = "cart-item-remove";
      removeBtn.textContent = "Eliminar";
      removeBtn.addEventListener("click", () => removeFromCart(item.id));

      actions.appendChild(minusBtn);
      actions.appendChild(qtyValue);
      actions.appendChild(plusBtn);
      actions.appendChild(removeBtn);

      info.appendChild(title);
      info.appendChild(meta);
      info.appendChild(actions);

      row.appendChild(info);
      container.appendChild(row);
    });
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  document.getElementById("cart-subtotal").textContent =
    formatCurrency(subtotal);
  document.getElementById("cart-total").textContent =
    formatCurrency(subtotal);
}

function changeCartQty(id, delta) {
  if (!cart[id]) return;
  cart[id].quantity += delta;
  if (cart[id].quantity <= 0) {
    delete cart[id];
  }
  saveCartToStorage();
  updateCartBadge();
  scheduleCartRender();
}

function removeFromCart(id) {
  if (!cart[id]) return;
  delete cart[id];
  saveCartToStorage();
  updateCartBadge();
  renderCart();
}

function buildWhatsAppMessage() {
  const items = Object.values(cart);
  if (items.length === 0) return "";

  let message = "Hola, quiero comprar:%0A%0A";
  items.forEach((item) => {
    message += `ID ${encodeURIComponent(item.id)} - ${
      item.quantity
    } pieza${item.quantity > 1 ? "s" : ""}%0A`;
  });

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  message += `%0ATotal: ${encodeURIComponent(formatCurrency(total))}`;
  return message;
}
// Agregar esta función para generar ID único
function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// Reemplazar la función openWhatsAppCheckout por esta versión modificada
async function openWhatsAppCheckout() {
  const items = Object.values(cart);
  if (items.length === 0) {
    alert("No hay productos en el carrito");
    return;
  }
  
  showLoader("Enviando solicitud...");
  
  // Generar ID único para esta solicitud
  const requestId = generateRequestId();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Guardar solicitud en localStorage para recuperar después
  const purchaseRequest = {
    id: requestId,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.Imagen1 || ""
    })),
    total: total,
    timestamp: Date.now(),
    status: 'pending',
    paymentLink: null
  };
  
  localStorage.setItem('pending_purchase_' + requestId, JSON.stringify(purchaseRequest));
  
  try {
    // Enviar notificación al admin (tu sistema existente)
    const notificationItems = items.map(item => ({
      productId: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      imagen: item.Imagen1 || ""
    }));
    
    await fetch(SHEET_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createNotification",
        items: notificationItems,
        requestId: requestId  // Añadir requestId a la notificación
      })
    });
    
    // Limpiar carrito
    cart = {};
    saveCartToStorage();
    updateCartBadge();
    renderCart();
    
    // Mostrar mensaje de espera
    alert("✅ Solicitud enviada al administrador.\n\nEspera la confirmación, el link de pago aparecerá aquí automáticamente cuando sea aprobado.");
    
    // Cerrar drawer y empezar a escuchar confirmación
    closeCartDrawer();
    
    // Iniciar polling para verificar si la solicitud fue confirmada
    startWaitingForConfirmation(requestId);
    
  } catch(err) {
    console.error("Error:", err);
    alert("Error al enviar la solicitud");
  } finally {
    hideLoader();
  }
}

// Función para esperar confirmación del admin
function startWaitingForConfirmation(requestId) {
  // Mostrar estado en el carrito
  showWaitingStatusInCart(requestId);
  
  // Hacer polling cada 3 segundos
  const intervalId = setInterval(async () => {
    const stored = localStorage.getItem('pending_purchase_' + requestId);
    if (!stored) {
      // Solicitud eliminada o expirada
      clearInterval(intervalId);
      removeWaitingStatus();
      return;
    }
    
    const request = JSON.parse(stored);
    
    if (request.status === 'approved' && request.paymentLink) {
      // ¡Solicitud aprobada! Mostrar link de pago
      clearInterval(intervalId);
      showPaymentLinkInCart(request.paymentLink, requestId);
    } else if (request.status === 'rejected') {
      clearInterval(intervalId);
      showRejectedStatus();
    }
  }, 3000);
}

function showWaitingStatusInCart(requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  // Guardar estado actual del carrito para restaurar después
  const originalContent = container.innerHTML;
  
  container.innerHTML = `
    <div class="waiting-status" style="text-align: center; padding: 40px 20px;">
      <div class="loader-spinner" style="margin: 0 auto 16px;"></div>
      <h3>⏳ Esperando confirmación del administrador</h3>
      <p style="color: #666; font-size: 14px; margin-top: 8px;">
        Solicitud ID: <strong>${requestId}</strong><br>
        El admin verificará el stock y te dará respuesta en unos momentos.
      </p>
      <button onclick="cancelRequest('${requestId}')" class="primary-button secondary" style="margin-top: 16px;">
        Cancelar solicitud
      </button>
    </div>
  `;
}

function showPaymentLinkInCart(paymentLink, requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 30px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <h3 style="color: #22c55e;">¡Solicitud aprobada!</h3>
      <p style="color: #666; margin: 16px 0;">
        El administrador ha confirmado el stock.
      </p>
      <div style="background: #f0f0f8; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="font-size: 12px; color: #666; margin-bottom: 8px;">🔗 Link de pago seguro:</p>
        <a href="${paymentLink}" target="_blank" 
           style="display: block; word-break: break-all; color: #009ee3; font-size: 12px; margin-bottom: 12px;">
          ${paymentLink}
        </a>
        <button onclick="window.open('${paymentLink}', '_blank')" 
                class="primary-button" style="width: 100%; background: linear-gradient(135deg, #009ee3, #00a3e8);">
          💳 Ir a pagar con Mercado Pago
        </button>
      </div>
      <p style="font-size: 11px; color: #999;">
        ⚠️ El enlace expira en 30 minutos
      </p>
      <button onclick="closeCartDrawer(); removePendingRequest('${requestId}')" 
              class="text-button" style="margin-top: 12px;">
        Cerrar
      </button>
    </div>
  `;
}

function showRejectedStatus() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3 style="color: #ef4444;">Solicitud rechazada</h3>
      <p style="color: #666; margin: 16px 0;">
        Lo sentimos, no hay suficiente stock para completar tu compra.
      </p>
      <button onclick="location.reload()" class="primary-button">
        Volver al catálogo
      </button>
    </div>
  `;
}

function cancelRequest(requestId) {
  if (confirm("¿Cancelar esta solicitud de compra?")) {
    localStorage.removeItem('pending_purchase_' + requestId);
    renderCart(); // Restaurar carrito vacío
    alert("Solicitud cancelada");
  }
}

function removeWaitingStatus() {
  renderCart();
}

function removePendingRequest(requestId) {
  localStorage.removeItem('pending_purchase_' + requestId);
  renderCart();
}
function shareProduct(id) {
  const url = `${window.location.origin}${window.location.pathname}#producto-${id}`;
  if (navigator.share) {
    navigator
      .share({
        title: "Producto",
        text: "Mira este producto",
        url,
      })
      .catch(() => {});
  } else {
    navigator.clipboard
      .writeText(url)
      .then(() => alert("Enlace copiado al portapapeles"))
      .catch(() => {});
  }
}

function handleInitialHash() {
  if (initialHashHandled) return;
  initialHashHandled = true;
  const hash = window.location.hash;
  if (!hash) return;
  const id = hash.replace("#", "");
  const el = document.getElementById(id);
  if (el) {
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
  }
}

function handleSecretTap() {
  secretTapCount += 1;

  if (secretTapTimeout) clearTimeout(secretTapTimeout);
  secretTapTimeout = setTimeout(() => {
    secretTapCount = 0;
  }, 2000);

  if (secretTapCount >= SECRET_TAPS_REQUIRED) {
    secretTapCount = 0;
    window.location.href = "admin.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  createImageObserver();
  loadCartFromStorage();
  renderCart();
  fetchProducts();

  let searchDebounceTimeout;
  document.getElementById("search-input").addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  });

  document.getElementById("gender-filter").addEventListener("change", () => {
    // Primero actualizar las opciones de categorías
    const genderValue = document.getElementById("gender-filter").value;
    populateCategoryFilter(genderValue);
    // Luego aplicar los filtros
    applyFilters();
  });
  
  document.getElementById("category-filter").addEventListener("change", () => applyFilters());
  document.getElementById("sort-select").addEventListener("change", () => applyFilters());

  document.getElementById("floating-cart-btn").addEventListener("click", () => {
    openCartDrawer();
  });

  document.getElementById("close-cart-btn").addEventListener("click", () => {
    closeCartDrawer();
  });

  document.getElementById("overlay").addEventListener("click", () => {
    closeCartDrawer();
    closeImageModal();
  });

  document.getElementById("close-image-modal").addEventListener("click", () => {
    closeImageModal();
  });

  document.getElementById("refresh-btn").addEventListener("click", () => {
    if (!isLoading) fetchProducts(true);
  });

  document.getElementById("secret-logo").addEventListener("click", handleSecretTap);

  // ✅ NUEVO: Verificar estado de pago al cargar (cuando vuelven de Mercado Pago)
  verificarEstadoPago();

  // ✅ NUEVO: Agregar evento al botón de Mercado Pago
  const mpBtn = document.getElementById("mp-checkout-btn");
  if (mpBtn) {
    mpBtn.addEventListener("click", pagarConMercadoPago);
  }


// En script.js y looks.js - agregar:
const requestBtn = document.getElementById("request-purchase-btn");
if (requestBtn) {
  requestBtn.addEventListener("click", openWhatsAppCheckout);
}





});
function showLoader(text="Cargando..."){
  const loader = document.getElementById("global-loader");
  if(!loader) return;

  loader.querySelector(".loader-text").textContent = text;
  loader.classList.remove("hidden");
}

function hideLoader(){
  const loader = document.getElementById("global-loader");
  if(!loader) return;

  loader.classList.add("hidden");
}

let cartRenderScheduled = false;

function scheduleCartRender() {
  if (cartRenderScheduled) return;
  cartRenderScheduled = true;
  requestAnimationFrame(() => {
    renderCart();
    cartRenderScheduled = false;
  });
}


function getGenderFromCategory(categoria) {
  if (!categoria) return null;
  
  const categoriaLower = categoria.toLowerCase().trim();
  
  // HOMBRE
  if (categoriaLower === "playeras") return "HOMBRE";
  if (categoriaLower === "pantalon para caballero") return "HOMBRE";
  if (categoriaLower === "short para caballero") return "HOMBRE";
  if (categoriaLower === "calzado para caballero") return "HOMBRE";
  if (categoriaLower === "sueter para caballero") return "HOMBRE";
  if (categoriaLower === "chamarra para caballero") return "HOMBRE";
  
  // MUJER
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


// Variable para almacenar el ID de la solicitud activa
let activeRequestId = null;
let pollingInterval = null;

// Función para iniciar la espera de confirmación
function startWaitingForConfirmation(requestId) {
  activeRequestId = requestId;
  
  // Mostrar estado de espera en el carrito
  showWaitingStatusInCart(requestId);
  
  // Iniciar polling cada 3 segundos
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    if (!activeRequestId) {
      if (pollingInterval) clearInterval(pollingInterval);
      return;
    }
    
    try {
      const response = await fetch(`${SHEET_API_URL}?action=checkRequestStatus&requestId=${activeRequestId}`);
      const data = await response.json();
      
      console.log("Polling response:", data);
      
      if (data.ok && data.status === 'approved' && data.paymentLink) {
        // ¡Solicitud aprobada!
        clearInterval(pollingInterval);
        pollingInterval = null;
        
        // Actualizar localStorage
        const stored = localStorage.getItem('pending_purchase_' + activeRequestId);
        if (stored) {
          const request = JSON.parse(stored);
          request.status = 'approved';
          request.paymentLink = data.paymentLink;
          localStorage.setItem('pending_purchase_' + activeRequestId, JSON.stringify(request));
        }
        
        // Mostrar link de pago en el carrito
        showPaymentLinkInCart(data.paymentLink, activeRequestId);
        activeRequestId = null;
      } else if (data.ok && data.status === 'rejected') {
        clearInterval(pollingInterval);
        pollingInterval = null;
        showRejectedStatus();
        activeRequestId = null;
      }
    } catch (err) {
      console.error("Error checking request status:", err);
    }
  }, 3000);
}

function showWaitingStatusInCart(requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div class="waiting-status" style="text-align: center; padding: 40px 20px;">
      <div class="loader-spinner" style="margin: 0 auto 16px; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #ff4f81; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <h3 style="color: #3b1f5f;">⏳ Esperando confirmación del administrador</h3>
      <p style="color: #666; font-size: 14px; margin-top: 8px;">
        Solicitud ID: <strong>${requestId}</strong><br>
        El admin verificará el stock y te dará respuesta en unos momentos.<br>
        No cierres esta ventana.
      </p>
      <button onclick="cancelRequest('${requestId}')" style="margin-top: 16px; background: #ef4444; color: white; border: none; padding: 8px 24px; border-radius: 20px; cursor: pointer;">
        Cancelar solicitud
      </button>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

function showPaymentLinkInCart(paymentLink, requestId) {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 30px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <h3 style="color: #22c55e;">¡Solicitud aprobada!</h3>
      <p style="color: #666; margin: 16px 0;">
        El administrador ha confirmado el stock.
      </p>
      <div style="background: #f0f0f8; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="font-size: 12px; color: #666; margin-bottom: 8px;">🔗 Link de pago seguro:</p>
        <a href="${paymentLink}" target="_blank" 
           style="display: block; word-break: break-all; color: #009ee3; font-size: 12px; margin-bottom: 12px;">
          ${paymentLink}
        </a>
        <button onclick="window.open('${paymentLink}', '_blank')" 
                class="primary-button" style="width: 100%; background: linear-gradient(135deg, #009ee3, #00a3e8);">
          💳 Ir a pagar con Mercado Pago
        </button>
      </div>
      <p style="font-size: 11px; color: #999;">
        ⚠️ El enlace expira en 30 minutos
      </p>
      <button onclick="closeCartDrawer(); removePendingRequest('${requestId}')" 
              class="text-button" style="margin-top: 12px;">
        Cerrar
      </button>
    </div>
  `;
}

function showRejectedStatus() {
  const container = document.getElementById("cart-items-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3 style="color: #ef4444;">Solicitud rechazada</h3>
      <p style="color: #666; margin: 16px 0;">
        Lo sentimos, no hay suficiente stock para completar tu compra.
      </p>
      <button onclick="location.reload()" class="primary-button">
        Volver al catálogo
      </button>
    </div>
  `;
}

function cancelRequest(requestId) {
  if (confirm("¿Cancelar esta solicitud de compra?")) {
    localStorage.removeItem('pending_purchase_' + requestId);
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = null;
    activeRequestId = null;
    renderCart(); // Restaurar carrito vacío
    alert("Solicitud cancelada");
  }
}

function removePendingRequest(requestId) {
  localStorage.removeItem('pending_purchase_' + requestId);
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = null;
  activeRequestId = null;
  renderCart();
}


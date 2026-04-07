// ============================================
// ADMIN.JS - Panel de administración
// ============================================

const ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbzNshrt3zldBNiyoB8x36ktCEO02H0cKxebiTuK7UAbsgd5R9biaCW7W4ihm1aVOJG7ww/exec";

let adminSession = null;
let adminProducts = [];
let adminCurrentPage = 1;
let adminFilteredProducts = [];
let adminProductsPerPage = 10;

// ========== FUNCIONES ESPECÍFICAS DE ADMIN ==========

async function apiRequest(method, body) {
  try {
    let url = ADMIN_API_URL;
    if (method === "GET" && body) {
      const params = new URLSearchParams(body);
      url += "?" + params.toString();
    }
    const options = {
      method: method === "POST" ? "POST" : "GET",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    };
    if (method === "POST" && body) {
      const params = new URLSearchParams(body);
      options.body = params.toString();
    }
    const res = await fetch(url, options);
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
  try {
    const data = await apiRequest("POST", { action: "login", password, token });
    if (!data || !data.ok) {
      alert("Credenciales incorrectas");
      return;
    }
    adminSession = data.session || "ok";
    document.getElementById("admin-login-view").hidden = true;
    document.getElementById("admin-panel-view").hidden = false;
    loadAdminProducts();
  } catch (err) {
    console.error(err);
    alert("Error al iniciar sesión");
  }
}

function handleAdminLogout() {
  adminSession = null;
  document.getElementById("admin-login-view").hidden = false;
  document.getElementById("admin-panel-view").hidden = true;
  document.getElementById("admin-login-form").reset();
}

async function loadAdminProducts() {
  try {
    const data = await apiRequest("GET");
    adminProducts = data.products || data || [];
    updateAdminStats();
    populateAdminCategoryFilter();
    adminCurrentPage = 1;
    renderAdminProductsWithFilters();
  } catch (err) {
    console.error(err);
    alert("Error al cargar productos");
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

function renderAdminProductsList(products) {
  const list = document.getElementById("admin-products-list");
  if (!list) return;
  
  list.innerHTML = "";
  if (!products || products.length === 0) {
    list.innerHTML = '<p class="helper-text" style="text-align:center; padding:40px;">No hay productos que coincidan con los filtros.</p>';
    return;
  }
  
  products.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    const stock = Number(p.Stock || 0);
    const stockClass = stock === 0 ? "out-stock" : (stock <= 5 ? "low-stock" : "");
    
    row.innerHTML = `
      <div class="admin-product-id">${p.ID || "N/A"}</div>
      <div class="admin-product-name">${escapeHtml(p.Nombre || "Sin nombre")}</div>
      <div class="admin-product-price">${formatCurrency(p.Precio)}</div>
      <div class="admin-product-stock ${stockClass}">${stock}</div>
      <div class="admin-product-actions">
        <button class="text-button edit-product-btn" data-id="${p.ID}">✏️ Editar</button>
        <button class="text-button delete-product-btn" data-id="${p.ID}" style="color:#d32f2f;">🗑️ Eliminar</button>
      </div>
    `;
    list.appendChild(row);
  });
  
  document.querySelectorAll(".edit-product-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const product = adminProducts.find(p => String(p.ID) === id);
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

function renderAdminPagination(totalPages) {
  const pagination = document.getElementById("admin-pagination");
  if (!pagination) return;
  pagination.innerHTML = "";
  if (totalPages <= 1) return;
  
  if (adminCurrentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Anterior";
    prevBtn.onclick = () => { adminCurrentPage--; renderAdminProductsWithFilters(); };
    pagination.appendChild(prevBtn);
  }
  
  let startPage = Math.max(1, adminCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === adminCurrentPage) btn.classList.add("active-page");
    btn.onclick = () => { adminCurrentPage = i; renderAdminProductsWithFilters(); };
    pagination.appendChild(btn);
  }
  
  if (adminCurrentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Siguiente →";
    nextBtn.onclick = () => { adminCurrentPage++; renderAdminProductsWithFilters(); };
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
  const outOfStock = adminProducts.filter(p => Number(p.Stock || 0) <= 0).length;
  const lowStock = adminProducts.filter(p => { const s = Number(p.Stock || 0); return s > 0 && s <= 5; }).length;
  
  const totalStockElem = document.getElementById("stat-total-products");
  const totalValueElem = document.getElementById("stat-total-stock");
  const outStockElem = document.getElementById("stat-out-of-stock");
  const lowStockElem = document.getElementById("stat-low-stock");
  
  if (totalStockElem) totalStockElem.textContent = totalProducts;
  if (totalValueElem) totalValueElem.textContent = formatCurrency(totalInventoryValue);
  if (outStockElem) outStockElem.textContent = outOfStock;
  if (lowStockElem) lowStockElem.textContent = lowStock;
}

function resetProductForm() {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-form-title").textContent = "Crear producto";
  clearImageUploads();
}

function fillFormForEdit(product) {
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
  document.getElementById("product-form-title").textContent = "Editar producto";
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
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
  try {
    let res;
    if (id) {
      res = await apiRequest("POST", { action: "update", id, ...data });
    } else {
      res = await apiRequest("POST", { action: "create", ...data });
    }
    if (!res || !res.ok) {
      alert("Error desde Apps Script");
      return;
    }
    resetProductForm();
    clearImageUploads();
    loadAdminProducts();
  } catch (err) {
    console.error(err);
    alert("Error al guardar el producto");
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  try {
    await apiRequest("POST", { action: "delete", id });
    loadAdminProducts();
  } catch (err) {
    console.error(err);
    alert("Error al eliminar el producto");
  }
}

// ========== SUBIDA DE IMÁGENES ==========
const UPLOAD_API_URL = ADMIN_API_URL;

function initImageUploads() {
  setupImageUpload("image-upload-1", "product-image1");
  setupImageUpload("image-upload-2", "product-image2");
  setupImageUpload("image-upload-3", "product-image3");
}

function setupImageUpload(fileInputId, textInputId) {
  const fileInput = document.getElementById(fileInputId);
  const textInput = document.getElementById(textInputId);
  const preview = document.getElementById("preview-" + fileInputId);
  const progress = document.getElementById("progress-" + fileInputId);
  if (!fileInput) return;
  
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    progress.style.width = "10%";
    try {
      const compressed = await compressImage(file);
      const base64 = compressed.split(",")[1];
      progress.style.width = "40%";
      const res = await fetch(UPLOAD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "uploadImage", fileName: file.name, mimeType: "image/jpeg", data: base64 })
      });
      progress.style.width = "70%";
      const json = await res.json();
      if (!json.ok) {
        alert("Error subiendo imagen: " + json.error);
        progress.style.width = "0%";
        return;
      }
      const imageUrl = "https://lh3.googleusercontent.com/d/" + json.id + "=w500-h500-c-rw";
      textInput.value = imageUrl;
      progress.style.width = "100%";
      setTimeout(() => progress.style.width = "0%", 800);
    } catch (err) {
      console.error(err);
      alert("Error subiendo imagen");
      progress.style.width = "0%";
    }
  });
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
      if (w > MAX || h > MAX) {
        if (w > h) { h *= MAX / w; w = MAX; }
        else { w *= MAX / h; h = MAX; }
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

function clearImageUploads() {
  const previews = document.querySelectorAll(".image-preview");
  const progressBars = document.querySelectorAll(".upload-progress");
  const fileInputs = document.querySelectorAll("input[type=file]");
  previews.forEach(img => { img.src = ""; img.style.display = "none"; });
  progressBars.forEach(bar => bar.style.width = "0%");
  fileInputs.forEach(input => input.value = "");
}

// ========== NOTIFICACIONES ==========
const NOTIF_API = ADMIN_API_URL + "?action=notifications";
let lastNotifCount = 0;

async function checkNotifications() {
  try {
    const res = await fetch(NOTIF_API);
    const data = await res.json();
    if (!data.ok) return;
    const notifications = data.notifications || [];
    const pendingNotifications = notifications.filter(n => n.STATUS === "pending");
    const count = pendingNotifications.length;
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    badge.textContent = count;
    if (count > lastNotifCount) animateBell();
    lastNotifCount = count;
  } catch(err) {
    console.log("notif error", err);
  }
}

function animateBell() {
  const bell = document.querySelector(".admin-notification-bell");
  bell.style.transform = "scale(1.2)";
  bell.style.color = "#ff4f81";
  setTimeout(() => { bell.style.transform = ""; bell.style.color = ""; }, 400);
}

function openNotifications() {
  window.location.href = "notificaciones.html";
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("admin-login-form")?.addEventListener("submit", handleAdminLogin);
  document.getElementById("admin-logout-btn")?.addEventListener("click", handleAdminLogout);
  document.getElementById("product-form")?.addEventListener("submit", handleProductFormSubmit);
  document.getElementById("reset-form-btn")?.addEventListener("click", resetProductForm);
  document.getElementById("admin-refresh-btn")?.addEventListener("click", loadAdminProducts);
  
  initImageUploads();
  checkNotifications();
  setInterval(checkNotifications, 10000);
  
  const adminSearch = document.getElementById("admin-search-input");
  const adminCategory = document.getElementById("admin-category-filter");
  const adminStock = document.getElementById("admin-stock-filter");
  
  if (adminSearch) adminSearch.addEventListener("input", () => { adminCurrentPage = 1; renderAdminProductsWithFilters(); });
  if (adminCategory) adminCategory.addEventListener("change", () => { adminCurrentPage = 1; renderAdminProductsWithFilters(); });
  if (adminStock) adminStock.addEventListener("change", () => { adminCurrentPage = 1; renderAdminProductsWithFilters(); });
});

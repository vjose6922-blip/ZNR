// ========== OFFLINE MANAGER - UNIFICADO ==========
// Maneja TODO el sistema offline: carrito, productos, imágenes, compras

// ========== 1. CONFIGURACIÓN GLOBAL ==========
const OFFLINE_DB_NAME = 'ZR_OfflineDB';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline_actions';
const OFFLINE_IMAGES_STORE = 'offline_images';

let offlineDB = null;
let isProcessingOffline = false;

// Tipos de acciones
const ACTION_TYPES = {
    ADD_TO_CART: 'add_to_cart',
    REMOVE_FROM_CART: 'remove_from_cart',
    UPDATE_CART_QTY: 'update_cart_qty',
    REQUEST_PURCHASE: 'request_purchase',
    CREATE_PRODUCT: 'create_product',
    UPDATE_PRODUCT: 'update_product',
    DELETE_PRODUCT: 'delete_product',
    UPLOAD_IMAGE: 'upload_image'
};

// ========== 2. INICIALIZAR INDEXEDDB ==========
function initOfflineDB() {
    return new Promise((resolve, reject) => {
        if (offlineDB && offlineDB.name === OFFLINE_DB_NAME) {
            resolve(offlineDB);
            return;
        }
        
        const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
        
        request.onerror = (event) => {
            console.error("❌ Error abriendo IndexedDB:", event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            offlineDB = event.target.result;
            console.log("✅ OfflineDB inicializada");
            updateOfflineBadge();
            resolve(offlineDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store para acciones pendientes
            if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
                const store = db.createObjectStore(OFFLINE_STORE_NAME, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }
            
            // Store para imágenes (datos grandes)
            if (!db.objectStoreNames.contains(OFFLINE_IMAGES_STORE)) {
                const imageStore = db.createObjectStore(OFFLINE_IMAGES_STORE, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                imageStore.createIndex('actionId', 'actionId', { unique: false });
            }
            
            console.log("📦 ObjectStores creados");
        };
    });
}

// ========== 3. AÑADIR ACCIÓN A LA COLA ==========
async function addOfflineAction(type, data, productId = null) {
    await initOfflineDB();
    
    const action = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 8),
        type: type,
        data: data,
        productId: productId,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
    };
    
    return new Promise((resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const request = store.add(action);
        
        request.onsuccess = () => {
            console.log(`📝 Acción "${type}" añadida a cola`);
            showOfflineMessage(getActionMessage(type));
            updateOfflineBadge();
            resolve(action);
        };
        
        request.onerror = (err) => reject(err);
    });
}

function getActionMessage(type) {
    const messages = {
        'add_to_cart': '📡 Producto agregado. Se sincronizará cuando haya internet.',
        'remove_from_cart': '📡 Eliminación guardada.',
        'update_cart_qty': '📡 Cantidad guardada.',
        'request_purchase': '📡 Solicitud guardada. Se enviará cuando haya internet.',
        'create_product': '📡 Producto guardado localmente. Se subirá cuando haya internet.',
        'update_product': '📡 Cambios guardados localmente.',
        'delete_product': '📡 Producto marcado para eliminar.',
        'upload_image': '📡 Imagen guardada. Se subirá cuando haya internet.'
    };
    return messages[type] || '📡 Acción guardada offline';
}

// ========== 4. OBTENER ACCIONES PENDIENTES ==========
async function getPendingActions() {
    await initOfflineDB();
    
    return new Promise((resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const index = store.index('status');
        const request = index.getAll('pending');
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (err) => reject(err);
    });
}

async function removeAction(actionId) {
    return new Promise((resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        const request = store.delete(actionId);
        
        request.onsuccess = () => resolve();
        request.onerror = (err) => reject(err);
    });
}

async function incrementRetry(actionId) {
    return new Promise(async (resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(OFFLINE_STORE_NAME);
        
        const getRequest = store.get(actionId);
        getRequest.onsuccess = () => {
            const action = getRequest.result;
            if (action) {
                action.retries++;
                const putRequest = store.put(action);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = (err) => reject(err);
            } else {
                resolve();
            }
        };
        getRequest.onerror = (err) => reject(err);
    });
}

// ========== 5. GUARDAR IMAGEN EN COLA ==========
async function queueImageUpload(file, productId, imageField) {
    await initOfflineDB();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const imageData = e.target.result;
            
            // Primero crear la acción principal
            const action = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 8),
                type: ACTION_TYPES.UPLOAD_IMAGE,
                data: {
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    productId: productId,
                    imageField: imageField
                },
                timestamp: Date.now(),
                retries: 0,
                status: 'pending'
            };
            
            const transaction = offlineDB.transaction([OFFLINE_STORE_NAME, OFFLINE_IMAGES_STORE], 'readwrite');
            const actionStore = transaction.objectStore(OFFLINE_STORE_NAME);
            const imageStore = transaction.objectStore(OFFLINE_IMAGES_STORE);
            
            // Guardar acción
            const actionRequest = actionStore.add(action);
            
            actionRequest.onsuccess = () => {
                // Guardar imagen asociada
                imageStore.add({
                    actionId: action.id,
                    imageData: imageData,
                    fileName: file.name
                });
                
                console.log(`📸 Imagen "${file.name}" guardada en cola`);
                showOfflineMessage(`📡 Imagen guardada. Se subirá cuando haya internet.`, 'warning');
                updateOfflineBadge();
                resolve({ queued: true, actionId: action.id });
            };
            
            actionRequest.onerror = (err) => reject(err);
        };
        
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

// ========== 6. PROCESAR TODA LA COLA ==========
async function processOfflineQueue() {
    if (isProcessingOffline) {
        console.log("⏳ Ya se está procesando la cola");
        return;
    }
    
    if (!navigator.onLine) {
        console.log("📡 Sin conexión, esperando...");
        return;
    }
    
    const pendingActions = await getPendingActions();
    if (pendingActions.length === 0) {
        return;
    }
    
    isProcessingOffline = true;
    console.log(`🔄 Procesando ${pendingActions.length} acciones pendientes...`);
    showOfflineSyncIndicator(true, pendingActions.length);
    
    for (let i = 0; i < pendingActions.length; i++) {
        const action = pendingActions[i];
        updateOfflineSyncProgress(i + 1, pendingActions.length);
        
        try {
            let success = false;
            
            switch (action.type) {
                case ACTION_TYPES.ADD_TO_CART:
                    success = await syncAddToCart(action.data);
                    break;
                case ACTION_TYPES.REMOVE_FROM_CART:
                    success = await syncRemoveFromCart(action.data);
                    break;
                case ACTION_TYPES.UPDATE_CART_QTY:
                    success = await syncUpdateCartQty(action.data);
                    break;
                case ACTION_TYPES.REQUEST_PURCHASE:
                    success = await syncRequestPurchase(action.data);
                    break;
                case ACTION_TYPES.CREATE_PRODUCT:
                    success = await syncCreateProduct(action.data);
                    break;
                case ACTION_TYPES.UPDATE_PRODUCT:
                    success = await syncUpdateProduct(action.productId, action.data);
                    break;
                case ACTION_TYPES.DELETE_PRODUCT:
                    success = await syncDeleteProduct(action.productId);
                    break;
                case ACTION_TYPES.UPLOAD_IMAGE:
                    success = await syncUploadImage(action.id, action.data);
                    break;
            }
            
            if (success) {
                await removeAction(action.id);
                console.log(`✅ Acción ${action.type} completada`);
            } else {
                await incrementRetry(action.id);
                console.log(`⚠️ Reintento ${action.retries + 1}/5 para ${action.type}`);
                
                if (action.retries + 1 >= 5) {
                    console.warn(`❌ Acción ${action.type} eliminada tras 5 reintentos`);
                    await removeAction(action.id);
                    showOfflineMessage(`⚠️ No se pudo completar una operación`, 'error');
                }
            }
            
        } catch (err) {
            console.error(`❌ Error procesando ${action.type}:`, err);
            await incrementRetry(action.id);
        }
        
        // Pequeña pausa entre operaciones
        await new Promise(r => setTimeout(r, 300));
    }
    
    isProcessingOffline = false;
    showOfflineSyncIndicator(false);
    updateOfflineBadge();
    
    const remaining = await getPendingActions();
    if (remaining.length === 0) {
        console.log("✅ Cola offline vacía");
        showOfflineMessage("✅ Todos los cambios sincronizados", "success");
        
        // Recargar datos si es necesario
        if (typeof loadAdminProducts === 'function') {
            loadAdminProducts();
        }
        if (typeof loadCartFromStorage === 'function') {
            loadCartFromStorage();
            if (typeof renderCart === 'function') renderCart();
        }
    }
}

// ========== 7. FUNCIONES DE SINCRONIZACIÓN ==========

async function syncAddToCart(data) {
    return new Promise((resolve) => {
        try {
            if (typeof window.addToCart === 'function') {
                window.addToCart(data.product);
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (err) {
            console.error(err);
            resolve(false);
        }
    });
}

async function syncRemoveFromCart(data) {
    return new Promise((resolve) => {
        try {
            if (typeof window.removeFromCart === 'function') {
                window.removeFromCart(data.productId);
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (err) {
            resolve(false);
        }
    });
}

async function syncUpdateCartQty(data) {
    return new Promise((resolve) => {
        try {
            if (typeof window.changeCartQty === 'function') {
                const cart = JSON.parse(localStorage.getItem('cart') || '{}');
                const currentQty = cart[data.productId]?.quantity || 0;
                const delta = data.quantity - currentQty;
                if (delta !== 0) {
                    window.changeCartQty(data.productId, delta);
                }
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (err) {
            resolve(false);
        }
    });
}

async function syncRequestPurchase(data) {
    try {
        if (typeof window.continueCheckout === 'function') {
            await window.continueCheckout();
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function syncCreateProduct(productData) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "create",
                ...productData
            }).toString()
        });
        const result = await response.json();
        return result.ok === true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function syncUpdateProduct(productId, productData) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "update",
                id: productId,
                ...productData
            }).toString()
        });
        const result = await response.json();
        return result.ok === true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function syncDeleteProduct(productId) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "delete",
                id: productId
            }).toString()
        });
        const result = await response.json();
        return result.ok === true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function syncUploadImage(actionId, data) {
    try {
        // Obtener la imagen de la store
        const imageData = await getQueuedImage(actionId);
        if (!imageData) return false;
        
        const base64 = imageData.split(',')[1];
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "uploadImage",
                fileName: data.fileName,
                mimeType: data.fileType,
                data: base64
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            const imageUrl = `https://lh3.googleusercontent.com/d/${result.id}=w400-h400-c-rw`;
            
            // Actualizar el campo correspondiente si existe
            const imageInput = document.getElementById(`product-${data.imageField.toLowerCase()}`);
            if (imageInput && imageInput.value.includes('[Pendiente de subir]')) {
                imageInput.value = imageUrl;
                imageInput.style.color = '';
            }
            
            // Eliminar imagen de la store
            await removeQueuedImage(actionId);
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function getQueuedImage(actionId) {
    return new Promise((resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(OFFLINE_IMAGES_STORE);
        const index = store.index('actionId');
        const request = index.get(actionId);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.imageData);
            } else {
                resolve(null);
            }
        };
        request.onerror = (err) => reject(err);
    });
}

async function removeQueuedImage(actionId) {
    return new Promise((resolve, reject) => {
        const transaction = offlineDB.transaction([OFFLINE_IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(OFFLINE_IMAGES_STORE);
        const index = store.index('actionId');
        const request = index.get(actionId);
        
        request.onsuccess = () => {
            if (request.result) {
                store.delete(request.result.id);
            }
            resolve();
        };
        request.onerror = (err) => reject(err);
    });
}

// ========== 8. UI - INDICADORES ==========

let offlineIndicator = null;

function showOfflineSyncIndicator(show, total = 0) {
    if (show && !offlineIndicator) {
        offlineIndicator = document.createElement('div');
        offlineIndicator.id = 'offline-sync-indicator';
        offlineIndicator.innerHTML = `
            <div class="offline-sync-content">
                <div class="offline-sync-spinner"></div>
                <div class="offline-sync-info">
                    <span>Sincronizando cambios...</span>
                    <small id="offline-sync-count">${total} operaciones pendientes</small>
                </div>
            </div>
        `;
        offlineIndicator.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #3b1f5f, #5a3b8a);
            color: white;
            border-radius: 12px;
            padding: 12px 20px;
            z-index: 10003;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 250px;
            font-size: 13px;
        `;
        document.body.appendChild(offlineIndicator);
    } else if (!show && offlineIndicator) {
        offlineIndicator.style.animation = 'fadeOutDown 0.3s ease';
        setTimeout(() => {
            if (offlineIndicator) offlineIndicator.remove();
            offlineIndicator = null;
        }, 300);
    }
}

function updateOfflineSyncProgress(current, total) {
    const countEl = document.getElementById('offline-sync-count');
    if (countEl) {
        countEl.textContent = `${current}/${total} operaciones`;
    }
}

function updateOfflineBadge() {
    // Función opcional para mostrar badge en UI
}

function showOfflineMessage(message, type = 'info') {
    if (typeof showTemporaryMessage === 'function') {
        showTemporaryMessage(message, type);
    } else {
        console.log(`[Offline] ${message}`);
    }
}

// ========== 9. INTERCEPTAR FUNCIONES GLOBALES ==========

function setupOfflineInterceptors() {
    // ===== CARRITO =====
    const originalAddToCart = window.addToCart;
    window.addToCart = function(product) {
        if (!navigator.onLine) {
            addOfflineAction(ACTION_TYPES.ADD_TO_CART, { product });
            if (originalAddToCart) originalAddToCart(product);
            return;
        }
        if (originalAddToCart) originalAddToCart(product);
    };
    
    const originalRemoveFromCart = window.removeFromCart;
    window.removeFromCart = function(productId) {
        if (!navigator.onLine) {
            addOfflineAction(ACTION_TYPES.REMOVE_FROM_CART, { productId });
            if (originalRemoveFromCart) originalRemoveFromCart(productId);
            return;
        }
        if (originalRemoveFromCart) originalRemoveFromCart(productId);
    };
    
    const originalChangeCartQty = window.changeCartQty;
    window.changeCartQty = function(productId, delta) {
        if (!navigator.onLine) {
            const cart = JSON.parse(localStorage.getItem('cart') || '{}');
            const newQuantity = (cart[productId]?.quantity || 0) + delta;
            addOfflineAction(ACTION_TYPES.UPDATE_CART_QTY, { productId, quantity: newQuantity });
            if (originalChangeCartQty) originalChangeCartQty(productId, delta);
            return;
        }
        if (originalChangeCartQty) originalChangeCartQty(productId, delta);
    };
    
    const originalContinueCheckout = window.continueCheckout;
    window.continueCheckout = async function() {
        if (!navigator.onLine) {
            await addOfflineAction(ACTION_TYPES.REQUEST_PURCHASE, {});
            showOfflineMessage("📡 Solicitud guardada. Se enviará cuando haya internet.", 'warning');
            return;
        }
        if (originalContinueCheckout) return await originalContinueCheckout();
    };
    
    // ===== ADMIN - CRUD PRODUCTOS =====
    const originalHandleSubmit = window.handleProductFormSubmit;
    if (originalHandleSubmit) {
        window.handleProductFormSubmit = async function(e) {
            e.preventDefault();
            
            const id = document.getElementById("product-id").value;
            const productData = {
                Nombre: document.getElementById("product-name")?.value.trim() || "",
                Precio: Number(document.getElementById("product-price")?.value || 0),
                Stock: Number(document.getElementById("product-stock")?.value || 0),
                Descripcion: document.getElementById("product-description")?.value.trim() || "",
                Talla: document.getElementById("product-sizes")?.value.trim() || "",
                Categoria: document.getElementById("product-category")?.value.trim() || "",
                Badge: document.getElementById("product-badge")?.value || "",
                Imagen1: document.getElementById("product-image1")?.value.trim() || "",
                Imagen2: document.getElementById("product-image2")?.value.trim() || "",
                Imagen3: document.getElementById("product-image3")?.value.trim() || "",
            };
            
            if (!navigator.onLine) {
                if (id) {
                    await addOfflineAction(ACTION_TYPES.UPDATE_PRODUCT, productData, id);
                } else {
                    await addOfflineAction(ACTION_TYPES.CREATE_PRODUCT, productData);
                }
                if (typeof resetProductForm === 'function') resetProductForm();
                showOfflineMessage("📡 Producto guardado localmente. Se sincronizará cuando haya internet.", "success");
                return;
            }
            
            await originalHandleSubmit(e);
        };
    }
    
    const originalDeleteProduct = window.deleteProduct;
    if (originalDeleteProduct) {
        window.deleteProduct = async function(id) {
            if (!navigator.onLine) {
                await addOfflineAction(ACTION_TYPES.DELETE_PRODUCT, null, id);
                const row = document.querySelector(`.admin-product-row button[data-id="${id}"]`)?.closest('.admin-product-row');
                if (row) row.remove();
                showOfflineMessage("📡 Producto marcado para eliminar.", 'warning');
                return;
            }
            await originalDeleteProduct(id);
        };
    }
    
    // ===== ADMIN - SUBIDA DE IMÁGENES =====
    const uploadFields = ['image-upload-1', 'image-upload-2', 'image-upload-3'];
    const imageFields = ['product-image1', 'product-image2', 'product-image3'];
    
    uploadFields.forEach((uploadId, index) => {
        const fileInput = document.getElementById(uploadId);
        if (fileInput && !fileInput._offlineIntercepted) {
            fileInput._offlineIntercepted = true;
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const productId = document.getElementById('product-id')?.value || 'new';
                const fieldNumber = index + 1;
                
                if (!navigator.onLine) {
                    const result = await queueImageUpload(file, productId, `Imagen${fieldNumber}`);
                    if (result.queued) {
                        const imageInput = document.getElementById(imageFields[index]);
                        if (imageInput) {
                            imageInput.value = '[Pendiente de subir] ' + file.name;
                            imageInput.style.color = '#f97316';
                        }
                        const preview = document.getElementById(`preview-${uploadId}`);
                        if (preview) {
                            preview.src = URL.createObjectURL(file);
                            preview.style.display = 'block';
                            preview.style.opacity = '0.6';
                        }
                    }
                } else {
                    // Si hay internet, usar la función original de subida
                    const originalUpload = window.setupImageUpload;
                    if (originalUpload) {
                        // Disparar el cambio normalmente
                        const event = new Event('change');
                        fileInput.dispatchEvent(event);
                    }
                }
            });
        }
    });
}

// ========== 10. MONITOREO DE CONEXIÓN ==========
window.addEventListener('online', () => {
    console.log("🟢 Conexión recuperada - Procesando cola offline...");
    showOfflineMessage("🟢 Conexión restablecida, sincronizando cambios...", "success");
    setTimeout(() => processOfflineQueue(), 1000);
});

window.addEventListener('offline', () => {
    console.log("🔴 Conexión perdida - Las acciones se guardarán");
    showOfflineMessage("📡 Sin conexión - Los cambios se guardarán automáticamente", "warning");
});

// ========== 11. INICIALIZACIÓN ==========
async function initOfflineManager() {
    await initOfflineDB();
    setupOfflineInterceptors();
    
    // Procesar cola si hay internet y hay acciones pendientes
    const pending = await getPendingActions();
    if (navigator.onLine && pending.length > 0) {
        setTimeout(() => processOfflineQueue(), 2000);
    }
    
    // Verificar periódicamente
    setInterval(async () => {
        const pendingActions = await getPendingActions();
        if (pendingActions.length > 0 && navigator.onLine && !isProcessingOffline) {
            processOfflineQueue();
        }
    }, 30000);
    
    console.log("✅ Offline Manager inicializado");
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOfflineManager);
} else {
    initOfflineManager();
}

// ========== 12. EXPORTAR FUNCIONES PARA DEBUG ==========
window.debugOfflineQueue = async () => {
    const actions = await getPendingActions();
    console.table(actions.map(a => ({
        type: a.type,
        productId: a.productId,
        retries: a.retries,
        timestamp: new Date(a.timestamp).toLocaleString()
    })));
    return actions;
};

window.clearOfflineQueue = async () => {
    await initOfflineDB();
    const transaction = offlineDB.transaction([OFFLINE_STORE_NAME, OFFLINE_IMAGES_STORE], 'readwrite');
    transaction.objectStore(OFFLINE_STORE_NAME).clear();
    transaction.objectStore(OFFLINE_IMAGES_STORE).clear();
    console.log("🗑️ Cola offline limpiada");
    updateOfflineBadge();
};

window.processOfflineQueue = processOfflineQueue;

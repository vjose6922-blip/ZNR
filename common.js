// SVG Sprite loader — injects icon definitions once
(function(){
  if(document.getElementById('zr-svg-sprite')) return;
  const d=document.createElement('div');
  d.id='zr-svg-sprite';
  d.style.display='none';
  d.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <defs>
    <!-- close/X -->
    <symbol id="ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 18L18 6M6 6l12 12"/>
    </symbol>
    <!-- trash/delete -->
    <symbol id="ic-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
    </symbol>
    <!-- refresh/reload -->
    <symbol id="ic-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
    </symbol>
    <!-- check/approve -->
    <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 12.75l6 6 9-13.5"/>
    </symbol>
    <!-- cart -->
    <symbol id="ic-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
    </symbol>
    <!-- edit/pencil -->
    <symbol id="ic-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
    </symbol>
    <!-- heart outline -->
    <symbol id="ic-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
    </symbol>
    <!-- heart filled -->
    <symbol id="ic-heart-fill" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <path fill="#ff4f81" stroke="#ff4f81" stroke-width="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
    </symbol>
    <!-- plus/add -->
    <symbol id="ic-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 4.5v15m7.5-7.5h-15"/>
    </symbol>
    <!-- home -->
    <symbol id="ic-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </symbol>
    <!-- settings/gear -->
    <symbol id="ic-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"/>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </symbol>
    <!-- bell -->
    <symbol id="ic-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
    </symbol>
    <!-- community/users -->
    <symbol id="ic-community" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
    </symbol>
    <!-- catalog/list -->
    <symbol id="ic-catalog" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>
    </symbol>
    <!-- outfit/sparkle -->
    <symbol id="ic-outfit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
    </symbol>
    <!-- logout -->
    <symbol id="ic-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
    </symbol>
    <!-- login -->
    <symbol id="ic-login" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
    </symbol>
    <!-- publish/upload -->
    <symbol id="ic-publish" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
    </symbol>
    <!-- share -->
    <symbol id="ic-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
    </symbol>
    <!-- moon/dark -->
    <symbol id="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
    </symbol>
    <!-- sun/light -->
    <symbol id="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
    </symbol>
    <!-- send/whatsapp-like -->
    <symbol id="ic-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
    </symbol>
    <!-- flag/report -->
    <symbol id="ic-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"/>
    </symbol>
    <!-- vendor/store -->
    <symbol id="ic-vendor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"/>
    </symbol>
    <!-- suspend/pause -->
    <symbol id="ic-suspend" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </symbol>
    <!-- stats/chart -->
    <symbol id="ic-stats" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </symbol>
    <!-- error/warning -->
    <symbol id="ic-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
    </symbol>
    <!-- grid view -->
    <symbol id="ic-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
    </symbol>
    <!-- list view -->
    <symbol id="ic-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
    </symbol>
    <!-- whatsapp -->
    <symbol id="ic-whatsapp" viewBox="0 0 24 24">
      <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.833L.057 23.57a.75.75 0 00.918.917l5.735-1.453A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 01-4.953-1.354l-.355-.21-3.676.932.948-3.557-.23-.368A9.714 9.714 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </symbol>
  </defs>
</svg>`;
  document.head.appendChild(d);
})();

const CACHE_KEY = 'zr_products_cache';
const CACHE_EXPIRY = 5 * 60 * 1000;
const RECENT_PRODUCTS_KEY = 'zr_recent_products';
const MAX_RECENT_PRODUCTS = 12;
const UP_KEY  = 'zr_user_prefs_v1';
const ORDERS_KEY  = 'zr_orders_history';
let localCart = {};
let imageObserver = null;
let activeModal = null;
let connectionBanner = null;
let isOnline = navigator.onLine;
let productsByCategoryMap = null;
let allProductsIndexed = [];
let lastPhoneDisplayed = null;
function buildProductIndex(products) {
if (!products || products.length === 0) return;
allProductsIndexed = products;
productsByCategoryMap = new Map();
productsByCategoryMap.set('TODOS', products);
products.forEach(product => {
const category = product.Categoria;
if (!category) return;
if (!productsByCategoryMap.has(category)) {
productsByCategoryMap.set(category, []);
}
productsByCategoryMap.get(category).push(product);
});
console.log(` Indexados ${products.length} productos en ${productsByCategoryMap.size - 1} categorías`);
}
function getProductsByCategoryIndexed(category) {
if (!category || category === '') return allProductsIndexed;
return productsByCategoryMap?.get(category) || [];
}
function clearProductIndex() {
productsByCategoryMap = null;
allProductsIndexed = [];
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
messageDiv.textContent = text;
document.body.appendChild(messageDiv);
setTimeout(() => {
messageDiv.style.animation = "slideDown 0.3s ease";
setTimeout(() => messageDiv.remove(), 300);
}, 3000);
}
function closeCurrentModal() {
if (activeModal) {
activeModal.classList.add("closing");
setTimeout(() => {
if (activeModal && activeModal.parentNode) activeModal.remove();
activeModal = null;
}, 150);
}
}
function showCustomAlert(options) {
const { title, message, icon = "", confirmText = "Aceptar", onConfirm } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
<div class="custom-alert-footer"><button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button></div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const close = () => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (onConfirm) onConfirm(); }, 150);
};
confirmBtn.addEventListener("click", close);
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(); });
}
function showCustomConfirm(options) {
const { title, message, icon = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body"><p>${escapeHtml(message)}</p></div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> ${escapeHtml(cancelText)}</button>
<button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button>
</div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const cancelBtn = modal.querySelector(".custom-alert-btn.cancel");
const close = (callback) => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (callback) callback(); }, 150);
};
confirmBtn.addEventListener("click", () => close(onConfirm));
cancelBtn.addEventListener("click", () => close(onCancel));
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(onCancel); });
}
function showCustomPrompt(options) {
const { title, message, icon = "", defaultValue = "", confirmText = "Aceptar", cancelText = "Cancelar", onConfirm, onCancel } = options;
const modal = document.createElement("div");
modal.className = "custom-alert-modal";
modal.innerHTML = `
<div class="custom-alert-content">
<div class="custom-alert-header"><span class="custom-alert-icon">${escapeHtml(icon)}</span><h3>${escapeHtml(title)}</h3></div>
<div class="custom-alert-body">
<p>${escapeHtml(message)}</p>
<input type="text" class="custom-alert-input" id="custom-prompt-input" value="${escapeHtml(defaultValue)}" autocomplete="off">
</div>
<div class="custom-alert-footer">
<button class="custom-alert-btn cancel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> ${escapeHtml(cancelText)}</button>
<button class="custom-alert-btn confirm"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> ${escapeHtml(confirmText)}</button>
</div>
</div>
`;
document.body.appendChild(modal);
activeModal = modal;
const input = modal.querySelector("#custom-prompt-input");
const confirmBtn = modal.querySelector(".custom-alert-btn.confirm");
const cancelBtn = modal.querySelector(".custom-alert-btn.cancel");
setTimeout(() => input.focus(), 100);
const close = (callback, value = null) => {
if (!modal.parentNode) return;
modal.classList.add("closing");
setTimeout(() => { if (modal.parentNode) modal.remove(); if (activeModal === modal) activeModal = null; if (callback) callback(value); }, 150);
};
confirmBtn.addEventListener("click", () => close(onConfirm, input.value));
cancelBtn.addEventListener("click", () => close(onCancel, null));
input.addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); close(onConfirm, input.value); } });
modal.addEventListener("click", (e) => { if (e.target === modal && !modal.classList.contains("closing")) close(onCancel, null); });
}
if (!window.alertIntercepted) {
window.originalAlert = window.alert;
window.alert = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomAlert({ title: "Aviso", message: String(message), icon: "", confirmText: "Aceptar", onConfirm: () => resolve() }); }); };
window.originalConfirm = window.confirm;
window.confirm = function(message) { return new Promise((resolve) => { closeCurrentModal(); showCustomConfirm({ title: "Confirmar", message: String(message), icon: "", confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: () => resolve(true), onCancel: () => resolve(false) }); }); };
window.originalPrompt = window.prompt;
window.prompt = function(message, defaultValue = "") { return new Promise((resolve) => { closeCurrentModal(); showCustomPrompt({ title: "Ingresar información", message: String(message), icon: "", defaultValue: defaultValue, confirmText: "Aceptar", cancelText: "Cancelar", onConfirm: (value) => resolve(value), onCancel: () => resolve(null) }); }); };
window.alertIntercepted = true;
}
function getCachedProducts() {
if (window.CacheManager && window.CacheManager.getSessionProductsCache) {
const sessionCached = window.CacheManager.getSessionProductsCache();
if (sessionCached && sessionCached.length > 0) {
console.log(" Usando caché de sesión (instantáneo)");
return sessionCached;
}
}
try {
const cached = localStorage.getItem(CACHE_KEY);
if (!cached) return null;
const { data, timestamp } = JSON.parse(cached);
if (Date.now() - timestamp >CACHE_EXPIRY) {
localStorage.removeItem(CACHE_KEY);
return null;
}
console.log(" Usando caché de localStorage");
return data;
} catch { return null; }
}
function setCachedProducts(products) {
if (window.CacheManager && window.CacheManager.setSessionProductsCache) {
window.CacheManager.setSessionProductsCache(products);
}
try {
localStorage.setItem(CACHE_KEY, JSON.stringify({ data: products, timestamp: Date.now() }));
} catch (e) { console.warn("No se pudo guardar en caché:", e); }
}
function formatCurrency(value) {
const num = Number(value) || 0;
return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
}
function hasFreeShipping(price) {
const numericPrice = Number(price) || 0;
return numericPrice >= 300;
}

function _refreshDeliveryBlock() {
const block  = document.getElementById('cart-delivery-block');
if (!block) return;
const savedAddress  = localStorage.getItem('client_address') || '';
const savedSchedule  = localStorage.getItem('client_schedule') || '';
const addrContainer  = document.getElementById('saved-address-container');
const addrDisplay  = document.getElementById('saved-address-display');
const addBtn  = document.getElementById('cart-add-address-btn');
const statusEl  = document.getElementById('cart-shipping-status');
const subtitleEl  = document.getElementById('cart-delivery-subtitle');
if (addrContainer && addrDisplay) {
if (savedAddress) {
addrDisplay.textContent = savedAddress + (savedSchedule ? ` · ${savedSchedule}` : '');
addrContainer.style.display = '';
if (addBtn) addBtn.style.display = 'none';
} else {
addrContainer.style.display = 'none';
if (addBtn) addBtn.style.display = '';
}
}
const items = Object.values(localCart || {});
const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
const hasShipping = items.some(i => hasFreeShipping(i.price));
if (statusEl) {
if (items.length === 0) {
statusEl.innerHTML = '';
} else if (hasShipping) {
statusEl.innerHTML = `<div class="cart-shipping-ok">Tu pedido califica para envío a domicilio</div>`;
if (subtitleEl) subtitleEl.textContent = 'Añade tu dirección para la entrega';
} else {
const missing = 300 - total;
if (missing > 0) {
statusEl.innerHTML = `<div class="cart-shipping-hint">Añade <strong>$${missing.toLocaleString()} más</strong> para calificar a envío a domicilio</div>`;
} else {
statusEl.innerHTML = '';
}
if (subtitleEl) subtitleEl.textContent = 'Opcional — para envío a domicilio';
}
}
}
function escapeHtml(str) {
if (!str) return '';
return String(str)
.replace(/\\/g, '&#x5C;')
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;')
.replace(/`/g, '&#96;')
.replace(/\n/g, '&#10;')
}
function escapeAttr(str) {
if (!str) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;')
.replace(/`/g, '&#96;')
.replace(/\n/g, '&#10;')
.replace(/\r/g, '&#13;');
}
function safeHtml(strings, ...values) {
return strings.reduce((result, string, i) => {
const value = values[i];
const escaped = typeof value === 'string' ? escapeHtml(value) :
value === null || value === undefined ? '' :
String(value);
return result + string + escaped;
}, '');
}

function optimizeDriveUrl(url, size = 400) {
if (!url) return "";
const match = url.match(/[-\w]{25,}/);
if (match) {
const id = match[0];
const screenWidth = window.innerWidth;
let actualSize;
if (screenWidth < 480) {
actualSize = 300;
} else if (screenWidth < 768) {
actualSize = 400;
} else if (screenWidth < 1200) {
actualSize = 600;
} else {
actualSize = 800;
}
if (size && size < actualSize) {
actualSize = Math.min(size, 800);
}
return `https://drive.google.com/thumbnail?id=${id}&sz=w${actualSize}`;
}
return url;
}
function generateRequestId() {
return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}
function updateSavedPhoneDisplay() {
const container = document.getElementById("saved-phone-container");
const display = document.getElementById("saved-phone-display");
const savedPhone = localStorage.getItem("client_phone");
if (container && display) {
if (savedPhone && savedPhone.length === 10) {
const formatted = `${savedPhone.slice(0,2)}-${savedPhone.slice(2,6)}-${savedPhone.slice(6)}`;
if (lastPhoneDisplayed !== formatted) {
display.textContent = formatted;
container.style.display = "block";
container.style.setProperty('display', 'block', 'important');
lastPhoneDisplayed = formatted;
}
} else if (lastPhoneDisplayed !== null) {
container.style.display = "none";
lastPhoneDisplayed = null;
}
}
const addrContainer = document.getElementById("saved-address-container");
const addrDisplay  = document.getElementById("saved-address-display");
const savedAddress  = localStorage.getItem("client_address");
if (addrContainer && addrDisplay) {
if (savedAddress) {
addrDisplay.textContent = savedAddress;
addrContainer.style.display = "block";
} else {
addrContainer.style.display = "none";
}
}
_refreshDeliveryBlock();
}
async function changePhoneNumber() {
const currentPhone = localStorage.getItem("client_phone") || "";
const formattedCurrent = currentPhone && currentPhone.length === 10
? `${currentPhone.slice(0,2)}-${currentPhone.slice(2,6)}-${currentPhone.slice(6)}`
: "no guardado";
const newPhone = await new Promise((resolve) => {
showCustomPrompt({
title: " Cambiar número de teléfono",
message: `Número actual: ${formattedCurrent}\n\nIngresa tu nuevo número (10 dígitos):\nEjemplo: 8671234567\n\n Solo números, sin espacios ni código país.`,
icon: "",
defaultValue: currentPhone || "",
confirmText: "Guardar",
cancelText: "Cancelar",
onConfirm: (value) => resolve(value),
onCancel: () => resolve(null)
});
});
if (newPhone === null) {
return;
}
if (newPhone === "") {
const confirmDelete = await new Promise((resolve) => {
showCustomConfirm({
title: " Eliminar número",
message: "¿Eliminar tu número guardado? Deberás ingresarlo nuevamente en tu próxima compra.",
icon: "",
confirmText: "Sí, eliminar",
cancelText: "Cancelar",
onConfirm: () => resolve(true),
onCancel: () => resolve(false)
});
});
if (confirmDelete) {
localStorage.removeItem("client_phone");
updateSavedPhoneDisplay();
}
return;
}
let cleanPhone = newPhone.replace(/[^0-9]/g, '');
if (cleanPhone.length !== 10) {
showCustomAlert({
title: " Número inválido",
message: "El número debe tener exactamente 10 dígitos.\nEjemplo: 8671234567",
icon: "",
confirmText: "Entendido"
});
return;
}
localStorage.setItem("client_phone", cleanPhone);
updateSavedPhoneDisplay();
const formatted = `${cleanPhone.slice(0,2)}-${cleanPhone.slice(2,6)}-${cleanPhone.slice(6)}`;
showCustomAlert({
title: " ¡Número actualizado!",
message: `Tu nuevo número es: ${formatted}\n\nSe usará para futuras compras.`,
icon: "",
confirmText: "Aceptar"
});
}
function showPrivacyModal(onAccept) {
let modal = document.getElementById("privacy-modal");
if (!modal) {
modal = document.createElement("div");
modal.id = "privacy-modal";
modal.className = "privacy-modal";
modal.innerHTML = `
<div class="privacy-modal-content">
<div class="privacy-modal-header"><span class="privacy-icon"></span><h2>Aviso de Privacidad</h2></div>
<div class="privacy-modal-body">
<p><strong>Z&R</strong>, con responsabilidad en el tratamiento de sus datos personales, le informa lo siguiente:</p>
<h3>Datos recopilados</h3><p>Para procesar tus compras, recopilamos tu <strong>número de teléfono</strong> (WhatsApp), <strong>dirección de envío</strong> y <strong>horario disponible para entrega</strong>.</p>
<h3>Finalidad</h3><p>Tus datos serán utilizados EXCLUSIVAMENTE para:</p>
<ul><li>Confirmar tu identidad en las solicitudes de compra</li><li>Enviarte el link de pago cuando el administrador confirme tu pedido</li><li>Coordinar la entrega en tu dirección y horario indicados</li><li>Comunicarnos contigo sobre el estado de tu compra</li></ul>
<h3>No compartimos tus datos</h3><p>Tu número, dirección y horario NO serán vendidos, cedidos ni compartidos con terceros. Solo serán visibles para el administrador de Z&R para procesar y entregar tu pedido.</p>
<h3>⏰ Conservación</h3><p>Tus datos se conservarán únicamente durante el tiempo necesario para cumplir con las finalidades descritas. Puedes eliminarlos en cualquier momento desde el panel de Preferencias.</p>
<h3>Tus derechos (ARCO)</h3><p>Puedes solicitar la eliminación de tus datos escribiendo a: <strong>contacto@zrtienda.com</strong></p>
<p class="privacy-date">Última actualización: Abril 2026</p>
</div>
<div class="privacy-modal-footer">
<button id="reject-privacy-btn" class="privacy-btn reject"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Rechazar</button>
<button id="accept-privacy-btn" class="privacy-btn accept"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Aceptar y continuar</button>
</div>
</div>
`;
document.body.appendChild(modal);
}
modal.style.display = "flex";
const acceptBtn = document.getElementById("accept-privacy-btn");
const rejectBtn = document.getElementById("reject-privacy-btn");
const handleAccept = () => { localStorage.setItem("privacy_accepted", "true"); modal.style.display = "none"; if (onAccept) onAccept(); cleanup(); };
const handleReject = () => { modal.style.display = "none"; showTemporaryMessage(" Debes aceptar el aviso de privacidad para continuar", "error"); cleanup(); };
const cleanup = () => { if (acceptBtn) acceptBtn.removeEventListener("click", handleAccept); if (rejectBtn) rejectBtn.removeEventListener("click", handleReject); };
if (acceptBtn) acceptBtn.addEventListener("click", handleAccept);
if (rejectBtn) rejectBtn.addEventListener("click", handleReject);
}
function loadCartFromStorage() {
try {
const raw = JSON.parse(localStorage.getItem("cart") || "{}");
localCart = {};
for (const [key, item] of Object.entries(raw)) {
if (
item && typeof item === 'object' &&
item.id !== undefined &&
typeof item.quantity === 'number' && item.quantity > 0 && item.quantity <= 99 &&
typeof item.price === 'number' && item.price >= 0 && item.price <= 999999
) {
localCart[key] = {
id:  item.id,
name:  String(item.name || '').slice(0, 200),
price:  item.price,
quantity: Math.floor(item.quantity),
Imagen1:  String(item.Imagen1 || '').slice(0, 500),
Talla:  String(item.Talla || '').slice(0, 50),
_comunidad: item._comunidad || false,
_vendedor:  String(item._vendedor  || '').slice(0, 100),
_vendorTel: String(item._vendorTel || '').slice(0, 20)
};
}
}
} catch {
localCart = {};
}
updateCartBadge();
}
function saveCartToStorage() { localStorage.setItem("cart", JSON.stringify(localCart)); }
function updateCartBadge() {
const countEl = document.getElementById("cart-count");
if (countEl) { const totalQty = Object.values(localCart).reduce((sum, item) => sum + (item.quantity || 0), 0); countEl.textContent = totalQty; }
}
function addToCart(product) {
const id = product.ID;
if (!id) { console.error("Producto sin ID:", product); return; }
if (!localCart[id]) {
localCart[id] = { id: id, name: product.Nombre || "Producto", price: Number(product.Precio || 0), quantity: 0, stock: Number(product.Stock || product.stock || 99), Imagen1: product.Imagen1 || "", Talla: product.Talla || "", _comunidad: product._comunidad || false, _vendedor: product._vendedor || "", _vendorTel: product._vendorTel || "" };
}
const maxStock = Number(localCart[id].stock || 99);
if (localCart[id].quantity >= maxStock) {
showTemporaryMessage(` Solo hay ${maxStock} pieza${maxStock === 1 ? '' : 's'} disponible${maxStock === 1 ? '' : 's'}`, 'error');
return;
}
localCart[id].quantity += 1;
saveCartToStorage();
updateCartBadge();
animateCartAdd();
let wishlist = getWishlist();
const existedInWishlist = wishlist.some(item => item.id === String(id));
if (existedInWishlist) {
wishlist = wishlist.filter(item => item.id !== String(id));
saveWishlist(wishlist);
updateAllWishlistButtons(id, false);
if (typeof renderWishlist === 'function') renderWishlist();
} else {
}
window.dispatchEvent(new CustomEvent('cartUpdated', { detail: localCart }));
}
function animateCartAdd() {
const btn = document.getElementById("floating-cart-btn");
if (btn) { btn.style.transform = "translateY(-4px) scale(1.05)"; setTimeout(() => btn.style.transform = "", 180); }
}
function openCartDrawer() {
console.log(" [CARRITO] Abriendo carrito...");
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
if (!drawer) {
console.error(" [CARRITO] No existe #cart-drawer");
return;
}
if (!overlay) {
console.error(" [CARRITO] No existe #overlay");
return;
}
drawer.classList.add("open");
overlay.classList.add("visible");
if (typeof renderCart === 'function') {
renderCart();
}
if (typeof updateSavedPhoneDisplay === 'function') {
updateSavedPhoneDisplay();
}
}
function closeCartDrawer() {
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
}
window.changeCartQty = function(productId, delta) {
if (!localCart[productId]) return;
const newQty = localCart[productId].quantity + delta;
if (newQty <= 0) {
delete localCart[productId];
} else {
// Validar contra stock real del producto
const maxStock = Number(localCart[productId].stock || localCart[productId].Stock || 99);
if (delta > 0 && localCart[productId].quantity >= maxStock) {
showTemporaryMessage(` Solo hay ${maxStock} pieza${maxStock === 1 ? '' : 's'} disponible${maxStock === 1 ? '' : 's'}`, 'error');
return;
}
localCart[productId].quantity = Math.min(newQty, maxStock);
}
saveCartToStorage();
updateCartBadge();
renderCart();
window.dispatchEvent(new CustomEvent('cartUpdated'));
};
window.removeFromCart = function(productId) {
if (localCart[productId]) {
delete localCart[productId];
saveCartToStorage();
updateCartBadge();
renderCart();
window.dispatchEvent(new CustomEvent('cartUpdated'));
}
};
function handleDecrement(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.changeCartQty) {
window.changeCartQty(id, -1);
}
}
function handleIncrement(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.changeCartQty) {
window.changeCartQty(id, 1);
}
}
function handleRemove(e) {
e.stopPropagation();
const id = e.currentTarget.getAttribute('data-id');
if (id && window.removeFromCart) {
window.removeFromCart(id);
}
}
function renderCart() {
console.log(" [RENDER] renderCart() iniciada");
const container = document.getElementById("cart-items-container");
if (!container) {
console.error(" [RENDER] No existe #cart-items-container");
return;
}
container.innerHTML = "";
const items = Object.values(localCart);
if (items.length === 0) {
container.innerHTML = `
<div class="cart-empty-state">
<div class="cart-empty-icon"></div>
<p class="helper-text">Tu carrito está vacío.</p>
<p class="cart-empty-hint">Agrega productos para comenzar</p>
</div>`;
} else {
const znrItems  = items.filter(i => !i._comunidad);
const comunidadItems = items.filter(i =>  i._comunidad);
function renderCartItem(item) {
const row = document.createElement("div");
row.className = "cart-item";
const imgUrl = item.Imagen1 ? optimizeDriveUrl(item.Imagen1, 120) : '';
const imgHtml = imgUrl
? `<div class="cart-item-img-wrap">
<img class="cart-item-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.style.display='none'">
</div>`
: `<div class="cart-item-img-wrap cart-item-img-placeholder">
<span></span>
</div>`;
const tallaBadge = item.Talla
? `<span class="cart-item-talla">Talla: ${escapeHtml(item.Talla)}</span>`
: '';
const vendorBadge = item._comunidad && item._vendedor
? `<span class="cart-item-vendor"> ${escapeHtml(item._vendedor)}</span>`
: '';
row.innerHTML = `
${imgHtml}
<div class="cart-item-info">
<div class="cart-item-title">${escapeHtml(item.name || `ID ${item.id}`)}</div>
${tallaBadge}
${vendorBadge}
<div class="cart-item-meta">${formatCurrency(item.price)} c/u</div>
<div class="cart-item-actions">
<button class="qty-btn" data-action="decrement" data-id="${item.id}">−</button>
<span class="qty-value">${item.quantity}</span>
<button class="qty-btn" data-action="increment" data-id="${item.id}">+</button>
<button class="cart-item-remove" data-action="remove" data-id="${item.id}"></button>
</div>
</div>
`;
container.appendChild(row);
}
if (znrItems.length > 0) {
if (comunidadItems.length > 0) {
const sep = document.createElement('div');
sep.className = 'cart-section-header';
sep.innerHTML = '<span>Z&R Tienda</span>';
container.appendChild(sep);
}
znrItems.forEach(renderCartItem);
}
if (comunidadItems.length > 0) {
const sep2 = document.createElement('div');
sep2.className = 'cart-section-header cart-section-comunidad';
sep2.innerHTML = '<span>Comunidad</span><small>Pago directo al vendedor vía WhatsApp</small>';
container.appendChild(sep2);
comunidadItems.forEach(renderCartItem);
}
document.querySelectorAll('.qty-btn[data-action="decrement"]').forEach(btn => {
btn.removeEventListener('click', handleDecrement);
btn.addEventListener('click', handleDecrement);
});
document.querySelectorAll('.qty-btn[data-action="increment"]').forEach(btn => {
btn.removeEventListener('click', handleIncrement);
btn.addEventListener('click', handleIncrement);
});
document.querySelectorAll('.cart-item-remove[data-action="remove"]').forEach(btn => {
btn.removeEventListener('click', handleRemove);
btn.addEventListener('click', handleRemove);
});
}
const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const subtotalEl = document.getElementById("cart-subtotal");
const totalEl = document.getElementById("cart-total");
if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
if (totalEl) totalEl.textContent = formatCurrency(subtotal);
const _znrCount  = items.filter(i => !i._comunidad).length;
const _commCount = items.filter(i =>  i._comunidad).length;
const requestBtn = document.getElementById("request-purchase-btn");
if (requestBtn) {
if (_znrCount > 0 && _commCount > 0) {
requestBtn.textContent = " Enviar pedidos (Z&R + Comunidad)";
} else if (_commCount > 0 && _znrCount === 0) {
requestBtn.textContent = " Contactar vendedor(es) por WhatsApp";
} else {
requestBtn.textContent = " Solicitar por WhatsApp";
}
}
_refreshDeliveryBlock();
setTimeout(() => {
const changePhoneBtn = document.getElementById('change-phone-btn');
if (changePhoneBtn) {
console.log(" Configurando botón change-phone-btn");
const newBtn = changePhoneBtn.cloneNode(true);
changePhoneBtn.parentNode.replaceChild(newBtn, changePhoneBtn);
newBtn.addEventListener('click', async function(e) {
e.preventDefault();
e.stopPropagation();
console.log(" Click en botón Cambiar número");
if (typeof window.changePhoneNumber === 'function') {
await window.changePhoneNumber();
} else if (typeof changePhoneNumber === 'function') {
await changePhoneNumber();
} else {
console.error(" changePhoneNumber no está definida");
if (typeof showCustomAlert === 'function') {
showCustomAlert({
title: "Error",
message: "Función no disponible. Recarga la página.",
icon: "",
confirmText: "Aceptar"
});
}
}
});
} else {
console.warn(" No se encontró el botón change-phone-btn en el DOM");
}
}, 100);
updateSavedPhoneDisplay();
}
let _modalImages  = [];
let _modalIndex  = 0;
let _modalTouchStartX = 0;
let _modalProduct  = null;
function openImageModal(url, productId = null, allImages = [], productData = null) {
const modal  = document.getElementById("image-modal");
const overlay = document.getElementById("overlay");
if (!modal) return;
_modalImages  = [url, ...allImages.filter(u => u && u !== url)];
_modalIndex  = 0;
_modalProduct = productData;
initImageModalControls();
_renderModalImage(modal, 0, 'none');
_renderProductInfo(modal);
_renderMagazinePanel(modal);
modal.classList.add("open");
if (overlay) overlay.classList.add("visible");
if (productId && typeof addToRecentProducts === 'function') {
addToRecentProducts(productId);
}
}
function _renderModalImage(modal, idx, direction) {
const img  = modal.querySelector('#image-modal-img');
const dots = modal.querySelector('.im-dots');
const prev = modal.querySelector('.im-prev');
const next = modal.querySelector('.im-next');
if (!img) return;
if (direction !== 'none') {
img.classList.add(direction === 'right' ? 'im-exit-left' : 'im-exit-right');
setTimeout(() => {
img.src = _modalImages[idx];
img.classList.remove('im-exit-left', 'im-exit-right');
img.classList.add(direction === 'right' ? 'im-enter-right' : 'im-enter-left');
setTimeout(() => img.classList.remove('im-enter-right', 'im-enter-left'), 320);
}, 220);
} else {
img.src = _modalImages[idx];
}
if (prev) prev.style.display = _modalImages.length > 1 ? '' : 'none';
if (next) next.style.display = _modalImages.length > 1 ? '' : 'none';
if (dots) {
dots.innerHTML = _modalImages.map((_, i) =>
`<span class="im-dot${i === idx ? ' active' : ''}"></span>`
).join('');
}
}
function _renderProductInfo(modal) {
const el = modal.querySelector('#im-product-info');
if (!el) return;
const p = _modalProduct;
if (!p) { el.innerHTML = ''; el.style.display = 'none'; return; }
const nombre  = p.Nombre  || p.nombre  || '';
const precio  = p.Precio  || p.precio  || 0;
const talla  = p.Talla  || p.talla  || '';
const desc  = p.Descripcion || p.descripcion || '';
const categoria = p.Categoria || p.categoria || '';
const stock  = Number(p.Stock ?? p.stock ?? -1);
const badge  = p.Badge  || p.badge  || '';
const fmtPrecio = typeof formatCurrency === 'function'
? formatCurrency(precio)
: `$${Number(precio).toLocaleString()}`;
const stockHtml = stock < 0 ? '' :
stock === 0
? `<span class="im-info-stock out">Sin stock</span>`
: `<span class="im-info-stock ok"> ${stock} disponibles</span>`;
const badgeHtml  = badge  ? `<span class="im-info-badge">${escapeHtml(badge)}</span>` : '';
const catHtml  = categoria ? `<span class="im-info-cat">${escapeHtml(categoria)}</span>` : '';
const tallaHtml  = talla  ? `<div class="im-info-talla">Talla: <strong>${escapeHtml(talla)}</strong></div>` : '';
const descHtml  = desc  ? `<p class="im-info-desc">${escapeHtml(desc)}</p>` : '';
el.style.display = '';
el.innerHTML = `
<div class="im-info-top">
<div class="im-info-name">${escapeHtml(nombre)}</div>
<div class="im-info-price">${fmtPrecio}</div>
</div>
<div class="im-info-meta">
${catHtml}${badgeHtml}${stockHtml}
</div>
${tallaHtml}
${descHtml}
`;
}
function _renderMagazinePanel(modal) {
const panel = modal.querySelector('.im-magazine-panel');
if (!panel) return;
const current = _modalProduct;
const isComunidad = current && (current._comunidad === true);
let rawPool;
if (isComunidad) {
rawPool = window.allCommunityProductsIndexed || [];
} else {
rawPool = (typeof allProductsIndexed !== 'undefined' ? allProductsIndexed : []);
}
const pool = rawPool.map(p => ({
_raw:  p,
_id:  String(p.ID  || p.id  || ''),
_nombre:  p.Nombre  || p.nombre  || '',
_precio:  p.Precio  || p.precio  || 0,
_categoria:  p.Categoria  || p.categoria  || '',
_stock:  Number(p.Stock || p.stock || 0),
_talla:  p.Talla  || p.talla  || '',
_descripcion:p.Descripcion || p.descripcion || '',
_badge:  p.Badge  || p.badge  || '',
_imagen1:  p.Imagen1  || p.imagen1  || '',
_imagen2:  p.Imagen2  || p.imagen2  || '',
_imagen3:  p.Imagen3  || p.imagen3  || '',
_comunidad:  isComunidad,
}));
const currentId  = current ? String(current.ID || current.id || '') : '';
const currentCat = current ? (current.Categoria || current.categoria || '') : '';
let related = [];
if (current && pool.length) {
const sameCat = pool.filter(p =>
p._id !== currentId &&
p._categoria === currentCat &&
p._stock > 0
);
related = sameCat.sort(() =>Math.random() - 0.5).slice(0, 3);
if (related.length < 3) {
const others = pool.filter(p =>
p._id !== currentId &&
!related.find(r => r._id === p._id) &&
p._stock > 0
).sort(() =>Math.random() - 0.5);
related = [...related, ...others].slice(0, 3);
}
}
if (related.length === 0) {
panel.style.display = 'none';
modal.querySelector('.im-magazine-layout').classList.add('im-no-panel');
return;
}
panel.style.display = '';
modal.querySelector('.im-magazine-layout').classList.remove('im-no-panel');
panel.innerHTML = `
<p class="im-panel-label">También te puede gustar</p>
${related.map(p => {
const thumbImg = typeof optimizeDriveUrl === 'function'
? optimizeDriveUrl(p._imagen1, 200)
: (p._imagen1 || '');
const fullImg  = typeof optimizeDriveUrl === 'function'
? optimizeDriveUrl(p._imagen1)
: (p._imagen1 || '');
const name = (p._nombre || 'Producto').substring(0, 28);
const price = typeof formatCurrency === 'function'
? formatCurrency(p._precio)
: `$${p._precio}`;
const safeImg     = thumbImg ? escapeAttr(thumbImg) : 'https://placehold.co/200x200/3b1f5f/white?text=Z%26R';
const safeFullImg = fullImg  ? escapeAttr(fullImg)  : safeImg;
const safeName  = typeof escapeHtml === 'function' ? escapeHtml(name) : name;
const safeId  = escapeAttr(p._id);
const allImg  = [p._imagen1, p._imagen2, p._imagen3]
.map(u => u ? (typeof optimizeDriveUrl === 'function' ? optimizeDriveUrl(u) : u) : '')
.filter(Boolean);
const allImgEncoded = escapeAttr(JSON.stringify(allImg));
const safeNombre  = escapeAttr(p._nombre  || '');
const safePrecio  = escapeAttr(String(p._precio  || 0));
const safeCat  = escapeAttr(p._categoria  || '');
const safeTalla  = escapeAttr(p._talla  || '');
const safeDesc  = escapeAttr(p._descripcion || '');
const safeStock  = escapeAttr(String(p._stock ?? -1));
const safeBadge  = escapeAttr(p._badge  || '');
const safeImg1  = escapeAttr(p._imagen1  || '');
const safeImg2  = escapeAttr(p._imagen2  || '');
const safeImg3  = escapeAttr(p._imagen3  || '');
const safeComunidad = p._comunidad ? '1' : '0';
return `
<button class="im-related-card"
data-id="${safeId}"
data-img="${safeFullImg}"
data-all-images="${allImgEncoded}"
data-nombre="${safeNombre}"
data-precio="${safePrecio}"
data-categoria="${safeCat}"
data-talla="${safeTalla}"
data-descripcion="${safeDesc}"
data-stock="${safeStock}"
data-badge="${safeBadge}"
data-imagen1="${safeImg1}"
data-imagen2="${safeImg2}"
data-imagen3="${safeImg3}"
data-comunidad="${safeComunidad}"
aria-label="Ver ${safeName}">
<div class="im-related-img-wrap">
<img src="${safeImg}" alt="${safeName}" loading="lazy" />
</div>
<div class="im-related-info">
<span class="im-related-name">${safeName}</span>
<span class="im-related-price">${price}</span>
</div>
</button>`;
}).join('')}
`;
panel.querySelectorAll('.im-related-card').forEach(btn => {
btn.addEventListener('click', () => {
const img1  = btn.dataset.img;
const allImgs = JSON.parse(btn.dataset.allImages || '[]');
const pData  = {
ID:  btn.dataset.id,
Nombre:  btn.dataset.nombre,
Precio:  btn.dataset.precio,
Categoria:  btn.dataset.categoria,
Talla:  btn.dataset.talla  || '',
Descripcion: btn.dataset.descripcion || '',
Stock:  btn.dataset.stock !== undefined ? Number(btn.dataset.stock) : -1,
Badge:  btn.dataset.badge  || '',
Imagen1:  btn.dataset.imagen1,
Imagen2:  btn.dataset.imagen2,
Imagen3:  btn.dataset.imagen3,
_comunidad:  btn.dataset.comunidad === '1',
};
_modalImages  = [img1, ...allImgs.filter(u => u && u !== img1)];
_modalIndex  = 0;
_modalProduct = pData;
const modal2 = document.getElementById("image-modal");
if (modal2) {
_renderModalImage(modal2, 0, 'right');
_renderProductInfo(modal2);
_renderMagazinePanel(modal2);
}
});
});
}
function _modalNav(dir) {
if (_modalImages.length < 2) return;
_modalIndex = (_modalIndex + dir + _modalImages.length) % _modalImages.length;
const modal = document.getElementById("image-modal");
if (modal) _renderModalImage(modal, _modalIndex, dir > 0 ? 'right' : 'left');
}
function closeImageModal() {
const modal  = document.getElementById("image-modal");
const overlay = document.getElementById("overlay");
if (modal) modal.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
_modalImages = []; _modalIndex = 0; _modalProduct = null;
}
function initImageModalControls() {
const modal = document.getElementById("image-modal");
if (!modal || modal.dataset.imInit) return;
modal.dataset.imInit = '1';
modal.innerHTML = `
<button class="im-close icon-button" aria-label="Cerrar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true"><use href="#ic-x"/></svg></button>
<div class="im-magazine-layout">
<!-- Hero column -->
<div class="im-hero-col">
<button class="im-prev" aria-label="Anterior">‹</button>
<div class="im-wrapper">
<img id="image-modal-img" alt="Vista de producto" />
</div>
<button class="im-next" aria-label="Siguiente">›</button>
<div class="im-dots"></div>
</div>
<!-- Product details strip -->
<div class="im-product-info" id="im-product-info"></div>
<!-- Related panel -->
<aside class="im-magazine-panel"></aside>
</div>
`;
modal.querySelector('.im-close').addEventListener('click', closeImageModal);
modal.querySelector('.im-prev').addEventListener('click', () => _modalNav(-1));
modal.querySelector('.im-next').addEventListener('click', () => _modalNav(1));
modal.addEventListener('click', e => {
if (e.target === modal) closeImageModal();
});
modal.addEventListener('touchstart', e => { _modalTouchStartX = e.touches[0].clientX; }, { passive: true });
modal.addEventListener('touchend', e => {
const dx = e.changedTouches[0].clientX - _modalTouchStartX;
if (Math.abs(dx) > 40) _modalNav(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('keydown', e => {
if (!modal.classList.contains('open')) return;
if (e.key === 'ArrowRight') _modalNav(1);
if (e.key === 'ArrowLeft')  _modalNav(-1);
if (e.key === 'Escape')  closeImageModal();
});
if (!document.getElementById('im-styles')) {
const st = document.createElement('style');
st.id = 'im-styles';
st.textContent = `
.image-modal {
position: fixed; inset: 0;
background: rgba(0,0,0,.88);
backdrop-filter: blur(6px);
-webkit-backdrop-filter: blur(6px);
z-index: 8000;
display: none;
align-items: center;
justify-content: center;
padding: 16px;
box-sizing: border-box;
}
.image-modal.open { display: flex; }
.im-close {
position: fixed; top: 14px; right: 14px; z-index: 10;
background: rgba(255,255,255,.13); border: none; color: #fff;
width: 38px; height: 38px; border-radius: 50%; font-size: 16px;
cursor: pointer; display: flex; align-items: center; justify-content: center;
transition: background .2s;
}
.im-close:hover { background: rgba(255,79,129,.4); }
.im-magazine-layout {
display: flex;
flex-direction: column;
align-items: center;
gap: 0;
width: min(480px, 96vw);
max-height: 92dvh;
background: #0d0d14;
border-radius: 22px;
overflow: hidden;
box-shadow: 0 32px 80px rgba(0,0,0,.75);
animation: im-fade-in .22s ease;
}
@keyframes im-fade-in { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
.im-hero-col {
position: relative;
width: 100%;
flex: 1 1 auto;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #111118;
min-height: 0;
}
.im-prev, .im-next {
position: absolute; top: 50%; transform: translateY(-50%);
background: rgba(0,0,0,.45); border: none; color: #fff;
width: 36px; height: 36px; border-radius: 50%; font-size: 24px;
cursor: pointer; display: flex; align-items: center; justify-content: center;
transition: background .2s; z-index: 4; backdrop-filter: blur(6px);
}
.im-prev { left: 10px; } .im-next { right: 10px; }
.im-prev:hover, .im-next:hover { background: rgba(255,79,129,.55); }
.im-wrapper {
width: 100%;
display: flex;
align-items: center;
justify-content: center;
background: #111118;
overflow: hidden;
}
.im-wrapper img {
display: block;
width: 100%;
max-height: 50dvh;
object-fit: contain;
}
.im-dots {
position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
display: flex; gap: 5px; z-index: 3;
}
.im-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.35); transition: all .2s; }
.im-dot.active { background: #ff4f81; width: 16px; border-radius: 3px; }
.im-product-info {
 width: calc(100% - 24px);
margin: 0 12px;
background: #252831;
border-top: 1px solid rgba(255,255,255,.07);
border-bottom: 1px solid rgba(255,255,255,.07);
padding: 12px;
display: flex;
flex-direction: column;
gap: 6px;
}
.im-info-top {
display: flex;
align-items: baseline;
justify-content: space-between;
gap: 10px;
flex-wrap: wrap;
}
.im-info-name {
font-size: 15px;
font-weight: 700;
color: #fff;
line-height: 1.3;
flex: 1;
}
.im-info-price {
font-size: 17px;
font-weight: 800;
color: #ff4f81;
white-space: nowrap;
background: rgba(255,79,129,.12);
padding: 2px 10px;
border-radius: 20px;
}
.im-info-meta {
display: flex;
align-items: center;
gap: 6px;
flex-wrap: wrap;
}
.im-info-cat {
background: rgba(255,255,255,.08);
color: rgba(255,255,255,.7);
font-size: 11px;
font-weight: 600;
padding: 3px 9px;
border-radius: 20px;
text-transform: uppercase;
letter-spacing: .4px;
}
.im-info-badge {
background: linear-gradient(135deg,#ff4f81,#ff7a4f);
color: #fff;
font-size: 10px;
font-weight: 700;
padding: 3px 9px;
border-radius: 20px;
text-transform: uppercase;
letter-spacing: .4px;
}
.im-info-stock {
font-size: 11px;
font-weight: 600;
padding: 3px 9px;
border-radius: 20px;
}
.im-info-stock.ok  { background: rgba(34,197,94,.15); color: #4ade80; }
.im-info-stock.out { background: rgba(239,68,68,.15);  color: #f87171; }
.im-info-talla {
font-size: 12px;
color: rgba(255,255,255,.65);
}
.im-info-talla strong { color: rgba(255,255,255,.9); }
.im-info-desc {
font-size: 12px;
color: rgba(255,255,255,.5);
margin: 0;
line-height: 1.45;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
}
.im-magazine-panel {
flex: 0 0 auto;
width: 100%;
display: flex;
flex-direction: row;
gap: 0;
background: #0d0d14;
border-top: 1px solid rgba(255,255,255,.07);
overflow-x: auto;
scrollbar-width: none;
}
.im-magazine-panel::-webkit-scrollbar { display: none; }
.im-panel-label {
display: none;
}
.im-related-card {
flex: 1 1 0;
min-width: 0;
display: flex;
flex-direction: column;
background: transparent;
border: none;
border-right: 1px solid rgba(255,255,255,.06);
cursor: pointer;
padding: 0;
color: #fff;
transition: background .18s;
position: relative;
overflow: hidden;
}
.im-related-card:last-child { border-right: none; }
.im-related-card:hover { background: rgba(255,79,129,.08); }
.im-related-card::after {
content: '';
position: absolute; inset: 0;
border: 2px solid transparent;
border-radius: 0;
transition: border-color .18s;
pointer-events: none;
}
.im-related-card:hover::after { border-color: rgba(255,79,129,.4); }
.im-related-img-wrap {
width: 100%; aspect-ratio: 1/1;
overflow: hidden; background: #1a1a28;
}
.im-related-img-wrap img {
width: 100%; height: 100%;
object-fit: cover;
transition: transform .3s;
}
.im-related-card:hover .im-related-img-wrap img { transform: scale(1.08); }
.im-related-info {
padding: 5px 6px 7px;
display: flex; flex-direction: column; gap: 1px;
background: rgba(0,0,0,.55);
}
.im-related-name {
font-size: 10px; font-weight: 600; color: rgba(255,255,255,.8);
line-height: 1.25; overflow: hidden;
display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.im-related-price {
font-size: 12px; font-weight: 800; color: #ff4f81; margin-top: 1px;
}
.im-magazine-layout.im-no-panel .im-hero-col { flex: 1 1 auto; }
.im-magazine-layout.im-no-panel .im-wrapper img { max-height: 82dvh; }
@keyframes im-slide-in-right  { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
@keyframes im-slide-in-left  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
@keyframes im-slide-out-left  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-40px)} }
@keyframes im-slide-out-right { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }
.im-enter-right { animation: im-slide-in-right  .28s ease forwards; }
.im-enter-left  { animation: im-slide-in-left  .28s ease forwards; }
.im-exit-left  { animation: im-slide-out-left  .2s ease forwards; }
.im-exit-right  { animation: im-slide-out-right .2s ease forwards; }
@media (min-width: 600px) {
.im-magazine-layout { width: min(520px, 92vw); }
.im-wrapper img { max-height: 54dvh; }
}
`;
document.head.appendChild(st);
const _btnSvgSt=document.createElement('style');_btnSvgSt.textContent='button svg{vertical-align:middle;margin-right:4px;flex-shrink:0}';document.head.appendChild(_btnSvgSt);
}
}
window.shareContent = shareContent;
window.shareProduct = shareProduct;
window.openImageModal  = openImageModal;
window.applyLayoutGlobal = applyLayoutGlobal;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.closeImageModal = closeImageModal;
window.initImageModalControls = initImageModalControls;

// ─── Función unificada de compartir ───────────────────────────────────────────
// Usada por productos (script.js, comunidad.js) y outfits (looks.js).
// Parámetros: { id?, title, text, url? }
function shareContent({ id, title, text, url }) {
  const shareUrl = url || `${window.location.origin}${window.location.pathname}${id ? '#producto-' + id : ''}`;
  const shareTitle = title || 'Z&R';
  const shareText = text || shareTitle;

  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        .then(() => showTemporaryMessage('✓ Enlace copiado', 'success'))
        .catch(() => showTemporaryMessage('✓ Enlace: ' + shareUrl, 'info'));
    } else {
      showTemporaryMessage('✓ Enlace: ' + shareUrl, 'info');
    }
  };

  const canUseShareAPI = navigator.share &&
    window.isSecureContext &&
    window.location.protocol !== 'file:';

  if (canUseShareAPI) {
    navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
      .catch(err => {
        if (err.name !== 'AbortError') copyToClipboard();
      });
  } else {
    copyToClipboard();
  }
}

// Wrapper para mantener compatibilidad con llamadas existentes a shareProduct()
function shareProduct(id, nombre, precio) {
  const title = nombre || 'Producto Z&R';
  const text = precio
    ? `${title} — $${Number(precio).toLocaleString()} MXN\n¡Míralo en Z&R!`
    : `${title}\n¡Míralo en Z&R!`;
  shareContent({ id, title, text });
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
newImg.onload = () => { img.src = dataSrc; img.removeAttribute("data-src"); };
newImg.src = dataSrc;
}
imageObserver.unobserve(img);
}
});
}, { rootMargin: "50px 0px", threshold: 0.01 });
}
return imageObserver;
}
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
function _collectAddressAndSchedule() {
return new Promise(resolve => {
const saved  = localStorage.getItem('client_address')  || '';
const savedDays = localStorage.getItem('client_days')  || '';
const savedFrom = localStorage.getItem('client_hour_from')|| '';
const savedTo  = localStorage.getItem('client_hour_to')  || '';
const savedNote = localStorage.getItem('client_note')  || '';
const DAYS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const HOURS = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM',
'1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM',
'7:00 PM','8:00 PM','9:00 PM'];
const savedDayArr = savedDays ? savedDays.split(',') : [];
const dayBtns = DAYS.map(d => {
const active = savedDayArr.includes(d);
return `<button type="button" class="_day-btn${active?' _day-active':''}" data-day="${d}"
style="padding:6px 10px;border-radius:20px;border:1.5px solid ${active?'#ff4f81':'rgba(255,255,255,.15)'};
background:${active?'rgba(255,79,129,.18)':'transparent'};color:${active?'#ff4f81':'#aaa'};
font-size:12px;font-weight:600;cursor:pointer;transition:all .15s">${d}</button>`;
}).join('');
const hourOpts = (sel) =>HOURS.map(h =>
`<option value="${h}"${sel===h?' selected':''}>${h}</option>`
).join('');
const selectStyle = 'width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;box-sizing:border-box;appearance:none;cursor:pointer';
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:20000;display:flex;align-items:flex-end;justify-content:center;overflow-y:auto';
overlay.innerHTML = `
<div style="background:var(--color-surface,#252831);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:500px;box-shadow:0 -10px 40px rgba(0,0,0,.5)">
<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 18px"></div>
<h3 style="margin:0 0 4px;font-size:18px;color:var(--color-text-primary,#fff)">Datos de entrega</h3>
<p style="margin:0 0 18px;font-size:13px;color:#888">Para coordinar tu pedido de la mejor manera.</p>
<!-- ADDRESS -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
<label style="font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Dirección</label>
<button type="button" id="_gps-btn" style="background:rgba(255,79,129,.12);border:1px solid rgba(255,79,129,.3);color:#ff4f81;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg> Usar GPS</button>
</div>
<textarea id="_addr-input" rows="2" placeholder="Calle, número, colonia, ciudad…"
style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:14px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:16px">${escapeHtml(saved)}</textarea>
<!-- DAYS -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Días disponibles</label>
<div id="_days-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
${dayBtns}
</div>
<!-- HOURS -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Horario</label>
<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:16px">
<select id="_hour-from" style="${selectStyle}">
<option value="">Desde</option>${hourOpts(savedFrom)}
</select>
<span style="color:#aaa;font-size:13px">a</span>
<select id="_hour-to" style="${selectStyle}">
<option value="">Hasta</option>${hourOpts(savedTo)}
</select>
</div>
<!-- NOTES -->
<label style="display:block;font-size:12px;font-weight:600;color:#aaa;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Comentarios o instrucciones</label>
<textarea id="_note-input" rows="2" placeholder="Ej: Tocar el timbre 2 veces, preguntar por Juan, dejar con el vecino…"
style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--color-text-primary,#fff);border-radius:12px;padding:12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:20px">${escapeHtml(savedNote)}</textarea>
<div style="display:flex;gap:10px">
<button id="_addr-cancel" style="flex:1;padding:13px;background:rgba(255,255,255,.07);border:none;border-radius:14px;color:#aaa;font-size:14px;font-weight:600;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-x"/></svg> Cancelar</button>
<button id="_addr-confirm" style="flex:2;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Confirmar</button>
</div>
</div>
`;
document.body.appendChild(overlay);
setTimeout(() => overlay.querySelector('textarea').focus(), 100);
const prevLat = localStorage.getItem('client_gps_lat');
const prevLng = localStorage.getItem('client_gps_lng');
if (prevLat && prevLng && saved) {
const mapsUrl  = `https://www.google.com/maps?q=${prevLat},${prevLng}`;
const mapsLink = document.createElement('a');
mapsLink.id  = '_maps-link';
mapsLink.href  = mapsUrl;
mapsLink.target = '_blank';
mapsLink.rel  = 'noopener noreferrer';
mapsLink.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#ff4f81;text-decoration:none;font-weight:600;margin-bottom:16px';
mapsLink.innerHTML = ' Ver ubicación en Google Maps';
overlay.querySelector('#_addr-input').insertAdjacentElement('afterend', mapsLink);
}
overlay.querySelectorAll('._day-btn').forEach(btn => {
btn.addEventListener('click', () => {
const active = btn.classList.toggle('_day-active');
btn.style.border  = `1.5px solid ${active ? '#ff4f81' : 'rgba(255,255,255,.15)'}`;
btn.style.background  = active ? 'rgba(255,79,129,.18)' : 'transparent';
btn.style.color  = active ? '#ff4f81' : '#aaa';
});
});
overlay.querySelector('#_gps-btn').addEventListener('click', () => {
const gpsBtn = overlay.querySelector('#_gps-btn');
gpsBtn.textContent = '⏳ Obteniendo…';
gpsBtn.disabled = true;
if (!navigator.geolocation) {
gpsBtn.textContent = ' Sin GPS';
return;
}
navigator.geolocation.getCurrentPosition(
async (pos) => {
const { latitude: lat, longitude: lng } = pos.coords;
overlay._gpsLat = lat;
overlay._gpsLng = lng;
localStorage.setItem('client_gps_lat', lat);
localStorage.setItem('client_gps_lng', lng);
let addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
try {
const res  = await fetch(
`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
{ headers: { 'Accept-Language': 'es' } }
);
if (res.ok) {
const data = await res.json();
if (data.display_name) addr = data.display_name;
}
} catch {  }
overlay.querySelector('#_addr-input').value = addr;
gpsBtn.textContent = ' Ubicación obtenida';
const mapsUrl  = `https://www.google.com/maps?q=${lat},${lng}`;
let mapsLink = overlay.querySelector('#_maps-link');
if (!mapsLink) {
mapsLink = document.createElement('a');
mapsLink.id  = '_maps-link';
mapsLink.target = '_blank';
mapsLink.rel  = 'noopener noreferrer';
mapsLink.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#ff4f81;text-decoration:none;font-weight:600;margin-bottom:16px';
overlay.querySelector('#_addr-input').insertAdjacentElement('afterend', mapsLink);
}
mapsLink.href  = mapsUrl;
mapsLink.innerHTML = ' Ver ubicación en Google Maps';
gpsBtn.disabled = false;
},
() => {
gpsBtn.textContent = ' Sin permiso';
gpsBtn.disabled = false;
},
{ enableHighAccuracy: true, timeout: 10000 }
);
});
overlay.querySelector('#_addr-cancel').addEventListener('click', () => {
overlay.remove(); resolve(null);
});
overlay.querySelector('#_addr-confirm').addEventListener('click', () => {
const address = overlay.querySelector('#_addr-input').value.trim();
if (!address) {
overlay.querySelector('#_addr-input').style.borderColor = '#ef4444';
overlay.querySelector('#_addr-input').focus();
return;
}
const selectedDays = [...overlay.querySelectorAll('._day-active')].map(b => b.dataset.day);
const hourFrom = overlay.querySelector('#_hour-from').value;
const hourTo  = overlay.querySelector('#_hour-to').value;
const note  = overlay.querySelector('#_note-input').value.trim();
let schedule = '';
if (selectedDays.length) schedule += selectedDays.join(', ');
if (hourFrom && hourTo)  schedule += (schedule ? ' · ' : '') + `${hourFrom} – ${hourTo}`;
else if (hourFrom)  schedule += (schedule ? ' · ' : '') + `desde ${hourFrom}`;
else if (hourTo)  schedule += (schedule ? ' · ' : '') + `hasta ${hourTo}`;
localStorage.setItem('client_days',  selectedDays.join(','));
localStorage.setItem('client_hour_from', hourFrom);
localStorage.setItem('client_hour_to',  hourTo);
overlay.remove();
resolve({ address, schedule, note });
});
});
}
async function continueCheckout() {
const items = Object.values(localCart);
if (items.length === 0) return;
const znrItems  = items.filter(i => !i._comunidad);
const comunidadItems = items.filter(i =>  i._comunidad);
if (znrItems.length > 0) {
await _checkoutZNR(znrItems, items);
}
if (comunidadItems.length > 0) {
await _checkoutComunidad(comunidadItems);
}
}
async function _checkoutZNR(znrItems, allItems) {
let clientPhone = localStorage.getItem("client_phone");
if (!clientPhone) {
clientPhone = await new Promise(resolve => {
showCustomPrompt({
title: " Tu número de WhatsApp",
message: "Para procesar tu compra necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
icon: "",
defaultValue: "",
confirmText: "Continuar",
cancelText: "Cancelar",
onConfirm: v => resolve(v),
onCancel: () => resolve(null)
});
});
if (!clientPhone) {
showTemporaryMessage(" Necesitamos tu número para procesar la compra", "error");
return;
}
clientPhone = clientPhone.replace(/[^0-9]/g, '');
if (clientPhone.length !== 10) {
showTemporaryMessage(" Número inválido. Debe tener 10 dígitos.", "error");
return;
}
localStorage.setItem("client_phone", clientPhone);
updateSavedPhoneDisplay();
}
let clientAddress  = localStorage.getItem("client_address")  || "";
let clientSchedule = localStorage.getItem("client_schedule") || "";
const hasShipping  = znrItems.some(i => hasFreeShipping(i.price));
if (!clientAddress) {
const addrData = await _collectAddressAndSchedule();
if (addrData) {
clientAddress  = addrData.address;
clientSchedule = addrData.schedule;
localStorage.setItem("client_address",  clientAddress);
localStorage.setItem("client_schedule", clientSchedule);
if (addrData.note !== undefined) localStorage.setItem("client_note", addrData.note);
updateSavedPhoneDisplay();
}
}
showLoader("Enviando solicitud...");
const requestId = generateRequestId();
const total = znrItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
let adminMessage = "* NUEVA SOLICITUD DE COMPRA*\n";
adminMessage += "\n";
adminMessage += ` *Cliente:* +52 ${clientPhone}\n`;
adminMessage += ` *ID Solicitud:* ${requestId}\n`;
adminMessage += ` *Fecha:* ${new Date().toLocaleString()}\n`;
if (clientAddress)  adminMessage += ` *Dirección:* ${clientAddress}\n`;
const clientGpsLat = localStorage.getItem("client_gps_lat");
const clientGpsLng = localStorage.getItem("client_gps_lng");
if (clientGpsLat && clientGpsLng) {
adminMessage += ` *Ubicación:* https://www.google.com/maps?q=${clientGpsLat},${clientGpsLng}\n`;
}
if (clientSchedule) adminMessage += ` *Horario:* ${clientSchedule}\n`;
const clientNote = localStorage.getItem("client_note") || "";
if (clientNote)  adminMessage += ` *Instrucciones:* ${clientNote}\n`;
adminMessage += "\n";
adminMessage += "* DETALLE DE PRODUCTOS:*\n\n";
znrItems.forEach((item, index) => {
const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim().replace(/^talla:\s*/i, '');
adminMessage += `\n`;
adminMessage += ` *${safeName}*\n`;
adminMessage += `\n`;
adminMessage += `  ID: ${item.id}\n`;
adminMessage += `  Talla: ${safeTalla}\n`;
adminMessage += `  Cantidad: ${item.quantity}\n`;
adminMessage += `  Precio: $${item.price.toLocaleString()} c/u\n`;
adminMessage += `  Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
if (hasFreeShipping(item.price)) adminMessage += `  Envío disponible\n`;
adminMessage += `\n`;
if (index < znrItems.length - 1) adminMessage += `\n`;
});
adminMessage += "\n\n";
adminMessage += ` *TOTAL: $${total.toLocaleString()} MXN*\n`;
adminMessage += ` *Envío:* ${hasShipping ? 'Disponible (consultar)' : 'No disponible'}\n`;
adminMessage += "\n";
if (typeof saveOrderToHistory === 'function') {
saveOrderToHistory({
requestId, timestamp: Date.now(), status: 'pendiente', total,
items: znrItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
});
}
const whatsappAdminUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
window.open(whatsappAdminUrl, '_blank');
try {
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "saveClientPhone", requestId: requestId, phone: clientPhone })
});
const notificationItems = znrItems.map(item => ({
productId: item.id,
nombre:  item.name,
cantidad:  item.quantity,
imagen:  item.Imagen1 || "",
talla:  item.Talla  || "",
precio:  item.price  || 0
}));
await fetch(API_URL, {
method: "POST",
body: JSON.stringify({ action: "createNotification", items: notificationItems, requestId: requestId })
});
znrItems.forEach(i => delete localCart[i.id]);
saveCartToStorage();
updateCartBadge();
renderCart();
showTemporaryMessage(
` ¡Solicitud Z&R enviada! Recibirás el link de pago por WhatsApp cuando el administrador confirme.`,
"success"
);
startSilentPolling(requestId, clientPhone);
} catch(err) {
console.error("Error checkout Z&R:", err);
showTemporaryMessage(" Error al enviar la solicitud Z&R", "error");
} finally {
hideLoader();
}
}
async function _checkoutComunidad(comunidadItems) {
let clientPhone = localStorage.getItem("client_phone") || "";
if (!clientPhone) {
clientPhone = await new Promise(resolve => {
showCustomPrompt({
title: " Tu número de WhatsApp",
message: "Para que el vendedor te contacte necesitamos tu número (10 dígitos).\nEjemplo: 8671234567",
icon: "",
defaultValue: "",
confirmText: "Continuar",
cancelText: "Cancelar",
onConfirm: v => resolve(v),
onCancel: () => resolve(null)
});
});
if (!clientPhone) {
showTemporaryMessage(" Necesitamos tu número para contactar al vendedor", "error");
return;
}
clientPhone = clientPhone.replace(/[^0-9]/g, '');
if (clientPhone.length !== 10) {
showTemporaryMessage(" Número inválido. Debe tener 10 dígitos.", "error");
return;
}
localStorage.setItem("client_phone", clientPhone);
updateSavedPhoneDisplay();
}
const byVendor = new Map();
comunidadItems.forEach(item => {
const tel  = item._vendorTel || "";
const nombre = item._vendedor  || "Vendedor";
const key  = tel || nombre;
if (!byVendor.has(key)) byVendor.set(key, { tel, nombre, items: [] });
byVendor.get(key).items.push(item);
});
const vendors  = Array.from(byVendor.values());
const firstVendor = vendors[0];
const remaining  = vendors.length - 1;
const { tel, nombre, items } = firstVendor;
const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
let msg = "* PEDIDO DESDE Z&R COMUNIDAD*\n";
msg += "\n";
msg += ` *Cliente:* +52 ${clientPhone}\n`;
msg += ` *Fecha:* ${new Date().toLocaleString()}\n`;
const _cAddr2  = localStorage.getItem("client_address")  || "";
const _cSchedule2 = localStorage.getItem("client_schedule") || "";
const _cNote2  = localStorage.getItem("client_note")  || "";
const _cLat2  = localStorage.getItem("client_gps_lat");
const _cLng2  = localStorage.getItem("client_gps_lng");
if (_cAddr2)  msg += ` *Dirección:* ${_cAddr2}\n`;
if (_cLat2 && _cLng2) msg += ` *Ubicación:* https://www.google.com/maps?q=${_cLat2},${_cLng2}\n`;
if (_cSchedule2)  msg += ` *Horario:* ${_cSchedule2}\n`;
if (_cNote2)  msg += ` *Instrucciones:* ${_cNote2}\n`;
msg += "\n";
msg += "*\uD83D\uDCE6 PRODUCTOS SOLICITADOS:*\n\n";
items.forEach((item, idx) => {
const safeName  = String(item.name  || '').replace(/[\r\n]/g, ' ').trim();
const safeTalla = String(item.Talla || 'No especificada').replace(/[\r\n]/g, ' ').trim().replace(/^talla:\s*/i, '');
msg += "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n";
msg += `\u2502 *${safeName}*\n`;
msg += "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\n";
msg += `\u2502 \uD83D\uDCCF Talla: ${safeTalla}\n`;
msg += `\u2502 \uD83D\uDD22 Cantidad: ${item.quantity}\n`;
msg += `\u2502 \uD83D\uDCB0 Precio: $${item.price.toLocaleString()} c/u\n`;
msg += `\u2502 \uD83D\uDCB5 Subtotal: $${(item.price * item.quantity).toLocaleString()}\n`;
msg += "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n";
if (idx < items.length - 1) msg += "\n";
});
msg += "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
msg += `\uD83D\uDCB0 *TOTAL: $${subtotal.toLocaleString()} MXN*\n`;
msg += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
msg += "_Pedido realizado a través de Z&R Comunidad_";
const destTel = tel ? `52${tel}` : "";
const waUrl  = destTel ? `https://wa.me/${destTel}?text=${encodeURIComponent(msg)}` : null;
const didOpen = await _showVendorCheckoutModal({ nombre, subtotal, items, waUrl, remaining });
if (didOpen) {
items.forEach(i => delete localCart[i.id]);
saveCartToStorage();
updateCartBadge();
renderCart();
if (remaining === 0) closeCartDrawer();
}
}
function _showVendorCheckoutModal({ nombre, subtotal, items, waUrl, remaining }) {
return new Promise(resolve => {
const old = document.getElementById('vendor-checkout-modal');
if (old) old.remove();
const modal = document.createElement('div');
modal.id = 'vendor-checkout-modal';
modal.style.cssText = `
position:fixed;inset:0;
background:rgba(0,0,0,.65);
backdrop-filter:blur(6px);
z-index:99999;
display:flex;align-items:flex-end;justify-content:center;
`;
const itemsHtml = items.map(i => `
<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)">
<div style="flex:1;min-width:0">
<div style="font-size:13px;font-weight:600;color:var(--color-text-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(i.name)}</div>
<div style="font-size:12px;color:#aaa">${i.Talla ? ' ' + escapeHtml(i.Talla) + ' · ' : ''} ${i.quantity} × ${formatCurrency(i.price)}</div>
</div>
<div style="font-size:13px;font-weight:700;color:#ff4f81;white-space:nowrap">${formatCurrency(i.price * i.quantity)}</div>
</div>
`).join('');
const remainingNote = remaining > 0
? `<p style="margin:14px 0 0;padding:10px 14px;background:rgba(249,115,22,.1);border-radius:10px;font-size:12px;color:#f97316;text-align:center;line-height:1.5">Tienes artículos de <strong>${remaining}</strong> vendedor${remaining > 1 ? 'es' : ''} más en tu carrito.<br>Después de contactar a este, regresa para continuar.
</p>`
: '';
modal.innerHTML = `
<div style="
background:var(--color-surface,#252831);
border-radius:24px 24px 0 0;
padding:24px 20px 40px;
width:100%;max-width:480px;
box-shadow:0 -10px 40px rgba(0,0,0,.5);
max-height:85vh;overflow-y:auto;
">
<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 20px"></div>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#3b1f5f);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0"></div>
<div>
<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Pedido para</div>
<div style="font-size:17px;font-weight:700;color:var(--color-text-primary,#fff)">${escapeHtml(nombre)}</div>
</div>
</div>
<div style="background:rgba(255,255,255,.04);border-radius:14px;padding:12px 14px;margin-bottom:8px">
${itemsHtml}
<div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:6px">
<span style="font-size:13px;color:#aaa">Total a coordinar</span>
<span style="font-size:18px;font-weight:800;color:#ff4f81">${formatCurrency(subtotal)}</span>
</div>
</div>
<p style="font-size:12px;color:#888;text-align:center;margin:8px 0 0;line-height:1.5">El vendedor coordinará contigo el método de pago directamente por WhatsApp.
</p>
${remainingNote}
<div style="display:flex;flex-direction:column;gap:10px;margin-top:20px">
${waUrl
? `<a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener"
id="vcm-wa-btn"
style="display:flex;align-items:center;justify-content:center;gap:10px;
padding:15px;border-radius:16px;
background:linear-gradient(135deg,#25d366,#128c7e);
color:#fff;font-size:15px;font-weight:700;
text-decoration:none;-webkit-tap-highlight-color:transparent">
<span style="font-size:22px"></span>Contactar a ${escapeHtml(nombre)}
</a>`
: `<div style="padding:14px;border-radius:16px;background:rgba(239,68,68,.12);color:#ef4444;text-align:center;font-size:13px;line-height:1.5">Este vendedor no tiene número registrado.<br>Búscalo directamente en la sección Comunidad.
</div>`
}
<button id="vcm-back-btn"
style="padding:13px;border-radius:16px;background:rgba(255,255,255,.07);
border:1.5px solid rgba(255,255,255,.1);
color:#aaa;font-size:14px;font-weight:600;cursor:pointer;
-webkit-tap-highlight-color:transparent">
${remaining > 0
? `← Volver al carrito · ${remaining} vendedor${remaining > 1 ? 'es' : ''} más`
: '← Volver al carrito'}
</button>
</div>
</div>
`;
document.body.appendChild(modal);
const waBtn = modal.querySelector('#vcm-wa-btn');
if (waBtn) {
waBtn.addEventListener('click', () => {
setTimeout(() => { modal.remove(); resolve(true); }, 350);
});
}
modal.querySelector('#vcm-back-btn').addEventListener('click', () => {
modal.remove();
resolve(false);
});
});
}
async function fetchProductsAPI(shouldIndex = false) {
const cached = getCachedProducts();
if (cached && cached.length > 0) {
if (shouldIndex) buildProductIndex(cached);
return cached;
}
try {
const res = await fetch(API_URL);
const data = await res.json();
const raw = data.products || data || [];
const products = raw.filter(validateProduct);
if (products.length < raw.length) {
console.warn(` Se filtraron ${raw.length - products.length} productos inválidos`);
}
setCachedProducts(products);
if (shouldIndex) buildProductIndex(products);
return products;
} catch (err) {
console.error("Error fetching products:", err);
return [];
}
}
async function getIndexedProducts(forceRefresh = false) {
if (forceRefresh || !allProductsIndexed.length) {
await fetchProductsAPI(true);
}
return allProductsIndexed;
}
async function loadProductsUnified({ onProducts, onError, force = false } = {}) {
const deliver = (products, fromCache) => {
buildProductIndex(products);
window.allProducts = products;
onProducts(products, fromCache);
};
if (!force) {
const cached = getCachedProducts();
if (cached && cached.length > 0) {
deliver(cached, true);
if (navigator.onLine) {
fetch(API_URL)
.then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
.then(data => {
const fresh = (data.products || data || []).slice(0, 500);
if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
setCachedProducts(fresh);
deliver(fresh, false);
}
})
.catch(() => {});
}
return;
}
}
if (!navigator.onLine) {
const stale = (() => {
try {
const raw = localStorage.getItem(CACHE_KEY);
return raw ? JSON.parse(raw).data : null;
} catch { return null; }
})();
if (stale && stale.length) { deliver(stale, true); return; }
if (onError) onError(new Error('offline'));
return;
}
try {
showLoader('Cargando productos...');
const res = await fetch(API_URL);
const data = await res.json();
const products = (data.products || data || []).slice(0, 500);
setCachedProducts(products);
deliver(products, false);
} catch (err) {
console.error('loadProductsUnified error:', err);
if (onError) onError(err);
} finally {
hideLoader();
}
}
function createConnectionBanner() {
if (connectionBanner) return;
connectionBanner = document.createElement('div');
connectionBanner.id = 'connection-banner';
connectionBanner.style.cssText = `
position: fixed;
top: 0;
left: 0;
right: 0;
z-index: 10001;
padding: 12px 16px;
text-align: center;
font-size: 14px;
font-weight: 500;
transform: translateY(-100%);
transition: transform 0.3s ease;
display: flex;
align-items: center;
justify-content: center;
gap: 12px;
flex-wrap: wrap;
`;
document.body.insertBefore(connectionBanner, document.body.firstChild);
}
function showOfflineBanner() {
if (!connectionBanner) createConnectionBanner();
connectionBanner.style.background = '#ffebee';
connectionBanner.style.color = '#c62828';
connectionBanner.style.borderBottom = '2px solid #ef5350';
connectionBanner.innerHTML = `
<span style="font-size: 20px;"></span>
<span><strong>Modo offline</strong> - Estás viendo una versión guardada del catálogo</span>
<button id="dismiss-offline-btn" style="
background: rgba(198, 40, 40, 0.1);
border: 1px solid #ef5350;
padding: 4px 12px;
border-radius: 20px;
color: #c62828;
cursor: pointer;
font-size: 12px;
"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-check"/></svg> Entendido</button>
`;
connectionBanner.style.transform = 'translateY(0)';
connectionBanner.style.display = 'flex';
const dismissBtn = document.getElementById('dismiss-offline-btn');
if (dismissBtn) {
dismissBtn.onclick = () => {
connectionBanner.style.transform = 'translateY(-100%)';
sessionStorage.setItem('offline_banner_dismissed', Date.now().toString());
setTimeout(() => {
if (connectionBanner) connectionBanner.style.display = 'none';
}, 300);
};
}
addOfflineIndicator();
}
function showOnlineBanner() {
if (!connectionBanner) createConnectionBanner();
connectionBanner.style.background = '#e8f5e9';
connectionBanner.style.color = '#2e7d32';
connectionBanner.style.borderBottom = '2px solid #4caf50';
connectionBanner.innerHTML = `
<span style="font-size: 20px;"></span>
<span><strong>¡Conexión restablecida!</strong>La página se actualizará automáticamente</span>
<button id="refresh-now-btn" style="
background: #4caf50;
border: none;
padding: 6px 16px;
border-radius: 20px;
color: white;
cursor: pointer;
font-size: 12px;
font-weight: 500;
"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Actualizar ahora</button>
`;
connectionBanner.style.transform = 'translateY(0)';
connectionBanner.style.display = 'flex';
setTimeout(() => {
if (connectionBanner && connectionBanner.style.transform !== 'translateY(-100%)') {
connectionBanner.style.transform = 'translateY(-100%)';
setTimeout(() => {
if (connectionBanner) connectionBanner.style.display = 'none';
}, 300);
}
}, 5000);
const refreshBtn = document.getElementById('refresh-now-btn');
if (refreshBtn) {
refreshBtn.onclick = () => {
window.location.reload();
};
}
removeOfflineIndicator();
}
function addOfflineIndicator() {
let indicator = document.getElementById('offline-mode-indicator');
if (indicator) return;
indicator = document.createElement('div');
indicator.id = 'offline-mode-indicator';
indicator.style.cssText = `
position: fixed;
bottom: 70px;
left: 16px;
background: rgba(0, 0, 0, 0.75);
backdrop-filter: blur(8px);
padding: 6px 12px;
border-radius: 20px;
font-size: 11px;
color: #ffeb3b;
z-index: 1000;
display: flex;
align-items: center;
gap: 6px;
font-weight: 500;
pointer-events: none;
`;
indicator.innerHTML = ' <span>Modo offline</span>';
document.body.appendChild(indicator);
}
function removeOfflineIndicator() {
const indicator = document.getElementById('offline-mode-indicator');
if (indicator) indicator.remove();
}
function startConnectionMonitor() {
setInterval(() => {
const wasOnline = isOnline;
isOnline = navigator.onLine;
if (wasOnline !== isOnline) {
if (!isOnline) {
console.log(' Conexión perdida - Activando modo offline');
showOfflineBanner();
window.dispatchEvent(new CustomEvent('connection:offline'));
} else {
console.log(' Conexión recuperada');
showOnlineBanner();
window.dispatchEvent(new CustomEvent('connection:online'));
if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
if (typeof fetchProducts === 'function') {
fetchProducts(true);
}
} else if (window.location.pathname.includes('looks.html')) {
if (typeof loadProducts === 'function') {
loadProducts();
}
}
}
}
}, 3000);
window.addEventListener('online', () => {
console.log(' Navegador detectó conexión online');
isOnline = true;
});
window.addEventListener('offline', () => {
console.log(' Navegador detectó conexión offline');
isOnline = false;
showOfflineBanner();
});
}
async function registerServiceWorker() {
if (!('serviceWorker' in navigator)) {
console.log(' Service Worker no soportado');
return false;
}
try {
const registration = await navigator.serviceWorker.register('/ZNR/sw.js', {
scope: '/ZNR/'
});
console.log(' Service Worker registrado:', registration.scope);
navigator.serviceWorker.addEventListener('message', event => {
if (event.data.type === 'CONNECTION_STATUS') {
console.log(' Estado desde SW:', event.data.isOnline);
}
});
return true;
} catch (error) {
console.error(' Error registrando SW:', error);
return false;
}
}
window.changePhoneNumber = changePhoneNumber;
window.updateSavedPhoneDisplay = updateSavedPhoneDisplay;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.renderCart = renderCart;
window.addToCart = addToCart;
window.escapeHtml = escapeHtml;
async function checkIfOfflineMode() {
if (!('serviceWorker' in navigator)) return false;
try {
const registration = await navigator.serviceWorker.ready;
const cache = await caches.open('zr-cache-v1');
const cachedResponse = await cache.match(window.location.href);
if (cachedResponse && !navigator.onLine) {
showOfflineBanner();
return true;
}
} catch (err) {
console.log('Error verificando modo offline:', err);
}
if (!navigator.onLine) {
showOfflineBanner();
return true;
}
return false;
}
window.ConnectionMonitor = {
showOfflineBanner,
showOnlineBanner,
startConnectionMonitor,
registerServiceWorker,
checkIfOfflineMode,
isOnline: () => navigator.onLine
};
document.addEventListener('DOMContentLoaded', async () => {
loadCartFromStorage();
createImageObserver();
if (typeof renderCart === 'function') {
renderCart();
console.log(" Carrito renderizado al inicio");
}
const floatingCartBtn = document.getElementById("floating-cart-btn");
if (floatingCartBtn) floatingCartBtn.addEventListener("click", openCartDrawer);
const closeCartBtn = document.getElementById("close-cart-btn");
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
const changePhoneBtn = document.getElementById("change-phone-btn");
if (changePhoneBtn) changePhoneBtn.addEventListener("click", changePhoneNumber);
const changeAddrBtn  = document.getElementById("change-address-btn");
const addAddrBtn  = document.getElementById("cart-add-address-btn");
async function _handleAddressEdit() {
const data = await _collectAddressAndSchedule();
if (data) {
localStorage.setItem("client_address",  data.address);
localStorage.setItem("client_schedule", data.schedule);
if (data.note !== undefined) localStorage.setItem("client_note", data.note);
updateSavedPhoneDisplay();
}
}
if (changeAddrBtn) changeAddrBtn.addEventListener("click", _handleAddressEdit);
if (addAddrBtn)  addAddrBtn.addEventListener("click",  _handleAddressEdit);
const overlay = document.getElementById("overlay");
if (overlay) {
const newOverlay = overlay.cloneNode(true);
overlay.parentNode.replaceChild(newOverlay, overlay);
newOverlay.addEventListener("click", () => {
if (typeof closeCartDrawer === 'function') closeCartDrawer();
const wishlistDrawer = document.getElementById("wishlist-drawer");
if (wishlistDrawer && wishlistDrawer.classList.contains("open")) {
wishlistDrawer.classList.remove("open");
}
const looksWishlistDrawer = document.getElementById("wishlist-looks-drawer");
if (looksWishlistDrawer && looksWishlistDrawer.classList.contains("open")) {
looksWishlistDrawer.classList.remove("open");
}
if (typeof closeImageModal === 'function') closeImageModal();
newOverlay.classList.remove("visible");
});
}
initImageModalControls();
updateSavedPhoneDisplay();
const deferTask = (task) => {
if (window.requestIdleCallback) {
requestIdleCallback(task, { timeout: 3000 });
} else {
setTimeout(task, 100);
}
};
deferTask(() => {
if (window.CacheManager && window.CacheManager.initPreloading) {
window.CacheManager.initPreloading();
}
});
deferTask(async () => {
await registerServiceWorker();
});
deferTask(() => {
startConnectionMonitor();
});
deferTask(async () => {
await checkIfOfflineMode();
});
window.addEventListener('cartUpdated', () => {
if (typeof renderCart === 'function') renderCart();
updateCartBadge();
});
window.addEventListener('connection:offline', () => {
console.log(' Evento: Conexión perdida');
});
window.addEventListener('connection:online', () => {
console.log(' Evento: Conexión recuperada');
if (typeof loadProductsInBackground === 'function') {
deferTask(() => loadProductsInBackground());
}
});
});
function initTheme() {
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
const savedLayout = localStorage.getItem('products_layout') || 'list';
applyLayoutGlobal(savedLayout);
}
function updateThemeIcon(theme) {
const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true"><use href="#ic-moon"/></svg>';
const sunSvg  = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true"><use href="#ic-sun"/></svg>';
document.querySelectorAll('#theme-toggle').forEach(btn => {
btn.innerHTML = theme === 'dark' ? moonSvg : sunSvg;
});
document.querySelectorAll('.up-theme-btn').forEach(btn => {
btn.classList.toggle('active', btn.dataset.theme === theme);
});
}
function toggleTheme() {
const currentTheme = document.documentElement.getAttribute('data-theme');
const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
updateThemeIcon(newTheme);
}
function applyLayoutGlobal(layout) {
const isGrid = layout === 'grid';
const productsContainer = document.getElementById('products-container');
if (productsContainer) {
productsContainer.classList.toggle('layout-grid', isGrid);
}
const layoutBtn = document.getElementById('layout-toggle-btn');
if (layoutBtn) layoutBtn.textContent = isGrid ? '' : '';
const looksContainer = document.getElementById('looks-container');
if (looksContainer) {
looksContainer.classList.toggle('layout-grid', isGrid);
localStorage.setItem('looks_layout', layout);
}
const layoutLooksBtn = document.getElementById('layout-toggle-looks');
if (layoutLooksBtn) layoutLooksBtn.textContent = isGrid ? '' : '≡';
const comunidadGrid = document.getElementById('comunidad-grid');
if (comunidadGrid) {
comunidadGrid.classList.toggle('layout-list', !isGrid);
const ltComBtn = document.getElementById('layout-toggle-comunidad');
if (ltComBtn) ltComBtn.textContent = isGrid ? '' : '≡';
}
const homeComGrid = document.getElementById('home-comunidad-grid');
if (homeComGrid) {
homeComGrid.classList.toggle('layout-list', !isGrid);
homeComGrid.classList.toggle('layout-grid', isGrid);
homeComGrid.style.gridTemplateColumns = isGrid ? '' : '1fr';
}
const featuredGrid = document.getElementById('featured-products');
if (featuredGrid) {
featuredGrid.classList.toggle('layout-list', !isGrid);
}
document.querySelectorAll('.up-layout-btn').forEach(btn => {
btn.classList.toggle('active', btn.dataset.layout === layout);
});
window.dispatchEvent(new CustomEvent('layoutChanged', { detail: { layout } }));
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
initTheme();
});
} else {
initTheme();
}
window.buildProductIndex = buildProductIndex;
window._commonBuildProductIndex = buildProductIndex;
window.getProductsByCategoryIndexed = getProductsByCategoryIndexed;
window.getIndexedProducts = getIndexedProducts;
window.clearProductIndex = clearProductIndex;
window.loadProductsUnified = loadProductsUnified;
Object.defineProperty(window, 'allProductsIndexed', { get: () => allProductsIndexed, configurable: true });
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
console.log(' PWA instalable detectada');
e.preventDefault();
deferredPrompt = e;
setTimeout(() => {
showPWAInstallButton();
}, 2000);
});
function showPWAInstallButton() {
if (document.getElementById('pwa-install-btn')) return;
const installBtn = document.createElement('button');
installBtn.id = 'pwa-install-btn';
installBtn.innerHTML = ' Instalar App Z&R';
installBtn.style.cssText = `
position: fixed;
bottom: 90px;
left: 16px;
background: linear-gradient(135deg, #ff4f81, #ff7a4f);
color: white;
border: none;
border-radius: 50px;
padding: 12px 20px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
z-index: 9999;
box-shadow: 0 4px 15px rgba(0,0,0,0.2);
display: flex;
align-items: center;
gap: 8px;
animation: slideInLeft 0.3s ease;
`;
installBtn.onclick = async () => {
if (!deferredPrompt) return;
installBtn.style.display = 'none';
deferredPrompt.prompt();
const { outcome } = await deferredPrompt.userChoice;
console.log(`Instalación: ${outcome}`);
deferredPrompt = null;
};
document.body.appendChild(installBtn);
setTimeout(() => {
if (installBtn && installBtn.parentNode) {
installBtn.style.opacity = '0';
setTimeout(() => installBtn.remove(), 300);
}
}, 15000);
}
if (window.matchMedia('(display-mode: standalone)').matches) {
console.log(' Z&R ejecutándose como app instalada');
document.body.classList.add('pwa-mode');
}
const style = document.createElement('style');
style.textContent = `
@keyframes slideInLeft {
from {
opacity: 0;
transform: translateX(-100px);
}
to {
opacity: 1;
transform: translateX(0);
}
}
`;
document.head.appendChild(style);
function addToRecentProducts(productId) {
if (!productId) return;
try {
let recent = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
recent = recent.filter(id =>String(id) !== String(productId));
recent.unshift(String(productId));
recent = recent.slice(0, MAX_RECENT_PRODUCTS);
localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recent));
console.log(` Producto ${productId} agregado a recientes`);
window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
} catch(e) {
console.warn('Error guardando producto reciente:', e);
}
}
function getRecentProductIds() {
try {
return JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
} catch(e) {
return [];
}
}
function getRecentProducts(allProductsArray) {
const recentIds = getRecentProductIds();
const recentProducts = [];
for (const id of recentIds) {
const product = allProductsArray.find(p =>String(p.ID) === String(id));
if (product && product.Stock > 0 && product.Stock !== "0") {
recentProducts.push(product);
}
}
return recentProducts;
}
function clearRecentProducts() {
localStorage.removeItem(RECENT_PRODUCTS_KEY);
window.dispatchEvent(new CustomEvent('recentProductsUpdated'));
showTemporaryMessage(' Historial de productos recientes eliminado', 'info');
}
const WISHLIST_KEY = 'zr_wishlist';
function getWishlist() {
try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
catch { return []; }
}
function saveWishlist(list) {
localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
updateWishlistBadge();
window.dispatchEvent(new CustomEvent('wishlistUpdated'));
}
function isInWishlist(productId) {
return getWishlist().some(item => item.id === String(productId));
}
function toggleWishlist(product) {
const id = String(product.ID || product.id);
let list = getWishlist();
const idx = list.findIndex(item => item.id === id);
if (idx >= 0) {
list.splice(idx, 1);
saveWishlist(list);
updateAllWishlistButtons(id, false);
showTemporaryMessage(' Quitado de favoritos', 'info');
} else {
list.push({
id,
name: product.Nombre || product.name || 'Producto',
price: Number(product.Precio || product.price || 0),
Imagen1: product.Imagen1 || '',
Talla: product.Talla || '',
addedAt: Date.now()
});
saveWishlist(list);
updateAllWishlistButtons(id, true);
showTemporaryMessage(' Agregado a favoritos', 'success');
}
}
function addAllWishlistToCart() {
const list = getWishlist();
if (list.length === 0) {
showTemporaryMessage("No hay productos en tu lista de deseos", "info");
return;
}
list.forEach(item => {
addToCart({
ID: item.id,
Nombre: item.name,
Precio: item.price,
Imagen1: item.Imagen1,
Talla: item.Talla
});
});
saveWishlist([]);
if (typeof renderWishlist === 'function') renderWishlist();
updateWishlistBadge();
}
function updateAllWishlistButtons(id, active) {
document.querySelectorAll(`.wishlist-btn[data-id="${id}"]`).forEach(btn => {
btn.classList.toggle('active', active);
btn.setAttribute('aria-pressed', active);
btn.innerHTML = active
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart-fill"/></svg>'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart"/></svg>';
});
}
function createWishlistButton(product) {
const id = String(product.ID || product.id);
const active = isInWishlist(id);
const btn = document.createElement('button');
btn.className = `wishlist-btn${active ? ' active' : ''}`;
btn.setAttribute('data-id', id);
btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
btn.setAttribute('aria-pressed', active);
btn.innerHTML = active
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart-fill"/></svg>'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-heart"/></svg>';
btn.addEventListener('click', (e) => {
e.stopPropagation();
e.preventDefault();
toggleWishlist(product);
});
return btn;
}
function openWishlistDrawer() {
console.log(" Abriendo wishlist drawer");
const drawer = document.getElementById("wishlist-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.add("open");
if (overlay) overlay.classList.add("visible");
renderWishlist();
}
function closeWishlistDrawer() {
const drawer = document.getElementById("wishlist-drawer");
const overlay = document.getElementById("overlay");
if (drawer) drawer.classList.remove("open");
if (overlay) overlay.classList.remove("visible");
}
function renderWishlist() {
const container = document.getElementById("wishlist-items-container");
if (!container) return;
const items = getWishlist();
container.innerHTML = "";
if (items.length === 0) {
container.innerHTML = `
<div class="cart-empty-state">
<div class="cart-empty-icon"></div>
<p class="helper-text">Tu lista de deseos está vacía.</p>
<p class="cart-empty-hint">Agrega productos que te gusten</p>
</div>`;
} else {
items.forEach((item) => {
const row = document.createElement("div");
row.className = "cart-item";
const imgUrl = item.Imagen1 ? optimizeDriveUrl(item.Imagen1, 120) : '';
const imgHtml = imgUrl
? `<div class="cart-item-img-wrap"><img class="cart-item-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`
: `<div class="cart-item-img-wrap cart-item-img-placeholder"><span></span></div>`;
row.innerHTML = `
${imgHtml}
<div class="cart-item-info">
<div class="cart-item-title">${escapeHtml(item.name)}</div>
<div class="cart-item-meta">${formatCurrency(item.price)}</div>
<div class="cart-item-actions">
<button class="add-to-cart-wishlist" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-img="${escapeHtml(item.Imagen1)}" data-talla="${escapeHtml(item.Talla || '')}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-cart"/></svg>Agregar al carrito</button>
<button class="remove-from-wishlist" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>
</div>
</div>
`;
container.appendChild(row);
});
document.querySelectorAll('.add-to-cart-wishlist').forEach(btn => {
btn.removeEventListener('click', handleAddFromWishlist);
btn.addEventListener('click', handleAddFromWishlist);
});
document.querySelectorAll('.remove-from-wishlist').forEach(btn => {
btn.removeEventListener('click', handleRemoveFromWishlist);
btn.addEventListener('click', handleRemoveFromWishlist);
});
}
updateWishlistBadge();
}
function handleAddFromWishlist(e) {
const btn = e.currentTarget;
const id = btn.dataset.id;
const name = btn.dataset.name;
const price = parseFloat(btn.dataset.price);
const img = btn.dataset.img;
const talla = btn.dataset.talla;
addToCart({ ID: id, Nombre: name, Precio: price, Imagen1: img, Talla: talla });
showTemporaryMessage(` ${name} agregado al carrito`, 'success');
}
function handleRemoveFromWishlist(e) {
const btn = e.currentTarget;
const id = btn.dataset.id;
let list = getWishlist();
const removedItem = list.find(i => i.id === id);
list = list.filter(i => i.id !== id);
saveWishlist(list);
updateAllWishlistButtons(id, false);
renderWishlist();
if (removedItem) {
showTemporaryMessage(` ${removedItem.name} eliminado de favoritos`, 'info');
}
}
function updateWishlistBadge() {
const count = getWishlist().length;
const badge = document.getElementById("wishlist-count");
if (badge) badge.textContent = count;
console.log(" Wishlist badge actualizado:", count);
}
window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.renderWishlist = renderWishlist;
window.addAllWishlistToCart = addAllWishlistToCart;
window.updateWishlistBadge = updateWishlistBadge;
(function watchProductCards() {
function injectWishlistBtn(card) {
if (card.querySelector('.wishlist-btn')) return;
const slider = card.querySelector('.product-slider');
if (!slider) return;
const id = card.id?.replace('producto-', '') || '';
if (!id) return;
let product = null;
if (window.allProductsIndexed && Array.isArray(window.allProductsIndexed)) {
product = window.allProductsIndexed.find(p =>String(p.ID) === id);
}
if (!product) {
const nameEl = card.querySelector('.product-name');
const priceEl = card.querySelector('.product-price');
product = {
ID: id,
Nombre: nameEl?.textContent || '',
Precio: priceEl?.textContent?.replace(/[^0-9]/g, '') || 0,
Imagen1: card.querySelector('img')?.src || ''
};
}
const btn = createWishlistButton(product);
slider.style.position = 'relative';
slider.appendChild(btn);
}
function injectAll() {
document.querySelectorAll('.product-card').forEach(injectWishlistBtn);
}
const observer = new MutationObserver(mutations => {
mutations.forEach(mut => {
mut.addedNodes.forEach(node => {
if (node.nodeType !== 1) return;
if (node.classList?.contains('product-card')) {
injectWishlistBtn(node);
} else {
node.querySelectorAll?.('.product-card').forEach(injectWishlistBtn);
}
});
});
});
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
injectAll();
observer.observe(document.body, { childList: true, subtree: true });
});
} else {
injectAll();
observer.observe(document.body, { childList: true, subtree: true });
}
})();
function _upEsc(str) {
const fn = window.escapeHtml;
if (typeof fn === 'function') return fn(str);
return String(str)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const SIZE_SECTIONS = {
torso: {
label:'Torso', icon:'',
hint:'Playeras, camisas, sudaderas, chamarras…',
keywords:['camisa','playera','camiseta','blusa','sudadera','chamarra','hoodie',
'jacket','top','saco','blazer','sweater','suéter','torso','buzo',
'polo','crop','manga','camisola'],
sizes:['XS','S','M','L','XL','XXL','XXXL']
},
piernas: {
label:'Piernas', icon:'',
hint:'Pantalones, jeans, shorts, faldas…',
keywords:['pantalon','pantalón','jean','jeans','short','falda','leggins',
'legging','bermuda','jogger','cargo','trouser','pant','skirt'],
sizes:['XS','S','M','L','XL','XXL','XXXL',
'26','27','28','29','30','31','32','33','34','36','38','40']
},
pies: {
label:'Pies', icon:'',
hint:'Tenis, botas, sandalias, zapatos…',
keywords:['tenis','zapato','bota','sandalia','zapatilla','mocasin','mocasín',
'sneaker','boot','shoe','calzado','loafer','flat'],
sizes:['22','23','24','24.5','25','25.5','26','26.5','27','27.5',
'28','28.5','29','30','31','32']
}
};
function loadPrefs() {
try { return JSON.parse(localStorage.getItem(UP_KEY)) || {torso:'',piernas:'',pies:''}; }
catch { return {torso:'',piernas:'',pies:''}; }
}
function savePrefs(p) {
try { localStorage.setItem(UP_KEY, JSON.stringify(p)); } catch {}
}
window.getUserPrefs = loadPrefs;
function loadOrders() {
try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
catch { return []; }
}
function saveOrder(order) {
try {
const orders = loadOrders();
orders.unshift(order);
if (orders.length > 50) orders.length = 50;
localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
} catch {}
}
window.saveOrderToHistory = saveOrder;
function detectSection(product) {
const hay = [product.Nombre||'', product.Categoria||'', product.Descripcion||'']
.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
for (const [k,cfg] of Object.entries(SIZE_SECTIONS))
if (cfg.keywords.some(kw => hay.includes(kw))) return k;
return null;
}
function sizeMatches(talla, user) {
if (!talla||!user) return false;
const h = talla.toLowerCase(), n = user.toLowerCase();
return h===n || h.split(/[\s,\/\-]+/).some(t=>t.trim()===n);
}
function getSizeScore(p, prefs) {
const s = detectSection(p); if (!s||!prefs[s]) return 0;
return sizeMatches(p.Talla||p.talla||'', prefs[s]) ? 1 : 0;
}
function sortByUserSize(products) {
const prefs = loadPrefs();
if (!Object.values(prefs).some(v=>v)) return products;
return [...products].sort((a,b)=>getSizeScore(b,prefs)-getSizeScore(a,prefs));
}
window.sortByUserSize  = sortByUserSize;
window.getSizeScore  = getSizeScore;
window.detectSection  = detectSection;
function currentTheme() {
return localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'dark';
}
function applyTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
document.body.className = document.body.className.replace(/theme-\S+/g,'').trim();
document.body.classList.add('theme-aeromexico');
localStorage.setItem('theme', theme);
updateThemeIcon(theme);
window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}
function renderOrders() {
const orders = loadOrders();
if (!orders.length) return `
<div class="up-empty-state">
<div class="up-empty-icon"></div>
<p>Aún no tienes pedidos registrados.<br>
<small>Tus compras aparecerán aquí una vez que las solicites.</small>
</p>
</div>`;
return orders.map(o=>{
const date = new Date(o.timestamp||Date.now()).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
const items = (o.items||[]).map(i=>`
<div class="up-order-item">
<span>${_upEsc(i.name||'Producto')}</span>
<span class="up-order-qty">x${i.quantity||1} · $${(i.price||0).toLocaleString()}</span>
</div>`).join('');
const statusColor = {pendiente:'#f59e0b',confirmado:'#22c55e',cancelado:'#ef4444'}[o.status]||'#888';
return `
<div class="up-order-card">
<div class="up-order-header">
<div>
<span class="up-order-id">${_upEsc(o.requestId||'—')}</span>
<span class="up-order-date">${date}</span>
</div>
<span class="up-order-status" style="color:${statusColor}">
${o.status==='confirmado'?'':o.status==='cancelado'?'':'⏳'} ${_upEsc(o.status||'pendiente')}
</span>
</div>
<div class="up-order-items">${items}</div>
<div class="up-order-total">Total: <strong>$${(o.total||0).toLocaleString()}</strong></div>
</div>`;
}).join('');
}
function buildPanel() {
if (document.getElementById('up-panel')) return;
const prefs = loadPrefs();
const theme = currentTheme();
const savedPhone = localStorage.getItem('client_phone')||'';
const savedAddress = localStorage.getItem('client_address')||'';
const layout = localStorage.getItem('products_layout')||'list';
const overlay = document.createElement('div');
overlay.id = 'up-overlay';
overlay.addEventListener('click', closePanel);
const panel = document.createElement('div');
panel.id = 'up-panel';
panel.setAttribute('role','dialog');
panel.setAttribute('aria-modal','true');
panel.innerHTML = `
<div class="up-header">
<div class="up-title-row">
<span class="up-logo">Z&R</span>
<h2 class="up-title">Preferencias</h2>
</div>
<button class="up-close" id="up-close-btn" aria-label="Cerrar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><use href="#ic-x"/></svg></button>
</div>
<div class="up-tabs" role="tablist">
<button class="up-tab active" data-tab="apariencia" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-refresh"/></svg> Apariencia</button>
<button class="up-tab" data-tab="tallas" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.595.33a18.095 18.095 0 005.223-5.223c.542-.815.369-1.896-.33-2.595L9.568 3z"/></svg> Tallas</button>
<button class="up-tab" data-tab="pedidos" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg> Pedidos</button>
<button class="up-tab" data-tab="privacidad" role="tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg> Privacidad</button>
</div>
<div class="up-body">
<section class="up-tab-content active" data-content="apariencia">
<h3 class="up-section-title">Tema visual</h3>
<div class="up-theme-row">
<button class="up-theme-btn ${theme==='dark'?'active':''}" data-theme="dark"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-moon"/></svg> Oscuro</button>
<button class="up-theme-btn ${theme==='light'?'active':''}" data-theme="light"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-sun"/></svg> Claro</button>
</div>
<h3 class="up-section-title" style="margin-top:24px">Vista del catálogo</h3>
<div class="up-theme-row">
<button class="up-layout-btn ${layout==='list'?'active':''}" data-layout="list"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-list"/></svg> Lista</button>
<button class="up-layout-btn ${layout==='grid'?'active':''}" data-layout="grid"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-grid"/></svg> Cuadrícula</button>
</div>
</section>
<section class="up-tab-content" data-content="tallas">
<p class="up-section-hint">Selecciona tu talla en cada sección para ver primero los productos que te quedan.</p>
${Object.entries(SIZE_SECTIONS).map(([key,cfg])=>`
<div class="up-size-block">
<div class="up-size-label">
<span class="up-size-icon">${cfg.icon}</span>
<div>
<strong>${cfg.label}</strong>
<span class="up-size-hint">${cfg.hint}</span>
</div>
${prefs[key]?`<span class="up-size-badge" data-badge="${key}">${_upEsc(prefs[key])}</span>`:`<span class="up-size-badge" data-badge="${key}" style="display:none"></span>`}
</div>
<div class="up-size-grid">
${cfg.sizes.map(sz=>`
<button class="up-size-btn${prefs[key]===sz?' selected':''}"
data-section="${key}" data-size="${sz}">${sz}</button>
`).join('')}
<button class="up-size-btn up-size-clear${!prefs[key]?' hidden':''}"
data-section="${key}" data-size=""><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Quitar</button>
</div>
</div>
`).join('')}
<button class="up-save-btn" id="up-save-sizes-btn"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Guardar tallas</button>
</section>
<section class="up-tab-content" data-content="pedidos">
<h3 class="up-section-title">Mis pedidos</h3>
<div id="up-orders-list">${renderOrders()}</div>
</section>
<section class="up-tab-content" data-content="privacidad">
<h3 class="up-section-title">Mis datos guardados</h3>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Número de teléfono</strong>
<span class="up-privacy-value">${savedPhone ? '+52 '+_upEsc(savedPhone) : 'No guardado'}</span>
</div>
</div>
${savedPhone?`<button class="up-danger-btn" id="up-delete-phone-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
<div class="up-privacy-item">
<div class="up-privacy-info">
<span class="up-privacy-icon"></span>
<div>
<strong>Dirección de envío</strong>
<span class="up-privacy-value">${savedAddress ? _upEsc(savedAddress) : 'No guardada'}</span>
</div>
</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button class="up-secondary-btn" id="up-edit-address-btn">${savedAddress ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-edit"/></svg> Editar' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-plus"/></svg> Añadir'}</button>
${savedAddress?`<button class="up-danger-btn" id="up-delete-address-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true"><use href="#ic-trash"/></svg> Eliminar</button>`:''}
</div>
</div>
</div>
<div class="up-divider"></div>
<p class="up-privacy-note">Tus datos se guardan únicamente en este dispositivo y se usan solo para agilizar
el proceso de compra. Puedes eliminarlos en cualquier momento.
Para solicitar eliminación de datos en nuestros registros escríbenos a
<strong>contacto@zrtienda.com</strong>
</p>
</section>
</div>
`;
document.body.appendChild(overlay);
document.body.appendChild(panel);
attachPanelEvents(panel);
requestAnimationFrame(()=>{
overlay.classList.add('visible');
panel.classList.add('visible');
});
}
function attachPanelEvents(panel) {
panel.querySelector('#up-close-btn').addEventListener('click', closePanel);
panel.querySelectorAll('.up-tab').forEach(tab=>{
tab.addEventListener('click',()=>{
panel.querySelectorAll('.up-tab').forEach(t=>t.classList.remove('active'));
panel.querySelectorAll('.up-tab-content').forEach(c=>c.classList.remove('active'));
tab.classList.add('active');
panel.querySelector(`[data-content="${tab.dataset.tab}"]`).classList.add('active');
});
});
panel.querySelectorAll('.up-theme-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
panel.querySelectorAll('.up-theme-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
applyTheme(btn.dataset.theme);
});
});
panel.querySelectorAll('.up-layout-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const layout = btn.dataset.layout;
localStorage.setItem('products_layout', layout);
localStorage.setItem('comunidad_layout', layout);
localStorage.setItem('home_layout', layout);
applyLayoutGlobal(layout);
});
});
panel.querySelectorAll('.up-size-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
const sec  = btn.dataset.section;
const size = btn.dataset.size;
panel.querySelectorAll(`.up-size-btn[data-section="${sec}"]`).forEach(b=>{
b.classList.remove('selected');
});
if (size) btn.classList.add('selected');
const clear = panel.querySelector(`.up-size-clear[data-section="${sec}"]`);
if (clear) clear.classList.toggle('hidden', !size);
const badge = panel.querySelector(`[data-badge="${sec}"]`);
if (badge) { badge.textContent=size; badge.style.display=size?'':'none'; }
});
});
const saveBtn = panel.querySelector('#up-save-sizes-btn');
if (saveBtn) {
saveBtn.addEventListener('click',()=>{
const prefs = {torso:'',piernas:'',pies:''};
panel.querySelectorAll('.up-size-btn.selected').forEach(b=>{
if (b.dataset.size) prefs[b.dataset.section]=b.dataset.size;
});
savePrefs(prefs);
if (typeof applyFilters==='function') applyFilters();
const orig = saveBtn.textContent;
saveBtn.textContent=' ¡Guardado!';
saveBtn.classList.add('saved');
setTimeout(()=>{ saveBtn.textContent=orig; saveBtn.classList.remove('saved'); }, 1400);
});
}
const delPhone = panel.querySelector('#up-delete-phone-btn');
if (delPhone) {
delPhone.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar teléfono',
message:'¿Eliminar el número guardado? Tendrás que ingresarlo de nuevo al comprar.',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_phone'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_phone');
closePanel(); buildPanel();
}
});
}
const delAddr = panel.querySelector('#up-delete-address-btn');
const editAddr = panel.querySelector('#up-edit-address-btn');
if (editAddr) {
editAddr.addEventListener('click', async () => {
const data = await _collectAddressAndSchedule();
if (data) {
localStorage.setItem('client_address',  data.address);
localStorage.setItem('client_schedule', data.schedule);
if (data.note !== undefined) localStorage.setItem('client_note', data.note);
updateSavedPhoneDisplay();
closePanel(); buildPanel();
}
});
}
if (delAddr) {
delAddr.addEventListener('click',()=>{
if (typeof showCustomConfirm==='function') {
showCustomConfirm({
title:' Eliminar dirección',
message:'¿Eliminar la dirección guardada?',
icon:'', confirmText:'Sí, eliminar', cancelText:'Cancelar',
onConfirm:()=>{ localStorage.removeItem('client_address'); localStorage.removeItem('client_schedule'); localStorage.removeItem('client_note'); localStorage.removeItem('client_days'); localStorage.removeItem('client_hour_from'); localStorage.removeItem('client_hour_to'); localStorage.removeItem('client_gps_lat'); localStorage.removeItem('client_gps_lng'); closePanel(); buildPanel(); }
});
} else {
localStorage.removeItem('client_address');
localStorage.removeItem('client_schedule');
localStorage.removeItem('client_note');
localStorage.removeItem('client_days');
localStorage.removeItem('client_hour_from');
localStorage.removeItem('client_hour_to');
closePanel(); buildPanel();
}
});
}
}
function closePanel() {
const panel = document.getElementById('up-panel');
const ov  = document.getElementById('up-overlay');
if (!panel) return;
panel.classList.remove('visible');
ov.classList.remove('visible');
setTimeout(()=>{ panel.remove(); ov.remove(); }, 280);
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePanel(); });
function wirePrefsButton() {
if (location.pathname.includes('admin') || location.pathname.includes('notificaciones')) return;
const btn = document.getElementById('up-open-btn');
if (!btn) return;
btn.addEventListener('click', buildPanel);
refreshHeaderDot(btn);
}
function refreshHeaderDot(btn) {
if (!btn) btn = document.getElementById('up-open-btn');
if (!btn) return;
const prefs = loadPrefs();
const hasSizes = Object.values(prefs).some(v=>v);
btn.style.position = 'relative';
let dot = btn.querySelector('.up-header-dot');
if (hasSizes && !dot) {
dot = document.createElement('span'); dot.className='up-header-dot'; btn.appendChild(dot);
} else if (!hasSizes && dot) dot.remove();
}
function patchScriptFilters() {
if (window._upPatched) return; window._upPatched = true;
const orig = window.applyFilters;
if (typeof orig!=='function') return;
window.applyFilters = function(...args) {
orig.apply(this, args);
if (typeof filteredProducts!=='undefined' && filteredProducts.length) {
const sorted = sortByUserSize(filteredProducts);
if (sorted.some((p,i)=>p!==filteredProducts[i])) {
filteredProducts.length=0; sorted.forEach(p=>filteredProducts.push(p));
if (typeof renderProductsPage==='function') renderProductsPage(true);
}
}
};
}
function injectStyles() {
if (document.getElementById('up-styles')) return;
const s = document.createElement('style');
s.id = 'up-styles';
s.textContent = `
#up-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9000;opacity:0;transition:opacity .28s ease}
#up-overlay.visible{opacity:1}
#up-panel{position:fixed;top:0;right:0;height:100dvh;width:min(390px,100vw);background:var(--color-surface,#252831);border-left:1px solid var(--color-border-subtle,rgba(255,255,255,.07));z-index:9001;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);overflow:hidden;box-shadow:-8px 0 40px rgba(0,0,0,.4)}
#up-panel.visible{transform:translateX(0)}
.up-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.up-title-row{display:flex;align-items:center;gap:10px}
.up-logo{font-size:12px;font-weight:800;letter-spacing:.05em;color:#ff4f81;background:rgba(255,79,129,.12);padding:3px 8px;border-radius:6px}
.up-title{font-size:16px;font-weight:700;margin:0;color:var(--color-text-primary,#fff)}
.up-close{background:rgba(255,255,255,.07);border:none;color:var(--color-text-secondary,#aaa);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
.up-close:hover{background:rgba(255,79,129,.15);color:#ff4f81}
.up-tabs{display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.up-tabs::-webkit-scrollbar{display:none}
.up-tab{flex-shrink:0;background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary,#888);font-size:12px;font-weight:600;padding:8px 12px;cursor:pointer;transition:color .2s,border-color .2s;white-space:nowrap}
.up-tab.active{color:#ff4f81;border-bottom-color:#ff4f81}
.up-body{flex:1;overflow-y:auto;padding:20px;scrollbar-width:thin;scrollbar-color:rgba(255,79,129,.3) transparent}
.up-tab-content{display:none}
.up-tab-content.active{display:block}
.up-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-secondary,#888);margin:0 0 12px}
.up-theme-row{display:flex;gap:8px;margin-bottom:8px}
.up-theme-btn,.up-layout-btn{flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--color-text-secondary,#aaa);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.up-theme-btn.active,.up-layout-btn.active{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81}
.up-section-hint{font-size:12px;color:var(--color-text-secondary,#888);line-height:1.5;margin:0 0 18px}
.up-size-block{margin-bottom:22px}
.up-size-label{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.up-size-icon{font-size:20px;flex-shrink:0}
.up-size-label strong{display:block;font-size:14px;font-weight:600;color:var(--color-text-primary,#fff);line-height:1.2}
.up-size-hint{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px}
.up-size-badge{margin-left:auto;background:rgba(255,79,129,.15);color:#ff4f81;border:1px solid rgba(255,79,129,.3);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;flex-shrink:0}
.up-size-grid{display:flex;flex-wrap:wrap;gap:7px}
.up-size-btn{border:1px solid var(--color-border-subtle,rgba(255,255,255,.1));background:var(--color-surface-2,rgba(255,255,255,.04));color:var(--color-text-muted,#aaa);padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.up-size-btn:hover{border-color:rgba(255,79,129,.5);color:#ff4f81}
.up-size-btn.selected{background:rgba(255,79,129,.18);border-color:#ff4f81;color:#ff4f81;font-weight:700}
.up-size-clear{font-size:11px;color:var(--color-text-secondary,#777)}
.up-size-btn.hidden{display:none}
.up-save-btn{width:100%;padding:13px;background:linear-gradient(135deg,#ff4f81,#ff7a4f);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:opacity .2s}
.up-save-btn:hover{opacity:.9}
.up-save-btn.saved{background:linear-gradient(135deg,#22c55e,#16a34a)}
.up-divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0}
.up-empty-state{text-align:center;padding:40px 20px;color:var(--color-text-secondary,#888)}
.up-empty-icon{font-size:48px;margin-bottom:12px}
.up-empty-state small{font-size:12px;opacity:.7}
.up-order-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;margin-bottom:12px}
.up-order-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px}
.up-order-id{display:block;font-size:10px;font-family:monospace;color:var(--color-text-secondary,#888)}
.up-order-date{display:block;font-size:12px;font-weight:600;color:var(--color-text-primary,#fff);margin-top:2px}
.up-order-status{font-size:12px;font-weight:700;flex-shrink:0}
.up-order-items{border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:4px}
.up-order-item{display:flex;justify-content:space-between;font-size:12px;color:var(--color-text-secondary,#aaa);padding:3px 0}
.up-order-qty{color:#ff4f81;font-weight:600;white-space:nowrap}
.up-order-total{text-align:right;font-size:13px;color:var(--color-text-primary,#fff);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.up-privacy-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;margin-bottom:10px}
.up-privacy-info{display:flex;align-items:center;gap:12px;min-width:0}
.up-privacy-icon{font-size:22px;flex-shrink:0}
.up-privacy-info strong{display:block;font-size:13px;color:var(--color-text-primary,#fff)}
.up-privacy-value{display:block;font-size:11px;color:var(--color-text-secondary,#888);margin-top:2px;word-break:break-all}
.up-danger-btn{flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.up-danger-btn:hover{background:rgba(239,68,68,.2)}
.up-privacy-note{font-size:11px;color:var(--color-text-secondary,#888);line-height:1.6}
.up-header-dot{position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#ff4f81;border-radius:50%;border:1.5px solid var(--color-surface,#252831);pointer-events:none}
[data-theme="light"] #up-panel{background:#fff;border-left-color:rgba(0,0,0,.08)}
[data-theme="light"] .up-theme-btn,[data-theme="light"] .up-layout-btn,[data-theme="light"] .up-size-btn{border-color:#c5c8d0;background:#f4f5f8;color:#333;font-weight:500}
[data-theme="light"] .up-theme-btn.active,[data-theme="light"] .up-layout-btn.active{background:rgba(255,79,129,.12);border-color:#ff4f81;color:#ff4f81}
[data-theme="light"] .up-size-btn:hover{border-color:#ff4f81;color:#ff4f81;background:#fff0f5}
[data-theme="light"] .up-size-btn.selected{background:#fff0f5;border-color:#ff4f81;color:#e11d6a;font-weight:700}
[data-theme="light"] .up-order-card,[data-theme="light"] .up-privacy-item{background:#f4f5f8;border-color:#dde0e8}
[data-theme="light"] .up-header,[data-theme="light"] .up-tabs{border-color:#e2e4ea}
[data-theme="light"] .up-divider{background:#e2e4ea}
[data-theme="light"] .up-close{background:#f0f1f5;color:#555}
[data-theme="light"] .up-close:hover{background:#fff0f5;color:#ff4f81}
[data-theme="light"] .up-section-title,[data-theme="light"] .up-size-hint,[data-theme="light"] .up-privacy-note,[data-theme="light"] .up-section-hint{color:#6b7280}
[data-theme="light"] .up-title,[data-theme="light"] .up-size-label strong,[data-theme="light"] .up-order-date,[data-theme="light"] .up-privacy-info strong{color:#111318}
@media(max-width:400px){#up-panel{width:100vw;border-left:none}}
`;
document.head.appendChild(s);
}
function initUserPreferences() {
injectStyles();
wirePrefsButton();
if (typeof applyFilters === 'function') patchScriptFilters();
}
document.addEventListener('DOMContentLoaded', initUserPreferences);
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;

window.fetchWithRetry = async function(fn, maxAttempts = 3, delays = [2000, 5000, 10000]) {
for (let attempt = 0; attempt < maxAttempts; attempt++) {
try { return await fn(); }
catch(err) {
if (attempt === maxAttempts - 1) throw err;
await new Promise(r => setTimeout(r, delays[attempt]));
}
}
};
window.safeHtml = safeHtml;
(function injectCartSectionStyles() {
if (document.getElementById('cart-section-styles')) return;
const style = document.createElement('style');
style.id = 'cart-section-styles';
style.textContent = `
.cart-section-header {
display: flex;
align-items: center;
gap: 8px;
padding: 8px 4px 4px;
margin: 10px 0 6px;
font-size: 12px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--color-text-secondary, #888);
border-bottom: 1px solid rgba(255,255,255,0.07);
}
.cart-section-comunidad {
color: #7c3aed;
border-bottom-color: rgba(124,58,237,0.2);
flex-direction: column;
align-items: flex-start;
gap: 2px;
}
.cart-section-comunidad small {
font-size: 11px;
font-weight: 400;
text-transform: none;
letter-spacing: 0;
color: #25d366;
opacity: 0.9;
}
.cart-item-vendor {
display: inline-block;
font-size: 11px;
color: #7c3aed;
font-weight: 600;
margin-top: 2px;
}
`;
document.head.appendChild(style);
})();
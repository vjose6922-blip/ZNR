

(function () {
  'use strict';

  const AV_CONFIG = {
    idioma: 'es-MX',
    urlOfertas: 'catalogo.html',     // aún no existe página de ofertas dedicada
    urlCatalogo: 'catalogo.html',
    urlInicio: 'index.html',
    urlComunidad: 'comunidad.html',
    urlVendedor: 'vendedor.html',
    duracionBurbuja: 4500,           // ms que se muestra el mensaje en pantalla
    storageKey: 'zr_voice_assistant_enabled',
    requierePalabraActivacion: true, // si es true, ignora todo lo que no empiece/incluya la palabra de activación
    palabraActivacion: 'oye asistente', // di, por ejemplo: "oye asistente, busca camisetas rojas"
    nluHabilitado: true,   // si es false, solo usa el matching local por frases (comportamiento actual)
    nluEndpoint: 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec?action=interpretarComandoVoz', // TODO: reemplazar con tu Web App de GAS
    nluTimeoutMs: 6000
  };

  const NOTIFICACIONES_SIMULADAS = [
    { titulo: 'Descuento especial', mensaje: 'Tienes un 20% de descuento en vestidos esta semana.' },
    { titulo: 'Nuevo look disponible', mensaje: 'Se agregaron nuevas chamarras para caballero al catálogo.' },
    { titulo: 'Envío gratis', mensaje: 'Envío gratis en compras mayores a 800 pesos hasta el domingo.' }
  ];

  const PEDIDO_SIMULADO = {
    numero: '1234',
    estado: 'en camino',
    texto: 'Tu pedido número 1234 está en camino y llegará en los próximos dos días.'
  };

  // ============================================================
  // 2) SOPORTE DEL NAVEGADOR
  // ============================================================
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const soportaReconocimiento = !!SpeechRecognitionAPI;
  const soportaSintesis = 'speechSynthesis' in window;
  const soportado = soportaReconocimiento && soportaSintesis;

  if (!soportado) {
    console.error('[AsistenteVoz] Este navegador no soporta Web Speech API (reconocimiento y/o síntesis de voz). Prueba con Chrome.');
  }

  // ============================================================
  // 3) ESTILOS
  // ============================================================
  const CSS = `
  .av-switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
  }
  .av-switch-info strong {
    display: block;
    font-size: 14px;
    color: var(--color-text-primary, #fff);
    margin-bottom: 3px;
  }
  .av-switch-info span {
    font-size: 12px;
    color: var(--color-text-secondary, #888);
    line-height: 1.4;
    display: block;
    max-width: 220px;
  }
  .av-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
  }
  .av-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .av-switch-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid var(--color-border-subtle, rgba(255,255,255,.12));
    border-radius: 999px;
    transition: background 0.2s ease;
  }
  .av-switch-slider::before {
    content: "";
    position: absolute;
    height: 20px;
    width: 20px;
    left: 2px;
    top: 2px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .av-switch input:checked + .av-switch-slider {
    background: #ff4f81;
    border-color: #ff4f81;
  }
  .av-switch input:checked + .av-switch-slider::before {
    transform: translateX(18px);
  }
  .av-switch input:disabled + .av-switch-slider {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .av-switch-note {
    font-size: 11px;
    color: #ff4f81;
    margin-top: -8px;
    margin-bottom: 4px;
  }

  .av-pill {
    position: fixed;
    right: 16px;
    bottom: 88px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1f2937;
    color: #fff;
    padding: 7px 12px 7px 9px;
    border-radius: 999px;
    font-size: 12px;
    z-index: 9998;
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  }
  .av-pill.av-show { opacity: 1; transform: translateY(0); }
  .av-pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6b7280;
    flex-shrink: 0;
  }
  .av-pill.av-listening .av-pill-dot { background: #ef4444; animation: av-blink 1.2s infinite; }
  .av-pill.av-speaking .av-pill-dot { background: #7c3aed; }
  @keyframes av-blink { 50% { opacity: 0.35; } }

  .av-bubble {
    position: fixed;
    right: 16px;
    bottom: 128px;
    max-width: 280px;
    background: #1f2937;
    color: #fff;
    padding: 12px 14px;
    border-radius: 14px;
    font-size: 13.5px;
    line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    z-index: 9999;
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .av-bubble.av-visible { opacity: 1; transform: translateY(0); }
  .av-bubble.av-error { background: #b91c1c; }
  .av-bubble.av-user { background: #374151; }
  .av-bubble strong { display: block; margin-bottom: 2px; font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.03em; }

  @media (max-width: 480px) {
    .av-pill { right: 12px; bottom: 78px; }
    .av-bubble { right: 12px; left: 12px; max-width: none; bottom: 114px; }
  }
  `;

  function injectStyles() {
    if (document.getElementById('av-styles')) return;
    const style = document.createElement('style');
    style.id = 'av-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ============================================================
  // 4) INDICADOR DE ESTADO (pill no interactivo) + BURBUJA
  // ============================================================
  function injectIndicators() {
    if (!document.getElementById('av-pill')) {
      const pill = document.createElement('div');
      pill.id = 'av-pill';
      pill.className = 'av-pill';
      pill.innerHTML = `<span class="av-pill-dot"></span><span class="av-pill-text">Asistente de voz activo</span>`;
      document.body.appendChild(pill);
    }
    if (!document.getElementById('av-bubble')) {
      const bubble = document.createElement('div');
      bubble.id = 'av-bubble';
      bubble.className = 'av-bubble';
      document.body.appendChild(bubble);
    }
  }

  let bubbleTimer = null;
  function mostrarBurbuja(texto, tipo, etiqueta) {
    const bubble = document.getElementById('av-bubble');
    if (!bubble) return;
    bubble.innerHTML = (etiqueta ? `<strong>${etiqueta}</strong>` : '') + texto;
    bubble.classList.remove('av-error', 'av-user');
    if (tipo === 'error') bubble.classList.add('av-error');
    if (tipo === 'user') bubble.classList.add('av-user');
    bubble.classList.add('av-visible');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('av-visible'), AV_CONFIG.duracionBurbuja);
  }

  function setEstadoPill(estado) {
    const pill = document.getElementById('av-pill');
    if (!pill) return;
    const textoEl = pill.querySelector('.av-pill-text');
    pill.classList.remove('av-listening', 'av-speaking');
    if (estado === 'listening') {
      pill.classList.add('av-listening', 'av-show');
      if (textoEl) textoEl.textContent = 'Escuchando...';
    } else if (estado === 'speaking') {
      pill.classList.add('av-speaking', 'av-show');
      if (textoEl) textoEl.textContent = 'Hablando...';
    } else if (estado === 'idle-on') {
      pill.classList.add('av-show');
      if (textoEl) textoEl.textContent = 'Asistente de voz activo';
    } else {
      pill.classList.remove('av-show');
    }
  }

  // ============================================================
  // 5) TEXTO A VOZ
  // ============================================================
  let vocesDisponibles = [];
  function cargarVoces() {
    vocesDisponibles = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  }
  if (soportaSintesis) {
    cargarVoces();
    window.speechSynthesis.onvoiceschanged = cargarVoces;
  }

  function hablar(texto) {
    if (!soportaSintesis) {
      console.error('[AsistenteVoz] Este navegador no soporta Speech Synthesis.');
      return;
    }
    // Evita que el asistente se "escuche a sí mismo": pausamos el
    // reconocimiento mientras habla y lo retomamos al terminar.
    pausarReconocimientoTemporalmente();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = AV_CONFIG.idioma;
    const voz = vocesDisponibles.find(v => v.lang === AV_CONFIG.idioma) ||
                vocesDisponibles.find(v => v.lang && v.lang.startsWith('es'));
    if (voz) utter.voice = voz;
    utter.rate = 1;
    utter.onstart = () => setEstadoPill('speaking');
    utter.onend = () => {
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      reanudarReconocimientoSiCorresponde();
    };
    utter.onerror = () => {
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      reanudarReconocimientoSiCorresponde();
    };
    window.speechSynthesis.speak(utter);
    mostrarBurbuja(texto, 'info', 'Asistente');
  }

  function normalizar(texto) {
    return (texto || '')
      .toLowerCase()
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ============================================================
  // 6) MOTOR DE COMANDOS — fácilmente ampliable
  // ============================================================
  const COMANDOS = [];

  function registrarComando(cmd) {
    // cmd = { id, frases: [..] opcional, patron: RegExp opcional, accion: fn(texto) }
    COMANDOS.push(cmd);
  }

  function coincide(cmd, textoNorm) {
    if (cmd.patron) {
      const m = textoNorm.match(cmd.patron);
      if (m) return m;
    }
    if (cmd.frases) {
      for (const frase of cmd.frases) {
        if (textoNorm.includes(normalizar(frase))) return true;
      }
    }
    return false;
  }

  // ============================================================
  // 6.0) NLU REMOTO (fallback cuando ninguna frase local matchea)
  // ------------------------------------------------------------
  // Contrato esperado del backend (POST JSON, respuesta JSON):
  //   Request:  { comando: "camisetas rojas de mujer talla m" }
  //   Response: { accion: "buscar", parametros: { query: "camisetas rojas" } }
  // "accion" debe ser una de las claves de ACCIONES_NLU más abajo.
  // Si el backend no puede interpretar nada, debe devolver:
  //   { accion: "desconocido", parametros: { respuesta: "..." } }
  // ============================================================
  async function consultarNLU(textoOriginal) {
    if (!AV_CONFIG.nluHabilitado || !AV_CONFIG.nluEndpoint) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AV_CONFIG.nluTimeoutMs);
    try {
      const resp = await fetch(AV_CONFIG.nluEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS con Apps Script
        body: JSON.stringify({ action: 'interpretarComandoVoz', comando: textoOriginal }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data || !data.accion) throw new Error('Respuesta sin "accion"');
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AsistenteVoz] Error consultando NLU remoto:', err);
      return null;
    }
  }

  const ACCIONES_NLU = {
    buscar: (p) => aplicarYConfirmarFiltro({ search: p.query || '' }, `Buscando ${p.query || ''}.`),
    filtrar_genero: (p) => aplicarYConfirmarFiltro({ gender: (p.genero || '').toUpperCase() }, `Mostrando ropa de ${p.genero || ''}.`),
    filtrar_categoria: (p) => aplicarYConfirmarFiltro({ category: p.categoria }, `Filtrando por categoría ${p.categoria}.`),
    filtrar_talla: (p) => aplicarYConfirmarFiltro({ size: p.talla }, `Filtrando por talla ${p.talla}.`),
    ordenar_precio: (p) => aplicarYConfirmarFiltro(
      { sort: p.direccion === 'desc' ? 'price-desc' : 'price-asc' },
      `Ordenando por precio, de ${p.direccion === 'desc' ? 'mayor a menor' : 'menor a mayor'}.`
    ),
    limpiar_filtros: () => {
      if (!catalogoListo()) { hablar('Los filtros solo están disponibles en el catálogo.'); return; }
      ['gender-filter', 'category-filter', 'sort-select', 'size-filter'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      const si = document.getElementById('search-input'); if (si) si.value = '';
      window.applyFilters();
      hablar('Quité todos los filtros.');
    },
    agregar_carrito: (p) => p.producto ? intentarAgregarConNombre(p.producto, false) : intentarAgregarSinNombre(),
    ir_carrito: () => {
      if (typeof window.openCartDrawer === 'function' && document.getElementById('cart-drawer')) {
        window.openCartDrawer();
        hablar('Aquí está tu carrito.');
      } else {
        hablar('El carrito no está disponible en esta página.');
      }
    },
    crear_producto: (p) => {
      const datos = { nombre: p.nombre || '', precio: p.precio || '', stock: p.stock || '', info: p.info || '', descripcion: p.descripcion || '', categoria: p.categoria || '' };
      if (!datos.nombre) { hablar('¿Cómo se llama el producto que quieres agregar?'); return; }
      sessionStorage.setItem('av_pending_new_product', JSON.stringify(datos));
      hablar(`Te llevo a publicar ${datos.nombre}. Revisa los datos, agrega fotos y da clic en publicar.`);
      setTimeout(() => { window.location.href = AV_CONFIG.urlVendedor; }, 1200);
    },
    ver_ofertas: () => { hablar('Te muestro las ofertas disponibles.'); setTimeout(() => { window.location.href = AV_CONFIG.urlOfertas; }, 800); },
    ir_inicio: () => { hablar('Vamos al inicio.'); setTimeout(() => { window.location.href = AV_CONFIG.urlInicio; }, 700); },
    ir_catalogo: () => { hablar('Abriendo el catálogo.'); setTimeout(() => { window.location.href = AV_CONFIG.urlCatalogo; }, 700); },
    ir_comunidad: () => { hablar('Abriendo comunidad.'); setTimeout(() => { window.location.href = AV_CONFIG.urlComunidad; }, 700); },
    leer_notificaciones: () => {
      if (!NOTIFICACIONES_SIMULADAS.length) { hablar('No tienes notificaciones nuevas.'); return; }
      const resumen = NOTIFICACIONES_SIMULADAS.map(n => `${n.titulo}. ${n.mensaje}`).join(' ... ');
      hablar(`Tienes ${NOTIFICACIONES_SIMULADAS.length} notificaciones. ${resumen}`);
    },
    leer_pedido: () => { hablar(PEDIDO_SIMULADO.texto); },
    ayuda: () => { hablar('Puedo buscar productos, filtrar, ordenar, agregar al carrito, llevarte a otras secciones, leer tus notificaciones y contarte el estado de tu pedido. Pregúntame casi cualquier cosa relacionada con la tienda.'); },
    detener: () => { window.speechSynthesis.cancel(); setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle'); },
    desconocido: (p) => { hablar((p && p.respuesta) || 'No entendí ese comando. Puedes decir "ayuda" para escuchar lo que puedo hacer.'); }
  };

  function extraerComandoTrasActivacion(textoNorm, textoOriginal) {
    if (!AV_CONFIG.requierePalabraActivacion) {
      return { activado: true, textoNorm, textoOriginal };
    }
    const wakeNorm = normalizar(AV_CONFIG.palabraActivacion);
    const idx = textoNorm.indexOf(wakeNorm);
    if (idx === -1) return { activado: false };
    const nuevoNorm = (textoNorm.slice(0, idx) + textoNorm.slice(idx + wakeNorm.length))
      .replace(/\s+/g, ' ')
      .replace(/^[,.\s]+/, '')
      .trim();
    const wakeRegex = new RegExp(AV_CONFIG.palabraActivacion.trim().split(/\s+/).join('\\s+'), 'i');
    const nuevoOriginal = textoOriginal.replace(wakeRegex, '').replace(/^[,.\s]+/, '').trim();
    return { activado: true, textoNorm: nuevoNorm, textoOriginal: nuevoOriginal || textoOriginal };
  }

  async function procesarComando(textoOriginal) {
    const textoNormCompleto = normalizar(textoOriginal);
    if (!textoNormCompleto) return;

    const gate = extraerComandoTrasActivacion(textoNormCompleto, textoOriginal);
    if (!gate.activado) return; // no trae la palabra de activación: se ignora en silencio

    const textoNorm = gate.textoNorm;
    const textoParaComando = gate.textoOriginal;
    if (!textoNorm) { hablar('Dime qué necesitas.'); return; }
    mostrarBurbuja(textoParaComando, 'user', 'Tú dijiste');

    for (const cmd of COMANDOS) {
      const resultado = coincide(cmd, textoNorm);
      if (resultado) {
        try {
          await cmd.accion(textoNorm, resultado, textoParaComando);
        } catch (err) {
          console.error(`[AsistenteVoz] Error ejecutando el comando "${cmd.id}":`, err);
          hablar('Ocurrió un error al ejecutar ese comando.');
        }
        return;
      }
    }

    // Ninguna frase local matcheó: probamos con el NLU remoto (Groq vía GAS).
    const nlu = await consultarNLU(textoParaComando);
    if (nlu && ACCIONES_NLU[nlu.accion]) {
      try {
        await ACCIONES_NLU[nlu.accion](nlu.parametros || {});
      } catch (err) {
        console.error('[AsistenteVoz] Error ejecutando acción NLU:', err);
        hablar('Ocurrió un error al ejecutar ese comando.');
      }
      return;
    }

    hablar('No entendí ese comando. Puedes decir "ayuda" para escuchar lo que puedo hacer.');
  }

  // ============================================================
  // 6.1) INTEGRACIÓN REAL CON EL CATÁLOGO (catalogo.html / home.js)
  // ------------------------------------------------------------
  // catalogo.html expone window.applyFilters() (definido en script.js),
  // que lee los valores de #search-input, #gender-filter, #category-filter,
  // #size-filter y #sort-select y filtra el catálogo. NO existe
  // window.fetchProducts ni window.ensureFullCatalog (viven dentro de un
  // IIFE), así que toda la integración pasa por rellenar esos campos del
  // DOM y llamar a applyFilters().
  // ============================================================

  function catalogoListo() {
    return !!document.getElementById('search-input') && typeof window.applyFilters === 'function';
  }

  function esperarCatalogoListo(callback, intentos = 20) {
    if (catalogoListo()) { callback(); return; }
    if (intentos <= 0) return;
    setTimeout(() => esperarCatalogoListo(callback, intentos - 1), 300);
  }

  function seleccionarOpcionPorTexto(select, texto) {
    const q = normalizar(texto);
    for (const opt of select.options) {
      if (normalizar(opt.textContent).includes(q) || normalizar(opt.value).includes(q)) {
        select.value = opt.value;
        return true;
      }
    }
    return false;
  }

  function aplicarCamposFiltro(filtros) {
    if (filtros.search !== undefined) { const el = document.getElementById('search-input'); if (el) el.value = filtros.search; }
    if (filtros.gender !== undefined) { const el = document.getElementById('gender-filter'); if (el) el.value = filtros.gender; }
    if (filtros.category !== undefined) { const el = document.getElementById('category-filter'); if (el) seleccionarOpcionPorTexto(el, filtros.category); }
    if (filtros.size !== undefined) { const el = document.getElementById('size-filter'); if (el) seleccionarOpcionPorTexto(el, filtros.size); }
    if (filtros.sort !== undefined) { const el = document.getElementById('sort-select'); if (el) el.value = filtros.sort; }
  }

  // Aplica filtros ya sea en el momento (si estamos en catalogo.html) o
  // navegando allá y reaplicándolos apenas cargue (vía sessionStorage).
  function aplicarYConfirmarFiltro(filtrosParciales, mensajeConfirmacion) {
    if (catalogoListo()) {
      aplicarCamposFiltro(filtrosParciales);
      window.applyFilters();
      hablar(mensajeConfirmacion);
    } else {
      sessionStorage.setItem('av_pending_filters', JSON.stringify(filtrosParciales));
      hablar(`Te llevo al catálogo. ${mensajeConfirmacion}`);
      setTimeout(() => { window.location.href = AV_CONFIG.urlCatalogo; }, 900);
    }
  }

  function aplicarFiltrosPendientes() {
    const raw = sessionStorage.getItem('av_pending_filters');
    if (!raw) return;
    sessionStorage.removeItem('av_pending_filters');
    let filtros;
    try { filtros = JSON.parse(raw); } catch (_) { return; }
    esperarCatalogoListo(() => {
      aplicarCamposFiltro(filtros);
      window.applyFilters();
    });
  }

  // ============================================================
  // 6.2) AGREGAR PRODUCTOS AL CARRITO POR VOZ
  // ------------------------------------------------------------
  // No duplicamos la lógica de addToCart(): buscamos la tarjeta real
  // en pantalla (.product-card, usada igual en script.js, home.js y
  // comunidad.js) y le hacemos click al botón "Añadir al carrito" que
  // ya trae su propio manejo de stock, wishlist, animación, etc.
  // ============================================================
  const ORDINALES = { primero: 0, primer: 0, segundo: 1, tercero: 2, tercer: 2, cuarto: 3, quinto: 4 };
  const REFERENCIAS_GENERICAS = ['esto', 'lo', 'eso', 'este producto', 'ese producto', 'este', 'ese', ''];

  function buscarTarjetaProductoPorNombre(nombre) {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    if (!cards.length) return null;
    const q = normalizar(nombre);
    let candidatos = cards.filter(c => {
      const nameEl = c.querySelector('.product-name');
      return nameEl && normalizar(nameEl.textContent).includes(q);
    });
    if (candidatos.length) return candidatos[0];
    const palabras = q.split(/\s+/).filter(Boolean);
    candidatos = cards.filter(c => {
      const nameEl = c.querySelector('.product-name');
      if (!nameEl) return false;
      const nombreNorm = normalizar(nameEl.textContent);
      return palabras.every(p => nombreNorm.includes(p));
    });
    return candidatos[0] || null;
  }

  function ejecutarAgregarDesdeTarjeta(card) {
    const nameEl = card.querySelector('.product-name');
    const btn = card.querySelector('button.primary-button, button[data-product-id]');
    if (!btn || btn.disabled) {
      hablar('Ese producto no tiene stock disponible.');
      return;
    }
    btn.click();
    hablar(`Agregué ${nameEl ? nameEl.textContent.trim() : 'el producto'} al carrito.`);
  }

  function intentarAgregarConNombre(nombre, reintentado) {
    const card = buscarTarjetaProductoPorNombre(nombre);
    if (card) { ejecutarAgregarDesdeTarjeta(card); return; }
    if (!reintentado) {
      // por si el comando llegó justo cuando el catálogo aún estaba renderizando
      setTimeout(() => intentarAgregarConNombre(nombre, true), 700);
      return;
    }
    hablar(`No encontré "${nombre}" entre los productos visibles. Intenta buscarlo primero.`);
  }

  function intentarAgregarSinNombre() {
    // 1) Modal de producto individual abierto (openImageModal en common.js)
    const modal = document.getElementById('image-modal');
    if (modal && modal.classList.contains('open')) {
      const buyBtn = modal.querySelector('#im-buy-btn');
      if (buyBtn && !buyBtn.disabled) {
        buyBtn.click();
        hablar('Agregué el producto al carrito.');
        return;
      }
    }
    // 2) Un único producto visible en la página
    const cards = document.querySelectorAll('.product-card');
    if (cards.length === 1) { ejecutarAgregarDesdeTarjeta(cards[0]); return; }
    hablar('¿Cuál producto quieres agregar? Por ejemplo: agrega camiseta roja al carrito.');
  }

  // ---- Comando: BUSCAR ------------------------------------------------
  registrarComando({
    id: 'buscar-producto',
    patron: /^(?:busca(?:r|me)?|encuentra|encontrar|quiero ver)\s+(.+)/,
    accion: (_texto, match) => {
      const query = match[1].trim();
      if (!query) { hablar('¿Qué producto quieres buscar?'); return; }
      aplicarYConfirmarFiltro({ search: query }, `Buscando ${query}.`);
    }
  });

  // ---- Comando: FILTRAR POR GÉNERO --------------------------------------
  registrarComando({
    id: 'filtro-genero-hombre',
    frases: ['ropa de hombre', 'ropa para hombre', 'filtra por hombre', 'filtrar por hombre', 'solo hombre', 'moda hombre', 'para caballero', 'ver caballero'],
    accion: () => aplicarYConfirmarFiltro({ gender: 'HOMBRE' }, 'Mostrando ropa de hombre.')
  });
  registrarComando({
    id: 'filtro-genero-mujer',
    frases: ['ropa de mujer', 'ropa para mujer', 'filtra por mujer', 'filtrar por mujer', 'solo mujer', 'moda mujer', 'para dama', 'ver dama'],
    accion: () => aplicarYConfirmarFiltro({ gender: 'MUJER' }, 'Mostrando ropa de mujer.')
  });

  // ---- Comando: FILTRAR POR CATEGORÍA -----------------------------------
  registrarComando({
    id: 'filtro-categoria',
    patron: /^(?:filtra(?:r)? por categoria|categoria|ver categoria)\s+(.+)/,
    accion: (_t, match) => {
      const cat = match[1].trim();
      aplicarYConfirmarFiltro({ category: cat }, `Filtrando por categoría ${cat}.`);
    }
  });

  // ---- Comando: FILTRAR POR TALLA ----------------------------------------
  registrarComando({
    id: 'filtro-talla',
    patron: /^(?:filtra(?:r)? por talla|talla)\s+(.+)/,
    accion: (_t, match) => {
      const talla = match[1].trim();
      aplicarYConfirmarFiltro({ size: talla }, `Filtrando por talla ${talla}.`);
    }
  });

  // ---- Comando: ORDENAR POR PRECIO ---------------------------------------
  registrarComando({
    id: 'orden-precio-asc',
    frases: ['ordenar por precio de menor a mayor', 'precio de menor a mayor', 'ordena de menor a mayor'],
    accion: () => aplicarYConfirmarFiltro({ sort: 'price-asc' }, 'Ordenando por precio, de menor a mayor.')
  });
  registrarComando({
    id: 'orden-precio-desc',
    frases: ['ordenar por precio de mayor a menor', 'precio de mayor a menor', 'ordena de mayor a menor'],
    accion: () => aplicarYConfirmarFiltro({ sort: 'price-desc' }, 'Ordenando por precio, de mayor a menor.')
  });

  // ---- Comando: QUITAR FILTROS -------------------------------------------
  registrarComando({
    id: 'limpiar-filtros',
    frases: ['quitar filtros', 'limpiar filtros', 'borrar filtros', 'quita los filtros', 'sin filtros'],
    accion: () => {
      if (!catalogoListo()) { hablar('Los filtros solo están disponibles en el catálogo.'); return; }
      ['gender-filter', 'category-filter', 'sort-select', 'size-filter'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      const si = document.getElementById('search-input'); if (si) si.value = '';
      window.applyFilters();
      hablar('Quité todos los filtros.');
    }
  });

  // ---- Comando: AGREGAR AL CARRITO ---------------------------------------
  registrarComando({
    id: 'agregar-al-carrito',
    patron: /^(?:agrega(?:r|le)?|anade|pon|compra(?:r)?|quiero comprar|dame)\s+(.+)/,
    accion: (_texto, match) => {
      let nombre = match[1]
        .replace(/\s*(al carrito|en el carrito|a mi carrito|a el carrito)\s*$/, '')
        .replace(/^(el|la|los|las)\s+/, '')
        .trim();
      if (REFERENCIAS_GENERICAS.includes(nombre)) { intentarAgregarSinNombre(); return; }
      if (nombre.replace(/\s+producto$/, '') in ORDINALES) {
        const idx = ORDINALES[nombre.replace(/\s+producto$/, '')];
        const cards = document.querySelectorAll('.product-card');
        const card = cards[idx];
        if (!card) { hablar('No encontré ese producto en la lista.'); return; }
        ejecutarAgregarDesdeTarjeta(card);
        return;
      }
      intentarAgregarConNombre(nombre, false);
    }
  });

  // ---- Comando: IR AL CARRITO ------------------------------------------
  registrarComando({
    id: 'ir-al-carrito',
    frases: ['ir al carrito', 'abrir carrito', 'ver carrito', 'mi carrito', 'ver mi carrito', 'muestrame el carrito'],
    accion: () => {
      if (typeof window.openCartDrawer === 'function' && document.getElementById('cart-drawer')) {
        window.openCartDrawer();
        hablar('Aquí está tu carrito.');
      } else {
        hablar('El carrito no está disponible en esta página.');
      }
    }
  });

  // ============================================================
  // 6.3) CREAR PRODUCTO NUEVO POR VOZ (funciona desde cualquier página)
  // ------------------------------------------------------------
  // Extrae nombre / precio / stock / info / descripción / categoría de
  // una frase libre, guarda los datos y redirige a vendedor.html, donde
  // se precargan en el formulario "Publicar producto". NO se envía
  // automáticamente: las fotos son obligatorias y publicar un producto
  // es una acción con consecuencias reales, así que siempre se deja
  // que la persona revise y confirme con su propio clic.
  // ============================================================
  function parsearProductoNuevo(textoOriginal) {
    const texto = String(textoOriginal || '').trim();
    const stopWords = '(?:vale|cuesta|precio|tengo|stock|hay|con stock de|informaci[oó]n|descripci[oó]n|info|categoria|categoría)';
    const datos = { nombre: '', precio: '', stock: '', info: '', descripcion: '', categoria: '' };

    let m = texto.match(new RegExp(`(?:llamado|llamada|que se llama|nombre)\\s+(.+?)(?=\\s+${stopWords}\\b|$)`, 'i'));
    if (!m) m = texto.match(new RegExp(`producto\\s+nuevo\\s+(.+?)(?=\\s+${stopWords}\\b|$)`, 'i'));
    if (m) datos.nombre = m[1].trim().replace(/[.,]+$/, '');

    m = texto.match(/(?:vale|cuesta|precio(?:\s+de)?)\s+(?:\$\s*)?(\d+(?:[.,]\d+)?)/i);
    if (m) datos.precio = m[1].replace(',', '.');

    m = texto.match(/(?:con stock de|stock de|stock|tengo|hay)\s+(\d+)/i);
    if (m) datos.stock = m[1];

    m = texto.match(/\binfo(?:rmaci[oó]n)?(?:\s+es)?\s*[:]?\s*(.+?)(?=[.,]|$)/i);
    if (m) datos.info = m[1].trim();

    m = texto.match(/descripci[oó]n(?:\s+es)?\s*[:]?\s*(.+?)(?=[.,]|$)/i);
    if (m) datos.descripcion = m[1].trim();

    m = texto.match(new RegExp(`categor[ií]a\\s+(?:es\\s+)?(.+?)(?=\\s+${stopWords}\\b|[.,]|$)`, 'i'));
    if (m) datos.categoria = m[1].trim();

    return datos;
  }

  registrarComando({
    id: 'crear-producto',
    patron: /(?:agregar|publicar|crear|dar de alta|registrar|subir)\s+(?:un\s+)?(?:producto\s+nuevo|nuevo\s+producto)/,
    accion: (_textoNorm, _match, textoOriginal) => {
      const datos = parsearProductoNuevo(textoOriginal);
      if (!datos.nombre) {
        hablar('¿Cómo se llama el producto que quieres agregar? Por ejemplo: agregar producto nuevo llamado perfume, vale 40 pesos, tengo 8, información 50 ml.');
        return;
      }
      sessionStorage.setItem('av_pending_new_product', JSON.stringify(datos));
      const partes = [`nombre ${datos.nombre}`];
      if (datos.precio) partes.push(`precio ${datos.precio} pesos`);
      if (datos.stock) partes.push(`stock ${datos.stock}`);
      if (datos.info) partes.push(`información ${datos.info}`);
      hablar(`Te llevo a publicar productos con ${partes.join(', ')}. Revisa los datos, agrega fotos y da clic en publicar.`);
      setTimeout(() => { window.location.href = AV_CONFIG.urlVendedor; }, 1200);
    }
  });

  function esperarElemento(id, callback, intentos = 20) {
    if (document.getElementById(id)) { callback(); return; }
    if (intentos <= 0) return;
    setTimeout(() => esperarElemento(id, callback, intentos - 1), 300);
  }

  function aplicarProductoNuevoPendiente() {
    const raw = sessionStorage.getItem('av_pending_new_product');
    if (!raw) return;
    sessionStorage.removeItem('av_pending_new_product');
    let datos;
    try { datos = JSON.parse(raw); } catch (_) { return; }
    esperarElemento('pNombre', () => {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      setVal('pNombre', datos.nombre);
      setVal('pPrecio', datos.precio);
      setVal('pStock', datos.stock);
      setVal('pTalla', datos.info);
      setVal('pDescripcion', datos.descripcion);
      if (datos.categoria) {
        const catEl = document.getElementById('pCategoria');
        if (catEl) seleccionarOpcionPorTexto(catEl, datos.categoria);
      }
      if (typeof window.switchTab === 'function') window.switchTab('form');
      mostrarBurbuja('Revisa los datos del producto, agrega fotos y da clic en "Publicar producto".', 'info', 'Asistente');
    });
  }

  // ---- Comando: VER OFERTAS --------------------------------------------
  registrarComando({
    id: 'ver-ofertas',
    frases: ['ver ofertas', 'mostrar ofertas', 'ver descuentos', 'ir a ofertas'],
    accion: () => {
      hablar('Te muestro las ofertas disponibles.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlOfertas; }, 800);
    }
  });

  // ---- Comando: VOLVER AL INICIO ----------------------------------------
  registrarComando({
    id: 'ir-al-inicio',
    frases: ['volver al inicio', 'ir al inicio', 'ir a inicio', 'ir a la pagina principal', 'ir a la página principal'],
    accion: () => {
      hablar('Vamos al inicio.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlInicio; }, 700);
    }
  });

  // ---- Comando: IR AL CATÁLOGO ------------------------------------------
  registrarComando({
    id: 'ir-al-catalogo',
    frases: ['ir al catalogo', 'ver catalogo', 'ver productos', 'ir a catalogo'],
    accion: () => {
      hablar('Abriendo el catálogo.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlCatalogo; }, 700);
    }
  });

  // ---- Comando: IR A COMUNIDAD -------------------------------------------
  registrarComando({
    id: 'ir-a-comunidad',
    frases: ['ir a comunidad', 'ver comunidad', 'abrir comunidad'],
    accion: () => {
      hablar('Abriendo comunidad.');
      setTimeout(() => { window.location.href = AV_CONFIG.urlComunidad; }, 700);
    }
  });

  // ---- Comando: LEER NOTIFICACIONES --------------------------------------
  registrarComando({
    id: 'leer-notificaciones',
    frases: ['leer notificaciones', 'mis notificaciones', 'tengo notificaciones', 'que notificaciones tengo'],
    accion: () => {
      if (!NOTIFICACIONES_SIMULADAS.length) {
        hablar('No tienes notificaciones nuevas.');
        return;
      }
      const resumen = NOTIFICACIONES_SIMULADAS.map(n => `${n.titulo}. ${n.mensaje}`).join(' ... ');
      hablar(`Tienes ${NOTIFICACIONES_SIMULADAS.length} notificaciones. ${resumen}`);
    }
  });

  // ---- Comando: LEER PEDIDO ------------------------------------------------
  registrarComando({
    id: 'leer-pedido',
    frases: ['mi pedido', 'donde esta mi pedido', 'estado de mi pedido', 'leer mi pedido', 'ver mi pedido'],
    accion: () => { hablar(PEDIDO_SIMULADO.texto); }
  });

  // ---- Comando: AYUDA ---------------------------------------------------
  registrarComando({
    id: 'ayuda',
    frases: ['ayuda', 'que puedes hacer', 'qué puedes hacer', 'comandos disponibles'],
    accion: () => {
      hablar('Puedo buscar productos, filtrar por hombre, mujer, categoría o talla, ordenar por precio, agregar productos al carrito, abrir el carrito, agregar un producto nuevo como vendedor, llevarte al inicio o al catálogo, leer tus notificaciones y contarte el estado de tu pedido. Por ejemplo: agregar producto nuevo llamado perfume, vale 40 pesos, tengo 8, información 50 mililitros.');
    }
  });

  // ---- Comando: DETENER / SILENCIO ---------------------------------------
  registrarComando({
    id: 'detener',
    frases: ['detente', 'callate', 'silencio', 'para de hablar'],
    accion: () => {
      window.speechSynthesis.cancel();
      setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
    }
  });

  // ============================================================
  // 7) ESTADO DEL ASISTENTE (on/off) + PERSISTENCIA
  // ============================================================
  const AV_STATE = {
    enabled: false
  };

  function cargarEstadoGuardado() {
    AV_STATE.enabled = localStorage.getItem(AV_CONFIG.storageKey) === '1';
  }

  function guardarEstado(enabled) {
    localStorage.setItem(AV_CONFIG.storageKey, enabled ? '1' : '0');
  }

  // ============================================================
  // 8) RECONOCIMIENTO DE VOZ CONTINUO
  // ------------------------------------------------------------
  // No hay botón para "empujar a hablar": mientras el switch esté
  // en ON, el reconocimiento se reinicia solo cada vez que termina
  // (los navegadores cortan la sesión tras cada silencio/resultado).
  //
  // El modo continuo del navegador puede quedarse "zombie" tras un
  // rato (deja de entregar eventos sin avisar) o se pueden generar
  // arranques dobles si el reinicio automático choca con un cambio
  // de pestaña. Por eso hay: (a) un pequeño "debounce" al iniciar,
  // y (b) un watchdog que fuerza un reinicio limpio si pasa
  // demasiado tiempo sin ningún evento del reconocimiento.
  // ============================================================
  let reconocimiento = null;
  let reconocimientoActivo = false;   // true si "debería" estar escuchando
  let pausadoPorHabla = false;        // pausa temporal mientras el asistente habla
  let erroresSeguidos = 0;
  let ultimoEventoReconocimiento = 0;
  let ultimoIntentoInicio = 0;
  let inicioSesionActual = 0;
  let watchdogInterval = null;
  let sesionConfirmada = false; // true solo cuando el navegador confirma con onstart que sí arrancó
  const WATCHDOG_INTERVALO_MS = 4000;
  const WATCHDOG_TIMEOUT_ARRANQUE_MS = 6000;   // si en este lapso nunca llega onstart, sí es un cuelgue real
  const WATCHDOG_TIMEOUT_SEGURIDAD_MS = 5 * 60 * 1000; // red de seguridad amplia; el silencio normal NO cuenta como falla

  function crearReconocimiento() {
    const r = new SpeechRecognitionAPI();
    r.lang = AV_CONFIG.idioma;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      erroresSeguidos = 0;
      ultimoEventoReconocimiento = Date.now();
      inicioSesionActual = Date.now();
      sesionConfirmada = true;
      setEstadoPill('listening');
    };

    r.onresult = (event) => {
      ultimoEventoReconocimiento = Date.now();
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const esFinal = event.results[event.results.length - 1].isFinal;
      if (pausadoPorHabla) return; // el asistente está hablando; ignoramos para no escucharse a sí mismo
      if (esFinal) {
        procesarComando(transcript);
      } else {
        mostrarBurbuja(transcript, 'user', 'Escuchando');
      }
    };

    r.onerror = (event) => {
      ultimoEventoReconocimiento = Date.now();
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          console.error('[AsistenteVoz] Permiso de micrófono denegado.');
          mostrarBurbuja('Necesito permiso para usar el micrófono. Actívalo en los permisos del navegador y vuelve a encender el switch.', 'error');
          apagarAsistente(true);
          return;
        case 'audio-capture':
          console.error('[AsistenteVoz] No se encontró micrófono.');
          mostrarBurbuja('No se encontró un micrófono disponible.', 'error');
          apagarAsistente(true);
          return;
        case 'no-speech':
        case 'aborted':
          // normal en modo continuo, no hace falta mostrar error
          return;
        default:
          erroresSeguidos++;
          console.error('[AsistenteVoz] Error de reconocimiento:', event.error);
          if (erroresSeguidos >= 5) {
            mostrarBurbuja('El asistente de voz tuvo varios errores seguidos y se apagó.', 'error');
            apagarAsistente(true);
          }
      }
    };

    r.onend = () => {
      ultimoEventoReconocimiento = Date.now();
      // Diagnóstico: para saber cada cuánto reinicia el navegador la
      // sesión en TU dispositivo/navegador (varía mucho entre Android,
      // desktop, etc.). Puedes ver esto en la consola.
      if (inicioSesionActual && !pausadoPorHabla) {
        const duracionSeg = ((Date.now() - inicioSesionActual) / 1000).toFixed(1);
        console.log(`[AsistenteVoz] La sesión de reconocimiento duró ${duracionSeg}s antes de que el navegador la cortara.`);
      }
      // El navegador corta la sesión periódicamente (esto sí genera el
      // sonido nativo de "micrófono encendido/apagado" y no podemos
      // evitarlo: es del navegador, no de este script). Si el switch
      // sigue en ON, se reinicia automáticamente. Ya NO detenemos el
      // micrófono nosotros mismos mientras el asistente habla (ver
      // pausadoPorHabla más abajo), así que esto solo ocurre por el
      // ciclo natural del navegador, no lo duplicamos.
      if (reconocimientoActivo) {
        setTimeout(() => { if (reconocimientoActivo) iniciarSesionReconocimiento(); }, 250);
      } else {
        setEstadoPill(AV_STATE.enabled ? 'idle-on' : 'idle');
      }
    };

    return r;
  }

  function iniciarSesionReconocimiento() {
    if (!soportado) return;
    const ahora = Date.now();
    if (ahora - ultimoIntentoInicio < 400) return; // evita dos arranques casi simultáneos
    ultimoIntentoInicio = ahora;
    ultimoEventoReconocimiento = ahora;
    sesionConfirmada = false;
    if (reconocimiento) {
      try { reconocimiento.abort(); } catch (_) {}
    }
    try {
      reconocimiento = crearReconocimiento();
      reconocimiento.start();
    } catch (err) {
      // start() puede lanzar si ya había una sesión activa; se ignora,
      // el watchdog o onend se encargarán de reintentar.
      console.error('[AsistenteVoz] No se pudo iniciar el reconocimiento:', err);
    }
  }

  // Ya NO detienen ni reinician el micrófono: solo activan/desactivan una
  // bandera que hace que se ignoren los resultados mientras el asistente
  // habla. Antes llamaban a reconocimiento.stop()/start(), lo que sumaba
  // un ciclo extra de "encendido de micrófono" (con su sonido) cada vez
  // que el asistente respondía — que era la causa principal del pitido
  // frecuente. El micrófono ahora sigue una sola sesión continua real;
  // el único sonido que queda es el que el navegador genera por su cuenta
  // cuando corta la sesión de forma natural (fuera de nuestro control).
  function pausarReconocimientoTemporalmente() {
    pausadoPorHabla = true;
  }

  function reanudarReconocimientoSiCorresponde() {
    pausadoPorHabla = false;
  }

  function iniciarWatchdog() {
    if (watchdogInterval) return;
    watchdogInterval = setInterval(() => {
      if (!reconocimientoActivo || pausadoPorHabla || document.hidden) return;
      const inactivoPor = Date.now() - ultimoEventoReconocimiento;

      // Caso real de cuelgue: llamamos a start() pero el navegador nunca
      // confirmó con onstart. El silencio normal (nadie hablando) NO
      // cuenta aquí porque sesionConfirmada ya estaría en true.
      if (!sesionConfirmada && inactivoPor > WATCHDOG_TIMEOUT_ARRANQUE_MS) {
        console.warn('[AsistenteVoz] El micrófono no confirmó su arranque, reintentando...');
        iniciarSesionReconocimiento();
        return;
      }

      // Red de seguridad muy amplia por si el navegador se queda colgado
      // de verdad sin avisar (no confundir con silencio normal, que puede
      // durar minutos sin que eso sea un problema).
      if (sesionConfirmada && inactivoPor > WATCHDOG_TIMEOUT_SEGURIDAD_MS) {
        console.warn('[AsistenteVoz] Sin actividad del reconocimiento por mucho tiempo, reiniciando por seguridad...');
        iniciarSesionReconocimiento();
      }
    }, WATCHDOG_INTERVALO_MS);
  }

  function detenerWatchdog() {
    if (watchdogInterval) { clearInterval(watchdogInterval); watchdogInterval = null; }
  }

  function encenderAsistente() {
    if (!soportado) {
      mostrarBurbuja('Tu navegador no soporta el asistente de voz. Prueba con Chrome.', 'error');
      return false;
    }
    AV_STATE.enabled = true;
    reconocimientoActivo = true;
    guardarEstado(true);
    setEstadoPill('idle-on');
    const ejemplo = AV_CONFIG.requierePalabraActivacion
      ? `Di, por ejemplo: "${AV_CONFIG.palabraActivacion}, busca camisetas rojas".`
      : 'Di, por ejemplo: "buscar camisetas rojas".';
    mostrarBurbuja(`Asistente de voz activado. ${ejemplo}`, 'info', 'Asistente');
    iniciarSesionReconocimiento();
    iniciarWatchdog();
    return true;
  }

  function apagarAsistente(porError) {
    AV_STATE.enabled = false;
    reconocimientoActivo = false;
    guardarEstado(false);
    detenerWatchdog();
    if (reconocimiento) {
      try { reconocimiento.stop(); } catch (_) {}
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setEstadoPill('idle');
    sincronizarSwitchesEnPantalla(false);
    if (!porError) mostrarBurbuja('Asistente de voz desactivado.', 'info');
  }

  function sincronizarSwitchesEnPantalla(enabled) {
    document.querySelectorAll('#av-toggle-switch').forEach(input => {
      input.checked = enabled;
    });
  }

  // Pausar/reanudar si el usuario cambia de pestaña, para no dejar
  // el micrófono activo de fondo innecesariamente.
  document.addEventListener('visibilitychange', () => {
    if (!AV_STATE.enabled) return;
    if (document.hidden) {
      if (reconocimiento) { try { reconocimiento.stop(); } catch (_) {} }
    } else if (reconocimientoActivo && !pausadoPorHabla) {
      iniciarSesionReconocimiento();
    }
  });

  // ============================================================
  // 9) INYECCIÓN DEL SWITCH EN EL PANEL DE PREFERENCIAS
  // ============================================================
  function construirFilaSwitch() {
    const row = document.createElement('div');
    row.innerHTML = `
      <h3 class="up-section-title" style="margin-top:24px">Asistente de voz</h3>
      ${!soportado ? '<p class="av-switch-note">Tu navegador no soporta el asistente de voz. Prueba con Chrome.</p>' : ''}
      <div class="av-switch-row">
        <div class="av-switch-info">
          <strong>Activar asistente de voz</strong>
          <span>Di "${AV_CONFIG.palabraActivacion}" y luego tu comando, por ejemplo "${AV_CONFIG.palabraActivacion}, buscar camisetas rojas".</span>
        </div>
        <label class="av-switch">
          <input type="checkbox" id="av-toggle-switch" ${AV_STATE.enabled ? 'checked' : ''} ${!soportado ? 'disabled' : ''}>
          <span class="av-switch-slider"></span>
        </label>
      </div>
    `;
    return row;
  }

  function inyectarSwitchEnPanel(panel) {
    if (panel.querySelector('#av-toggle-switch')) return; // ya inyectado
    const contenido = panel.querySelector('.up-tab-content[data-content="apariencia"]');
    if (!contenido) return;
    contenido.appendChild(construirFilaSwitch());
    const input = contenido.querySelector('#av-toggle-switch');
    if (input) {
      input.addEventListener('change', () => {
        if (input.checked) {
          const ok = encenderAsistente();
          if (!ok) input.checked = false;
        } else {
          apagarAsistente(false);
        }
      });
    }
  }

  function observarPanelDePreferencias() {
    // Si el panel ya está abierto al cargar el script (poco común, pero
    // posible si el asistente se inyecta tarde), lo enganchamos ya mismo.
    const existente = document.getElementById('up-panel');
    if (existente) inyectarSwitchEnPanel(existente);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.id === 'up-panel') {
            inyectarSwitchEnPanel(node);
          } else if (node.querySelector) {
            const inner = node.querySelector('#up-panel');
            if (inner) inyectarSwitchEnPanel(inner);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true });
  }

  // ============================================================
  // 11) INICIALIZACIÓN
  // ============================================================
  function init() {
    injectStyles();
    injectIndicators();
    cargarEstadoGuardado();
    observarPanelDePreferencias();
    aplicarFiltrosPendientes(); // retoma búsqueda/filtros si veníamos de otra página por voz
    aplicarProductoNuevoPendiente(); // precarga el formulario de vendedor.html si veníamos de "agregar producto nuevo"

    // Si el usuario ya había encendido el asistente en una visita
    // anterior, lo reactivamos automáticamente en esta página. El
    // navegador ya tiene el permiso de micrófono concedido desde la
    // primera vez que se encendió el switch, así que no hace falta
    // una nueva interacción del usuario.
    if (AV_STATE.enabled && soportado) {
      reconocimientoActivo = true;
      setEstadoPill('idle-on');
      iniciarSesionReconocimiento();
      iniciarWatchdog();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 12) API PÚBLICA
  // ============================================================
  window.AsistenteVoz = {
    hablar,
    encender: encenderAsistente,
    apagar: () => apagarAsistente(false),
    registerCommand: registrarComando,
    commands: COMANDOS,
    config: AV_CONFIG,
    get enabled() { return AV_STATE.enabled; }
  };

})();

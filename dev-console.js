/**
 * dev-console.js — Consola de desarrollo incrustable
 * Uso: <script src="dev-console.js"></script>
 *
 * SEGURIDAD: Solo se activa en los dominios permitidos en ALLOWED_HOSTS.
 * En cualquier otro dominio el script termina inmediatamente sin hacer nada.
 *
 * Opciones globales (antes de cargar el script):
 *   window.DEV_CONSOLE_OPTIONS = {
 *     position : 'bottom-right', // bottom-right|bottom-left|top-right|top-left
 *     maxLines : 300,
 *     height   : 280,
 *     width    : 420,
 *   }
 *
 * CSP: cero peticiones externas. Fuentes del sistema unicamente.
 * Ejecucion de codigo requiere 'unsafe-eval' en script-src del servidor.
 */
(function () {
  "use strict";

  /* ─── GUARDIA DE DOMINIO ─────────────────────────────────────────────────
   * Agrega aqui todos los dominios donde quieres que la consola funcione.
   * En cualquier otro host el script se detiene sin dejar rastro en la pagina.
   * ─────────────────────────────────────────────────────────────────────── */
  const ALLOWED_HOSTS = [
    "vjose6922-blip.github.io",
    "localhost",
    "127.0.0.1",
  ];

  if (!ALLOWED_HOSTS.includes(location.hostname)) return;

  /* ─── Opciones ───────────────────────────────────────── */
  const defaults = { position:"bottom-right", maxLines:300, height:280, width:420 };
  const opts = Object.assign({}, defaults, window.DEV_CONSOLE_OPTIONS || {});

  const isMobile = () => window.matchMedia("(max-width:600px)").matches;

  /* ─── Estado ─────────────────────────────────────────── */
  let minimized = false, logCount = 0;
  const cmdHistory = [];
  let historyIdx = -1;
  let lastText = null, lastType = null, lastEl = null;

  /* ─── CSS ────────────────────────────────────────────── */
  function positionRule(pos) {
    return ({"bottom-right":"bottom:18px;right:18px;",
             "bottom-left" :"bottom:18px;left:18px;",
             "top-right"   :"top:18px;right:18px;",
             "top-left"    :"top:18px;left:18px;"})[pos] || "bottom:18px;right:18px;";
  }

  const style = document.createElement("style");
  style.textContent = `
    #__dc__{
      --bg:#0d1117;--bg2:#161b22;--bd:#30363d;--tx:#e6edf3;--mu:#6e7681;
      --inf:#58a6ff;--wrn:#d29922;--err:#f85149;--ok:#3fb950;--acc:#58a6ff;
      --fn:'Cascadia Code','Fira Code',Consolas,Menlo,Monaco,'Courier New',monospace;
    }
    #__dc__{
      position:fixed;z-index:2147483647;
      font-family:var(--fn);font-size:11.5px;line-height:1.5;
      display:flex;flex-direction:column;
      background:var(--bg);border:1px solid var(--bd);border-radius:10px;
      box-shadow:0 8px 32px rgba(0,0,0,.65),0 2px 8px rgba(0,0,0,.4);
      overflow:hidden;
      width:${opts.width}px;height:${opts.height}px;
      ${positionRule(opts.position)}
      resize:both;min-width:260px;max-width:95vw;max-height:85vh;
      transition:height .22s cubic-bezier(.4,0,.2,1),box-shadow .2s,border-radius .2s;
    }
    #__dc__::before{
      content:'';display:none;width:36px;height:4px;
      border-radius:2px;background:var(--bd);
      margin:7px auto -3px;flex-shrink:0;
    }
    @media(max-width:600px){
      #__dc__{
        width:100%!important;left:0!important;right:0!important;
        bottom:0!important;top:auto!important;height:42vh;
        border-radius:14px 14px 0 0;resize:none;min-width:unset;
        border-left:none;border-right:none;border-bottom:none;
        box-shadow:0 -4px 24px rgba(0,0,0,.55);
      }
      #__dc__::before{display:block;}
    }

    /* Header */
    #__dc-hdr__{
      background:var(--bg2);border-bottom:1px solid var(--bd);
      display:flex;align-items:center;gap:8px;padding:0 10px;height:38px;
      cursor:move;user-select:none;flex-shrink:0;touch-action:none;
    }
    @media(max-width:600px){#__dc-hdr__{cursor:default;height:44px;padding:0 14px;}}

    .dc-dots{display:flex;gap:5px;}
    .dc-dot{width:11px;height:11px;border-radius:50%;}
    .dc-dot-r{background:#f85149;}.dc-dot-y{background:#d29922;}.dc-dot-g{background:#3fb950;}
    @media(max-width:600px){.dc-dots{display:none;}}

    #__dc-hdr__ .dc-ttl{
      flex:1;color:var(--mu);font-size:10.5px;
      letter-spacing:.08em;text-transform:uppercase;
    }
    @media(max-width:600px){#__dc-hdr__ .dc-ttl{font-size:12.5px;}}

    .dc-hb{
      background:none;border:1px solid var(--bd);color:var(--mu);
      border-radius:5px;padding:2px 9px;cursor:pointer;
      font-family:var(--fn);font-size:10px;line-height:1.6;
      transition:color .15s,border-color .15s;
      -webkit-tap-highlight-color:transparent;
    }
    @media(max-width:600px){.dc-hb{font-size:12px;padding:5px 13px;border-radius:7px;}}
    #__dc-clr__:hover,#__dc-clr__:active{color:var(--err);border-color:var(--err);}
    #__dc-min__:hover,#__dc-min__:active{color:var(--acc);border-color:var(--acc);}

    /* Body */
    #__dc-body__{
      flex:1;overflow-y:auto;overflow-x:hidden;
      background:var(--bg);padding:4px 0;
      -webkit-overflow-scrolling:touch;
    }
    #__dc-body__::-webkit-scrollbar{width:4px;}
    #__dc-body__::-webkit-scrollbar-track{background:transparent;}
    #__dc-body__::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px;}

    /* Entradas */
    .dc-e{
      display:flex;align-items:flex-start;
      padding:3px 10px;border-bottom:1px solid transparent;
      animation:dcFI .14s ease;
    }
    @keyframes dcFI{from{opacity:0;transform:translateY(-2px);}to{opacity:1;transform:none;}}
    @media(max-width:600px){.dc-e{padding:5px 14px;font-size:12.5px;}}
    .dc-e:active{background:rgba(255,255,255,.04);}
    .dc-e.dc-warn {background:rgba(210,153,34,.08);border-bottom-color:rgba(210,153,34,.14);}
    .dc-e.dc-error{background:rgba(248,81,73,.08); border-bottom-color:rgba(248,81,73,.14);}

    .dc-ic{
      flex-shrink:0;width:13px;margin-right:7px;margin-top:1px;
      font-size:10px;font-weight:700;text-align:center;
    }
    @media(max-width:600px){.dc-ic{font-size:12px;width:16px;margin-right:9px;}}
    .dc-ic-log{color:var(--mu);}.dc-ic-info{color:var(--inf);}.dc-ic-warn{color:var(--wrn);}
    .dc-ic-error{color:var(--err);}.dc-ic-debug{color:var(--ok);}
    .dc-ic-cmd{color:var(--acc);}.dc-ic-res{color:var(--ok);}

    .dc-ts{
      flex-shrink:0;color:var(--mu);font-size:9.5px;
      margin-right:7px;margin-top:2px;opacity:.55;white-space:nowrap;
    }
    @media(max-width:600px){.dc-ts{font-size:11px;}}

    .dc-m{flex:1;word-break:break-all;white-space:pre-wrap;}
    .dc-m.dc-log{color:var(--tx);}.dc-m.dc-info{color:var(--inf);}
    .dc-m.dc-warn{color:var(--wrn);}.dc-m.dc-error{color:var(--err);}
    .dc-m.dc-debug{color:var(--ok);}.dc-m.dc-cmd{color:var(--acc);font-style:italic;}
    .dc-m.dc-res{color:var(--ok);}

    .dc-dup{
      flex-shrink:0;margin-left:6px;background:var(--bd);color:var(--mu);
      border-radius:10px;padding:0 5px;font-size:9px;align-self:center;
    }

    /* Input bar */
    #__dc-bar__{
      display:flex;align-items:center;
      background:var(--bg2);border-top:1px solid var(--bd);
      padding:0 10px;height:38px;gap:6px;flex-shrink:0;
    }
    @media(max-width:600px){#__dc-bar__{height:50px;padding:0 14px;gap:8px;}}
    #__dc-bar__ .dc-pr{color:var(--acc);font-size:15px;font-weight:700;flex-shrink:0;}

    #__dc-inp__{
      flex:1;background:transparent;border:none;outline:none;
      color:var(--tx);font-family:var(--fn);font-size:11.5px;
      caret-color:var(--acc);min-width:0;
    }
    @media(max-width:600px){#__dc-inp__{font-size:14px;}}
    #__dc-inp__::placeholder{color:var(--mu);}

    #__dc-run__{
      background:var(--acc);color:#0d1117;border:none;border-radius:6px;
      padding:4px 11px;cursor:pointer;font-family:var(--fn);
      font-size:10px;font-weight:700;white-space:nowrap;
      transition:opacity .15s;-webkit-tap-highlight-color:transparent;
    }
    @media(max-width:600px){#__dc-run__{font-size:13px;padding:8px 18px;border-radius:9px;}}
    #__dc-run__:hover,#__dc-run__:active{opacity:.75;}

    /* Banner eval bloqueado */
    #__dc-eval-warn__{
      background:rgba(210,153,34,.13);border-top:1px solid rgba(210,153,34,.25);
      color:var(--wrn);font-size:10px;padding:4px 10px;text-align:center;
      flex-shrink:0;display:none;
    }
    @media(max-width:600px){#__dc-eval-warn__{font-size:11.5px;padding:5px 14px;}}

    /* Minimizado */
    #__dc__.dc-min{height:38px!important;resize:none!important;box-shadow:0 2px 10px rgba(0,0,0,.4);}
    @media(max-width:600px){
      #__dc__.dc-min{height:44px!important;border-radius:14px 14px 0 0!important;}
      #__dc__.dc-min::before{display:block;}
    }
    #__dc__.dc-min #__dc-body__,
    #__dc__.dc-min #__dc-bar__,
    #__dc__.dc-min #__dc-eval-warn__{display:none;}
    #__dc__.dc-dragging{opacity:.88;transition:none;}
  `;
  document.head.appendChild(style);

  /* ─── Markup ─────────────────────────────────────────── */
  const root = document.createElement("div");
  root.id = "__dc__";
  root.innerHTML = `
    <div id="__dc-hdr__">
      <div class="dc-dots">
        <div class="dc-dot dc-dot-r"></div>
        <div class="dc-dot dc-dot-y"></div>
        <div class="dc-dot dc-dot-g"></div>
      </div>
      <span class="dc-ttl">⬡ DevConsole</span>
      <button class="dc-hb" id="__dc-clr__">clear</button>
      <button class="dc-hb" id="__dc-min__">–</button>
    </div>
    <div id="__dc-body__"></div>
    <div id="__dc-eval-warn__">
      ⚠ Agrega <code>'unsafe-eval'</code> a <code>script-src</code> para ejecutar codigo.
    </div>
    <div id="__dc-bar__">
      <span class="dc-pr">›</span>
      <input id="__dc-inp__" type="text" inputmode="text"
             autocomplete="off" autocorrect="off"
             autocapitalize="off" spellcheck="false"
             placeholder="Ejecutar JavaScript…" />
      <button id="__dc-run__">▶ Run</button>
    </div>`;
  document.body.appendChild(root);

  const body     = document.getElementById("__dc-body__");
  const input    = document.getElementById("__dc-inp__");
  const btnRun   = document.getElementById("__dc-run__");
  const btnMin   = document.getElementById("__dc-min__");
  const btnClr   = document.getElementById("__dc-clr__");
  const header   = document.getElementById("__dc-hdr__");
  const evalWarn = document.getElementById("__dc-eval-warn__");

  /* ─── Utilidades ─────────────────────────────────────── */
  function ts() {
    const d = new Date();
    return [d.getHours(),d.getMinutes(),d.getSeconds()]
      .map(n => String(n).padStart(2,"0")).join(":");
  }

  function serialize(args) {
    return args.map(a => {
      if (a === null)      return "null";
      if (a === undefined) return "undefined";
      if (typeof a === "function") return a.toString().split("\n")[0]+"…}";
      if (typeof a === "object"){ try{return JSON.stringify(a,null,2);}catch{return String(a);} }
      return String(a);
    }).join(" ");
  }

  const ICON = {log:"·",info:"i",warn:"!",error:"✕",debug:"d",cmd:">",res:"←"};

  /* ─── Añadir entrada ─────────────────────────────────── */
  function addEntry(type, text) {
    if (logCount >= opts.maxLines && body.firstChild) body.removeChild(body.firstChild);
    logCount++;

    if (text === lastText && type === lastType && lastEl) {
      let dup = lastEl.querySelector(".dc-dup");
      if (!dup) {
        dup = document.createElement("span");
        dup.className = "dc-dup"; dup.textContent = "2";
        lastEl.appendChild(dup);
      } else dup.textContent = +dup.textContent + 1;
      return;
    }

    const e = document.createElement("div");
    e.className = `dc-e dc-${type}`;
    e.innerHTML =
      `<span class="dc-ic dc-ic-${type}">${ICON[type]||"·"}</span>`+
      `<span class="dc-ts">${ts()}</span>`+
      `<span class="dc-m dc-${type}"></span>`;
    e.querySelector(".dc-m").textContent = text;
    body.appendChild(e);
    body.scrollTop = body.scrollHeight;
    lastText = text; lastType = type; lastEl = e;
  }

  /* ─── Interceptar console.* ──────────────────────────── */
  const _o = {};
  ["log","info","warn","error","debug","table","dir",
   "group","groupEnd","groupCollapsed","time","timeEnd",
   "assert","count","countReset","trace"].forEach(m => {
    _o[m] = console[m].bind(console);
    console[m] = function(...args){
      _o[m](...args);
      let t = "log";
      if      (m==="warn")   t = "warn";
      else if (m==="error")  t = "error";
      else if (m==="info")   t = "info";
      else if (m==="debug")  t = "debug";
      else if (m==="assert"){
        if(!args[0]){t="error";args=["Assertion failed:",...args.slice(1)];}
        else return;
      }
      addEntry(t, (m!=="log"?`[${m}] `:"")+serialize(args));
    };
  });

  window.addEventListener("error", ev =>
    addEntry("error",`Uncaught ${ev.message}\n  → ${ev.filename}:${ev.lineno}:${ev.colno}`));
  window.addEventListener("unhandledrejection", ev =>
    addEntry("error",`Unhandled Promise: ${serialize([ev.reason])}`));

  /* ─── Ejecucion de comandos ──────────────────────────── */
  let evalBlocked = false;

  // Prueba silenciosa al arrancar
  try { (0, eval)("0"); }
  catch (e) {
    if (e instanceof EvalError || /Content Security Policy/i.test(e.message)) {
      evalBlocked = true;
      evalWarn.style.display = "block";
      addEntry("warn", "eval() bloqueado por CSP. Agrega 'unsafe-eval' a script-src.");
    }
  }

  function runCmd(cmd) {
    cmd = cmd.trim();
    if (!cmd) return;
    cmdHistory.unshift(cmd);
    historyIdx = -1;
    addEntry("cmd", cmd);

    if (evalBlocked) {
      addEntry("error", "No se puede ejecutar: eval bloqueado por CSP.\nSolucion: script-src 'self' 'unsafe-inline' 'unsafe-eval';");
      input.value = "";
      return;
    }

    try {
      const res = (0, eval)(cmd);
      if (res !== undefined) addEntry("res", serialize([res]));
    } catch (err) {
      if (err instanceof EvalError || /Content Security Policy/i.test(err.message)) {
        evalBlocked = true;
        evalWarn.style.display = "block";
        addEntry("error", "eval() bloqueado por CSP.\nSolucion: script-src 'self' 'unsafe-inline' 'unsafe-eval';");
      } else {
        addEntry("error", String(err));
      }
    }
    input.value = "";
  }

  btnRun.addEventListener("click", () => runCmd(input.value));
  input.addEventListener("keydown", ev => {
    if (ev.key === "Enter") {
      runCmd(input.value);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (historyIdx < cmdHistory.length - 1) input.value = cmdHistory[++historyIdx];
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      historyIdx > 0
        ? (input.value = cmdHistory[--historyIdx])
        : (historyIdx = -1, input.value = "");
    }
  });

  /* ─── Minimizar ──────────────────────────────────────── */
  function toggleMin() {
    minimized = !minimized;
    root.classList.toggle("dc-min", minimized);
    btnMin.textContent = minimized ? "▲" : "–";
  }
  btnMin.addEventListener("click", toggleMin);
  header.addEventListener("dblclick", ev => { if(ev.target.tagName !== "BUTTON") toggleMin(); });

  let ltap;
  header.addEventListener("touchstart", () => { ltap = setTimeout(toggleMin, 600); }, {passive:true});
  header.addEventListener("touchend",   () => clearTimeout(ltap), {passive:true});
  header.addEventListener("touchmove",  () => clearTimeout(ltap), {passive:true});

  /* ─── Clear ──────────────────────────────────────────── */
  btnClr.addEventListener("click", () => {
    body.innerHTML = "";
    logCount = 0; lastText = lastType = lastEl = null;
    addEntry("info", "Consola limpiada.");
    if (evalBlocked) addEntry("warn", "eval() sigue bloqueado por CSP.");
  });

  /* ─── Drag desktop ───────────────────────────────────── */
  (function(){
    let ox, oy, sx, sy;
    header.addEventListener("mousedown", ev => {
      if (isMobile() || ev.target.tagName === "BUTTON") return;
      ev.preventDefault();
      const r = root.getBoundingClientRect();
      ox=r.left; oy=r.top; sx=ev.clientX; sy=ev.clientY;
      root.style.right="auto"; root.style.bottom="auto";
      root.style.left=ox+"px"; root.style.top=oy+"px";
      root.classList.add("dc-dragging");
      const mv = e => { root.style.left=(ox+e.clientX-sx)+"px"; root.style.top=(oy+e.clientY-sy)+"px"; };
      const up = () => { root.classList.remove("dc-dragging"); document.removeEventListener("mousemove",mv); document.removeEventListener("mouseup",up); };
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    });
  })();

  /* ─── Swipe-down para minimizar (movil) ──────────────── */
  (function(){
    let sy = null;
    root.addEventListener("touchstart", ev => {
      if (ev.target.closest("#__dc-body__") || ev.target.closest("#__dc-bar__")) return;
      sy = ev.touches[0].clientY;
    }, {passive:true});
    root.addEventListener("touchend", ev => {
      if (sy === null) return;
      const dy = ev.changedTouches[0].clientY - sy;
      if (dy >  50 && !minimized) toggleMin();
      if (dy < -50 &&  minimized) toggleMin();
      sy = null;
    }, {passive:true});
  })();

  window.addEventListener("resize", () => {
    if (isMobile()) root.style.cssText = "";
  });

  /* ─── Bienvenida ─────────────────────────────────────── */
  addEntry("info", `DevConsole activo en: ${location.hostname}`);
  addEntry("info", isMobile()
    ? "Desliza el header hacia abajo para minimizar."
    : "Arrastra el header para mover · ↑↓ navega historial.");

})();


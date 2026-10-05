// js/guarda.js
'use strict';
/* Guarda de carga. Es el primer script: si algún archivo no se descarga, o si algo falla mientras la
   aplicación arranca, muestra un aviso claro arriba de la pantalla en lugar de dejar una app a medias
   que parece funcionar. arranque.js (el último script) marca la aplicación como lista.
   No depende de ningún otro archivo ni del CSS; todo el texto se inserta con textContent (sin HTML). */
(function () {
  const fallos = [];
  let caja = null;

  function mostrar() {
    const padre = document.body || document.documentElement;
    if (!caja) {
      caja = document.createElement('div');
      caja.setAttribute('role', 'alert');
      caja.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:10px 14px;background:#7f1d1d;color:#fff;' +
        'font:13px/1.45 system-ui,sans-serif;border-bottom:2px solid #fca5a5;max-height:50vh;overflow:auto';
      padre.appendChild(caja);
    }
    caja.textContent = '';
    const t = document.createElement('strong');
    t.textContent = 'Atlas Estructuras 3D no pudo iniciar correctamente. No uses los resultados hasta resolverlo.';
    caja.appendChild(t);
    fallos.forEach(f => { const d = document.createElement('div'); d.textContent = '· ' + f; caja.appendChild(d); });
    const p = document.createElement('div');
    p.textContent = 'Revisá que la carpeta del proyecto esté completa (index.html junto a css/, js/ y libs/) y recargá la página con Ctrl+F5.';
    caja.appendChild(p);
  }

  function anotar(texto) { if (!fallos.includes(texto)) fallos.push(texto); mostrar(); }

  // Fase de captura: los errores de descarga de un <script> no burbujean hasta window.
  window.addEventListener('error', function (ev) {
    if (window.__ATLAS_LISTO__) return;                                   // solo vigila la carga inicial
    const el = ev.target;
    if (el && el !== window && el.tagName === 'SCRIPT') {
      anotar('No se pudo cargar el archivo ' + (el.getAttribute('src') || '(sin ruta)') + '.');
    } else if (el === window) {
      const donde = ev.filename ? ' [' + String(ev.filename).split('/').slice(-2).join('/') + ':' + ev.lineno + ']' : '';
      anotar('Error al iniciar: ' + (ev.message || 'desconocido') + donde);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (ev) {
    if (!window.__ATLAS_LISTO__) anotar('Error al iniciar: ' + String(ev.reason && ev.reason.message || ev.reason));
  });

  window.addEventListener('load', function () {
    if (!window.__ATLAS_LISTO__ && !fallos.length) anotar('La aplicación no terminó de iniciar.');
  });
})();

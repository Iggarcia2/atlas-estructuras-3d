// js/arranque.js
'use strict';
/* Arranque: se carga al final, cuando todos los módulos ya están definidos. */
/* ════════ ARRANQUE ════════ */
setMode('select'); updUndo(); setStatus();
loadExample();
window.__ATLAS_LISTO__ = true;                         // lo lee js/guarda.js: si no llega acá, avisa que la carga falló

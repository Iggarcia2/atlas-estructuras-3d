// js/ui/calculo.js
'use strict';
/* Cálculo. */
/* ════════ CÁLCULO ════════ */
function runCalc() {
  const s = $('#status'); s.className = 'status warn'; s.textContent = 'Calculando…';
  setTimeout(() => {
    try {
      const R = analyzeModel(state);
      if (!R.ok) { UI.results = null; UI.err = R.error; UI.badNode = R.badNode; toast('No se pudo calcular'); }
      else { checkAll(state, R); R.rmap = new Map(R.checks.map(c => [c.id, c])); UI.results = R; UI.stale = false; UI.err = null; UI.badNode = null; if (UI.colorBy === 'section' && state.members.length) UI.colorBy = 'util'; _stCache.key = ''; }
    } catch (err) { console.error(err); UI.results = null; UI.err = 'Error interno: ' + err.message; }
    setStatus(); renderAll(); showRTab(UI.nextRTab || 'sum'); UI.nextRTab = null;
  }, 25);
}


// js/ui/panel_vista.js
'use strict';
/* Pestaña «Vista». */
/* ── VISTA ── */
function renderVis() {
  const pane = $('#pane-vis'); if (UI.tab !== 'vis') return;
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(o => `<option value="${o[0]}"${o[0] === cur ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  pane.innerHTML = `<div class="hdr">Colorear barras por</div><div class="field">${sel('vColor', [['section', 'Perfil'], ['util', 'Aprovechamiento r (resultados)'], ['uniform', 'Uniforme']], UI.colorBy)}</div>
  <div class="hdr">Resultado en el modelo</div><div class="field"><label>Combinación</label>${sel('vCombo', state.combos.map((c, k) => [k, esc(c.n)]), UI.comboIdx)}</div>
  <div class="field"><label>Diagrama / forma</label>${sel('vDiag', [['none', 'Ninguno'], ['def', 'Deformada'], ['N', 'Axial N'], ['Vy', 'Corte en plano del alma Vy'], ['Vz', 'Corte Vz'], ['Mz', 'Momento Mz (fuerte)'], ['My', 'Momento My (débil)'], ['T', 'Torsión T']], UI.diagram)}</div>
  <div class="field"><label>Escala de deformada (0 = automática${UI.results && UI.results.defAuto ? ', hoy ×' + fmt(UI.results.defAuto, 0) : ''})</label><input id="vDef" value="${UI.defScale ? fmt(UI.defScale, 0) : '0'}"></div>
  <div class="hdr">Mostrar</div><div class="field"><label>Cargas</label>${sel('vLoads', [['none', 'Ninguna'], ['D', 'Permanentes D'], ['L', 'Sobrecarga L'], ['H', 'Horizontales H'], ['S', 'Nieve S'], ['W', 'Viento W'], ['E', 'Sismo E'], ['T', 'Temperatura T']], UI.showLoads)}</div>
  ${chk('Números de nudo', 'v.nodes', UI.lbl.nodes)}${chk('Etiquetas de barra', 'v.members', UI.lbl.members)}${chk('Nombre del perfil', 'v.secs', UI.lbl.secs)}${chk('Apoyos', 'v.sup', UI.showSup)}${chk('Grilla del plano de trabajo', 'v.grid', UI.showGrid)}
  <div class="hdr">Tema</div><div class="chips"><button class="chip" data-theme="auto">Automático</button><button class="chip" data-theme="dark">Oscuro</button><button class="chip" data-theme="light">Claro</button></div>
  <div class="note">Dibujo en proyección ortogonal 3D. <b>Clic derecho</b> arrastrando rota, <b>rueda apretada</b> mueve, rueda del mouse acerca. Con <b>T</b> o los botones XY/XZ/YZ elegís el plano donde se apoyan los nudos que dibujás.</div>`;
}
$('#pane-vis').addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'vColor') UI.colorBy = el.value; else if (el.id === 'vCombo') { UI.comboIdx = +el.value; renderResults(); } else if (el.id === 'vDiag') { UI.diagram = el.value; if (el.value !== 'none' && !resultsFresh()) toast('Calculá primero (▶ Calcular)'); }
  else if (el.id === 'vDef') { const v = pnum(el.value); UI.defScale = v > 0 ? v : 0; } else if (el.id === 'vLoads') UI.showLoads = el.value;
  else if (el.dataset.b === 'v.nodes') UI.lbl.nodes = el.checked; else if (el.dataset.b === 'v.members') UI.lbl.members = el.checked; else if (el.dataset.b === 'v.secs') UI.lbl.secs = el.checked; else if (el.dataset.b === 'v.sup') UI.showSup = el.checked; else if (el.dataset.b === 'v.grid') UI.showGrid = el.checked;
  _stCache.key = ''; scheduleDraw();
});
$('#pane-vis').addEventListener('click', e => { const t = e.target.closest('[data-theme]'); if (!t) return; if (t.dataset.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t.dataset.theme; scheduleDraw(); });


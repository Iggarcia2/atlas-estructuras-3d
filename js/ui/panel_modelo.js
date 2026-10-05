// js/ui/panel_modelo.js
'use strict';
/* Pestaña «Modelo». */
/* ── MODELO ── */
function renderModel() {
  const pane = $('#pane-model'); if (UI.tab !== 'model') return;
  const nl = state.nodes.slice(0, 300), ml = state.members.slice(0, 300);
  let h = `<div class="hdr">Resumen</div><div class="kv"><span>Nudos</span><span>${state.nodes.length}</span><span>Barras</span><span>${state.members.length}</span><span>Perfiles distintos</span><span>${new Set(state.members.map(m => m.sec)).size}</span></div>`;
  h += `<div class="hdr">Perfil para dibujar</div><div class="field"><select id="drawSec">${secOptions(UI.drawSec)}</select></div>`;
  h += det('drawinfo', 'Propiedades y esbeltez local del perfil', secInfoHTML(UI.drawSec), false);
  h += `<div class="hdr">Agregar nudo por coordenadas</div><div class="r3"><input class="num-in" style="width:100%" id="cx" placeholder="X"><input class="num-in" style="width:100%" id="cy" placeholder="Y"><input class="num-in" style="width:100%" id="cz" placeholder="Z"></div><button class="btn" id="btnAddNode" style="margin-top:6px">+ Agregar nudo</button>`;
  h += `<div class="hdr">Copiar / mover selección</div><div class="r3"><input class="num-in" style="width:100%" id="ex" placeholder="ΔX" value="0"><input class="num-in" style="width:100%" id="ey" placeholder="ΔY" value="0"><input class="num-in" style="width:100%" id="ez" placeholder="ΔZ" value="1000"></div>
    <div class="r2" style="margin-top:6px"><input class="num-in" style="width:100%" id="ecount" value="1" title="Cantidad de copias"><label class="chk" style="margin:0"><input type="checkbox" id="elink"> unir con barras</label></div>
    <div class="r2" style="margin-top:6px"><button class="btn" id="btnCopy">Copiar</button><button class="btn" id="btnMove">Mover</button></div>`;
  h += `<div class="hdr">Crear perfil</div><div class="field"><select id="newSecType"><optgroup label="Simples"><option value="RHS">Tubo rectangular / cuadrado</option><option value="CHS">Tubo circular</option><option value="FLAT">Pletina</option><option value="ANG">Ángulo de lados iguales</option></optgroup><optgroup label="Armadas (soldadas)"><option value="WI">Doble T soldada (alma + 2 alas)</option><option value="IPL">IPE con platabandas</option><option value="BOX">Cajón soldado (4 chapas)</option></optgroup><optgroup label="Otro"><option value="GEN">Genérico (propiedades)</option></optgroup></select></div><div id="newSecFields"></div><button class="btn" id="btnNewSec">+ Crear perfil</button>`;
  h += `<div class="hdr">Nudos</div>` + nl.map(n => `<div class="list-item ${UI.sel.nodes.has(n.id) ? 'sel' : ''}" data-n="${n.id}"><span class="dot" style="background:${n.sup.some(v => v) ? 'var(--accent)' : 'var(--faint)'}"></span><span class="a">N${n.id} ${esc(n.tag || '')}</span><span class="b">${fmt(n.x, 0)}, ${fmt(n.y, 0)}, ${fmt(n.z, 0)}</span></div>`).join('') + (state.nodes.length > 300 ? `<div class="note">… y ${state.nodes.length - 300} más</div>` : '');
  h += `<div class="hdr">Barras</div>` + ml.map(m => `<div class="list-item ${UI.sel.members.has(m.id) ? 'sel' : ''}" data-m="${m.id}"><span class="dot" style="background:${secColor(m.sec)}"></span><span class="a">B${m.id} ${esc(m.tag || '')}</span><span class="b">${esc(m.sec)} · ${m.i}→${m.j}</span></div>`).join('') + (state.members.length > 300 ? `<div class="note">… y ${state.members.length - 300} más</div>` : '');
  pane.innerHTML = h; renderNewSecFields();
}
/* campos: [rótulo, valor por defecto, permite 0] */
const NEWSEC = {
  RHS: [['Alto h (mm)', 100], ['Ancho b (mm)', 50], ['Espesor t (mm)', 3]], CHS: [['Diámetro D (mm)', 60.3], ['Espesor t (mm)', 3.2]], FLAT: [['Alto h (mm)', 50], ['Espesor t (mm)', 6]], ANG: [['Lado a (mm)', 50], ['Espesor t (mm)', 5]],
  WI: [['Alto del alma hw (mm)', 300], ['Espesor alma tw', 6], ['Ala superior b', 150], ['Espesor ala sup. tf', 10], ['Ala inferior b', 150], ['Espesor ala inf. tf', 10]],
  IPL: [['Platabanda sup. b (mm)', 150], ['Espesor sup. (0 = sin)', 10, 1], ['Platabanda inf. b (mm)', 0, 1], ['Espesor inf. (0 = sin)', 0, 1]],
  BOX: [['Alto h (mm)', 300], ['Ancho b (mm)', 200], ['Espesor almas tw', 8], ['Espesor alas tf', 10]],
  GEN: [['A (cm²)', 10], ['I fuerte (cm⁴)', 200], ['I débil (cm⁴)', 30], ['J (cm⁴)', 3], ['W fuerte (cm³)', 40], ['W débil (cm³)', 8], ['kg/m', 8]]
};
function renderNewSecFields() {
  const t = $('#newSecType'); if (!t) return; const ty = t.value;
  const base = ty === 'IPL' ? `<div class="field"><label>Perfil laminado base</label><select id="newSecBase">${Object.keys(CAT).filter(k => CAT[k].type === 'I').map(k => `<option>${esc(k)}</option>`).join('')}</select></div>` : '';
  const note = ty === 'WI' || ty === 'IPL' || ty === 'BOX' ? `<div class="note">Sección soldada: el programa calcula A, I, J, alabeo Cw y módulos plásticos por geometría, clasifica ala y alma (pandeo local, Q) y verifica flexión con AISC 360-05 §F4/F5 cuando la sección es monosimétrica o de alma esbelta. Eje fuerte = eje horizontal de la sección; «sup.» es el lado +y local (con β = 0).</div>` : '';
  $('#newSecFields').innerHTML = base + `<div class="r2">${NEWSEC[ty].map((f, k) => `<div class="field"><label>${f[0]}</label><input data-ns="${k}" value="${f[1]}"></div>`).join('')}</div>` + note;
}
$('#pane-model').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.det) UI.det[d.dataset.det] = d.open; }, true);
$('#pane-model').addEventListener('change', e => {
  if (e.target.id === 'drawSec') { UI.drawSec = e.target.value; updTbSec(); toast('Perfil de dibujo: ' + UI.drawSec); renderModel(); }
  if (e.target.id === 'newSecType') renderNewSecFields();
});
$('#pane-model').addEventListener('click', e => {
  const li = e.target.closest('.list-item'); if (li) { if (li.dataset.n) { UI.sel.nodes = new Set([+li.dataset.n]); UI.sel.members.clear(); } else { UI.sel.members = new Set([+li.dataset.m]); UI.sel.nodes.clear(); } renderModel(); scheduleDraw(); return; }
  const t = e.target.closest('button'); if (!t) return;
  const val = id => pnum($('#' + id).value);
  if (t.id === 'btnAddNode') { const x = val('cx'), y = val('cy'), z = val('cz'); if (![x, y, z].every(isFinite)) { toast('Ingresá X, Y y Z'); return; } pushUndo(); const n = getOrAddNode(x, y, z); UI.sel.nodes = new Set([n.id]); UI.sel.members.clear(); afterEdit(); }
  if (t.id === 'btnCopy') { const d = [val('ex'), val('ey'), val('ez')], c = Math.round(val('ecount')); if (!d.every(isFinite) || !(c >= 1 && c <= 200)) { toast('Valores inválidos'); return; } copySelection(d[0], d[1], d[2], c, $('#elink').checked); }
  if (t.id === 'btnMove') { const d = [val('ex'), val('ey'), val('ez')]; if (!d.every(isFinite)) { toast('Valores inválidos'); return; } moveSelection(d[0], d[1], d[2]); }
  if (t.id === 'btnNewSec') createSection();
});
function createSection() {
  const type = $('#newSecType').value, defs = NEWSEC[type], v = $$('#newSecFields input[data-ns]').map(i => pnum(i.value));
  if (!v.every((x, k) => isFinite(x) && (defs[k][2] ? x >= 0 : x > 0))) { toast('Completá todos los valores (> 0)'); return; }
  const n0 = x => fmt(x, 1).replace(/,0$/, '');
  let name, spec;
  if (type === 'RHS') { name = `Tubo ${fmt(v[0], 0)}x${fmt(v[1], 0)}x${n0(v[2])}`; spec = {type, h: v[0], b: v[1], t: v[2]}; }
  else if (type === 'CHS') { name = `Caño Ø${n0(v[0])}x${n0(v[1])}`; spec = {type, D: v[0], t: v[1]}; }
  else if (type === 'FLAT') { name = `PL ${fmt(v[0], 0)}x${fmt(v[1], 0)}`; spec = {type, h: v[0], t: v[1]}; }
  else if (type === 'ANG') { name = `L ${fmt(v[0], 0)}x${n0(v[1])}`; spec = {type, a: v[0], t: v[1]}; }
  else if (type === 'WI') {
    const sym = v[2] === v[4] && v[3] === v[5], H = v[0] + v[3] + v[5];
    name = sym ? `PS ${n0(H)}x${n0(v[2])}x${n0(v[3])}/${n0(v[1])}` : `PS ${n0(H)} sup ${n0(v[2])}x${n0(v[3])} inf ${n0(v[4])}x${n0(v[5])} /${n0(v[1])}`;
    spec = {type, hw: v[0], tw: v[1], bft: v[2], tft: v[3], bfb: v[4], tfb: v[5]};
  } else if (type === 'IPL') {
    const base = $('#newSecBase').value; if (!(v[1] > 0 || v[3] > 0)) { toast('Poné al menos una platabanda (espesor > 0)'); return; }
    if ((v[1] > 0 && !(v[0] > 0)) || (v[3] > 0 && !(v[2] > 0))) { toast('Falta el ancho de la platabanda'); return; }
    name = `${base} + PL` + (v[1] > 0 ? ` sup ${n0(v[0])}x${n0(v[1])}` : '') + (v[3] > 0 ? ` inf ${n0(v[2])}x${n0(v[3])}` : '');
    spec = {type, base, top: {b: v[0], t: v[1]}, bot: {b: v[2], t: v[3]}};
  } else if (type === 'BOX') {
    if (v[0] <= 2 * v[3] || v[1] <= 2 * v[2]) { toast('Los espesores son demasiado grandes para el alto / ancho'); return; }
    name = `Cajón ${n0(v[0])}x${n0(v[1])}x${n0(v[2])}/${n0(v[3])}`; spec = {type, h: v[0], b: v[1], tw: v[2], tf: v[3]};
  } else { name = `Perfil A=${fmt(v[0], 1)}`; spec = {type: 'GEN', A: v[0], Is: v[1], Iw: v[2], J: v[3], Ss: v[4], Sw: v[5], kg: v[6]}; }
  if (!secProps(spec)) { toast('No se pudo crear el perfil: revisá los datos'); return; }
  pushUndo(); state.customSections[name] = spec; UI.drawSec = name; afterEdit(); toast('Perfil creado: ' + name);
}


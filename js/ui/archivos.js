// js/ui/archivos.js
'use strict';
/* Archivos: guardar, abrir, exportar a Excel. */
/* ════════ ARCHIVOS ════════ */
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
const fileBase = () => (state.name || 'modelo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\-. ]+/g, ' ').trim().replace(/\s+/g, '_').slice(0, 60) || 'modelo';
function saveJSON() { download(fileBase() + '.json', new Blob([snapJSON()], {type: 'application/json'})); toast('Modelo guardado (.json)'); }
function loadModelObj(o, name) {
  if (!o || !Array.isArray(o.nodes) || !Array.isArray(o.members)) throw new Error('El archivo no tiene nudos y barras');
  hist.u = []; hist.r = [];
  const n = normModel(o); state.name = o.name || name || 'Modelo'; state.ver = 2; state.nodes = n.nodes; state.members = n.members; state.customSections = n.customSections; state.combos = n.combos; state.settings = n.settings;
  UI.nextN = state.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1; UI.nextM = state.members.reduce((m, n) => Math.max(m, n.id), 0) + 1;
  UI.sel.nodes.clear(); UI.sel.members.clear(); UI.chain = null; UI.results = null; UI.err = null; UI.stale = true; UI.ver++; UI.bench = null;
  const si = state.combos.findIndex(c => /D\+L/.test(c.n) && c.type === 'SLS'); UI.comboIdx = si >= 0 ? si : 0;
  const names = secListAll(state); if (!names.includes(UI.drawSec)) UI.drawSec = names[0];
  UI.colorBy = 'section'; UI.diagram = 'none'; updUndo(); setStatus(); fitView(); renderAll();
}
function loadExample() { loadModelObj(clone(EXAMPLE), EXAMPLE.name); UI.drawSec = 'UPN 120'; UI.showLoads = 'none'; runCalc(); }
async function newModel() {
  if (state.nodes.length && !(await confirmDlg('Modelo nuevo', 'Se descarta el modelo actual (podés deshacer solo con un modelo guardado). ¿Continuar?'))) return;
  loadModelObj({name: 'Modelo nuevo', nodes: [], members: []}); fitView(); setPlane('XY'); toast('Modelo vacío: dibujá con ● Nudo / ╱ Barra');
}
$('#newBtn').onclick = newModel;
$('#exampleBtn').onclick = async () => { if (state.nodes.length && !(await confirmDlg('Cargar el ejemplo', 'Se reemplaza el modelo actual por la plataforma BIO4-24101. ¿Continuar?'))) return; loadExample(); };
$('#openFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { try { loadModelObj(JSON.parse(r.result), f.name.replace(/\.json$/i, '')); toast('Modelo abierto: ' + f.name); } catch (err) { toast('No se pudo abrir: ' + err.message); } e.target.value = ''; };
  r.readAsText(f);
};
$('#saveBtn').onclick = saveJSON;
$('#xlsBtn').onclick = exportXLS;
function exportXLS() {
  const R = resultsFresh() ? UI.results : null, d = bomData();
  const sheets = [];
  const S0 = state.settings, JT = {rigid: 'rígida', pin: 'articulada', pinS: 'articulada eje fuerte', pinW: 'articulada eje débil', semi: 'semirrígida'};
  sheets.push(['Opciones', [['Parámetro', 'Valor'], ['Orden de análisis', S0.order === 2 ? 'segundo orden (P-Δ + P-δ)' : 'primer orden'], ['Deformación por corte', S0.shearDef ? 'sí' : 'no'], ['Rigidez reducida DAM', S0.order === 2 && S0.dam ? 'sí' : 'no'], ['Cb de volcamiento', S0.cbMode === 'unit' ? 'Cb = 1' : 'del diagrama de momentos'], ['E (MPa)', S0.E], ['G (MPa)', S0.G], ['Fy (MPa)', S0.Fy], ['Peso propio', S0.selfWeight ? 'incluido' : 'no incluido']]]);
  const nf = (n, c) => c === 'H' ? [((n.P || {}).H || [])[0] || 0, ((n.P || {}).H || [])[1] || 0] : ((n.P || {})[c] || [0, 0, 0]).slice(0, 3).map(v => v || 0);
  sheets.push(['Nudos', [['ID', 'X (mm)', 'Y (mm)', 'Z (mm)', 'Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz', 'k Ux (kN/m)', 'k Uy', 'k Uz', 'k Rx (kN·m/rad)', 'k Ry', 'k Rz', 'Asent. Ux (mm)', 'Uy', 'Uz', 'Rx (mrad)', 'Ry', 'Rz', 'D Fx (kN)', 'D Fy', 'D Fz', 'L Fx', 'L Fy', 'L Fz', 'Hx Fx', 'Hy Fy', 'S Fx', 'S Fy', 'S Fz', 'Wx Fx', 'Wx Fy', 'Wx Fz', 'Wy Fx', 'Wy Fy', 'Wy Fz', 'Ex Fx', 'Ex Fy', 'Ex Fz', 'Ey Fx', 'Ey Fy', 'Ey Fz', 'Momentos (caso: Mx, My, Mz)', 'Descripción']].concat(state.nodes.map(n => {
    const mo = Object.entries(n.Mo || {}).filter(([, v]) => v && v.some(x => x)).map(([k, v]) => k + ': ' + v.map(x => x || 0).join(', ')).join(' | ');
    return [n.id, n.x, n.y, n.z, ...n.sup, ...[0, 1, 2, 3, 4, 5].map(q => (n.spr || [])[q] || 0), ...[0, 1, 2, 3, 4, 5].map(q => (n.sd || [])[q] || 0), ...nf(n, 'D'), ...nf(n, 'L'), nf(n, 'H')[0], nf(n, 'H')[1], ...nf(n, 'S'), ...nf(n, 'Wx'), ...nf(n, 'Wy'), ...nf(n, 'Ex'), ...nf(n, 'Ey'), mo, n.tag || ''];
  }))]);
  sheets.push(['Barras', [['ID', 'Pos.', 'Nudo i', 'Nudo j', 'Perfil', 'L (mm)', 'β (°)', 'Unión i', 'kθ fuerte i (kN·m/rad)', 'kθ débil i', 'Torsión libre i', 'Unión j', 'kθ fuerte j', 'kθ débil j', 'Torsión libre j', 'D (kN/m)', 'L (kN/m)', 'Hx (kN/m)', 'Hy (kN/m)', 'Otras cargas', 'K', 'KL fuerte', 'KL débil', 'Lb', 'Cb fijo']].concat(state.members.map(m => {
    const a = nodeById(m.i), b = nodeById(m.j), q = m.q || {}, si = m.sprI || {}, sj = m.sprJ || {};
    return [m.id, m.tag || '', m.i, m.j, m.sec, a && b ? Math.round(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)) : '', m.beta || 0, JT[jointKind(m, 'I')], si.s == null ? '' : si.s, si.w == null ? '' : si.w, m.trelI ? 'sí' : '', JT[jointKind(m, 'J')], sj.s == null ? '' : sj.s, sj.w == null ? '' : sj.w, m.trelJ ? 'sí' : '', q.D || 0, q.L || 0, q.Hx || 0, q.Hy || 0, (m.loads || []).length, m.K || 1, m.kls || '', m.klw || '', m.lb || '', m.cb || ''];
  }))]);
  const lrows = [['Barra', 'N.º', 'Tipo', 'Caso', 'Dirección', 'w1 / w en a (kN/m)', 'w2 / w en b (kN/m)', 'F (kN)', 'M (kN·m)', 'a (mm)', 'b (mm)', 'ΔT (°C)', 'grad. fuerte (°C)', 'grad. débil (°C)', 'α (1/°C)', 'Generada']];
  state.members.forEach(m => (m.loads || []).forEach((l, i) => lrows.push([m.id, i + 1, LD_KINDS[l.k || 'U'], l.c || 'D', l.dir || '', l.w1 == null ? '' : l.w1, l.w2 == null ? '' : l.w2, l.F == null ? '' : l.F, l.M == null ? '' : l.M, l.a == null ? '' : l.a, l.b == null ? '' : l.b, l.dT || '', l.dTy || '', l.dTz || '', l.alpha || '', l.gen || ''])));
  if (lrows.length > 1) sheets.push(['Cargas en barra', lrows]);
  sheets.push(['Combinaciones', [['Nombre', ...CASES, 'Tipo', 'L/δ']].concat(state.combos.map(c => [c.n, ...padF(c.f), c.type, c.lim || '']))]);
  if (R) {
    const o2 = R.order === 2;
    sheets.push(['Verificación', [['Barra', 'Pos.', 'Perfil', 'L (mm)', 'Combinación', 'Compr. (kN)', 'Tracc. (kN)', 'M fuerte (kN·m)', 'M débil (kN·m)', 'Corte fuerte (kN)', 'Corte débil (kN)', 'φPn compr. (kN)', 'φPn tracc. (kN)', 'φMn fuerte Cb=1 (kN·m)', 'φMn fuerte en sección crítica (kN·m)', 'φMn débil (kN·m)', 'Cb', 'Ecuación', 'x crítica (mm)', 'Interacción axial', 'Interacción flexión', 'Corte (r)', ...(o2 ? ['Amp. M fuerte', 'Amp. M débil', 'Amp. N'] : []), 'Q', 'Clase ala', 'Clase alma', 'r', 'Estado']].concat(R.checks.filter(c => !c.rigid).map(c => { const b = c.best, k = c.cap, g = b.gov || {}; return [c.id, c.tag, c.sec, Math.round(c.L), b.combo, +(b.Pc / 1e3).toFixed(2), +(b.Pt / 1e3).toFixed(2), +(b.Ms / 1e6).toFixed(3), +(b.Mw / 1e6).toFixed(3), +(b.Vs / 1e3).toFixed(2), +(b.Vw / 1e3).toFixed(2), +(k.phiPc / 1e3).toFixed(1), +(k.phiPt / 1e3).toFixed(1), +(k.phiMs / 1e6).toFixed(2), +(b.phiMsUsed / 1e6).toFixed(2), +(k.phiMw / 1e6).toFixed(2), +b.Cb.toFixed(3), g.eq || '', Math.round(b.x), +(g.ra || 0).toFixed(3), +(g.mom || 0).toFixed(3), +b.rV.toFixed(3), ...(o2 ? [+(b.ampS || 1).toFixed(3), +(b.ampW || 1).toFixed(3), +(b.ampN || 1).toFixed(3)] : []), +(k.Q || 1).toFixed(3), (k.cls || {}).ala || '', (k.cls || {}).alma || '', +c.r.toFixed(3), c.r > 1 ? 'NO VERIFICA' : 'VERIFICA']; }))]);
    sheets.push(['Flechas', [['Barra', 'Pos.', 'Combinación', 'δ (mm)', 'Límite (mm)', 'δ/límite']].concat(R.defl.map(x => [x.id, x.tag, x.combo, +x.d.toFixed(3), +x.lim.toFixed(2), +x.ratio.toFixed(3)]))]);
    const hdr = ['Combinación', 'Nudo', 'Fx (kN)', 'Fy (kN)', 'Fz (kN)', 'Mx (kN·m)', 'My (kN·m)', 'Mz (kN·m)'], rr = [hdr];
    R.combos.forEach(c => R.reacNodes.forEach(i => { const q = nodeReac(R, i, c.f); rr.push([c.n, R.nodes[i].id, ...q.map(v => +v.toFixed(3))]); })); sheets.push(['Reacciones', rr]);
    const dd = [['Combinación', 'Nudo', 'Ux (mm)', 'Uy (mm)', 'Uz (mm)']]; R.combos.forEach(c => R.nodes.forEach((n, i) => { const u = nodeDisp(R, i, c.f); dd.push([c.n, n.id, +u[0].toFixed(4), +u[1].toFixed(4), +u[2].toFixed(4)]); })); sheets.push(['Desplazamientos', dd]);
  }
  sheets.push(['Cómputo', [['Perfil', 'Piezas', 'Longitud total (m)', 'kg/m', 'Peso (kg)', 'Largos (mm)']].concat(d.sec.map(r => [r.sec, r.n, +(r.L / 1000).toFixed(3), r.kgm, +r.kg.toFixed(1), lensTxt(r.lens)])).concat([['TOTAL', state.members.length, +(d.len / 1000).toFixed(3), '', +d.kg.toFixed(1), '']])]);
  sheets.push(['Cómputo por posición', [['Pos.', 'Perfil', 'Piezas', 'Longitud total (m)', 'Peso (kg)', 'Largos (mm)']].concat(d.tag.map(r => [r.tag, r.sec, r.n, +(r.L / 1000).toFixed(3), +r.kg.toFixed(1), lensTxt(r.lens)]))]);
  if (typeof XLSX === 'undefined') {   // sin la librería: CSV de barras
    const csv = sheets.map(s => '# ' + s[0] + '\n' + s[1].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n')).join('\n\n');
    download(fileBase() + '.csv', new Blob(['﻿' + csv], {type: 'text/csv'})); toast('Sin conexión a la librería Excel: se exportó CSV'); return;
  }
  const wb = XLSX.utils.book_new(); sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = s[1][0].map((_, k) => ({wch: Math.min(40, Math.max(8, ...s[1].slice(0, 60).map(r => String(r[k] == null ? '' : r[k]).length + 2)))})); XLSX.utils.book_append_sheet(wb, ws, s[0].slice(0, 31)); });
  XLSX.writeFile(wb, fileBase() + '.xlsx'); toast(R ? 'Excel exportado con resultados' : 'Excel exportado (sin resultados: calculá primero)');
}


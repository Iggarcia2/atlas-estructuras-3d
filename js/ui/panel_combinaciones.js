// js/ui/panel_combinaciones.js
'use strict';
/* Combinaciones de carga y generadores de viento y sismo. */
/* ════════ COMBINACIONES Y GENERADORES ════════ */
UI.gen = {S: true, H: false, W: false, E: false, orth: true, d09: true, keepSLS: true};
UI.wind = {V: 45, exp: 'C', Kzt: 1, Kd: 0.85, I: 1, G: 0.85, Cf: 1.3, wMode: 'sec', wFix: 100, z0: 0, dirX: true, dirY: true};
UI.seis = {Cs: 0.1, T: 0.5, psi: 0, dirX: true, dirY: true, z0: null};
UI.genMsg = {wind: '', seis: '', combo: ''};
const WIND_EXP = {B: {alpha: 7, zg: 365.76}, C: {alpha: 9.5, zg: 274.32}, D: {alpha: 11.5, zg: 213.36}};
function windKz(z, exp) { const e = WIND_EXP[exp] || WIND_EXP.C; return 2.01 * Math.pow(Math.max(z, 4.57) / e.zg, 2 / e.alpha); }
function windQ(z, w) { return 0.613 * windKz(z, w.exp) * w.Kzt * w.Kd * w.V * w.V * w.I / 1000; }      // kN/m² (V en m/s, z en m)
function seisK(T) { return T <= 0.5 ? 1 : T >= 2.5 ? 2 : 1 + (T - 0.5) / 2; }
const SLS_BASE = () => clone(DEF_COMBOS).filter(c => c.type === 'SLS').map(c => Object.assign(c, {f: padF(c.f)}));

function genLRFD() {
  const g = UI.gen, mk = o => { const a = new Array(CASES.length).fill(0); for (const k in o) a[CASES.indexOf(k)] = o[k]; return a; };
  const list = []; const add = o => list.push({n: '', f: mk(o), type: 'ULS'});
  const wd = [['Wx', 1], ['Wx', -1], ['Wy', 1], ['Wy', -1]];
  add({D: 1.4});
  add(g.S ? {D: 1.2, L: 1.6, S: 0.5} : {D: 1.2, L: 1.6});
  if (g.S) add({D: 1.2, S: 1.6, L: 0.5});
  if (g.H) for (const [k, s] of [['Hx', 1], ['Hx', -1], ['Hy', 1], ['Hy', -1]]) add({D: 1.2, [k]: 1.6 * s, L: 0.5});
  if (g.W) for (const [k, s] of wd) {
    if (g.S) add({D: 1.2, S: 1.6, [k]: 0.8 * s});
    add(g.S ? {D: 1.2, [k]: 1.3 * s, L: 0.5, S: 0.5} : {D: 1.2, [k]: 1.3 * s, L: 0.5});
    if (g.d09) add({D: 0.9, [k]: 1.3 * s});
  }
  if (g.E) {
    const dirs = [];
    for (const [a, b] of [['Ex', 'Ey'], ['Ey', 'Ex']]) for (const s1 of [1, -1]) { if (g.orth) for (const s2 of [1, -1]) dirs.push({[a]: s1, [b]: 0.3 * s2}); else dirs.push({[a]: s1}); }
    for (const e of dirs) {
      add(Object.assign({D: 1.2, L: 0.5}, e, g.S ? {S: 0.2} : {}));
      if (g.d09) add(Object.assign({D: 0.9}, e));
    }
  }
  list.forEach((c, i) => { c.n = 'U' + (i + 1) + ': ' + facText(c.f).replace(/ /g, '').replace(/−/g, '-'); });
  const sls = g.keepSLS ? state.combos.filter(c => c.type === 'SLS') : SLS_BASE();
  return list.concat(sls.length ? sls : SLS_BASE());
}
function memberWindDir(m, d) {                          // coseno entre el eje de la barra y la dirección del viento
  const a = nodeById(m.i), b = nodeById(m.j), L = memberLen(m); return L ? Math.abs((b.x - a.x) * d[0] + (b.y - a.y) * d[1] + (b.z - a.z) * d[2]) / L : 1;
}
function genWind() {
  const ms = [...UI.sel.members].map(memberById).filter(Boolean), w = UI.wind;
  if (!ms.length) return 'Seleccioná las barras expuestas al viento.';
  if (!(w.V > 0 && w.Cf > 0 && w.G > 0)) return 'Completá V, G y Cf (> 0).';
  if (!w.dirX && !w.dirY) return 'Elegí al menos una dirección de viento.';
  pushUndo(); let n = 0, skipped = 0, qmin = 1e9, qmax = 0;
  ms.forEach(m => {
    const a = nodeById(m.i), b = nodeById(m.j), spec = getSecSpec(state, m.sec), P = spec ? secProps(spec) : null; if (!a || !b) return;
    m.loads = (m.loads || []).filter(l => l.gen !== 'wind');
    const width = w.wMode === 'fix' ? w.wFix : (P && !P.rigid ? Math.max(P.h, P.b) : 100);
    for (const [key, d, on] of [['Wx', [1, 0, 0], w.dirX], ['Wy', [0, 1, 0], w.dirY]]) {
      if (!on) continue; if (memberWindDir(m, d) > 0.9) { skipped++; continue; }
      const zi = (a.z - w.z0) / 1000, zj = (b.z - w.z0) / 1000, qi = windQ(zi, w) * w.G * w.Cf * width / 1000, qj = windQ(zj, w) * w.G * w.Cf * width / 1000;
      qmin = Math.min(qmin, qi, qj); qmax = Math.max(qmax, qi, qj);
      const ld = Math.abs(qi - qj) > 1e-9 ? {k: 'T', c: key, dir: key === 'Wx' ? 'X' : 'Y', a: 0, b: null, w1: qi, w2: qj, gen: 'wind'} : {k: 'U', c: key, dir: key === 'Wx' ? 'X' : 'Y', a: 0, b: null, w1: qi, gen: 'wind'};
      m.loads.push(ld); n++;
    }
  });
  afterEdit();
  return `Viento aplicado: ${n} carga(s) en ${ms.length} barra(s)` + (n ? ` · w entre ${fmt(qmin, 3)} y ${fmt(qmax, 3)} kN/m` : '') + (skipped ? ` · ${skipped} barra(s) casi paralelas al viento sin carga` : '') + '.';
}
function seismicWeights(psi) {                          // kN por nudo: peso propio + D + ψ·L (de las cargas en barra y nodales)
  const Wn = new Map(state.nodes.map(n => [n.id, 0])), addN = (id, v) => Wn.set(id, (Wn.get(id) || 0) + v), self = state.settings.selfWeight;
  for (const m of state.members) {
    const a = nodeById(m.i), b = nodeById(m.j), spec = getSecSpec(state, m.sec), P = spec ? secProps(spec) : null, L = memberLen(m); if (!a || !b || !L) continue;
    let w = 0; if (self && P) w += P.kg * 9.80665 / 1000 * L / 1000;
    const q = m.q || {}; w += ((q.D || 0) + psi * (q.L || 0)) * L / 1000;
    for (const ld of (m.loads || [])) {
      const f = (ld.c === 'D' ? 1 : ld.c === 'L' ? psi : 0); if (!f) continue; const sg = ld.dir === 'Z' ? -1 : (ld.dir === 'grav' || ld.dir == null) ? 1 : 0; if (!sg) continue;
      const k = ld.k || 'U', aa = Math.max(0, ld.a || 0), bb = ld.b == null ? L : Math.min(L, ld.b);
      if (k === 'U') w += f * sg * (ld.w1 || 0) * (bb - aa) / 1000; else if (k === 'T') w += f * sg * ((ld.w1 || 0) + (ld.w2 || 0)) / 2 * (bb - aa) / 1000;
      else if (k === 'P') { const F = f * sg * (ld.F || 0), t = Math.min(1, aa / L); addN(m.i, F * (1 - t)); addN(m.j, F * t); }
    }
    addN(m.i, w / 2); addN(m.j, w / 2);
  }
  for (const n of state.nodes) { const P = n.P || {}; addN(n.id, -((P.D || [])[2] || 0) - psi * ((P.L || [])[2] || 0)); }
  return Wn;
}
function genSeismic() {
  const s = UI.seis; if (!(s.Cs > 0) || !(s.T > 0)) return 'Completá C (V/W) y el período T (> 0).';
  if (!s.dirX && !s.dirY) return 'Elegí al menos una dirección de sismo.';
  if (!state.nodes.length) return 'El modelo no tiene nudos.';
  const sup = state.nodes.filter(n => n.sup && n.sup[2]), z0 = s.z0 != null && isFinite(s.z0) ? s.z0 : Math.min(...(sup.length ? sup : state.nodes).map(n => n.z));
  const Wn = seismicWeights(s.psi || 0), k = seisK(s.T), above = state.nodes.filter(n => n.z > z0 + 1);
  if (!above.length) return 'No hay nudos por encima del nivel de base.';
  const Wt = above.reduce((t, n) => t + Math.max(0, Wn.get(n.id) || 0), 0), V = s.Cs * Wt;
  const den = above.reduce((t, n) => t + Math.max(0, Wn.get(n.id) || 0) * Math.pow((n.z - z0) / 1000, k), 0);
  if (!(Wt > 0 && den > 0)) return 'Peso sísmico nulo: revisá las cargas D y el peso propio.';
  pushUndo();
  state.nodes.forEach(n => { if (n.genE) { n.P = n.P || {}; n.P.Ex = [0, 0, 0]; n.P.Ey = [0, 0, 0]; delete n.genE; } });
  let Fmax = 0;
  above.forEach(n => {
    const F = V * Math.max(0, Wn.get(n.id) || 0) * Math.pow((n.z - z0) / 1000, k) / den; if (!(F > 0)) return; Fmax = Math.max(Fmax, F);
    n.P = n.P || {}; n.P.Ex = s.dirX ? [F, 0, 0] : [0, 0, 0]; n.P.Ey = s.dirY ? [0, F, 0] : [0, 0, 0]; n.genE = true;
  });
  afterEdit();
  return `Sismo aplicado en ${above.length} nudo(s): W = ${fmt(Wt, 1)} kN · V = C·W = ${fmt(V, 1)} kN · k = ${fmt(k, 2)} · base z = ${fmt(z0, 0)} mm · fuerza máx. por nudo ${fmt(Fmax, 2)} kN.`;
}

function openComboDlg() { renderComboDlg(); $('#comboDlg').hidden = false; }
function renderComboDlg() {
  const body = $('#cbBody'); if (!body) return; const g = UI.gen, w = UI.wind, s = UI.seis;
  const gp = (label, bind, val, t, extra) => `<div class="field"><label>${label}</label><input data-gp="${bind}" data-t="${t || 'n'}" value="${esc(val)}" ${extra || ''}></div>`;
  const gc = (label, bind, on) => `<label class="chk"><input type="checkbox" data-gp="${bind}" data-t="c" ${on ? 'checked' : ''}> ${label}</label>`;
  let h = `<div class="hdr">Combinaciones (${state.combos.length})</div><div class="tw"><table class="t"><thead><tr><th class="l">Nombre</th>${CASES.map(c => `<th title="${esc(CASE_NAMES[c])}">${c}</th>`).join('')}<th>Tipo</th><th>L/δ</th><th></th></tr></thead><tbody>` +
    state.combos.map((c, k) => `<tr><td class="l"><input data-cb="${k}.n" value="${esc(c.n)}" style="width:190px"></td>${CASES.map((_, q) => `<td><input data-cb="${k}.f${q}" value="${c.f[q] ? fmt(c.f[q], 2) : ''}" placeholder="·" style="width:42px;text-align:right"></td>`).join('')}<td><select data-cb="${k}.type"><option${c.type === 'ULS' ? ' selected' : ''}>ULS</option><option${c.type === 'SLS' ? ' selected' : ''}>SLS</option></select></td><td><input data-cb="${k}.lim" value="${c.lim || ''}" style="width:42px;text-align:right" ${c.type === 'ULS' ? 'disabled' : ''}></td><td><button class="chip" data-cdel="${k}">✕</button></td></tr>`).join('') + `</tbody></table></div>
    <div class="r3" style="margin-top:8px;max-width:640px"><button class="btn" id="btnAddCombo">+ Combinación</button><button class="btn" id="btnCbDefault">Restablecer básicas</button></div>
    <div class="note">Casos: D permanente · L sobrecarga · Hx/Hy horizontales variables · S nieve/techo · Wx/Wy viento · Ex/Ey sismo · T temperatura · A asentamientos. ULS = resistencia LRFD (CIRSOC 301 / AISC); SLS = servicio, «L/δ» = límite de flecha (250 → L/250; 0 = sin verificar). Con segundo orden cada combinación se resuelve por separado.</div>`;
  h += det('gLRFD', 'Generador de combinaciones LRFD (CIRSOC 301-2005 §A.4 / AISC LRFD-99 §A4)',
    `<div class="r2">${gc('Hay nieve / sobrecarga de techo S', 'gen.S', g.S)}${gc('Horizontales variables Hx / Hy (factor 1,6)', 'gen.H', g.H)}${gc('Viento (±Wx, ±Wy)', 'gen.W', g.W)}${gc('Sismo (±Ex, ±Ey)', 'gen.E', g.E)}${gc('Sismo: 100 % + 30 % en la dirección ortogonal', 'gen.orth', g.orth)}${gc('Incluir 0,9D (con viento y sismo)', 'gen.d09', g.d09)}${gc('Conservar las combinaciones de servicio (SLS) actuales', 'gen.keepSLS', g.keepSLS)}</div>
     <button class="btn" id="btnGenLRFD">Generar y reemplazar las combinaciones ULS</button>
     <div class="note">1,4D · 1,2D+1,6L+0,5S · 1,2D+1,6S+(0,5L ó 0,8W) · 1,2D+1,3W+0,5L+0,5S · 1,2D±1,0E+0,5L+0,2S · 0,9D±(1,3W ó 1,0E). Factores del AISC LRFD-99 / CIRSOC 301-2005: <b>verificalos contra la edición del reglamento que uses</b>; el sismo toma E ya definido por la norma sísmica (INPRES-CIRSOC 103), sin la componente vertical.</div>${UI.genMsg.combo ? `<div class="msg ok">${esc(UI.genMsg.combo)}</div>` : ''}`, true);
  h += det('gWind', 'Generador de viento (CIRSOC 102-2005 / ASCE 7-02, método simplificado por barra)',
    `<div class="r3">${gp('V básica (m/s)', 'wind.V', fmt(w.V, 1))}<div class="field"><label>Exposición</label><select data-gp="wind.exp" data-t="s">${['B', 'C', 'D'].map(x => `<option${w.exp === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>${gp('Cota del terreno (mm)', 'wind.z0', fmt(w.z0, 0))}${gp('Kzt', 'wind.Kzt', fmt(w.Kzt, 2))}${gp('Kd', 'wind.Kd', fmt(w.Kd, 2))}${gp('Importancia I', 'wind.I', fmt(w.I, 2))}${gp('Factor de ráfaga G', 'wind.G', fmt(w.G, 2))}${gp('Coef. de fuerza Cf', 'wind.Cf', fmt(w.Cf, 2))}<div class="field"><label>Ancho expuesto</label><select data-gp="wind.wMode" data-t="s"><option value="sec"${w.wMode === 'sec' ? ' selected' : ''}>del perfil (máx. h, b)</option><option value="fix"${w.wMode === 'fix' ? ' selected' : ''}>valor fijo</option></select></div>${w.wMode === 'fix' ? gp('Ancho (mm)', 'wind.wFix', fmt(w.wFix, 0)) : ''}</div>
     <div class="r2">${gc('Viento en X (caso Wx, +X)', 'wind.dirX', w.dirX)}${gc('Viento en Y (caso Wy, +Y)', 'wind.dirY', w.dirY)}</div>
     <div class="note">qz = 0,613·Kz·Kzt·Kd·V²·I (N/m²) con Kz = 2,01·(z/zg)^(2/α) (z ≥ 4,57 m; B: α=7, zg=365,76 m · C: 9,5 / 274,32 m · D: 11,5 / 213,36 m). Carga por metro = qz·G·Cf·ancho, en la dirección del viento, trapezoidal entre las cotas de los nudos. Se aplica a las <b>${UI.sel.members.size}</b> barra(s) seleccionada(s) (las casi paralelas al viento se saltean). Cf, G y la velocidad los fijás vos según la tabla del reglamento; usá ancho de influencia y Cf = Cp·G para revestimientos.</div>
     <button class="btn" id="btnGenWind">Aplicar viento a las barras seleccionadas</button>${UI.genMsg.wind ? `<div class="msg ok">${esc(UI.genMsg.wind)}</div>` : ''}`, false);
  h += det('gSeis', 'Generador de sismo (estático equivalente V = C·W)',
    `<div class="r3">${gp('C = V/W (coef. sísmico)', 'seis.Cs', fmt(s.Cs, 3))}${gp('Período T (s)', 'seis.T', fmt(s.T, 2))}${gp('% de L en la masa (ψ)', 'seis.psi', fmt(s.psi, 2))}${gp('Cota de base (mm, vacío = apoyos)', 'seis.z0', s.z0 == null ? '' : fmt(s.z0, 0), 'o')}</div>
     <div class="r2">${gc('Sismo en X (caso Ex)', 'seis.dirX', s.dirX)}${gc('Sismo en Y (caso Ey)', 'seis.dirY', s.dirY)}</div>
     <div class="note">W = peso propio + D + ψ·L de todo lo que está sobre la base, concentrado en los nudos. Fi = V·Wi·hi^k / Σ(Wj·hj^k), con k = 1 (T ≤ 0,5 s) a 2 (T ≥ 2,5 s). <b>C lo calculás vos</b> con INPRES-CIRSOC 103 (zona, suelo, tipo de estructura, R, importancia): el programa no tabula esos coeficientes. Las fuerzas se cargan como Ex / Ey en los nudos; combinalas con 1,0E en las combinaciones.</div>
     <button class="btn" id="btnGenSeis">Aplicar sismo a los nudos</button>${UI.genMsg.seis ? `<div class="msg ok">${esc(UI.genMsg.seis)}</div>` : ''}`, false);
  const keep = body.scrollTop; body.innerHTML = h; body.scrollTop = keep;
}
$('#cbClose').onclick = () => { $('#comboDlg').hidden = true; renderSide(); };
$('#cbBody').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.det) UI.det[d.dataset.det] = d.open; }, true);
$('#cbBody').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.cb) {
    const [k, f] = el.dataset.cb.split('.'), c = state.combos[+k]; pushUndo();
    if (f === 'n') c.n = el.value; else if (f === 'type') { c.type = el.value; if (c.type === 'SLS' && c.lim == null) c.lim = 250; }
    else if (f === 'lim') c.lim = Math.max(0, pnum(el.value) || 0);
    else { const q = +f.slice(1), raw = el.value.trim(), v = raw === '' ? 0 : pnum(raw); if (!isFinite(v)) { toast('Valor inválido'); renderComboDlg(); return; } c.f[q] = v; }
    afterEdit(); renderComboDlg(); return;
  }
  if (el.dataset.gp) {
    const [grp, key] = el.dataset.gp.split('.'), o = UI[grp], t = el.dataset.t;
    if (t === 'c') o[key] = el.checked; else if (t === 's') o[key] = el.value;
    else if (t === 'o') { const v = el.value.trim() === '' ? null : pnum(el.value); o[key] = v; }
    else { const v = pnum(el.value); if (!isFinite(v)) { toast('Valor inválido'); renderComboDlg(); return; } o[key] = v; }
    renderComboDlg();
  }
});
$('#cbBody').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.cdel != null) { if (state.combos.length <= 1) return; pushUndo(); state.combos.splice(+t.dataset.cdel, 1); if (UI.comboIdx >= state.combos.length) UI.comboIdx = 0; afterEdit(); renderComboDlg(); return; }
  if (t.id === 'btnAddCombo') { pushUndo(); state.combos.push({n: 'U' + (state.combos.length + 1) + ': 1,2D+1,6L', f: padF([1.2, 1.6]), type: 'ULS'}); afterEdit(); renderComboDlg(); return; }
  if (t.id === 'btnCbDefault') { pushUndo(); state.combos = clone(DEF_COMBOS).map(c => Object.assign(c, {f: padF(c.f)})); UI.comboIdx = 0; afterEdit(); renderComboDlg(); return; }
  if (t.id === 'btnGenLRFD') {
    const nl = genLRFD(); pushUndo(); state.combos = nl; UI.comboIdx = Math.max(0, nl.findIndex(c => c.type === 'SLS' && /D\+L/.test(c.n)));
    UI.genMsg.combo = `Se generaron ${nl.filter(c => c.type === 'ULS').length} combinaciones ULS (${nl.filter(c => c.type === 'SLS').length} SLS conservadas).`; afterEdit(); renderComboDlg(); return;
  }
  if (t.id === 'btnGenWind') { UI.genMsg.wind = genWind(); renderComboDlg(); return; }
  if (t.id === 'btnGenSeis') { UI.genMsg.seis = genSeismic(); renderComboDlg(); return; }
});


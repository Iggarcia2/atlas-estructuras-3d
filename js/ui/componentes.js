// js/ui/componentes.js
'use strict';
/* Componentes HTML reutilizables de los paneles: campos, constantes de uniones y cargas, ficha de sección, verificación. */
/* ── helpers de formulario ── */
const fld = (label, bind, val, type, extra) => `<div class="field"><label>${label}</label><input data-b="${bind}" data-t="${type || 'n'}" value="${esc(val)}" ${extra || ''}></div>`;
const chk = (label, bind, on) => `<label class="chk"><input type="checkbox" data-b="${bind}" data-t="c" ${on ? 'checked' : ''}> ${label}</label>`;
const selb = (label, bind, opts, cur, t) => `<div class="field"><label>${label}</label><select data-b="${bind}" data-t="${t || 's'}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
UI.det = UI.det || {};
const det = (id, title, body, force) => `<details class="dt" data-det="${id}"${(UI.det[id] != null ? UI.det[id] : force) ? ' open' : ''}><summary>${title}</summary>${body}</details>`;
function secOptions(sel, mixed) {
  const names = secListAll(state), g = {UPN: [], IPE: [], 'Ángulos': [], 'Armadas': [], 'Otras': []};
  names.forEach(n => { const sp = getSecSpec(state, n), t = sp ? sp.type : ''; (t === 'UPN' ? g.UPN : t === 'I' ? g.IPE : t === 'ANG' ? g['Ángulos'] : (t === 'WI' || t === 'IPL' || t === 'BOX') ? g.Armadas : g.Otras).push(n); });
  return (mixed ? '<option value="" selected>— varias —</option>' : '') + Object.entries(g).filter(e => e[1].length).map(([k, v]) => `<optgroup label="${k}">${v.map(n => `<option${n === sel && !mixed ? ' selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>`).join('');
}
const SUP_PRESETS = {free: [0, 0, 0, 0, 0, 0], pin: [1, 1, 1, 0, 0, 0], fix: [1, 1, 1, 1, 1, 1], roll: [0, 0, 1, 0, 0, 0]};
const NODE_CASES = [['D', 'D'], ['L', 'L'], ['H', 'Hx·Hy'], ['S', 'S'], ['Wx', 'Wx'], ['Wy', 'Wy'], ['Ex', 'Ex'], ['Ey', 'Ey']];
UI.nodeCase = 'D';
const nodeHasLoad = (n, c) => c === 'H' ? ((n.P && n.P.H) || []).some(v => v) : (((n.P || {})[c] || []).some(v => v) || ((n.Mo || {})[c] || []).some(v => v));
const JT_KINDS = [['rigid', 'Rígida (continua)'], ['pin', 'Articulada (ambos ejes)'], ['pinS', 'Articulada solo eje fuerte'], ['pinW', 'Articulada solo eje débil'], ['semi', 'Semirrígida (resorte de giro)']];
const LD_KINDS = {U: 'Distribuida uniforme', T: 'Distribuida trapezoidal', P: 'Puntual', M: 'Momento concentrado', TH: 'Temperatura'};
const LD_DIRS = [['grav', 'Gravedad ↓ (−Z)'], ['X', '+X global'], ['Y', '+Y global'], ['Z', '+Z global'], ['lx', 'Eje local x (axial)'], ['ly', 'Eje local y'], ['lz', 'Eje local z']];
const CASE_OPTS = CASES.filter(c => c !== 'A').map(c => [c, CASE_NAMES[c]]);
const CASE_DIR = {D: 'grav', L: 'grav', S: 'grav', Hx: 'X', Hy: 'Y', Wx: 'X', Wy: 'Y', Ex: 'X', Ey: 'Y', T: 'grav'};
UI.ldDraft = {k: 'U', c: 'D', dir: 'grav', w1: 0, w2: 0, F: 0, M: 0, a: 0, b: null, dT: 0, dTy: 0, dTz: 0, alpha: 1.2e-5};
function memberLen(m) { const a = nodeById(m.i), b = nodeById(m.j); return a && b ? Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) : 0; }
function kthRef(m) {                                  // 4EI/L del eje fuerte, en kN·m/rad: referencia para dimensionar un resorte de unión
  const spec = getSecSpec(state, m.sec), P = spec ? secProps(spec) : null, L = memberLen(m); if (!P || !L) return 5000;
  return +(4 * state.settings.E * P.Is / L / 1e6).toPrecision(2);
}
/* campos de una carga (existente: mode 'm' con índice; borrador: mode 'd') */
function ldFields(ld, mode, i) {
  const bind = f => mode === 'm' ? `data-ldm="${i}.${f}"` : `data-ldd="${f}"`;
  const inp = (label, f, val, ph) => `<div class="field"><label>${label}</label><input ${bind(f)} value="${esc(val)}"${ph ? ` placeholder="${ph}"` : ''}></div>`;
  const sel = (label, f, opts, cur) => `<div class="field"><label>${label}</label><select ${bind(f)}>${opts.map(o => `<option value="${o[0]}"${o[0] === cur ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>`;
  const k = ld.k || 'U'; let h = '';
  h += `<div class="r2">${sel('Caso', 'c', CASE_OPTS, ld.c || 'D')}${k === 'TH' ? '' : sel(k === 'M' ? 'Eje del momento' : 'Dirección', 'dir', LD_DIRS, ld.dir || 'grav')}</div>`;
  if (k === 'U') h += `<div class="r3">${inp('w (kN/m)', 'w1', fmt(ld.w1 || 0, 3))}${inp('desde a (mm)', 'a', fmt(ld.a || 0, 0))}${inp('hasta b (mm)', 'b', ld.b == null ? '' : fmt(ld.b, 0), 'nudo j')}</div>`;
  else if (k === 'T') h += `<div class="r2">${inp('w en a (kN/m)', 'w1', fmt(ld.w1 || 0, 3))}${inp('w en b (kN/m)', 'w2', fmt(ld.w2 || 0, 3))}${inp('desde a (mm)', 'a', fmt(ld.a || 0, 0))}${inp('hasta b (mm)', 'b', ld.b == null ? '' : fmt(ld.b, 0), 'nudo j')}</div>`;
  else if (k === 'P') h += `<div class="r2">${inp('F (kN)', 'F', fmt(ld.F || 0, 3))}${inp('posición a (mm desde i)', 'a', fmt(ld.a || 0, 0))}</div>`;
  else if (k === 'M') h += `<div class="r2">${inp('M (kN·m)', 'M', fmt(ld.M || 0, 3))}${inp('posición a (mm desde i)', 'a', fmt(ld.a || 0, 0))}</div>`;
  else if (k === 'TH') h += `<div class="r2">${inp('ΔT uniforme (°C)', 'dT', fmt(ld.dT || 0, 1))}${inp('α (10⁻⁶/°C)', 'alpha', fmt((ld.alpha || 1.2e-5) * 1e6, 2))}${inp('gradiente eje fuerte (°C)', 'dTy', fmt(ld.dTy || 0, 1))}${inp('gradiente eje débil (°C)', 'dTz', fmt(ld.dTz || 0, 1))}</div>`;
  return h;
}
function ldSummary(ld, i) {
  const k = ld.k || 'U', d = (LD_DIRS.find(x => x[0] === (ld.dir || 'grav')) || [0, ''])[1];
  const t = k === 'U' ? `${fmt(ld.w1, 2)} kN/m` : k === 'T' ? `${fmt(ld.w1, 2)}→${fmt(ld.w2, 2)} kN/m` : k === 'P' ? `${fmt(ld.F, 2)} kN @ ${fmt(ld.a, 0)}` : k === 'M' ? `${fmt(ld.M, 2)} kN·m @ ${fmt(ld.a, 0)}` : `ΔT ${fmt(ld.dT || 0, 0)}°`;
  return `${i + 1} · ${LD_KINDS[k]} · ${ld.c || 'D'} · ${t}${k === 'TH' ? '' : ' · ' + d}${ld.gen ? ' · generada' : ''}`;
}
function ldBuilderHTML() {
  const d = UI.ldDraft, nSel = UI.sel.members.size;
  return `<div class="field"><label>Tipo de carga</label><select data-ldd="k">${Object.entries(LD_KINDS).map(([k, t]) => `<option value="${k}"${d.k === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>${ldFields(d, 'd')}<button class="btn" data-ldadd="1">+ Agregar a ${nSel} barra(s) seleccionada(s)</button>`;
}
/* Resumen de propiedades y esbeltez local de un perfil */
function secInfoHTML(name) {
  const spec = getSecSpec(state, name), P = spec ? secProps(spec) : null; if (!P || P.rigid) return '';
  const S0 = state.settings; let cap = null; try { cap = memberCapacity({E: S0.E, G: S0.G, Fy: S0.Fy}, P, 1000, 1000, 1000); } catch (_) {}
  const kv = (k, v) => `<span>${k}</span><span>${v}</span>`;
  let h = `<div class="kv">${kv('A (cm²)', fmt(P.A / 100, 2))}${kv('Ix fuerte / Iy débil (cm⁴)', fmt(P.Is / 1e4, 1) + ' / ' + fmt(P.Iw / 1e4, 1))}${kv('J torsión (cm⁴)', fmt(P.J / 1e4, 2))}${P.Cw ? kv('Cw alabeo (cm⁶)', fmt(P.Cw / 1e6, 0)) : ''}${kv('Wx · Zx (cm³)', fmt(P.Ss / 1e3, 1) + ' · ' + fmt(P.Zs / 1e3, 1))}${kv('Wy · Zy (cm³)', fmt(P.Sw / 1e3, 1) + ' · ' + fmt(P.Zw / 1e3, 1))}${kv('Peso (kg/m)', fmt(P.kg, 2))}${P.mono ? kv('Simetría', 'monosimétrica (ala sup. ≠ inf.)') : ''}</div>`;
  if (cap) {
    const els = (cap.compElems || []).map(e => `${e.n}: λ=${fmt(e.lam, 1)} (λr=${fmt(e.lr, 1)}) ${e.cls}`);
    h += `<div class="flab">Pandeo local · compresión</div><div class="note" style="margin-bottom:6px">Q = ${fmt(cap.Q, 3)}${cap.Q < 0.9999 ? ` (Qs ${fmt(cap.Qs, 3)} · Qa ${fmt(cap.Qa, 3)})` : ' (sin elementos esbeltos)'}<br>${els.map(esc).join('<br>') || '—'}</div>`;
    h += `<div class="flab">Pandeo local · flexión (eje fuerte)</div><div class="note" style="margin-bottom:6px">${(cap.flexInfo || []).map(e => `${esc(e.n)}: λ=${fmt(e.lam, 1)} · λp=${fmt(e.lp, 1)} · λr=${fmt(e.lr, 1)} → <b>${e.cls}</b>`).join('<br>') || '—'}<br>Mp = ${fmt(cap.Mp / 1e6, 1)} kN·m${cap.Lp ? ` · Lp = ${fmt(cap.Lp, 0)} mm · Lr = ${fmt(cap.Lr, 0)} mm` : ''}</div>`;
    if (cap.notes.length) h += cap.notes.map(n => `<div class="msg warn" style="margin-bottom:4px">${esc(n)}</div>`).join('');
  }
  return h;
}
function verifHTML(c) {
  const bs = c.best, cap = c.cap, g = bs.gov || {}, kv = (k, v) => `<span>${k}</span><span>${v}</span>`;
  let h = `<div class="hdr">Verificación LRFD</div><div class="kv">` + kv('r (aprovechamiento)', `<span class="pill ${c.r > 1 ? 'bad' : c.r > 0.9 ? 'warn' : 'ok'}">${fmt(c.r, 2)}</span>`) + kv('Combinación', esc(bs.combo)) +
    kv('Interacción', `${g.eq || '—'} (axial ${fmt(g.ra, 2)} · flexión ${fmt(g.mom, 2)}) · corte ${fmt(bs.rV, 2)}`) + kv('Sección crítica x (mm)', fmt(bs.x, 0)) +
    kv('Pu compr. / Tu tracc. (kN)', fmt(bs.Pc / 1e3, 1) + ' / ' + fmt(bs.Pt / 1e3, 1)) + kv('Mu fuerte / débil (kN·m)', fmt(bs.Ms / 1e6, 2) + ' / ' + fmt(bs.Mw / 1e6, 2)) + kv('Vu fuerte / débil (kN)', fmt(bs.Vs / 1e3, 1) + ' / ' + fmt(bs.Vw / 1e3, 1)) + kv('Tu torsor (kN·m)', fmt(bs.T / 1e6, 2)) +
    kv('φc·Pn compresión (kN)', fmt(cap.phiPc / 1e3, 0)) + kv('φt·Pn tracción (kN)', fmt(cap.phiPt / 1e3, 0)) + kv('Cb usado', fmt(bs.Cb, 2) + (c.cant ? ' (voladizo)' : '')) +
    kv('φb·Mn fuerte, sección crítica (kN·m)', fmt(bs.phiMsUsed / 1e6, 2)) + kv('Estado límite de flexión', esc(String(g.gov || cap.flexGov || '—'))) + kv('φb·Mn débil (kN·m)', fmt(cap.phiMw / 1e6, 2)) + kv('φv·Vn fuerte / débil (kN)', fmt(cap.phiVs / 1e3, 0) + ' / ' + fmt(cap.phiVw / 1e3, 0)) +
    kv('Ala / alma en flexión', (cap.cls.ala || '—') + ' / ' + (cap.cls.alma || '—')) + kv('Longitudes KL fuerte · débil · Lb (mm)', fmt(cap.KLs, 0) + ' · ' + fmt(cap.KLw, 0) + ' · ' + fmt(cap.Lb, 0));
  if (bs.amp != null) h += kv('Amplificación 2.º orden M fuerte · M débil · N', fmt(bs.ampS, 3) + ' · ' + fmt(bs.ampW, 3) + ' · ' + fmt(bs.ampN, 3));
  h += `</div>` + cap.notes.map(n => `<div class="msg warn" style="margin-bottom:4px">${esc(n)}</div>`).join('');
  return h;
}


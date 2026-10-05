// js/bench/ejercicios_1_clasicos.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EJERCICIOS · parte 1: problemas con resultado publicado (apuntes de cátedra)
                         y problemas clásicos con solución cerrada (tablas de vigas / pórticos)
   ════════════════════════════════════════════════════════════════════════════ */
const SRC_UMD = {t: 'Prof. R. Austin, Univ. de Maryland, ENCE 353 · «Direct Stiffness Method» (apuntes de cátedra)', url: 'https://user.eng.umd.edu/~austin/ence353.d/lecture-material2025/direct-stiffness-method.pdf'};
const SRC_MEM = {t: 'Univ. de Memphis, CIVL 7117 · capítulo 5b, ejemplo de emparrillado (apuntes de cátedra)', url: 'https://www.ce.memphis.edu/7117/notes/presentations/chapter_05b.pdf'};
const GEN_TRUSS = {type: 'GEN', A: 0.01, Is: 0.0001, Iw: 0.0001, J: 0.0001, Ss: 0.0001, Sw: 0.0001, kg: 0};   // A = 1 mm²
const E_IPE200 = 19430000, E_IPE300 = 83560000;                                                               // Ix en mm⁴ (tablas)

/* ───────────── A · PROBLEMAS CON RESPUESTA PUBLICADA ───────────── */
function trussApuntes(id, titulo, enun, nodes, bars, loadsD, loadsH, checks) {
  return {
    id, grupo: 'apuntes', titulo, fuente: SRC_UMD, enunciado: enun, tol: 1e-5,
    params: [['E', 1000, 'MPa', 'Módulo elástico adoptado (EA = 1000 N)'], ['A', 1, 'mm²', 'Área de cada barra (la fuente adopta E = A = 1)'], ['F', 10, 'kN', 'Carga de la fuente (valor 10)'], ['a', 10, 'mm', 'Lado del cuadrado de la fuente (valor 10)']],
    model: p => ({
      customSections: {'Barra 1 mm²': GEN_TRUSS}, settings: {E: 1000, G: 400},
      nodes: nodes.map(([i, x, z, sup]) => BN(i, x * p.a / 10, 0, z * p.a / 10, sup, {D: loadsD[i] ? [loadsD[i][0], 0, loadsD[i][1]] : [0, 0, 0], H: loadsH[i] ? [loadsH[i][0] * p.F / 10, 0] : [0, 0, 0]})),
      members: bars.map(([id, i, j]) => BM(id, i, j, 'Barra 1 mm²', {relI: true, relJ: true})),
      combos: [{n: 'C1: 1,0·D + 1,0·Hx', f: [1, 0, 1, 0], type: 'ULS'}]
    }),
    checks
  };
}
const TS = [0, 1, 1, 0, 0, 0], PN = [1, 1, 1, 0, 0, 0], RO = [0, 1, 1, 0, 0, 0], UYR = [0, 1, 0, 0, 0, 0];
BENCH.push(trussApuntes('A01', 'Cercha plana de 3 barras (carga horizontal)',
  'Cercha en el plano XZ: nudo 1 (0,0) articulado, nudo 2 (10,0) con apoyo móvil vertical, nudo 3 (0,10) libre con carga horizontal de 10. Las tres barras tienen E = A = 1. Se comparan desplazamientos y esfuerzos axiles publicados.',
  [[1, 0, 0, PN], [2, 10, 0, RO], [3, 0, 10, UYR]], [[1, 1, 2], [2, 1, 3], [3, 2, 3]], {}, {3: [10, 0]},
  [{l: 'Desplazamiento horizontal del nudo 2', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: '100', pub: 1},
   {l: 'Desplazamiento horizontal del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: '482.843', pub: 1, tol: 2e-6},
   {l: 'Desplazamiento vertical del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: '100', pub: 1},
   {l: 'Esfuerzo axil barra 1 (1–2), tracción +', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '10', pub: 1},
   {l: 'Esfuerzo axil barra 2 (1–3)', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '10', pub: 1},
   {l: 'Esfuerzo axil barra 3 (2–3), compresión −', u: 'kN', ref: {k: 'mem', m: 3, x: .5, f: 'N'}, t: '-14.142136', pub: 1}]));
BENCH.push(trussApuntes('A02', 'Cercha plana de 5 barras (cuadrado con diagonal)',
  'Cuadrado de lado 10 en el plano XZ con 5 barras: los cuatro lados (1–2, 1–3, 2–4 y 3–4) y la diagonal 1–4. Nudo 1 articulado, nudo 2 con apoyo móvil vertical. Cargas: 10 horizontal en el nudo 3 y 10 hacia abajo en el nudo 4. E = A = 1.',
  [[1, 0, 0, PN], [2, 10, 0, RO], [3, 0, 10, UYR], [4, 10, 10, UYR]], [[1, 1, 2], [2, 1, 3], [3, 2, 4], [4, 3, 4], [5, 1, 4]], {4: [0, -10]}, {3: [10, 0]},
  [{l: 'Desplazamiento horizontal del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: '582.843', pub: 1, tol: 2e-6},
   {l: 'Desplazamiento vertical del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: '0', pub: 1},
   {l: 'Desplazamiento horizontal del nudo 4', u: 'mm', ref: {k: 'disp', n: 4, d: 'Ux'}, t: '482.843', pub: 1, tol: 2e-6},
   {l: 'Desplazamiento vertical del nudo 4', u: 'mm', ref: {k: 'disp', n: 4, d: 'Uz'}, t: '-200', pub: 1},
   {l: 'Axil barra 1 (1–2)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '0', pub: 1},
   {l: 'Axil barra 2 (1–3)', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '0', pub: 1},
   {l: 'Axil barra 3 (2–4)', u: 'kN', ref: {k: 'mem', m: 3, x: .5, f: 'N'}, t: '-20', pub: 1},
   {l: 'Axil barra 4 (3–4)', u: 'kN', ref: {k: 'mem', m: 4, x: .5, f: 'N'}, t: '-10', pub: 1},
   {l: 'Axil barra 5 (diagonal 1–4)', u: 'kN', ref: {k: 'mem', m: 5, x: .5, f: 'N'}, t: '14.142136', pub: 1}]));
BENCH.push(trussApuntes('A03', 'Cercha plana de 6 barras (cuadrado con dos diagonales)',
  'Igual al ejercicio A02 con una segunda diagonal 2–3 (seis barras). Mismos apoyos, cargas y E = A = 1. Se comparan los desplazamientos y los esfuerzos axiles publicados (la fuente trunca los axiles a dos decimales).',
  [[1, 0, 0, PN], [2, 10, 0, RO], [3, 0, 10, UYR], [4, 10, 10, UYR]], [[1, 1, 2], [2, 1, 3], [3, 2, 4], [4, 3, 4], [5, 1, 4], [6, 2, 3]], {4: [0, -10]}, {3: [10, 0]},
  [{l: 'Desplazamiento horizontal del nudo 2', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: '60.3553', pub: 1, tol: 2e-6},
   {l: 'Desplazamiento horizontal del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: '291.421', pub: 1, tol: 5e-6},
   {l: 'Desplazamiento vertical del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: '60.3553', pub: 1, tol: 2e-6},
   {l: 'Desplazamiento horizontal del nudo 4', u: 'mm', ref: {k: 'disp', n: 4, d: 'Ux'}, t: '251.777', pub: 1, tol: 5e-6},
   {l: 'Desplazamiento vertical del nudo 4', u: 'mm', ref: {k: 'disp', n: 4, d: 'Uz'}, t: '-139.645', pub: 1, tol: 5e-6},
   {l: 'Axil barra 1 (1–2)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '6.0355', pub: 1, tol: 0, atol: 0.011},
   {l: 'Axil barra 2 (1–3)', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '6.0355', pub: 1, tol: 0, atol: 0.011},
   {l: 'Axil barra 3 (2–4)', u: 'kN', ref: {k: 'mem', m: 3, x: .5, f: 'N'}, t: '-13.96', pub: 1, tol: 0, atol: 0.011},
   {l: 'Axil barra 4 (3–4)', u: 'kN', ref: {k: 'mem', m: 4, x: .5, f: 'N'}, t: '-3.96', pub: 1, tol: 0, atol: 0.011},
   {l: 'Axil barra 5 (diagonal 1–4)', u: 'kN', ref: {k: 'mem', m: 5, x: .5, f: 'N'}, t: '5.60', pub: 1, tol: 0, atol: 0.011},
   {l: 'Axil barra 6 (diagonal 2–3)', u: 'kN', ref: {k: 'mem', m: 6, x: .5, f: 'N'}, t: '-8.53', pub: 1, tol: 0, atol: 0.011}]));

BENCH.push({
  id: 'A04', grupo: 'apuntes', titulo: 'Emparrillado en L empotrado en ambos extremos (flexión + torsión)', fuente: SRC_MEM, tol: 1e-4,
  enunciado: 'Dos barras horizontales de 3 m en ángulo recto, unidas en el nudo 2 y empotradas en los extremos 1 y 3. Carga vertical de 22 kN hacia abajo en el nudo 2. E = 210 GPa, G = 84 GPa, I = 16,6·10⁻⁵ m⁴, J = 4,6·10⁻⁵ m⁴. La fuente publica v = −2,59 mm, giros de 0,00126 rad y esfuerzos de barra con tres cifras (algunos redondeados: por ejemplo el torsor); por eso las filas «publicado» tienen tolerancia mayor y se agregan las filas «solución exacta» deducidas por compatibilidad (θ = (P/4)·L²/(EI+GJ)).',
  params: [['E', 210000, 'MPa', 'Módulo elástico'], ['G', 84000, 'MPa', 'Módulo de corte'], ['I', 166000000, 'mm⁴', 'Inercia (16,6·10⁻⁵ m⁴)'], ['J', 46000000, 'mm⁴', 'Constante de torsión (4,6·10⁻⁵ m⁴)'], ['L', 3000, 'mm', 'Largo de cada barra'], ['P', 22, 'kN', 'Carga vertical en el nudo 2'],
    ['th', '(P*1000/4)*L^2/(E*I+G*J)', 'rad', 'Giro exacto del nudo 2 (compatibilidad)'], ['w', '(P*1000/2)*L^3/(12*E*I)+th*L/2', 'mm', 'Descenso exacto del nudo 2'], ['T', 'G*J*th/L/1000000', 'kN·m', 'Torsor exacto en cada barra']],
  model: p => ({
    customSections: {'Perfil emparrillado': {type: 'GEN', A: 1000, Is: 16600, Iw: 16600, J: 4600, Ss: 1000, Sw: 1000, kg: 0}}, settings: {E: p.E, G: p.G},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, null, {D: [0, 0, -p.P]}), BN(3, p.L, p.L, 0, SUP_FIX)],
    members: [BM(1, 1, 2, 'Perfil emparrillado'), BM(2, 3, 2, 'Perfil emparrillado')]
  }),
  checks: [
    {l: 'Descenso del nudo 2 (publicado)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-2.59', pub: 1, tol: 0.02},
    {l: 'Giro del nudo 2 alrededor de X (publicado)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Rx'}, t: '0.00126', pub: 1, abs: 1, tol: 0.02},
    {l: 'Giro del nudo 2 alrededor de Y (publicado)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: '0.00126', pub: 1, abs: 1, tol: 0.02},
    {l: 'Corte en el extremo 1 (publicado)', u: 'kN', ref: {k: 'mem', m: 1, x: 0, f: 'Vy'}, t: '11.0', pub: 1, abs: 1, tol: 1e-3},
    {l: 'Momento flector en el empotramiento 1 (publicado)', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: '31.0', pub: 1, abs: 1, tol: 0.02},
    {l: 'Torsor en la barra 1 (publicado, redondeado en la fuente)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'T'}, t: '1.50', pub: 1, abs: 1, tol: 0.10, note: 'La fuente da 1,50; la solución exacta es 1,65 (fila siguiente).'},
    {l: 'Descenso del nudo 2 (solución exacta)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-w'},
    {l: 'Giro del nudo 2 alrededor de X (solución exacta)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Rx'}, t: 'th', abs: 1},
    {l: 'Torsor en la barra 1 (solución exacta)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'T'}, t: 'T', abs: 1},
    {l: 'Reacción vertical en cada empotramiento', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P/2'}
  ]
});

/* ───────────── C · PROBLEMAS CLÁSICOS CON SOLUCIÓN CERRADA ───────────── */
const SRC_CL = {t: 'Soluciones clásicas de resistencia de materiales y análisis estructural (tablas de vigas, método de pendiente-deflexión, método de los nudos, castigliano)'};
BENCH.push({
  id: 'C01', grupo: 'clasico', titulo: 'Viga biapoyada con carga uniforme (D + L y combinaciones)', fuente: SRC_CL,
  enunciado: 'Viga IPE 200 de 4,00 m, apoyo fijo en A y móvil en B. Carga uniforme permanente D = 6 kN/m y sobrecarga L = 4 kN/m. Se verifican reacciones, flecha, giro, momento y corte con la combinación de servicio D+L y la de resistencia 1,2D+1,6L (comprueba también el manejo de factores).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 4000, 'mm', 'Luz'], ['qD', 6, 'kN/m', 'Carga permanente'], ['qL', 4, 'kN/m', 'Sobrecarga'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200 (tabla: 1943 cm⁴)'], ['q', 'qD+qL', 'kN/m', 'Carga de servicio D+L'], ['qu', '1.2*qD+1.6*qL', 'kN/m', 'Carga última 1,2D+1,6L']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {q: {D: p.qD, L: p.qL}})],
    combos: [{n: 'S1: D+L', f: [1, 1, 0, 0], type: 'SLS', lim: 250}, {n: 'U2: 1,2D+1,6L', f: [1.2, 1.6, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Reacción en A (D+L)', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 0}, t: 'q*L/2000'},
    {l: 'Reacción en B (1,2D+1,6L)', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz', c: 1}, t: 'qu*L/2000'},
    {l: 'Flecha en el centro (D+L)', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy', c: 0}, t: '-5*q*L^4/(384*E*I)'},
    {l: 'Giro en el apoyo A (D+L)', u: 'rad', ref: {k: 'disp', n: 1, d: 'Ry', c: 0}, t: 'q*L^3/(24*E*I)', abs: 1},
    {l: 'Giro en el apoyo A (1,2D+1,6L)', u: 'rad', ref: {k: 'disp', n: 1, d: 'Ry', c: 1}, t: 'qu*L^3/(24*E*I)', abs: 1},
    {l: 'Momento máximo en el centro (1,2D+1,6L)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz', c: 1}, t: 'qu*L^2/8/1000000', abs: 1},
    {l: 'Corte en el apoyo A (1,2D+1,6L)', u: 'kN', ref: {k: 'mem', m: 1, x: 0, f: 'Vy', c: 1}, t: 'qu*L/2000', abs: 1},
    {l: 'Corte en el centro', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'Vy', c: 1}, t: '0'},
    {l: 'Momento en el apoyo A', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz', c: 1}, t: '0'}]
});
BENCH.push({
  id: 'C02', grupo: 'clasico', titulo: 'Voladizo con carga puntual en el extremo', fuente: SRC_CL,
  enunciado: 'Voladizo IPE 200 de 2,50 m empotrado en el nudo 1, con una carga vertical de 15 kN hacia abajo en el extremo libre. Se comparan flecha y giro del extremo, reacciones, diagramas y la flecha a media luz.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 2500, 'mm', 'Largo'], ['P', 15, 'kN', 'Carga en el extremo'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, null, {D: [0, 0, -p.P]})], members: [BM(1, 1, 2, 'IPE 200')]}),
  checks: [
    {l: 'Flecha del extremo', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-P*1000*L^3/(3*E*I)'},
    {l: 'Giro del extremo', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'P*1000*L^2/(2*E*I)', abs: 1},
    {l: 'Flecha a media luz', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-P*1000*(L/2)^2*(3*L-L/2)/(6*E*I)'},
    {l: 'Reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P'},
    {l: 'Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'P*L/1000', abs: 1},
    {l: 'Corte constante', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'Vy'}, t: 'P', abs: 1},
    {l: 'Momento a media luz', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'P*(L/2)/1000', abs: 1},
    {l: 'Esfuerzo axil', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '0'}]
});
BENCH.push({
  id: 'C03', grupo: 'clasico', titulo: 'Voladizo con carga uniforme', fuente: SRC_CL,
  enunciado: 'Voladizo UPN 200 de 3,00 m con carga permanente de 8 kN/m. Flecha y giro del extremo, flecha a media luz, reacciones y momento de empotramiento.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 3000, 'mm', 'Largo'], ['q', 8, 'kN/m', 'Carga uniforme'], ['I', 19100000, 'mm⁴', 'Ix UPN 200 (tabla: 1910 cm⁴)']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0)], members: [BM(1, 1, 2, 'UPN 200', {q: {D: p.q}})]}),
  checks: [
    {l: 'Flecha del extremo', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-q*L^4/(8*E*I)'},
    {l: 'Giro del extremo', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'q*L^3/(6*E*I)', abs: 1},
    {l: 'Flecha a media luz', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-q*(L/2)^2*(6*L^2-4*L*(L/2)+(L/2)^2)/(24*E*I)'},
    {l: 'Reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'q*L/1000'},
    {l: 'Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'q*L^2/2/1000000', abs: 1},
    {l: 'Momento a media luz', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'q*(L/2)^2/2/1000000', abs: 1}]
});
BENCH.push({
  id: 'C04', grupo: 'clasico', titulo: 'Viga biempotrada con carga uniforme', fuente: SRC_CL,
  enunciado: 'Viga IPE 240 de 5,00 m empotrada en ambos extremos con 12 kN/m. Momentos de empotramiento perfecto qL²/12, momento central qL²/24 y flecha qL⁴/(384EI).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 5000, 'mm', 'Luz'], ['q', 12, 'kN/m', 'Carga uniforme'], ['I', 38920000, 'mm⁴', 'Ix IPE 240 (tabla: 3892 cm⁴)']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, SUP_FIX)], members: [BM(1, 1, 2, 'IPE 240', {q: {D: p.q}})]}),
  checks: [
    {l: 'Reacción vertical en cada extremo', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'q*L/2000'},
    {l: 'Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'q*L^2/12/1000000', abs: 1},
    {l: 'Momento de empotramiento (diagrama de la barra)', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: 'q*L^2/12/1000000', abs: 1},
    {l: 'Momento en el centro', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'q*L^2/24/1000000', abs: 1},
    {l: 'Flecha en el centro', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-q*L^4/(384*E*I)'},
    {l: 'Corte en el extremo', u: 'kN', ref: {k: 'mem', m: 1, x: 0, f: 'Vy'}, t: 'q*L/2000', abs: 1}]
});
BENCH.push({
  id: 'C05', grupo: 'clasico', titulo: 'Viga continua de dos tramos iguales con carga uniforme', fuente: SRC_CL,
  enunciado: 'Dos tramos de 3,50 m (IPE 200) con 10 kN/m y tres apoyos. Resultados clásicos de la ecuación de los tres momentos: reacciones 3qL/8, 10qL/8 y 3qL/8; momento en el apoyo central qL²/8 y máximo positivo 9qL²/128 a 3L/8.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 3500, 'mm', 'Luz de cada tramo'], ['q', 10, 'kN/m', 'Carga uniforme'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL), BN(3, 2 * p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {q: {D: p.q}}), BM(2, 2, 3, 'IPE 200', {q: {D: p.q}})]}),
  checks: [
    {l: 'Reacción en el apoyo extremo A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: '3*q*L/8000'},
    {l: 'Reacción en el apoyo central B', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: '10*q*L/8000'},
    {l: 'Reacción en el apoyo extremo C', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fz'}, t: '3*q*L/8000'},
    {l: 'Momento negativo sobre el apoyo central', u: 'kN·m', ref: {k: 'mem', m: 1, x: 1, f: 'Mz'}, t: 'q*L^2/8/1000000', abs: 1},
    {l: 'Momento positivo máximo (a 3L/8 del apoyo A)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .375, f: 'Mz'}, t: '9*q*L^2/128/1000000', abs: 1},
    {l: 'Corte a la izquierda del apoyo central', u: 'kN', ref: {k: 'mem', m: 1, x: 1, f: 'Vy'}, t: '5*q*L/8000', abs: 1},
    {l: 'Giro del apoyo central (simetría)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: '0', atol: 1e-9}]
});
BENCH.push({
  id: 'C06', grupo: 'clasico', titulo: 'Viga empotrada–apoyada con carga uniforme', fuente: SRC_CL,
  enunciado: 'Viga IPE 200 de 4,00 m empotrada en A y con apoyo móvil en B, carga de 10 kN/m. Reacciones 5qL/8 y 3qL/8, momento de empotramiento qL²/8, máximo positivo 9qL²/128 a 3L/8 del apoyo B, flecha a media luz qL⁴/(192EI) y giro en B qL³/(48EI).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 4000, 'mm', 'Luz'], ['q', 10, 'kN/m', 'Carga uniforme'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {q: {D: p.q}})]}),
  checks: [
    {l: 'Reacción en el empotramiento A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: '5*q*L/8000'},
    {l: 'Reacción en el apoyo móvil B', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: '3*q*L/8000'},
    {l: 'Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'q*L^2/8/1000000', abs: 1},
    {l: 'Momento positivo máximo (a 5L/8 de A)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .625, f: 'Mz'}, t: '9*q*L^2/128/1000000', abs: 1},
    {l: 'Flecha a media luz', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-q*L^4/(192*E*I)'},
    {l: 'Giro en el apoyo B', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'q*L^3/(48*E*I)', abs: 1}]
});
BENCH.push({
  id: 'C07', grupo: 'clasico', titulo: 'Viga Gerber (articulación intermedia)', fuente: SRC_CL,
  enunciado: 'Dos tramos de 3,00 m con 10 kN/m. El primero está empotrado en 1; el segundo se articula al extremo del primero (momento liberado en el nudo 2) y se apoya en 3. Es isostática: R3 = qL/2, R1 = 3qL/2, M1 = qL². Verifica la liberación de momentos y la recuperación del giro liberado.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 3000, 'mm', 'Luz de cada tramo'], ['q', 10, 'kN/m', 'Carga uniforme'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0), BN(3, 2 * p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {q: {D: p.q}}), BM(2, 2, 3, 'IPE 200', {q: {D: p.q}, relI: true})]}),
  checks: [
    {l: 'Reacción vertical en el empotramiento', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: '1.5*q*L/1000'},
    {l: 'Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'q*L^2/1000000', abs: 1},
    {l: 'Reacción en el apoyo móvil', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fz'}, t: 'q*L/2000'},
    {l: 'Descenso de la articulación (nudo 2)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-7*q*L^4/(24*E*I)'},
    {l: 'Giro del extremo del primer tramo', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: '5*q*L^3/(12*E*I)', abs: 1},
    {l: 'Momento en la articulación, lado tramo 2', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: '0'},
    {l: 'Momento en la articulación, lado tramo 1', u: 'kN·m', ref: {k: 'mem', m: 1, x: 1, f: 'Mz'}, t: '0'},
    {l: 'Momento a media luz del tramo 2', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'Mz'}, t: 'q*L^2/8/1000000', abs: 1}]
});
BENCH.push({
  id: 'C08', grupo: 'clasico', titulo: 'Reticulado plano triangular (método de los nudos)', fuente: SRC_CL,
  enunciado: 'Triángulo isósceles de base 4,00 m y altura 3,00 m, barras articuladas (A = 500 mm²), apoyo fijo en A, móvil en B y carga vertical de 30 kN en el vértice C. Esfuerzos por equilibrio de nudos y descenso del vértice por trabajos virtuales.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['Lab', 4000, 'mm', 'Base'], ['H', 3000, 'mm', 'Altura'], ['A', 500, 'mm²', 'Área de cada barra'], ['P', 30, 'kN', 'Carga en el vértice'], ['Lc', 'SQRT((Lab/2)^2+H^2)', 'mm', 'Longitud de las barras inclinadas'], ['alfa', 'ATAN(H/(Lab/2))', 'rad', 'Ángulo de las barras inclinadas']],
  model: p => ({customSections: {'Barra articulada': {type: 'GEN', A: p.A / 100, Is: 0.0001, Iw: 0.0001, J: 0.0001, Ss: 0.0001, Sw: 0.0001, kg: 0}},
    nodes: [BN(1, 0, 0, 0, [1, 1, 1, 0, 0, 0]), BN(2, p.Lab, 0, 0, SUP_ROL), BN(3, p.Lab / 2, 0, p.H, [0, 1, 0, 0, 0, 0], {D: [0, 0, -p.P]})],
    members: [BM(1, 1, 3, 'Barra articulada', {relI: true, relJ: true}), BM(2, 2, 3, 'Barra articulada', {relI: true, relJ: true}), BM(3, 1, 2, 'Barra articulada', {relI: true, relJ: true})]}),
  checks: [
    {l: 'Axil de la barra inclinada 1 (compresión −)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-P/(2*SIN(alfa))'},
    {l: 'Axil de la barra inclinada 2', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '-P/(2*SIN(alfa))'},
    {l: 'Axil del tirante AB (tracción +)', u: 'kN', ref: {k: 'mem', m: 3, x: .5, f: 'N'}, t: 'P/(2*TAN(alfa))'},
    {l: 'Descenso del vértice C', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: '-P*1000/(E*A)*(2*(1/(2*SIN(alfa)))^2*Lc+(1/(2*TAN(alfa)))^2*Lab)'},
    {l: 'Corrimiento horizontal del apoyo móvil B', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: 'P/(2*TAN(alfa))*1000*Lab/(E*A)'},
    {l: 'Reacción vertical en A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P/2'},
    {l: 'Reacción vertical en B', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: 'P/2'},
    {l: 'Reacción horizontal en A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: '0'}]
});
BENCH.push({
  id: 'C09', grupo: 'clasico', titulo: 'Reticulado espacial: trípode con carga vertical y horizontal', fuente: SRC_CL,
  enunciado: 'Tres barras articuladas (A = 500 mm²) unen un vértice a 2,50 m de altura con tres apoyos articulados en un círculo de 2,00 m de radio, a 120° entre sí. En el vértice actúan 30 kN hacia abajo y 12 kN horizontal en X. Esfuerzos por equilibrio espacial del nudo y desplazamientos del vértice por trabajos virtuales.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['R', 2000, 'mm', 'Radio de la base'], ['Ht', 2500, 'mm', 'Altura del vértice'], ['A', 500, 'mm²', 'Área de cada barra'], ['P', 30, 'kN', 'Carga vertical (hacia abajo)'], ['Hx', 12, 'kN', 'Carga horizontal en X'],
    ['Lc', 'SQRT(R^2+Ht^2)', 'mm', 'Longitud de cada barra'], ['a', 'R/Lc', '', 'cos de la inclinación respecto de la vertical (R/Lc)'], ['b', 'Ht/Lc', '', 'sen de la inclinación sobre la horizontal (H/Lc)']],
  model: p => { const s3 = Math.sqrt(3) / 2, ap = [BN(1, 0, 0, p.Ht, null, {D: [0, 0, -p.P], H: [p.Hx, 0]})];
    const base = [[0, p.R], [-p.R * s3, -p.R / 2], [p.R * s3, -p.R / 2]];
    base.forEach((b, k) => ap.push(BN(2 + k, b[0], b[1], 0, [1, 1, 1, 0, 0, 0])));
    return {customSections: {'Barra articulada': {type: 'GEN', A: p.A / 100, Is: 0.0001, Iw: 0.0001, J: 0.0001, Ss: 0.0001, Sw: 0.0001, kg: 0}}, nodes: ap,
      members: [2, 3, 4].map((n, k) => BM(1 + k, n, 1, 'Barra articulada', {relI: true, relJ: true})), combos: [{n: 'C1: D + Hx', f: [1, 0, 1, 0], type: 'ULS'}]}; },
  checks: [
    {l: 'Axil barra 1 (base a 90°)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-P/(3*b)'},
    {l: 'Axil barra 2 (base a 210°)', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '-P/(3*b)-2*Hx/(3*a)*COS(7*PI()/6)'},
    {l: 'Axil barra 3 (base a 330°)', u: 'kN', ref: {k: 'mem', m: 3, x: .5, f: 'N'}, t: '-P/(3*b)-2*Hx/(3*a)*COS(11*PI()/6)'},
    {l: 'Descenso del vértice', u: 'mm', ref: {k: 'disp', n: 1, d: 'Uz'}, t: '-P*1000*Lc/(3*b^2*E*A)'},
    {l: 'Corrimiento horizontal del vértice en X', u: 'mm', ref: {k: 'disp', n: 1, d: 'Ux'}, t: '2*Hx*1000*Lc/(3*a^2*E*A)'},
    {l: 'Corrimiento horizontal del vértice en Y', u: 'mm', ref: {k: 'disp', n: 1, d: 'Uy'}, t: '0'},
    {l: 'Suma de reacciones verticales', u: 'kN', ref: {k: 'reacsum', ns: [2, 3, 4], d: 'Fz'}, t: 'P'},
    {l: 'Suma de reacciones horizontales en X', u: 'kN', ref: {k: 'reacsum', ns: [2, 3, 4], d: 'Fx'}, t: '-Hx'}]
});

/* ── pórticos planos (plano XZ) ── */
function portalNodes(p, fix, Hx) { return [BN(1, 0, 0, 0, fix ? SUP_FIX : [1, 1, 1, 0, 0, 0]), BN(2, 0, 0, p.h, fix ? null : UYR, Hx ? {H: [Hx, 0]} : null), BN(3, p.L, 0, p.h, fix ? null : UYR), BN(4, p.L, 0, 0, fix ? SUP_FIX : [1, 1, 1, 0, 0, 0])]; }
const PORTAL_PARAMS = [['E', 200000, 'MPa', 'Módulo elástico'], ['h', 3500, 'mm', 'Altura de las columnas'], ['L', 5000, 'mm', 'Luz de la viga'], ['Ic', E_IPE200, 'mm⁴', 'Inercia de las columnas (IPE 200: 1943 cm⁴)'], ['Ib', E_IPE300, 'mm⁴', 'Inercia de la viga (IPE 300: 8356 cm⁴)'], ['Kc', 'E*Ic/h', 'N·mm', 'Rigidez EI/h de la columna'], ['Kb', 'E*Ib/L', 'N·mm', 'Rigidez EI/L de la viga']];
// inercias de tabla (IPE 200: 1943 cm⁴ · IPE 300: 8356 cm⁴) y área ficticia enorme: barras inextensibles, como supone la solución clásica
const PORTAL_SECS = {'Columna 1943 cm⁴ (axil rígido)': {type: 'GEN', A: 3.34e4, Is: 1943, Iw: 142, J: 7, Ss: 194, Sw: 28, kg: 0}, 'Viga 8356 cm⁴ (axil rígido)': {type: 'GEN', A: 5.38e4, Is: 8356, Iw: 604, J: 20, Ss: 557, Sw: 80, kg: 0}};
const PORTAL_MEMBERS = q => [BM(1, 1, 2, 'Columna 1943 cm⁴ (axil rígido)'), BM(2, 2, 3, 'Viga 8356 cm⁴ (axil rígido)', {q: {D: q || 0}}), BM(3, 4, 3, 'Columna 1943 cm⁴ (axil rígido)')];
BENCH.push({
  id: 'C10', grupo: 'clasico', titulo: 'Pórtico plano articulado en la base con carga lateral', fuente: SRC_CL, tol: 1e-4,
  enunciado: 'Columnas IPE 200 de 3,50 m articuladas en la base y viga IPE 300 de 5,00 m. Fuerza horizontal de 20 kN en el nudo superior izquierdo. Solución por pendiente-deflexión (nudos con giro y desplazamiento lateral, barras inextensibles): Δ = H·h²(a+b)/(2ab) con a = 3EIc/h y b = 6EIb/L. Se usan las inercias de tabla con área ficticia muy grande (barras inextensibles) porque la solución clásica desprecia la deformación axial; con las áreas reales de los IPE el programa se aparta de esta solución hasta un 2,3 % (giro de los nudos), diferencia atribuible a esa deformación y no a un error de cálculo.',
  params: PORTAL_PARAMS.slice(0, 1).concat([['H', 20, 'kN', 'Fuerza horizontal en el nudo 2']], PORTAL_PARAMS.slice(1), [['a', '3*Kc', 'N·mm', 'Rigidez lateral de la columna articulada'], ['b', '6*Kb', 'N·mm', 'Rigidez de la viga con giros iguales'], ['Dsw', 'H*1000*h^2*(a+b)/(2*a*b)', 'mm', 'Desplazamiento lateral teórico']]),
  model: p => ({nodes: portalNodes(p, false, p.H), customSections: PORTAL_SECS, members: PORTAL_MEMBERS(0), combos: [{n: 'C1: 1,0·Hx', f: [0, 0, 1, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Desplazamiento lateral del nudo 2', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: 'Dsw'},
    {l: 'Desplazamiento lateral del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: 'Dsw'},
    {l: 'Reacción horizontal en el apoyo 1', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: '-H/2'},
    {l: 'Reacción horizontal en el apoyo 4', u: 'kN', ref: {k: 'reac', n: 4, d: 'Fx'}, t: '-H/2'},
    {l: 'Reacción vertical en el apoyo 4 (vuelco)', u: 'kN', ref: {k: 'reac', n: 4, d: 'Fz'}, t: 'H*h/L'},
    {l: 'Reacción vertical en el apoyo 1', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: '-H*h/L'},
    {l: 'Momento en el extremo de la viga (nudo 2)', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: 'H*h/2/1000', abs: 1}]
});
BENCH.push({
  id: 'C11', grupo: 'clasico', titulo: 'Pórtico plano empotrado en la base con carga lateral', fuente: SRC_CL, tol: 1e-4,
  enunciado: 'Mismo pórtico que C10 pero con empotramientos en la base. Pendiente-deflexión: Δ = H·h²(2Kc+3Kb)/(12·Kc·(Kc+6Kb)), giro θ = 6KcΔ/(h(4Kc+6Kb)), momentos M_sup = 4Kcθ − 6KcΔ/h y M_base = 2Kcθ − 6KcΔ/h. Barras inextensibles como en la solución clásica (área ficticia muy grande); con las áreas reales de los IPE la diferencia llega al 2,3 % en el giro de los nudos.',
  params: PORTAL_PARAMS.slice(0, 1).concat([['H', 20, 'kN', 'Fuerza horizontal en el nudo 2']], PORTAL_PARAMS.slice(1), [['Dsw', 'H*1000*h^2*(2*Kc+3*Kb)/(12*Kc*(Kc+6*Kb))', 'mm', 'Desplazamiento lateral teórico'], ['th', '6*Kc*Dsw/(h*(4*Kc+6*Kb))', 'rad', 'Giro de los nudos superiores'], ['Mt', 'ABS(4*Kc*th-6*Kc*Dsw/h)', 'N·mm', 'Momento en la cabeza de la columna'], ['Mb', 'ABS(2*Kc*th-6*Kc*Dsw/h)', 'N·mm', 'Momento en la base']]),
  model: p => ({nodes: portalNodes(p, true, p.H), customSections: PORTAL_SECS, members: PORTAL_MEMBERS(0), combos: [{n: 'C1: 1,0·Hx', f: [0, 0, 1, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Desplazamiento lateral del nudo 2', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: 'Dsw'},
    {l: 'Desplazamiento lateral del nudo 3', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: 'Dsw'},
    {l: 'Giro del nudo 2', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'th', abs: 1},
    {l: 'Reacción horizontal en el empotramiento 1', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: '-H/2'},
    {l: 'Momento de empotramiento en la base 1', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'Mb/1000000', abs: 1},
    {l: 'Momento en la cabeza de la columna 1', u: 'kN·m', ref: {k: 'mem', m: 1, x: 1, f: 'Mz'}, t: 'Mt/1000000', abs: 1},
    {l: 'Momento en el extremo de la viga (nudo 2)', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: 'Mt/1000000', abs: 1},
    {l: 'Reacción vertical en el apoyo 4 (par resistente)', u: 'kN', ref: {k: 'reac', n: 4, d: 'Fz'}, t: '(H*1000*h-2*Mb)/L/1000', abs: 1}]
});
BENCH.push({
  id: 'C12', grupo: 'clasico', titulo: 'Pórtico plano empotrado con carga uniforme en el dintel', fuente: SRC_CL, tol: 1e-4,
  enunciado: 'Pórtico de C11 con carga permanente de 15 kN/m sobre la viga. Carga simétrica: sin desplazamiento lateral. Pendiente-deflexión: θ = (qL²/12)/(4Kc+2Kb); M_col = 4Kcθ en la cabeza y 2Kcθ en la base; empuje horizontal (M_cab + M_base)/h; momento positivo en el centro de la viga qL²/8 − M_cab.',
  params: PORTAL_PARAMS.slice(0, 1).concat([['q', 15, 'kN/m', 'Carga uniforme sobre la viga']], PORTAL_PARAMS.slice(1), [['th', 'q*L^2/12/(4*Kc+2*Kb)', 'rad', 'Giro de los nudos superiores'], ['Mt', '4*Kc*th', 'N·mm', 'Momento en la cabeza de la columna'], ['Mb', '2*Kc*th', 'N·mm', 'Momento en la base'], ['Hth', '(Mt+Mb)/h', 'N', 'Empuje horizontal en cada base']]),
  model: p => ({nodes: portalNodes(p, true, 0), customSections: PORTAL_SECS, members: PORTAL_MEMBERS(p.q), combos: [{n: 'C1: 1,0·D', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Reacción vertical en cada base', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'q*L/2000'},
    {l: 'Empuje horizontal en la base 1', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: 'Hth/1000', abs: 1},
    {l: 'Momento de empotramiento en la base 1', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'Mb/1000000', abs: 1},
    {l: 'Giro del nudo 2', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'th', abs: 1},
    {l: 'Momento en el extremo de la viga', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: 'Mt/1000000', abs: 1},
    {l: 'Momento positivo en el centro de la viga', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'Mz'}, t: '(q*L^2/8-Mt)/1000000', abs: 1}]
});
BENCH.push({
  id: 'C13', grupo: 'clasico', titulo: 'Ménsula en L en el espacio (flexión + torsión)', fuente: SRC_CL,
  enunciado: 'Dos barras horizontales perpendiculares: la primera de 2,00 m a lo largo de X, empotrada en el origen; la segunda de 1,50 m a lo largo de Y, desde su extremo. Carga vertical de 5 kN hacia abajo en el extremo libre. Perfil genérico I = 1000 cm⁴, J = 600 cm⁴. Por Castigliano: δ = P(a³+b³)/(3EI) + P·a·b²/(GJ); la primera barra trabaja a flexión y torsión (T = P·b).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['I', 10000000, 'mm⁴', 'Inercia (1000 cm⁴)'], ['J', 6000000, 'mm⁴', 'Constante de torsión (600 cm⁴)'], ['a', 2000, 'mm', 'Largo de la barra 1 (eje X)'], ['b', 1500, 'mm', 'Largo de la barra 2 (eje Y)'], ['P', 5, 'kN', 'Carga vertical en el extremo']],
  model: p => ({customSections: {'Perfil L-espacial': {type: 'GEN', A: 20, Is: 1000, Iw: 300, J: 600, Ss: 100, Sw: 30, kg: 0}},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.a, 0, 0), BN(3, p.a, p.b, 0, null, {D: [0, 0, -p.P]})], members: [BM(1, 1, 2, 'Perfil L-espacial'), BM(2, 2, 3, 'Perfil L-espacial')]}),
  checks: [
    {l: 'Descenso del extremo libre', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: '-(P*1000*(a^3+b^3)/(3*E*I)+P*1000*a*b^2/(G*J))'},
    {l: 'Giro por torsión del nudo 2 alrededor de X', u: 'rad', ref: {k: 'disp', n: 2, d: 'Rx'}, t: 'P*1000*b*a/(G*J)', abs: 1},
    {l: 'Giro por flexión del nudo 2 alrededor de Y', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'P*1000*a^2/(2*E*I)', abs: 1},
    {l: 'Reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P'},
    {l: 'Momento de reacción alrededor de X', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'Mx'}, t: 'P*b/1000', abs: 1},
    {l: 'Momento de reacción alrededor de Y', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'P*a/1000', abs: 1},
    {l: 'Torsor en la barra 1', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'T'}, t: 'P*b/1000', abs: 1},
    {l: 'Momento flector en el empotramiento (barra 1)', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: 'P*a/1000', abs: 1},
    {l: 'Momento flector al inicio de la barra 2', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: 'P*b/1000', abs: 1}]
});
BENCH.push({
  id: 'C14', grupo: 'clasico', titulo: 'Columna en voladizo con cargas horizontales en los dos ejes', fuente: SRC_CL,
  enunciado: 'Columna UPN 200 vertical de 3,00 m empotrada en la base. En la cabeza actúan 4 kN en X y 3 kN en Y; además una carga distribuida de 1,5 kN/m en X y 1,0 kN/m en Y. En X flexiona alrededor del eje fuerte (I = 1910 cm⁴) y en Y alrededor del débil (I = 148 cm⁴). Superposición de δ = FL³/(3EI) + wL⁴/(8EI).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 3000, 'mm', 'Altura'], ['Fx', 4, 'kN', 'Fuerza en la cabeza, eje X'], ['Fy', 3, 'kN', 'Fuerza en la cabeza, eje Y'], ['wx', 1.5, 'kN/m', 'Carga distribuida Hx'], ['wy', 1, 'kN/m', 'Carga distribuida Hy'], ['Is', 19100000, 'mm⁴', 'Ix UPN 200'], ['Iw', 1480000, 'mm⁴', 'Iy UPN 200 (tabla: 148 cm⁴)']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, 0, 0, p.L, null, {H: [p.Fx, p.Fy]})], members: [BM(1, 1, 2, 'UPN 200', {q: {Wx: p.wx, Wy: p.wy}})], combos: [{n: 'C1: Hx + Hy', f: [0, 0, 1, 1], type: 'ULS'}]}),
  checks: [
    {l: 'Desplazamiento de la cabeza en X (eje fuerte)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: '(Fx*1000*L^3/3+wx*L^4/8)/(E*Is)'},
    {l: 'Desplazamiento de la cabeza en Y (eje débil)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uy'}, t: '(Fy*1000*L^3/3+wy*L^4/8)/(E*Iw)'},
    {l: 'Reacción horizontal en X', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: '-(Fx+wx*L/1000)'},
    {l: 'Reacción horizontal en Y', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fy'}, t: '-(Fy+wy*L/1000)'},
    {l: 'Momento de empotramiento alrededor de Y', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: '(Fx*L/1000+wx*L^2/2/1000000)', abs: 1},
    {l: 'Momento de empotramiento alrededor de X', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'Mx'}, t: '(Fy*L/1000+wy*L^2/2/1000000)', abs: 1}]
});
BENCH.push({
  id: 'C15', grupo: 'clasico', titulo: 'Barra girada (ángulo β): eje fuerte, débil e inclinado', fuente: SRC_CL,
  enunciado: 'Tres voladizos UPN 200 de 2,00 m con 2 kN hacia abajo en la punta, uno sin giro (β = 0°), otro girado 45° y otro girado 90°. Con β = 0° flexiona con el eje fuerte, con 90° con el débil, y con 45° la carga se descompone en los ejes principales: δz = (PL³/6E)(1/Is + 1/Iw), δy = (PL³/6E)(1/Iw − 1/Is).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 2000, 'mm', 'Largo'], ['P', 2, 'kN', 'Carga en la punta'], ['Is', 19100000, 'mm⁴', 'Ix UPN 200'], ['Iw', 1480000, 'mm⁴', 'Iy UPN 200']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, null, {D: [0, 0, -p.P]}), BN(3, 0, 500, 0, SUP_FIX), BN(4, p.L, 500, 0, null, {D: [0, 0, -p.P]}), BN(5, 0, 1000, 0, SUP_FIX), BN(6, p.L, 1000, 0, null, {D: [0, 0, -p.P]})],
    members: [BM(1, 1, 2, 'UPN 200'), BM(2, 3, 4, 'UPN 200', {beta: 45}), BM(3, 5, 6, 'UPN 200', {beta: 90})]}),
  checks: [
    {l: 'Descenso con β = 0° (eje fuerte)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-P*1000*L^3/(3*E*Is)'},
    {l: 'Corrimiento lateral con β = 0°', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uy'}, t: '0'},
    {l: 'Descenso con β = 45°', u: 'mm', ref: {k: 'disp', n: 4, d: 'Uz'}, t: '-P*1000*L^3/(6*E)*(1/Is+1/Iw)'},
    {l: 'Corrimiento lateral con β = 45°', u: 'mm', ref: {k: 'disp', n: 4, d: 'Uy'}, t: 'P*1000*L^3/(6*E)*(1/Iw-1/Is)', abs: 1},
    {l: 'Descenso con β = 90° (eje débil)', u: 'mm', ref: {k: 'disp', n: 6, d: 'Uz'}, t: '-P*1000*L^3/(3*E*Iw)'},
    {l: 'Corrimiento lateral con β = 90°', u: 'mm', ref: {k: 'disp', n: 6, d: 'Uy'}, t: '0'}]
});
BENCH.push({
  id: 'C16', grupo: 'clasico', titulo: 'Voladizo inclinado 30° con carga vertical', fuente: SRC_CL,
  enunciado: 'Barra UPN 160 de 3,00 m empotrada en el origen e inclinada 30° sobre la horizontal en el plano XZ, con 10 kN verticales hacia abajo en la punta. Descompuesta la carga en axil (P·sen θ, compresión) y transversal (P·cos θ), el desplazamiento de la punta se proyecta a ejes globales.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 3000, 'mm', 'Largo'], ['ang', 30, '°', 'Inclinación sobre la horizontal'], ['P', 10, 'kN', 'Carga vertical'], ['A', 2400, 'mm²', 'Área UPN 160'], ['I', 9250000, 'mm⁴', 'Ix UPN 160 (tabla: 925 cm⁴)'],
    ['th', 'ang*PI()/180', 'rad', 'Inclinación'], ['c', 'COS(th)', '', 'cos θ'], ['s', 'SIN(th)', '', 'sen θ'], ['ua', '-P*1000*s*L/(E*A)', 'mm', 'Acortamiento axil de la punta'], ['ut', '-P*1000*c*L^3/(3*E*I)', 'mm', 'Flecha transversal de la punta']],
  model: p => ({nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L * p.c, 0, p.L * p.s, null, {D: [0, 0, -p.P]})], members: [BM(1, 1, 2, 'UPN 160')]}),
  checks: [
    {l: 'Desplazamiento horizontal de la punta', u: 'mm', ref: {k: 'disp', n: 2, d: 'Ux'}, t: 'ua*c-ut*s'},
    {l: 'Desplazamiento vertical de la punta', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: 'ua*s+ut*c'},
    {l: 'Esfuerzo axil (compresión −)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-P*s'},
    {l: 'Corte transversal', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'Vy'}, t: 'P*c', abs: 1},
    {l: 'Momento en el empotramiento', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: 'P*L*c/1000', abs: 1},
    {l: 'Reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P'},
    {l: 'Momento de reacción alrededor de Y', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'P*L*c/1000', abs: 1}]
});
BENCH.push({
  id: 'C17', grupo: 'clasico', titulo: 'Peso propio del perfil', fuente: SRC_CL,
  enunciado: 'Viga IPE 200 de 6,00 m biapoyada, solo con su peso propio (22,4 kg/m, g = 9,80665 m/s²). El programa suma el peso del perfil al caso D. Se verifican reacciones, flecha, momento y el peso total en kg.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 6000, 'mm', 'Luz'], ['kg', 22.4, 'kg/m', 'Masa del IPE 200'], ['g', 9.80665, 'm/s²', 'Gravedad'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'], ['w', 'kg*g/1000', 'kN/m', 'Peso propio']],
  model: p => ({settings: {selfWeight: true}, nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200')]}),
  checks: [
    {l: 'Reacción en el apoyo A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'w*L/2/1000'},
    {l: 'Flecha en el centro', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-5*w*L^4/(384*E*I)'},
    {l: 'Momento en el centro', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'w*L^2/8/1000000', abs: 1},
    {l: 'Peso total de la barra', u: 'kg', ref: {k: 'weight'}, t: 'kg*L/1000'}]
});

// js/bench/ejercicios_2_perfiles.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EJERCICIOS · parte 2: verificación de perfiles (CIRSOC 301-2005 / AISC-LRFD 1999)
     A05–A09  problemas con resultado publicado (ejemplos INTI-CIRSOC y apuntes de la Univ. de Michigan)
     F01–F03  fórmulas del Reglamento recalculadas aparte (confirman la implementación, no son un libro)
   ════════════════════════════════════════════════════════════════════════════ */
const SRC_INTI = {t: 'INTI-CIRSOC · «Ejemplos de aplicación del Reglamento CIRSOC 301-EL» (Ejemplos 4, 5 y 6)', url: 'https://www.inti.gob.ar/assets/uploads/files/cirsoc/EJEMPLOS%202/EJEMPLOS%202.2/1_%20ejemplos_301.pdf'};
const SRC_MSU = {t: 'Michigan State Univ., CE 405 «Design of Steel Structures», cap. 3 «Compression members» (ejemplos 3.2 y 3.4, AISC-LRFD 1999)', url: 'https://www.egr.msu.edu/~harichan/classes/ce405/chap3.pdf'};
const SRC_REG = {t: 'Fórmulas del Reglamento CIRSOC 301-2005 (capítulos D, E, F, H) recalculadas aparte; no provienen de un ejemplo publicado'};
const KIP = 4.4482216, KSI = 6.894757, IN = 25.4;       // kN por kip · MPa por ksi · mm por pulgada
// perfil W de tabla AISC (pulgadas) → especificación del programa (cm, cm², cm³, cm⁴)
const wSpec = (d, bf, tw, tf, A, Ix, Iy, Sx, Sy, J) => ({type: 'I', h: d * IN, b: bf * IN, tw: tw * IN, tf: tf * IN, A: A * 6.4516, Is: Ix * 41.62314, Iw: Iy * 41.62314, Ss: Sx * 16.387064, Sw: Sy * 16.387064, kg: 0, J: J * 41.62314});
// constantes del perfil I de catálogo y las derivadas con las hipótesis del programa
const secChain = (h, b, tw, tf, A, Is, Iw, Ss, Sw, nombre) => [
  ['h', h, 'mm', nombre + ': altura'], ['b', b, 'mm', 'Ancho de ala'], ['tw', tw, 'mm', 'Espesor de alma'], ['tf', tf, 'mm', 'Espesor de ala'],
  ['A', A, 'mm²', 'Área'], ['Is', Is, 'mm⁴', 'Inercia, eje fuerte (tabla)'], ['Iw', Iw, 'mm⁴', 'Inercia, eje débil (tabla)'], ['Ss', Ss, 'mm³', 'Módulo resistente fuerte (tabla)'], ['Sw', Sw, 'mm³', 'Módulo resistente débil (tabla)'],
  ['J', '(2*b*tf^3+(h-2*tf)*tw^3)/3*1.3', 'mm⁴', 'Constante de torsión (aproximación del programa para perfiles I laminados)'],
  ['Cw', 'Iw*(h-tf)^2/4', 'mm⁶', 'Constante de alabeo (Iw·(h−tf)²/4)'],
  ['Zs', 'MIN(b*tf*(h-tf)+tw*(h-2*tf)^2/4,1.5*Ss)', 'mm³', 'Módulo plástico fuerte (geometría simplificada, tope 1,5·Ss)'],
  ['Zw', 'MIN(tf*b^2/2+(h-2*tf)*tw^2/4,1.5*Sw)', 'mm³', 'Módulo plástico débil (tope 1,5·Sw)'],
  ['rs', 'SQRT(Is/A)', 'mm', 'Radio de giro fuerte'], ['rw', 'SQRT(Iw/A)', 'mm', 'Radio de giro débil'], ['r02', '(Is+Iw)/A', 'mm²', 'Radio polar al cuadrado (sección doblemente simétrica)']];
const IPE200 = () => secChain(200, 100, 5.6, 8.5, 2850, 19430000, 1420000, 194000, 28500, 'IPE 200');
const IPE300 = () => secChain(300, 150, 7.1, 10.7, 5380, 83560000, 6040000, 557000, 80500, 'IPE 300');
// resistencia a compresión (CIRSOC 301 cap. E · AISC-LRFD 1999, φc = 0,85) para longitudes efectivas kls, klw
const colChain = (k, kls, klw) => [
  ['kls' + k, kls, 'mm', 'Longitud efectiva, pandeo en el eje fuerte'], ['klw' + k, klw, 'mm', 'Longitud efectiva, pandeo en el eje débil'],
  ['Fes' + k, 'PI()^2*E/(kls' + k + '/rs)^2', 'MPa', 'Tensión de Euler, eje fuerte'], ['Few' + k, 'PI()^2*E/(klw' + k + '/rw)^2', 'MPa', 'Tensión de Euler, eje débil'],
  ['Fez' + k, '(PI()^2*E*Cw/klw' + k + '^2+G*J)/(A*r02)', 'MPa', 'Tensión de pandeo torsional'],
  ['Fe' + k, 'MIN(Fes' + k + ',Few' + k + ',Fez' + k + ')', 'MPa', 'Tensión elástica crítica (la menor)'],
  ['lc' + k, 'SQRT(Fy/Fe' + k + ')', '', 'Esbeltez adimensional λc'],
  ['Fcr' + k, 'IF(lc' + k + '<=1.5,0.658^(lc' + k + '^2),0.877/lc' + k + '^2)*Fy', 'MPa', 'Tensión crítica Fcr'],
  ['phiPc' + k, '0.85*A*Fcr' + k + '/1000', 'kN', 'Resistencia de diseño a compresión φc·Pn']];
// flexión: Mp, Lp, Lr (CIRSOC 301 cap. F · AISC-LRFD 1999, φb = 0,90, Cb = 1)
const flexChain = () => [
  ['Mp', 'Fy*Zs', 'N·mm', 'Momento plástico Mp = Fy·Zs'], ['Lp', '1.76*rw*SQRT(E/Fy)', 'mm', 'Longitud límite plástica Lp = 1,76·rw·√(E/Fy)'], ['FL', 'Fy-69', 'MPa', 'FL = Fy − 69 MPa'],
  ['X1', 'PI()/Ss*SQRT(E*G*J*A/2)', 'MPa', 'Coeficiente X1'], ['X2', '4*Cw/Iw*(Ss/(G*J))^2', '1/MPa²', 'Coeficiente X2'],
  ['Lr', 'rw*X1/FL*SQRT(1+SQRT(1+X2*FL^2))', 'mm', 'Longitud límite inelástica Lr'], ['Mr', 'FL*Ss', 'N·mm', 'Momento Mr = FL·Ss']];
const MnExpr = k => 'IF(Lb' + k + '<=Lp,Mp,IF(Lb' + k + '<=Lr,MIN(Mp,Mp-(Mp-Mr)*(Lb' + k + '-Lp)/(Lr-Lp)),MIN(Mp,PI()/Lb' + k + '*SQRT(E*Iw*G*J+(PI()*E/Lb' + k + ')^2*Iw*Cw))))';
const flexBeam = (k, Lb) => [['Lb' + k, Lb, 'mm', 'Longitud sin arriostrar'], ['Mn' + k, MnExpr(k), 'N·mm', 'Resistencia nominal Mn según el régimen'], ['phiMn' + k, '0.9*Mn' + k + '/1000000', 'kN·m', 'Resistencia de diseño φb·Mn']];

/* ───────────── A05 · tracción: ejemplo 4 INTI-CIRSOC (IPB 120) ───────────── */
BENCH.push({
  id: 'A05', grupo: 'apuntes', titulo: 'Barra traccionada IPB 120: resistencia por fluencia (ejemplo INTI-CIRSOC 4)', fuente: SRC_INTI, tol: 1e-3,
  enunciado: 'Barra de acero F-24 (Fy = 235 MPa) con perfil IPB 120 (A = 34,0 cm²), L = 9,00 m y tracción mayorada Tu = 500 kN. El ejemplo publica la resistencia de diseño por fluencia de la sección bruta φt·Pn = 719 kN (φt = 0,90). Se comprueba además el axil y la relación de uso Tu/φt·Pn.',
  perfil: 'IPB 120 (tabla): h = 120 mm, b = 120 mm, tw = 6,5 mm, tf = 11 mm, A = 34,0 cm², Ix = 864 cm⁴, Iy = 318 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['Fy', 235, 'MPa', 'Tensión de fluencia F-24'], ['A', 3400, 'mm²', 'Área bruta IPB 120'], ['L', 9000, 'mm', 'Largo de la barra'], ['Tu', 500, 'kN', 'Tracción mayorada (publicada)'],
    ['phiPt', '0.9*Fy*A/1000', 'kN', 'φt·Pn = 0,90·Fy·Ag']],
  model: p => ({customSections: {'IPB 120': {type: 'I', h: 120, b: 120, tw: 6.5, tf: 11, A: 34.0, Is: 864, Iw: 318, Ss: 144, Sw: 52.9, kg: 26.7, J: 13.84}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL, {D: [p.Tu, 0, 0]})], members: [BM(1, 1, 2, 'IPB 120')],
    combos: [{n: 'C1: Tu mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Resistencia de diseño por fluencia φt·Pn (publicada)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPt'}, t: '719', pub: 1, tol: 1e-3, note: 'La fuente redondea a 719 kN; la fórmula da 719,1 kN.'},
    {l: 'Resistencia de diseño φt·Pn (fórmula 0,90·Fy·Ag)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPt'}, t: 'phiPt'},
    {l: 'Esfuerzo axil en la barra (tracción +)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: 'Tu'},
    {l: 'Reacción horizontal en el apoyo fijo', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: '-Tu'},
    {l: 'Relación de uso Tu / φt·Pn', u: '', ref: {k: 'util', m: 1}, t: 'Tu/phiPt'}]
});

/* ───────────── A06 · viga IPE 500: ejemplo 5 INTI-CIRSOC (esfuerzos de cálculo) ───────────── */
BENCH.push({
  id: 'A06', grupo: 'apuntes', titulo: 'Viga IPE 500 de 16 m: esfuerzos mayorados 1,2D + 1,6L (ejemplo INTI-CIRSOC 5)', fuente: SRC_INTI, tol: 1e-4,
  enunciado: 'Viga biapoyada de 16,00 m con D = 2 kN/m y L = 5 kN/m. El ejemplo calcula qu = 1,2D + 1,6L = 10,4 kN/m, el momento máximo Mu = 332,8 kN·m, y en la sección del empalme (x = 4 m) un momento Mf + Mw = 194,17 + 55,43 = 249,60 kN·m y un corte Vu = 41,6 kN. Se verifica que el programa, con la combinación U2, entregue los mismos esfuerzos.',
  perfil: 'IPE 500 (tabla): h = 500 mm, b = 200 mm, tw = 10,2 mm, tf = 16 mm, A = 116 cm², Ix = 48 200 cm⁴, Iy = 2 140 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 16000, 'mm', 'Luz'], ['qD', 2, 'kN/m', 'Carga permanente'], ['qL', 5, 'kN/m', 'Sobrecarga'], ['xs', 4000, 'mm', 'Sección del empalme'],
    ['qu', '1.2*qD+1.6*qL', 'kN/m', 'Carga mayorada'], ['Mu', 'qu*L^2/8/1000000', 'kN·m', 'Momento máximo'], ['Ms', 'qu*xs*(L-xs)/2/1000000', 'kN·m', 'Momento en x = 4 m'], ['Vs', 'qu*(L/2-xs)/1000', 'kN', 'Corte en x = 4 m']],
  model: p => ({customSections: {'IPE 500': {type: 'I', h: 500, b: 200, tw: 10.2, tf: 16, A: 116, Is: 48200, Iw: 2140, Ss: 1930, Sw: 214, kg: 90.7, J: 89.3}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 500', {q: {D: p.qD, L: p.qL}})],
    combos: [{n: 'U2: 1,2D+1,6L', f: [1.2, 1.6, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Momento máximo Mu en el centro (publicado)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: '332.8', pub: 1, abs: 1},
    {l: 'Momento en la sección del empalme, Mf + Mw (publicado)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .25, f: 'Mz'}, t: '194.17+55.43', pub: 1, abs: 1},
    {l: 'Corte Vu en la sección del empalme (publicado)', u: 'kN', ref: {k: 'mem', m: 1, x: .25, f: 'Vy'}, t: '41.6', pub: 1, abs: 1},
    {l: 'Reacción en el apoyo A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'qu*L/2000'}]
});

/* ───────────── A07 · viga PNI 300: ejemplo 6 INTI-CIRSOC (momento plástico) ───────────── */
BENCH.push({
  id: 'A07', grupo: 'apuntes', titulo: 'Viga PNI 300 de 10 m: momento mayorado y resistencia φb·Mp (ejemplo INTI-CIRSOC 6)', fuente: SRC_INTI, tol: 1e-4,
  enunciado: 'Viga biapoyada de 10,00 m con carga mayorada qu = 22 kN/m, de acero F-24 (Fy = 235 MPa), con arriostramiento lateral continuo (Lb ≤ Lp). El ejemplo publica Mu = 275 kN·m y la resistencia del perfil solo φb·Mp = 161,16 kN·m (Zx de tabla = 762 cm³), por lo que agrega una platabanda (esa parte no puede reproducirse con el modelo de secciones del programa). El programa estima el módulo plástico con la geometría simplificada de la sección, que en el PNI 300 resulta 0,8 % mayor que el de tabla; por eso la fila de resistencia admite 1,5 %.',
  perfil: 'PNI 300 (IPN 300, tabla): h = 300 mm, b = 125 mm, tw = 10,8 mm, tf = 16,2 mm (medio), A = 69,1 cm², Ix = 9 800 cm⁴, Iy = 451 cm⁴, Wx = 653 cm³, Zx = 762 cm³.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['Fy', 235, 'MPa', 'Tensión de fluencia F-24'], ['L', 10000, 'mm', 'Luz'], ['qu', 22, 'kN/m', 'Carga mayorada (publicada)'], ['Mu', 'qu*L^2/8/1000000', 'kN·m', 'Momento máximo'],
    ['Zx', 762000, 'mm³', 'Módulo plástico de tabla'], ['phiMp', '0.9*Fy*Zx/1000000', 'kN·m', 'φb·Mp con el Zx de tabla (publicado: 161,16)']],
  model: p => ({customSections: {'PNI 300': {type: 'I', h: 300, b: 125, tw: 10.8, tf: 16.2, A: 69.1, Is: 9800, Iw: 451, Ss: 653, Sw: 72.2, kg: 54.2}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'PNI 300', {q: {D: p.qu}, lb: 500})],
    combos: [{n: 'C1: qu mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Momento máximo Mu (publicado)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: '275', pub: 1, abs: 1},
    {l: 'Corte máximo en el apoyo', u: 'kN', ref: {k: 'mem', m: 1, x: 0, f: 'Vy'}, t: 'qu*L/2000', abs: 1},
    {l: 'Resistencia de diseño φb·Mp del perfil solo (publicada)', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMs'}, t: '161.16', pub: 1, tol: 1.5e-2, note: 'El programa calcula Zx = 768 cm³ con la geometría simplificada (tabla: 762 cm³): +0,8 %, del lado inseguro pero dentro de la tolerancia.'},
    {l: 'Relación de uso Mu / φb·Mp (publicada 275/161,16)', u: '', ref: {k: 'util', m: 1}, t: '275/161.16', pub: 1, tol: 1.5e-2, note: 'Mayor que 1: el perfil solo no alcanza, por eso el ejemplo agrega la platabanda.'}]
});

/* ───────────── A08 · columna W14×74: ejemplo 3.2 (Univ. de Michigan) ───────────── */
BENCH.push({
  id: 'A08', grupo: 'apuntes', titulo: 'Columna W14×74, A36, KL = 20 ft: resistencia a compresión (apuntes MSU, ej. 3.2)', fuente: SRC_MSU, tol: 1e-3,
  enunciado: 'Columna W14×74 de acero A36 (Fy = 36 ksi, E = 29 000 ksi) con KL = 20 ft = 240 in en ambos ejes. El ejemplo obtiene KL/ry = 240/2,48 = 96,77 (gobierna el eje débil), λc = 1,085, Fcr = 21,99 ksi y φcPn = 408 kip con φc = 0,85, que es el factor del CIRSOC 301-2005. Se ingresa la sección con los datos de la tabla AISC (las inercias son coherentes con los radios de giro publicados) y se compara.',
  perfil: 'W14×74 (tabla AISC): d = 14,17 in, bf = 10,07 in, tw = 0,450 in, tf = 0,785 in, A = 21,8 in², Ix = 796 in⁴, Iy = 134 in⁴, rx = 6,04 in, ry = 2,48 in, J = 3,87 in⁴. Unidades del programa: mm, N, MPa (1 in = 25,4 mm; 1 ksi = 6,894757 MPa; 1 kip = 4,4482216 kN).',
  params: [['E_ksi', 29000, 'ksi', 'Módulo elástico'], ['Fy_ksi', 36, 'ksi', 'Tensión de fluencia A36'], ['A_in2', 21.8, 'in²', 'Área'], ['rx', 6.04, 'in', 'Radio de giro fuerte (tabla)'], ['ry', 2.48, 'in', 'Radio de giro débil (tabla)'],
    ['KL', 240, 'in', 'Longitud efectiva en ambos ejes (publicada)'], ['Pu_kip', 300, 'kip', 'Carga axil mayorada adoptada para la relación de uso'],
    ['E', 'E_ksi*6.894757', 'MPa', 'Módulo elástico en MPa'], ['Fy', 'Fy_ksi*6.894757', 'MPa', 'Fluencia en MPa'], ['G', 'E/2.6', 'MPa', 'Módulo de corte (no interviene en el resultado)'],
    ['KLmm', 'KL*25.4', 'mm', 'Longitud efectiva en mm'], ['Pu', 'Pu_kip*4.4482216', 'kN', 'Carga axil mayorada'],
    ['lamy', 'KL/ry/PI()*SQRT(Fy_ksi/E_ksi)', '', 'λc del eje débil (publicado: 1,085)'], ['lamx', 'KL/rx/PI()*SQRT(Fy_ksi/E_ksi)', '', 'λc del eje fuerte'], ['lamc', 'MAX(lamx,lamy)', '', 'λc gobernante'],
    ['Fcr', 'IF(lamc<=1.5,0.658^(lamc^2),0.877/lamc^2)*Fy_ksi', 'ksi', 'Tensión crítica (publicada: 21,99 ksi)'], ['phiPn', '0.85*A_in2*Fcr', 'kip', 'φc·Pn recalculado con la fórmula del libro'], ['phiPnkN', 'phiPn*4.4482216', 'kN', 'φc·Pn en kN']],
  model: p => ({customSections: {'W14x74': wSpec(14.17, 10.07, 0.450, 0.785, 21.8, 796, 134, 112, 26.6, 3.87)}, settings: {E: p.E, G: p.G, Fy: p.Fy},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, 0, 0, p.KLmm, null, {D: [0, 0, -p.Pu]})], members: [BM(1, 1, 2, 'W14x74', {kls: p.KLmm, klw: p.KLmm})],
    combos: [{n: 'C1: Pu mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Esbeltez KL/r gobernante (publicada 96,77)', u: '', ref: {k: 'cap', m: 1, f: 'lam'}, t: '96.77', pub: 1, tol: 1e-3},
    {l: 'Resistencia de diseño a compresión φc·Pn (publicada 408 kip)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: '408*4.4482216', pub: 1, tol: 5e-3, note: 'El libro redondea (21,8 × 21,99 × 0,85 = 407,5 kip).'},
    {l: 'φc·Pn recalculado con la fórmula del libro', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: 'phiPnkN', tol: 2e-3},
    {l: 'Esfuerzo axil en la columna (compresión −)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-Pu'},
    {l: 'Relación de uso Pu / φc·Pn', u: '', ref: {k: 'util', m: 1}, t: 'Pu/phiPnkN', tol: 2e-3}]
});

/* ───────────── A09 · columna W14×132: ejemplo 3.4 (Univ. de Michigan) ───────────── */
BENCH.push({
  id: 'A09', grupo: 'apuntes', titulo: 'Columna W14×132, Fy = 50 ksi, longitudes distintas por eje (apuntes MSU, ej. 3.4)', fuente: SRC_MSU, tol: 1e-3,
  enunciado: 'Columna W14×132 de acero A992 (Fy = 50 ksi) con KxLx = 30 ft y KyLy = 15 ft (arriostrada a media altura en el eje débil). El ejemplo obtiene KxLx/rx = 57,32 y KyLy/ry = 47,87, gobierna el eje fuerte y la tabla da φcPn ≈ 1 300 kip. Comprueba que el programa asigne cada longitud efectiva al eje correcto.',
  perfil: 'W14×132 (tabla AISC): d = 14,66 in, bf = 14,725 in, tw = 0,645 in, tf = 1,030 in, A = 38,8 in², Ix = 1 530 in⁴, Iy = 548 in⁴, rx = 6,28 in, ry = 3,76 in, J = 12,3 in⁴.',
  params: [['E_ksi', 29000, 'ksi', 'Módulo elástico'], ['Fy_ksi', 50, 'ksi', 'Tensión de fluencia'], ['A_in2', 38.8, 'in²', 'Área'], ['rx', 6.28, 'in', 'Radio de giro fuerte (tabla)'], ['ry', 3.76, 'in', 'Radio de giro débil (tabla)'],
    ['KxLx', 360, 'in', 'Longitud efectiva, eje fuerte (30 ft)'], ['KyLy', 180, 'in', 'Longitud efectiva, eje débil (15 ft)'], ['Pu_kip', 1000, 'kip', 'Carga axil mayorada adoptada para la relación de uso'],
    ['E', 'E_ksi*6.894757', 'MPa', 'Módulo elástico en MPa'], ['Fy', 'Fy_ksi*6.894757', 'MPa', 'Fluencia en MPa'], ['G', 'E/2.6', 'MPa', 'Módulo de corte (no interviene en el resultado)'],
    ['Kxmm', 'KxLx*25.4', 'mm', 'Longitud efectiva fuerte en mm'], ['Kymm', 'KyLy*25.4', 'mm', 'Longitud efectiva débil en mm'], ['Pu', 'Pu_kip*4.4482216', 'kN', 'Carga axil mayorada'],
    ['lamx', 'KxLx/rx', '', 'KL/r eje fuerte (publicado: 57,32)'], ['lamy', 'KyLy/ry', '', 'KL/r eje débil (publicado: 47,87)'], ['lamc', 'MAX(lamx,lamy)/PI()*SQRT(Fy_ksi/E_ksi)', '', 'λc gobernante'],
    ['Fcr', 'IF(lamc<=1.5,0.658^(lamc^2),0.877/lamc^2)*Fy_ksi', 'ksi', 'Tensión crítica'], ['phiPn', '0.85*A_in2*Fcr', 'kip', 'φc·Pn recalculado con la fórmula del libro'], ['phiPnkN', 'phiPn*4.4482216', 'kN', 'φc·Pn en kN']],
  model: p => ({customSections: {'W14x132': wSpec(14.66, 14.725, 0.645, 1.030, 38.8, 1530, 548, 209, 74.5, 12.3)}, settings: {E: p.E, G: p.G, Fy: p.Fy},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, 0, 0, p.Kxmm, null, {D: [0, 0, -p.Pu]})], members: [BM(1, 1, 2, 'W14x132', {kls: p.Kxmm, klw: p.Kymm})],
    combos: [{n: 'C1: Pu mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Esbeltez del eje fuerte KxLx/rx (publicada 57,32), la mayor', u: '', ref: {k: 'cap', m: 1, f: 'lam'}, t: '57.32', pub: 1, tol: 1e-3},
    {l: 'Resistencia de diseño a compresión φc·Pn (publicada ≈ 1 300 kip)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: '1300*4.4482216', pub: 1, tol: 5e-3, note: 'El libro toma 1 300 kip de la tabla (por fórmula: 1 296,7 kip).'},
    {l: 'φc·Pn recalculado con la fórmula del libro', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: 'phiPnkN', tol: 2e-3},
    {l: 'Relación de uso Pu / φc·Pn', u: '', ref: {k: 'util', m: 1}, t: 'Pu/phiPnkN', tol: 2e-3}]
});

/* ───────────── F01 · compresión de columnas IPE 200 (fórmulas del Reglamento) ───────────── */
BENCH.push({
  id: 'F01', grupo: 'reglamento', titulo: 'Compresión: columnas IPE 200 con distintas longitudes efectivas por eje', fuente: SRC_REG, tol: 1e-4,
  enunciado: 'Tres columnas IPE 200 (Fy = 235 MPa) con carga axil mayorada de 100 kN: A) KL = 3,0 m en ambos ejes; B) KL = 4,5 m; C) pandeo fuerte con KLs = 7,0 m y débil con KLw = 1,5 m (gobierna el eje fuerte). Resistencia φc·Pn = 0,85·A·Fcr con Fcr = 0,658^(λc²)·Fy si λc ≤ 1,5 o 0,877·Fy/λc² si λc > 1,5, y Fe = menor de los pandeos flexional y torsional (CIRSOC 301-2005 cap. E, AISC-LRFD 1999). Es un recálculo independiente de las fórmulas: confirma que el programa las implementa bien, no que el Reglamento esté bien interpretado.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia F-24'], ['Pu', 100, 'kN', 'Carga axil mayorada en cada columna']]
    .concat(IPE200(), colChain('A', 3000, 3000), colChain('B', 4500, 4500), colChain('C', 7000, 1500)),
  model: p => ({settings: {E: p.E, G: p.G, Fy: p.Fy},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, 0, 0, 3000, null, {D: [0, 0, -p.Pu]}), BN(3, 1000, 0, 0, SUP_FIX), BN(4, 1000, 0, 4500, null, {D: [0, 0, -p.Pu]}), BN(5, 2000, 0, 0, SUP_FIX), BN(6, 2000, 0, 7000, null, {D: [0, 0, -p.Pu]})],
    members: [BM(1, 1, 2, 'IPE 200', {kls: p.klsA, klw: p.klwA}), BM(2, 3, 4, 'IPE 200', {kls: p.klsB, klw: p.klwB}), BM(3, 5, 6, 'IPE 200', {kls: p.klsC, klw: p.klwC})],
    combos: [{n: 'C1: Pu mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'A) φc·Pn con KL = 3,0 m (gobierna el eje débil)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: 'phiPcA'},
    {l: 'B) φc·Pn con KL = 4,5 m (gobierna el eje débil)', u: 'kN', ref: {k: 'cap', m: 2, f: 'phiPc'}, t: 'phiPcB'},
    {l: 'C) φc·Pn con KLs = 7,0 m y KLw = 1,5 m (gobierna el eje fuerte)', u: 'kN', ref: {k: 'cap', m: 3, f: 'phiPc'}, t: 'phiPcC'},
    {l: 'A) Relación de uso Pu / φc·Pn', u: '', ref: {k: 'util', m: 1}, t: 'Pu/phiPcA'},
    {l: 'B) Relación de uso Pu / φc·Pn', u: '', ref: {k: 'util', m: 2}, t: 'Pu/phiPcB'},
    {l: 'C) Relación de uso Pu / φc·Pn', u: '', ref: {k: 'util', m: 3}, t: 'Pu/phiPcC'},
    {l: 'Esfuerzo axil en la columna A (compresión −)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-Pu'}]
});

/* ───────────── F02 · flexión con pandeo lateral-torsional, IPE 300 ───────────── */
BENCH.push({
  id: 'F02', grupo: 'reglamento', titulo: 'Flexión con pandeo lateral-torsional: IPE 300 en los tres regímenes', fuente: SRC_REG, tol: 1e-4,
  enunciado: 'Tres vigas IPE 300 biapoyadas con carga uniforme mayorada y longitud sin arriostrar igual a la luz: 1,2 m (Lb ≤ Lp: plástica), 3,5 m (Lp < Lb ≤ Lr: inelástica) y 9,0 m (Lb > Lr: elástica). Resistencia φb·Mn = 0,90·Mn con Cb = 1, Lp = 1,76·rw·√(E/Fy), FL = Fy − 69 MPa, X1, X2 y Lr del CIRSOC 301-2005 cap. F (AISC-LRFD 1999). Se verifican también el momento resistente de eje débil φb·Mw, la resistencia a corte φv·Vn = 0,90·0,6·Fy·h·tw y la relación de uso. Recálculo independiente de las fórmulas del Reglamento.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia F-24'], ['q1', 300, 'kN/m', 'Carga mayorada, viga 1'], ['q2', 50, 'kN/m', 'Carga mayorada, viga 2'], ['q3', 4, 'kN/m', 'Carga mayorada, viga 3']]
    .concat(IPE300(), flexChain(), flexBeam(1, 1200), flexBeam(2, 3500), flexBeam(3, 9000), [
      ['phiMw', '0.9*Fy*Zw/1000000', 'kN·m', 'Resistencia de diseño de eje débil φb·Mw = 0,90·Fy·Zw'], ['phiVs', '0.9*0.6*Fy*h*tw/1000', 'kN', 'Resistencia a corte φv·Vn'],
      ['u1', 'MAX(q1*Lb1^2/8/1000000/phiMn1,q1*Lb1/2/1000/phiVs)', '', 'Relación de uso viga 1 (corte gobierna)'], ['u2', 'MAX(q2*Lb2^2/8/1000000/phiMn2,q2*Lb2/2/1000/phiVs)', '', 'Relación de uso viga 2'], ['u3', 'MAX(q3*Lb3^2/8/1000000/phiMn3,q3*Lb3/2/1000/phiVs)', '', 'Relación de uso viga 3']]),
  model: p => ({settings: {E: p.E, G: p.G, Fy: p.Fy, cbMode: 'unit'},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.Lb1, 0, 0, SUP_ROL), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.Lb2, 1000, 0, SUP_ROL), BN(5, 0, 2000, 0, SUP_PIN), BN(6, p.Lb3, 2000, 0, SUP_ROL)],
    members: [BM(1, 1, 2, 'IPE 300', {q: {D: p.q1}}), BM(2, 3, 4, 'IPE 300', {q: {D: p.q2}}), BM(3, 5, 6, 'IPE 300', {q: {D: p.q3}})],
    combos: [{n: 'C1: carga mayorada', f: [1, 0, 0, 0], type: 'ULS'}]}),
  checks: [
    {l: 'Longitud límite plástica Lp', u: 'm', ref: {k: 'cap', m: 1, f: 'Lp'}, t: 'Lp/1000'},
    {l: 'Longitud límite inelástica Lr', u: 'm', ref: {k: 'cap', m: 1, f: 'Lr'}, t: 'Lr/1000'},
    {l: 'Viga 1 (Lb ≤ Lp): φb·Mn = φb·Mp', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMs'}, t: 'phiMn1'},
    {l: 'Viga 2 (Lp < Lb ≤ Lr): φb·Mn inelástico', u: 'kN·m', ref: {k: 'cap', m: 2, f: 'phiMs'}, t: 'phiMn2'},
    {l: 'Viga 3 (Lb > Lr): φb·Mn elástico', u: 'kN·m', ref: {k: 'cap', m: 3, f: 'phiMs'}, t: 'phiMn3'},
    {l: 'Momento resistente de eje débil φb·Mw', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMw'}, t: 'phiMw'},
    {l: 'Resistencia a corte φv·Vn', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiVs'}, t: 'phiVs'},
    {l: 'Viga 1: relación de uso', u: '', ref: {k: 'util', m: 1}, t: 'u1'},
    {l: 'Viga 2: relación de uso', u: '', ref: {k: 'util', m: 2}, t: 'u2'},
    {l: 'Viga 3: relación de uso', u: '', ref: {k: 'util', m: 3}, t: 'u3'}]
});

/* ───────────── F03 · flexocompresión (interacción H1-1a / H1-1b) ───────────── */
BENCH.push({
  id: 'F03', grupo: 'reglamento', titulo: 'Flexocompresión biaxial: ecuaciones de interacción H1-1a y H1-1b', fuente: SRC_REG, tol: 1e-4,
  enunciado: 'Dos barras IPE 200 de 4,00 m biapoyadas, con carga transversal vertical de 3 kN/m (eje fuerte) y horizontal de 0,4 kN/m (eje débil), K = 1 y Lb = 4,00 m. Barra A con compresión Pu = 80 kN (Pu/φc·Pn ≥ 0,2: ecuación H1-1a) y barra B con Pu = 15 kN (< 0,2: ecuación H1-1b). Interacción: Pu/φcPn + 8/9·(Mus/φbMs + Muw/φbMw) ≤ 1 si Pu/φcPn ≥ 0,2; Pu/(2φcPn) + (Mus/φbMs + Muw/φbMw) ≤ 1 en caso contrario. Análisis de primer orden (el programa no amplifica por P-δ, y aquí tampoco se amplifica). Recálculo independiente de las fórmulas del Reglamento.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia F-24'], ['L', 4000, 'mm', 'Luz, KL y Lb'], ['q', 3, 'kN/m', 'Carga vertical (eje fuerte)'], ['qy', 0.4, 'kN/m', 'Carga horizontal (eje débil)'], ['PuA', 80, 'kN', 'Compresión barra A'], ['PuB', 15, 'kN', 'Compresión barra B']]
    .concat(IPE200(), colChain('', 'L', 'L'), flexChain(), flexBeam(1, 'L'), [
      ['phiMw', '0.9*Fy*Zw/1000000', 'kN·m', 'Resistencia de eje débil φb·Mw'], ['Mus', 'q*L^2/8/1000000', 'kN·m', 'Momento último de eje fuerte'], ['Muw', 'qy*L^2/8/1000000', 'kN·m', 'Momento último de eje débil'],
      ['mom', 'Mus/phiMn1+Muw/phiMw', '', 'Suma de las relaciones de momento'], ['rhoA', 'PuA/phiPc', '', 'Pu/φcPn barra A'], ['rhoB', 'PuB/phiPc', '', 'Pu/φcPn barra B'],
      ['rA', 'IF(rhoA>=0.2,rhoA+8/9*mom,rhoA/2+mom)', '', 'Relación de uso barra A'], ['rB', 'IF(rhoB>=0.2,rhoB+8/9*mom,rhoB/2+mom)', '', 'Relación de uso barra B']]),
  model: p => ({settings: {E: p.E, G: p.G, Fy: p.Fy, cbMode: 'unit'},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL, {D: [-p.PuA, 0, 0]}), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L, 1000, 0, SUP_ROL, {D: [-p.PuB, 0, 0]})],
    members: [BM(1, 1, 2, 'IPE 200', {q: {D: p.q, Wy: p.qy}}), BM(2, 3, 4, 'IPE 200', {q: {D: p.q, Wy: p.qy}})],
    combos: [{n: 'C1: D + Hy mayorados', f: [1, 0, 0, 1], type: 'ULS'}]}),
  checks: [
    {l: 'Resistencia a compresión φc·Pn (K = 1)', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: 'phiPc'},
    {l: 'Resistencia a flexión de eje fuerte φb·Ms (Lb = 4 m)', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMs'}, t: 'phiMn1'},
    {l: 'Resistencia a flexión de eje débil φb·Mw', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMw'}, t: 'phiMw'},
    {l: 'Momento de eje fuerte en la barra A', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'Mus', abs: 1},
    {l: 'Momento de eje débil en la barra A', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'My'}, t: 'Muw', abs: 1},
    {l: 'Esfuerzo axil en la barra A (compresión −)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-PuA'},
    {l: 'Barra A (Pu/φcPn ≥ 0,2): relación de uso H1-1a', u: '', ref: {k: 'util', m: 1}, t: 'rA'},
    {l: 'Barra B (Pu/φcPn < 0,2): relación de uso H1-1b', u: '', ref: {k: 'util', m: 2}, t: 'rB'}]
});

// js/bench/ejercicios_3_funciones_v2.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EJERCICIOS · parte 3: funciones nuevas de la versión 2
     N01–N04  cargas de barra (puntual, parcial, trapezoidal, temperatura)
     N05–N07  apoyos elásticos, asentamientos y uniones semirrígidas
     N08      deformación por corte (Timoshenko)
     N09      Cb real del diagrama de momentos
     N10      propiedades de secciones armadas
     N11–N12  pandeo local (recálculo del Reglamento)
     N13      segundo orden con solución exacta (viga-columna)
     N14      combinaciones con 0,9D, S, W y E
   Todos usan el modelo v2 (ver: 2) y las 11 acciones; las soluciones son cerradas y se escriben
   con la sintaxis de Excel igual que en las partes anteriores.
   ════════════════════════════════════════════════════════════════════════════ */
const SRC_CL3 = {t: 'Soluciones clásicas: Timoshenko «Resistencia de materiales» y «Theory of Elastic Stability» (Timoshenko & Gere), Roark «Formulas for Stress and Strain», método de pendiente-deflexión, Ghali & Neville «Structural Analysis» (efectos térmicos y asentamientos)'};
const SRC_REG3 = {t: 'Fórmulas del Reglamento CIRSOC 301-2005 / AISC-LRFD 1999 (apéndice B, caps. E y F) recalculadas aparte; no provienen de un ejemplo publicado. Las constantes están escritas de memoria: cotejarlas con el texto del Reglamento antes de usar el resultado para proyecto.'};
const H3 = {D: 'D'};
const NM = (id, x, y, z, sup, P, Mo) => { const n = BN(id, x, y, z, sup, P); if (Mo) n.Mo = Mo; return n; };
const SUP_XLINK = [0, 1, 1, 1, 1, 1];        // sólo Ux libre (resto empotrado): apoyo móvil de un empotramiento guiado

/* ───────────── N01 · carga puntual y momento puntual dentro del tramo ───────────── */
BENCH.push({
  id: 'N01', grupo: 'clasico', titulo: 'Carga y momento puntuales dentro del tramo (viga biapoyada, plano fuerte y débil)', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Cuatro vigas IPE 200 biapoyadas de 4,80 m con una acción puntual a 1,20 m del apoyo A, aplicada como carga de barra (no en un nudo): (1) carga vertical de 30 kN (flexión en el plano fuerte); (2) la misma carga en dirección horizontal (flexión en el plano débil, con Iy); (3) momento puntual de 20 kN·m alrededor del eje horizontal (plano fuerte); (4) momento puntual de 20 kN·m alrededor del eje vertical (plano débil). El programa divide el tramo internamente en la abscisa de la acción y obtiene el estado exacto de la solución de Euler-Bernoulli; se comparan reacciones, cortes, momentos y flechas.',
  perfil: 'IPE 200 (tabla): Ix = 1 943 cm⁴, Iy = 142 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 4800, 'mm', 'Luz'], ['a', 1200, 'mm', 'Distancia de la acción al apoyo A'], ['b', 'L-a', 'mm', 'Distancia de la acción al apoyo B'], ['P', 30, 'kN', 'Carga puntual'], ['M0', 20, 'kN·m', 'Momento puntual'],
    ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'], ['Iy', 1420000, 'mm⁴', 'Iy IPE 200']],
  model: p => ({ver: 2, nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L, 1000, 0, SUP_ROL), BN(5, 0, 2000, 0, SUP_PIN), BN(6, p.L, 2000, 0, SUP_ROL), BN(7, 0, 3000, 0, SUP_PIN), BN(8, p.L, 3000, 0, SUP_ROL)],
    members: [BM(1, 1, 2, 'IPE 200', {loads: [{k: 'P', c: 'D', dir: 'grav', a: p.a, F: p.P}]}), BM(2, 3, 4, 'IPE 200', {loads: [{k: 'P', c: 'D', dir: 'Y', a: p.a, F: p.P}]}),
      BM(3, 5, 6, 'IPE 200', {loads: [{k: 'M', c: 'D', dir: 'Y', a: p.a, M: p.M0}]}), BM(4, 7, 8, 'IPE 200', {loads: [{k: 'M', c: 'D', dir: 'Z', a: p.a, M: p.M0}]})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: '(1) Reacción en A = P·b/L', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P*b/L'},
    {l: '(1) Reacción en B = P·a/L', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: 'P*a/L'},
    {l: '(1) Corte entre A y la carga', u: 'kN', ref: {k: 'mem', m: 1, x: .1, f: 'Vy'}, t: 'P*b/L', abs: 1},
    {l: '(1) Corte entre la carga y B', u: 'kN', ref: {k: 'mem', m: 1, x: .9, f: 'Vy'}, t: 'P*a/L', abs: 1},
    {l: '(1) Momento bajo la carga = P·a·b/L', u: 'kN·m', ref: {k: 'mem', m: 1, x: .25, f: 'Mz'}, t: 'P*a*b/L/1000', abs: 1},
    {l: '(1) Flecha bajo la carga = P·a²·b²/(3·E·I·L)', u: 'mm', ref: {k: 'mem', m: 1, x: .25, f: 'vy'}, t: '-P*1000*a^2*b^2/(3*E*I*L)'},
    {l: '(1) Flecha a media luz (tramo de la derecha)', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-P*1000*a*(L-L/2)*(2*L*(L/2)-(L/2)^2-a^2)/(6*E*I*L)'},
    {l: '(1) Giro en A = P·b·(L²−b²)/(6·E·I·L)', u: 'rad', ref: {k: 'disp', n: 1, d: 'Ry'}, t: 'P*1000*b*(L^2-b^2)/(6*E*I*L)', abs: 1},
    {l: '(1) Giro en B = P·a·(L²−a²)/(6·E·I·L)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'P*1000*a*(L^2-a^2)/(6*E*I*L)', abs: 1},
    {l: '(2) Reacción horizontal en A = −P·b/L (se opone a la carga en +Y)', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fy'}, t: '-P*b/L'},
    {l: '(2) Momento débil bajo la carga = P·a·b/L', u: 'kN·m', ref: {k: 'mem', m: 2, x: .25, f: 'My'}, t: 'P*a*b/L/1000', abs: 1},
    {l: '(2) Flecha horizontal bajo la carga = P·a²·b²/(3·E·Iy·L)', u: 'mm', ref: {k: 'mem', m: 2, x: .25, f: 'vz'}, t: 'P*1000*a^2*b^2/(3*E*Iy*L)', abs: 1},
    {l: '(2) Flecha horizontal a media luz', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vz'}, t: 'P*1000*a*(L-L/2)*(2*L*(L/2)-(L/2)^2-a^2)/(6*E*Iy*L)', abs: 1},
    {l: '(3) Reacción vertical en A = −M0/L (momento +Y en el tramo)', u: 'kN', ref: {k: 'reac', n: 5, d: 'Fz'}, t: '-M0/(L/1000)'},
    {l: '(3) Momento a la izquierda del punto = M0·a/L', u: 'kN·m', ref: {k: 'mem', m: 3, x: .2, f: 'Mz'}, t: 'M0*(0.2*L)/L', abs: 1},
    {l: '(3) Momento a la derecha del punto = M0·b/L', u: 'kN·m', ref: {k: 'mem', m: 3, x: .6, f: 'Mz'}, t: 'M0*(L-0.6*L)/L', abs: 1},
    {l: '(3) Flecha bajo el momento = M0·a·b·(b−a)/(3·E·I·L)', u: 'mm', ref: {k: 'mem', m: 3, x: .25, f: 'vy'}, t: 'M0*1000000*a*b*(b-a)/(3*E*I*L)', abs: 1},
    {l: '(4) Reacción horizontal en A = +M0/L (momento +Z en el tramo)', u: 'kN', ref: {k: 'reac', n: 7, d: 'Fy'}, t: 'M0/(L/1000)'},
    {l: '(4) Momento débil a la izquierda = M0·a/L', u: 'kN·m', ref: {k: 'mem', m: 4, x: .2, f: 'My'}, t: 'M0*(0.2*L)/L', abs: 1},
    {l: '(4) Flecha horizontal bajo el momento = M0·a·b·(b−a)/(3·E·Iy·L)', u: 'mm', ref: {k: 'mem', m: 4, x: .25, f: 'vz'}, t: 'M0*1000000*a*b*(b-a)/(3*E*Iy*L)', abs: 1}]
});

/* ───────────── N02 · carga uniforme parcial ───────────── */
BENCH.push({
  id: 'N02', grupo: 'clasico', titulo: 'Carga uniforme parcial (viga biapoyada)', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Dos vigas IPE 200 biapoyadas de 6,00 m con una carga uniforme de 12 kN/m aplicada solo entre x = 0,50 m y x = 3,50 m (3,00 m de largo): la viga 1 con carga vertical (plano fuerte) y la viga 2 con la misma carga horizontal (plano débil, con Iy). Se comparan las reacciones, los cortes fuera de la zona cargada, el momento a media luz, el momento máximo (donde el corte se anula) y la flecha a media luz, obtenida integrando dos veces la ecuación del momento con funciones de singularidad.',
  perfil: 'IPE 200 (tabla): Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 6000, 'mm', 'Luz'], ['a', 500, 'mm', 'Inicio de la carga'], ['c', 3000, 'mm', 'Largo cargado'], ['w', 12, 'kN/m', 'Carga uniforme'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'], ['Iy', 1420000, 'mm⁴', 'Iy IPE 200'],
    ['R1', 'w*c*(L-a-c/2)/L', 'N', 'Reacción en A'], ['R2', 'w*c-R1', 'N', 'Reacción en B'], ['x0', 'a+R1/w', 'mm', 'Abscisa del momento máximo (V = 0)'],
    ['C1', '(-R1*L^3/6+w/24*(L-a)^4-w/24*MAX(L-a-c,0)^4)/L', 'N·mm²', 'Constante de integración de la elástica (v(L) = 0)']],
  model: p => ({ver: 2, nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L, 1000, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {loads: [{k: 'U', c: 'D', dir: 'grav', a: p.a, b: p.a + p.c, w1: p.w}]}), BM(2, 3, 4, 'IPE 200', {loads: [{k: 'U', c: 'D', dir: 'Y', a: p.a, b: p.a + p.c, w1: p.w}]})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: 'Reacción en A', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'R1/1000'},
    {l: 'Reacción en B', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: 'R2/1000'},
    {l: 'Corte antes de la zona cargada', u: 'kN', ref: {k: 'mem', m: 1, x: .05, f: 'Vy'}, t: 'R1/1000', abs: 1},
    {l: 'Corte después de la zona cargada', u: 'kN', ref: {k: 'mem', m: 1, x: .9, f: 'Vy'}, t: 'R2/1000', abs: 1},
    {l: 'Momento a media luz (dentro de la zona cargada)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: '(R1*L/2-w*(L/2-a)^2/2)/1000000', abs: 1},
    {l: 'Momento máximo (V = 0) en x0', u: 'kN·m', ref: {k: 'mem', m: 1, x: 2500 / 6000, f: 'Mz'}, t: '(R1*a+R1^2/(2*w))/1000000', abs: 1},
    {l: 'Flecha a media luz (funciones de singularidad)', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '(R1*(L/2)^3/6-w/24*MAX(L/2-a,0)^4+w/24*MAX(L/2-a-c,0)^4+C1*(L/2))/(E*I)'},
    {l: 'Viga 2 (plano débil): reacción horizontal en A (se opone a la carga en +Y)', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fy'}, t: '-R1/1000'},
    {l: 'Viga 2 (plano débil): momento débil a media luz', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'My'}, t: '(R1*L/2-w*(L/2-a)^2/2)/1000000', abs: 1},
    {l: 'Viga 2 (plano débil): flecha horizontal a media luz', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vz'}, t: '(R1*(L/2)^3/6-w/24*MAX(L/2-a,0)^4+w/24*MAX(L/2-a-c,0)^4+C1*(L/2))/(E*Iy)', abs: 1}]
});

/* ───────────── N03 · carga trapezoidal ───────────── */
BENCH.push({
  id: 'N03', grupo: 'clasico', titulo: 'Carga trapezoidal sobre toda la luz (uniforme + triangular)', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Viga IPE 200 biapoyada de 6,00 m con una carga trapezoidal que va de 5 kN/m en el apoyo A a 20 kN/m en el apoyo B. Se trata como la suma de una carga uniforme de 5 kN/m y una triangular de 15 kN/m; se comparan reacciones, momento a un cuarto y a media luz, flecha a media luz y los giros de apoyo.',
  perfil: 'IPE 200 (tabla): Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['L', 6000, 'mm', 'Luz'], ['w1', 5, 'kN/m', 'Carga en A'], ['w2', 20, 'kN/m', 'Carga en B'], ['dw', 'w2-w1', 'kN/m', 'Parte triangular'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'],
    ['RA', 'w1*L/2+dw*L/6', 'N', 'Reacción en A'], ['RB', 'w1*L/2+dw*L/3', 'N', 'Reacción en B']],
  model: p => ({ver: 2, nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL)], members: [BM(1, 1, 2, 'IPE 200', {loads: [{k: 'T', c: 'D', dir: 'grav', a: 0, b: null, w1: p.w1, w2: p.w2}]})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: 'Reacción en A = w1·L/2 + Δw·L/6', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'RA/1000'},
    {l: 'Reacción en B = w1·L/2 + Δw·L/3', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: 'RB/1000'},
    {l: 'Momento a un cuarto de la luz', u: 'kN·m', ref: {k: 'mem', m: 1, x: .25, f: 'Mz'}, t: '(RA*L/4-w1*(L/4)^2/2-dw*(L/4)^3/(6*L))/1000000', abs: 1},
    {l: 'Momento a media luz = w1·L²/8 + Δw·L²/16', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: '(w1*L^2/8+dw*L^2/16)/1000000', abs: 1},
    {l: 'Flecha a media luz = 5·w1·L⁴/(384EI) + 5·Δw·L⁴/(768EI)', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-(5*w1*L^4/384+5*dw*L^4/768)/(E*I)'},
    {l: 'Giro en A (extremo menos cargado)', u: 'rad', ref: {k: 'disp', n: 1, d: 'Ry'}, t: '(w1*L^3/24+7*dw*L^3/360)/(E*I)', abs: 1},
    {l: 'Giro en B (extremo más cargado)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: '(w1*L^3/24+dw*L^3/45)/(E*I)', abs: 1}]
});

/* ───────────── N04 · temperatura ───────────── */
BENCH.push({
  id: 'N04', grupo: 'clasico', titulo: 'Temperatura: variación uniforme y gradiente en el canto', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Tres barras IPE 200 independientes. (1) Barra de 3,00 m empotrada en ambos extremos con ΔT = +30 °C uniforme: no puede alargarse, aparece una compresión N = E·A·α·ΔT. (2) Viga biapoyada de 4,00 m con gradiente ΔT = 20 °C entre la cara superior y la inferior: se curva libremente, con flecha central α·ΔT·L²/(8h), giro de apoyo α·ΔT·L/(2h) y sin esfuerzos. (3) Viga de 4,00 m biempotrada con el mismo gradiente: el giro está impedido y el momento es constante e igual a E·I·α·ΔT/h, sin reacciones verticales.',
  perfil: 'IPE 200 (tabla): h = 200 mm, A = 28,5 cm², Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['al', 1.2e-5, '1/°C', 'Coeficiente de dilatación térmica del acero'], ['A', 2850, 'mm²', 'Área IPE 200'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'], ['h', 200, 'mm', 'Altura IPE 200'],
    ['L1', 3000, 'mm', 'Largo de la barra (1)'], ['dT', 30, '°C', 'Variación uniforme de temperatura'], ['L2', 4000, 'mm', 'Luz de las vigas (2) y (3)'], ['dTy', 20, '°C', 'Gradiente: T(cara superior) − T(cara inferior)']],
  model: p => ({ver: 2,
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L1, 0, 0, SUP_FIX), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L2, 1000, 0, SUP_ROL), BN(5, 0, 2000, 0, SUP_FIX), BN(6, p.L2, 2000, 0, SUP_FIX)],
    members: [BM(1, 1, 2, 'IPE 200', {loads: [{k: 'TH', c: 'T', dT: p.dT, alpha: p.al}]}), BM(2, 3, 4, 'IPE 200', {loads: [{k: 'TH', c: 'T', dTy: -p.dTy, alpha: p.al}]}), BM(3, 5, 6, 'IPE 200', {loads: [{k: 'TH', c: 'T', dTy: -p.dTy, alpha: p.al}]})],
    combos: [cmb('C1: temperatura', {T: 1})]}),
  checks: [
    {l: '(1) Esfuerzo axil N = −E·A·α·ΔT (compresión)', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-E*A*al*dT/1000'},
    {l: '(1) Reacción horizontal en el empotramiento', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fx'}, t: 'E*A*al*dT/1000', abs: 1},
    {l: '(1) Alargamiento de la barra (impedido)', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'ux'}, t: '0', atol: 1e-9},
    {l: '(2) Flecha central de la viga libre = α·ΔT·L²/(8h)', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vy'}, t: 'al*dTy*L2^2/(8*h)', abs: 1},
    {l: '(2) Giro de apoyo = α·ΔT·L/(2h)', u: 'rad', ref: {k: 'disp', n: 3, d: 'Ry'}, t: 'al*dTy*L2/(2*h)', abs: 1},
    {l: '(2) Momento en la viga libre', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'Mz'}, t: '0', atol: 1e-6},
    {l: '(3) Momento constante E·I·α·ΔT/h (viga biempotrada)', u: 'kN·m', ref: {k: 'mem', m: 3, x: .5, f: 'Mz'}, t: 'E*I*al*dTy/h/1000000', abs: 1},
    {l: '(3) Momento en el empotramiento (igual al de la mitad)', u: 'kN·m', ref: {k: 'reac', n: 5, d: 'My'}, t: 'E*I*al*dTy/h/1000000', abs: 1},
    {l: '(3) Reacción vertical (nula)', u: 'kN', ref: {k: 'reac', n: 5, d: 'Fz'}, t: '0', atol: 1e-6}]
});

/* ───────────── N05 · apoyos elásticos ───────────── */
BENCH.push({
  id: 'N05', grupo: 'clasico', titulo: 'Apoyos elásticos: resorte vertical y resorte de giro', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Tres modelos con resortes de apoyo. (1) Voladizo IPE 200 de 3,00 m con un resorte vertical ks en el extremo libre y una carga P ahí: δ = P/(3EI/L³ + ks) y la fuerza del resorte es ks·δ. (2) Viga biapoyada de 6,00 m con un resorte vertical ks en el centro y la carga P en el centro: δ = P/(48EI/L³ + ks). (3) Viga de 4,00 m empotrada en un extremo y apoyada en el otro sobre un resorte de giro kθ, con carga uniforme: el momento en el apoyo elástico es (wL²/12)·kθ/(kθ + 4EI/L).',
  perfil: 'IPE 200 (tabla): Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'],
    ['L1', 3000, 'mm', 'Largo del voladizo (1)'], ['P1', 8, 'kN', 'Carga en el extremo (1)'], ['ks1', 500, 'kN/m', 'Resorte vertical (1)'], ['kb1', '3*E*I/L1^3', 'N/mm', 'Rigidez del voladizo'],
    ['L2', 6000, 'mm', 'Luz de la viga (2)'], ['P2', 20, 'kN', 'Carga central (2)'], ['ks2', 300, 'kN/m', 'Resorte vertical central (2)'], ['kb2', '48*E*I/L2^3', 'N/mm', 'Rigidez de la viga biapoyada en el centro'],
    ['L3', 4000, 'mm', 'Largo de la viga (3)'], ['w3', 15, 'kN/m', 'Carga uniforme (3)'], ['kt', 800, 'kN·m/rad', 'Resorte de giro (3)'], ['ktn', 'kt*1000000', 'N·mm/rad', 'Resorte de giro en N·mm/rad'],
    ['th3', 'w3*L3^2/12/(ktn+4*E*I/L3)', 'rad', 'Giro del apoyo elástico (3)']],
  model: p => { const s1 = BN(2, p.L1, 0, 0, [0, 0, 0, 0, 0, 0], {D: [0, 0, -p.P1]}); s1.spr = [0, 0, p.ks1, 0, 0, 0];
    const s2 = BN(4, p.L2 / 2, 1000, 0, [0, 0, 0, 0, 0, 0], {D: [0, 0, -p.P2]}); s2.spr = [0, 0, p.ks2, 0, 0, 0];
    const s3 = BN(6, 0, 2000, 0, SUP_PIN); s3.spr = [0, 0, 0, 0, p.kt, 0];
    return {ver: 2, nodes: [BN(1, 0, 0, 0, SUP_FIX), s1, BN(3, 0, 1000, 0, SUP_PIN), s2, BN(5, p.L2, 1000, 0, SUP_ROL), s3, BN(7, p.L3, 2000, 0, SUP_FIX)],
      members: [BM(1, 1, 2, 'IPE 200'), BM(2, 3, 4, 'IPE 200'), BM(3, 4, 5, 'IPE 200'), BM(4, 6, 7, 'IPE 200', {q: {D: p.w3}})], combos: [cmb('C1: 1,0·D', {D: 1})]}; },
  checks: [
    {l: '(1) Flecha del extremo = P/(3EI/L³ + ks)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-P1*1000/(kb1+ks1)'},
    {l: '(1) Reacción del resorte = ks·δ', u: 'kN', ref: {k: 'reac', n: 2, d: 'Fz'}, t: 'ks1*P1*1000/(kb1+ks1)/1000'},
    {l: '(1) Reacción en el empotramiento = P − ks·δ', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'P1-ks1*P1*1000/(kb1+ks1)/1000'},
    {l: '(2) Flecha central = P/(48EI/L³ + ks)', u: 'mm', ref: {k: 'disp', n: 4, d: 'Uz'}, t: '-P2*1000/(kb2+ks2)'},
    {l: '(2) Reacción del resorte = ks·δ', u: 'kN', ref: {k: 'reac', n: 4, d: 'Fz'}, t: 'ks2*P2*1000/(kb2+ks2)/1000'},
    {l: '(2) Reacción en un apoyo extremo = (P − ks·δ)/2', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fz'}, t: '(P2-ks2*P2*1000/(kb2+ks2)/1000)/2'},
    {l: '(3) Giro del apoyo elástico', u: 'rad', ref: {k: 'disp', n: 6, d: 'Ry'}, t: 'th3', abs: 1},
    {l: '(3) Momento en el apoyo elástico = kθ·θ', u: 'kN·m', ref: {k: 'reac', n: 6, d: 'My'}, t: 'ktn*th3/1000000', abs: 1},
    {l: '(3) Momento de empotramiento = wL²/12·(kθ+6EI/L)/(kθ+4EI/L)', u: 'kN·m', ref: {k: 'reac', n: 7, d: 'My'}, t: 'w3*L3^2/12*(ktn+6*E*I/L3)/(ktn+4*E*I/L3)/1000000', abs: 1}]
});

/* ───────────── N06 · asentamientos de apoyo ───────────── */
BENCH.push({
  id: 'N06', grupo: 'clasico', titulo: 'Asentamientos impuestos de apoyo', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Tres modelos con descenso impuesto de un apoyo (caso de carga A). (1) Viga IPE 200 de 4,00 m biempotrada con el apoyo derecho 10 mm más abajo: M = 6EIΔ/L² en ambos extremos y corte V = 12EIΔ/L³. (2) Viga continua de dos tramos de 5,00 m con 15 mm de descenso del apoyo central: R_B = 6EIδ/L³ (hacia abajo), R_A = R_C = 3EIδ/L³ y M_B = 3EIδ/L². (3) Voladizo de 3,00 m con un resorte en el extremo cuya base desciende 20 mm: δ = ks·s/(ks + 3EI/L³). (4) Viga biempotrada de 4,00 m con giro impuesto de 5 mrad en el empotramiento izquierdo: M_i = 4EIθ/L, M_j = 2EIθ/L y corte 6EIθ/L².',
  perfil: 'IPE 200 (tabla): Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'],
    ['L1', 4000, 'mm', 'Luz de la viga (1)'], ['D1', 10, 'mm', 'Descenso del apoyo derecho (1)'],
    ['L2', 5000, 'mm', 'Luz de cada tramo (2)'], ['D2', 15, 'mm', 'Descenso del apoyo central (2)'],
    ['L3', 3000, 'mm', 'Largo del voladizo (3)'], ['ks3', 400, 'kN/m', 'Resorte del extremo (3)'], ['D3', 20, 'mm', 'Descenso de la base del resorte (3)'], ['kb3', '3*E*I/L3^3', 'N/mm', 'Rigidez del voladizo'],
    ['L4', 4000, 'mm', 'Luz de la viga (4)'], ['R4', 5, 'mrad', 'Giro impuesto del empotramiento izquierdo (4)'], ['th4', 'R4/1000', 'rad', 'Giro impuesto']],
  model: p => { const n2 = BN(2, p.L1, 0, 0, SUP_FIX); n2.sd = [0, 0, -p.D1, 0, 0, 0];
    const n4 = BN(4, p.L2, 1000, 0, SUP_ROL); n4.sd = [0, 0, -p.D2, 0, 0, 0];
    const n7 = BN(7, p.L3, 2000, 0, [0, 0, 0, 0, 0, 0]); n7.spr = [0, 0, p.ks3, 0, 0, 0]; n7.sd = [0, 0, -p.D3, 0, 0, 0];
    const n8 = BN(8, 0, 3000, 0, SUP_FIX); n8.sd = [0, 0, 0, 0, p.R4, 0];
    return {ver: 2, nodes: [BN(1, 0, 0, 0, SUP_FIX), n2, BN(3, 0, 1000, 0, SUP_PIN), n4, BN(5, 2 * p.L2, 1000, 0, SUP_ROL), BN(6, 0, 2000, 0, SUP_FIX), n7, n8, BN(9, p.L4, 3000, 0, SUP_FIX)],
      members: [BM(1, 1, 2, 'IPE 200'), BM(2, 3, 4, 'IPE 200'), BM(3, 4, 5, 'IPE 200'), BM(4, 6, 7, 'IPE 200'), BM(5, 8, 9, 'IPE 200')], combos: [cmb('C1: asentamiento', {A: 1})]}; },
  checks: [
    {l: '(1) Momento en el extremo izquierdo = 6EIΔ/L²', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: '6*E*I*D1/L1^2/1000000', abs: 1},
    {l: '(1) Momento en el extremo derecho', u: 'kN·m', ref: {k: 'mem', m: 1, x: 1, f: 'Mz'}, t: '6*E*I*D1/L1^2/1000000', abs: 1},
    {l: '(1) Corte constante = 12EIΔ/L³', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'Vy'}, t: '12*E*I*D1/L1^3/1000', abs: 1},
    {l: '(1) Reacción vertical en el apoyo izquierdo', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: '12*E*I*D1/L1^3/1000', abs: 1},
    {l: '(1) Desplazamiento impuesto del apoyo derecho', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-D1'},
    {l: '(2) Reacción en el apoyo central = 6EIδ/L³', u: 'kN', ref: {k: 'reac', n: 4, d: 'Fz'}, t: '6*E*I*D2/L2^3/1000', abs: 1},
    {l: '(2) Reacción en un apoyo extremo = 3EIδ/L³', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fz'}, t: '3*E*I*D2/L2^3/1000', abs: 1},
    {l: '(2) Momento sobre el apoyo central = 3EIδ/L²', u: 'kN·m', ref: {k: 'mem', m: 2, x: 1, f: 'Mz'}, t: '3*E*I*D2/L2^2/1000000', abs: 1},
    {l: '(3) Desplazamiento del extremo = ks·s/(ks + 3EI/L³)', u: 'mm', ref: {k: 'disp', n: 7, d: 'Uz'}, t: '-ks3*D3/(ks3+kb3)'},
    {l: '(3) Momento de empotramiento = kb·δ·L', u: 'kN·m', ref: {k: 'reac', n: 6, d: 'My'}, t: 'kb3*ks3*D3/(ks3+kb3)*L3/1000000', abs: 1},
    {l: '(4) Momento en el empotramiento con giro impuesto = 4EIθ/L', u: 'kN·m', ref: {k: 'mem', m: 5, x: 0, f: 'Mz'}, t: '4*E*I*th4/L4/1000000', abs: 1},
    {l: '(4) Momento en el otro empotramiento = 2EIθ/L', u: 'kN·m', ref: {k: 'mem', m: 5, x: 1, f: 'Mz'}, t: '2*E*I*th4/L4/1000000', abs: 1},
    {l: '(4) Corte constante = 6EIθ/L²', u: 'kN', ref: {k: 'mem', m: 5, x: .5, f: 'Vy'}, t: '6*E*I*th4/L4^2/1000', abs: 1},
    {l: '(4) Giro impuesto del nudo', u: 'rad', ref: {k: 'disp', n: 8, d: 'Ry'}, t: 'th4', abs: 1}]
});

/* ───────────── N07 · uniones semirrígidas ───────────── */
BENCH.push({
  id: 'N07', grupo: 'clasico', titulo: 'Uniones semirrígidas (resorte de giro en el extremo de la barra)', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Viga IPE 300 de 6,00 m con carga uniforme de 20 kN/m, unida por resortes de giro a nudos empotrados. (1) Resortes iguales en ambos extremos con kθ = 2EI/L: el momento de unión es (wL²/12)·kθL/(kθL + 2EI) = wL²/24, la flecha central 5wL⁴/(384EI) − M·L²/(8EI) y el giro relativo de la unión M/kθ. (2) Lo mismo con kθ = 10EI/L. (3) Resorte kθ = 4EI/L en un extremo y empotramiento rígido en el otro: M_i = (wL²/12)·kθ/(kθ + 4EI/L) y M_j = (wL²/12)·(kθ + 6EI/L)/(kθ + 4EI/L).',
  perfil: 'IPE 300 (tabla): Ix = 8 356 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['I', E_IPE300, 'mm⁴', 'Ix IPE 300'], ['L', 6000, 'mm', 'Luz'], ['w', 20, 'kN/m', 'Carga uniforme'], ['EI', 'E*I', 'N·mm²', 'Rigidez a flexión'],
    ['k1', '2*EI/L/1000000', 'kN·m/rad', 'Resorte del caso (1): 2EI/L'], ['k2', '10*EI/L/1000000', 'kN·m/rad', 'Resorte del caso (2): 10EI/L'], ['k3', '4*EI/L/1000000', 'kN·m/rad', 'Resorte del caso (3): 4EI/L'],
    ['M1', 'w*L^2/12*(k1*1000000*L)/(k1*1000000*L+2*EI)', 'N·mm', 'Momento de unión, caso (1)'], ['M2', 'w*L^2/12*(k2*1000000*L)/(k2*1000000*L+2*EI)', 'N·mm', 'Momento de unión, caso (2)'],
    ['M3', 'w*L^2/12*(k3*1000000)/(k3*1000000+4*EI/L)', 'N·mm', 'Momento en la unión elástica, caso (3)'], ['M3j', 'w*L^2/12*(k3*1000000+6*EI/L)/(k3*1000000+4*EI/L)', 'N·mm', 'Momento en el empotramiento, caso (3)']],
  model: p => ({ver: 2,
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L, 0, 0, SUP_XLINK), BN(3, 0, 1000, 0, SUP_FIX), BN(4, p.L, 1000, 0, SUP_XLINK), BN(5, 0, 2000, 0, SUP_FIX), BN(6, p.L, 2000, 0, SUP_FIX)],
    members: [BM(1, 1, 2, 'IPE 300', {q: {D: p.w}, sprI: {s: p.k1, w: null}, sprJ: {s: p.k1, w: null}}), BM(2, 3, 4, 'IPE 300', {q: {D: p.w}, sprI: {s: p.k2, w: null}, sprJ: {s: p.k2, w: null}}), BM(3, 5, 6, 'IPE 300', {q: {D: p.w}, sprI: {s: p.k3, w: null}})],
    combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: '(1) Momento en la unión (extremo i)', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: 'M1/1000000', abs: 1},
    {l: '(1) Momento a media luz = wL²/8 − M', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: '(w*L^2/8-M1)/1000000', abs: 1},
    {l: '(1) Flecha central', u: 'mm', ref: {k: 'mem', m: 1, x: .5, f: 'vy'}, t: '-(5*w*L^4/384-M1*L^2/8)/EI'},
    {l: '(1) Reacción de momento en el nudo (= M de la unión)', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'M1/1000000', abs: 1},
    {l: '(2) Momento en la unión (extremo i)', u: 'kN·m', ref: {k: 'mem', m: 2, x: 0, f: 'Mz'}, t: 'M2/1000000', abs: 1},
    {l: '(2) Flecha central', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vy'}, t: '-(5*w*L^4/384-M2*L^2/8)/EI'},
    {l: '(3) Momento en la unión elástica', u: 'kN·m', ref: {k: 'mem', m: 3, x: 0, f: 'Mz'}, t: 'M3/1000000', abs: 1},
    {l: '(3) Momento en el empotramiento rígido', u: 'kN·m', ref: {k: 'reac', n: 6, d: 'My'}, t: 'M3j/1000000', abs: 1},
    {l: '(3) Reacción vertical en el extremo con unión elástica = wL/2 − (Mj − Mi)/L', u: 'kN', ref: {k: 'reac', n: 5, d: 'Fz'}, t: '(w*L/2-(M3j-M3)/L)/1000', abs: 1}]
});

/* ───────────── N08 · deformación por corte ───────────── */
BENCH.push({
  id: 'N08', grupo: 'clasico', titulo: 'Deformación por corte (Timoshenko): voladizo y viga corta', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Con la opción «deformación por corte» activada (área de corte As = h·tw, la del Reglamento). (1) Voladizo IPE 200 de 0,80 m con P = 50 kN en la punta: δ = PL³/(3EI) + PL/(G·As); el giro de la sección en la punta no cambia (PL²/2EI). (2) Viga biapoyada IPE 200 de 1,60 m con 40 kN/m: δ = 5wL⁴/(384EI) + wL²/(8·G·As); el giro de la sección en el apoyo tampoco cambia (wL³/24EI).',
  perfil: 'IPE 200 (tabla): h = 200 mm, tw = 5,6 mm, Ix = 1 943 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['I', E_IPE200, 'mm⁴', 'Ix IPE 200'], ['As', '200*5.6', 'mm²', 'Área de corte h·tw'],
    ['L1', 800, 'mm', 'Largo del voladizo (1)'], ['P', 50, 'kN', 'Carga en la punta (1)'], ['L2', 1600, 'mm', 'Luz de la viga (2)'], ['w', 40, 'kN/m', 'Carga uniforme (2)']],
  model: p => ({ver: 2, settings: {shearDef: true}, nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L1, 0, 0, null, {D: [0, 0, -p.P]}), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L2, 1000, 0, SUP_ROL)],
    members: [BM(1, 1, 2, 'IPE 200'), BM(2, 3, 4, 'IPE 200', {q: {D: p.w}})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: '(1) Flecha de la punta = PL³/(3EI) + PL/(G·As)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-(P*1000*L1^3/(3*E*I)+P*1000*L1/(G*As))'},
    {l: '(1) Giro de la sección en la punta = PL²/(2EI)', u: 'rad', ref: {k: 'disp', n: 2, d: 'Ry'}, t: 'P*1000*L1^2/(2*E*I)', abs: 1},
    {l: '(1) Momento de empotramiento', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'P*L1/1000', abs: 1},
    {l: '(2) Flecha central = 5wL⁴/(384EI) + wL²/(8·G·As)', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vy'}, t: '-(5*w*L2^4/(384*E*I)+w*L2^2/(8*G*As))'},
    {l: '(2) Giro de la sección en el apoyo = wL³/(24EI)', u: 'rad', ref: {k: 'disp', n: 3, d: 'Ry'}, t: 'w*L2^3/(24*E*I)', abs: 1},
    {l: '(2) Momento a media luz', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'Mz'}, t: 'w*L2^2/8/1000000', abs: 1}]
});

/* ───────────── N09 · Cb real ───────────── */
const MnCbExpr = 'IF(Lb<=Lp,Mp,IF(Lb<=Lr,MIN(Mp,Cb*(Mp-(Mp-Mr)*(Lb-Lp)/(Lr-Lp))),MIN(Mp,Cb*PI()/Lb*SQRT(E*Iw*G*J+(PI()*E/Lb)^2*Iw*Cw))))';
BENCH.push({
  id: 'N09', grupo: 'reglamento', titulo: 'Cb a partir del diagrama de momentos real (LRFD-99 F1-3)', fuente: SRC_REG3, tol: 1e-4,
  enunciado: 'Cinco vigas IPE 300 de 6,00 m, arriostradas solo en los apoyos (Lb = L), con distintos diagramas de momento. El programa evalúa M en los cuartos de la luz con la solución exacta de la barra y aplica Cb = 12,5·Mmax/(2,5·Mmax + 3·MA + 4·MB + 3·MC). Se espera: carga uniforme → 1,136; carga central → 1,316; momentos de extremo iguales con el mismo sentido (curvatura doble) → 2,273; momentos de extremo opuestos (momento uniforme) → 1,000; viga biempotrada con carga uniforme → la fórmula da 100/42 = 2,38 y se limita al tope 2,3. Son los valores 1,14 / 1,32 / 2,27 / 1,00 que se citan habitualmente. Además se comprueba que la resistencia de diseño φb·Mn usada en la viga uniforme incluye el Cb en el tramo inelástico.',
  perfil: 'IPE 300 (tabla, ver F02).',
  params: [['L', 6000, 'mm', 'Luz de las vigas (Lb = L)'], ['q', 10, 'kN/m', 'Carga uniforme (viga 1)'], ['P', 30, 'kN', 'Carga central (viga 2)'], ['Mext', 60, 'kN·m', 'Momentos de extremo (vigas 3 y 4)'],
    ['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia']]
    .concat(IPE300()).concat(flexChain()).concat([['Lb', 'L', 'mm', 'Longitud sin arriostrar'],
    ['Cb1', '12.5*(q*L^2/8)/(2.5*(q*L^2/8)+3*(3*q*L^2/32)+4*(q*L^2/8)+3*(3*q*L^2/32))', '', 'Cb, carga uniforme'],
    ['Cb2', '12.5*(P*L/4)/(2.5*(P*L/4)+3*(P*L/8)+4*(P*L/4)+3*(P*L/8))', '', 'Cb, carga puntual central'],
    ['Cb3', '12.5/(2.5+3*0.5+4*0+3*0.5)', '', 'Cb, momentos de extremo iguales (M, M/2, 0, −M/2)'],
    ['Cb4', 'MIN(2.3,12.5*8/(2.5*8+3*1+4*4+3*1))', '', 'Cb, viga biempotrada con carga uniforme: M = −8, +1, +4, +1 (en 1/96 de wL²), tope 2,3'],
    ['Cb', 'Cb1', '', 'Cb de la viga 1 (para φb·Mn)'],
    ['MnCb', MnCbExpr, 'N·mm', 'Mn con Cb (viga 1)'], ['phiMnCb', '0.9*MnCb', 'N·mm', 'φb·Mn de la viga 1']]),
  model: p => ({ver: 2,
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L, 1000, 0, SUP_ROL),
      NM(5, 0, 2000, 0, SUP_PIN, null, {D: [0, p.Mext, 0]}), NM(6, p.L, 2000, 0, SUP_ROL, null, {D: [0, p.Mext, 0]}),
      NM(7, 0, 3000, 0, SUP_PIN, null, {D: [0, p.Mext, 0]}), NM(8, p.L, 3000, 0, SUP_ROL, null, {D: [0, -p.Mext, 0]}), BN(9, 0, 4000, 0, SUP_FIX), BN(10, p.L, 4000, 0, SUP_FIX)],
    members: [BM(1, 1, 2, 'IPE 300', {q: {D: p.q}}), BM(2, 3, 4, 'IPE 300', {loads: [{k: 'P', c: 'D', dir: 'grav', a: p.L / 2, F: p.P}]}), BM(3, 5, 6, 'IPE 300'), BM(4, 7, 8, 'IPE 300'), BM(5, 9, 10, 'IPE 300', {q: {D: p.q}})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: 'Cb de la viga con carga uniforme (≈ 1,14)', u: '', ref: {k: 'util', m: 1, f: 'Cb'}, t: 'Cb1'},
    {l: 'Cb de la viga con carga puntual central (≈ 1,32)', u: '', ref: {k: 'util', m: 2, f: 'Cb'}, t: 'Cb2'},
    {l: 'Cb con momentos de extremo iguales, curvatura doble (≈ 2,27)', u: '', ref: {k: 'util', m: 3, f: 'Cb'}, t: 'Cb3'},
    {l: 'Cb con momentos de extremo opuestos, momento uniforme', u: '', ref: {k: 'util', m: 4, f: 'Cb'}, t: '1'},
    {l: 'Cb de la viga biempotrada con carga uniforme (la fórmula da 2,38; tope 2,3)', u: '', ref: {k: 'util', m: 5, f: 'Cb'}, t: 'Cb4'},
    {l: 'φb·Mn de la viga 1 con su Cb', u: 'N·mm', ref: {k: 'util', m: 1, f: 'phiMsUsed'}, t: 'phiMnCb'}]
});

/* ───────────── N10 · propiedades de secciones armadas ───────────── */
BENCH.push({
  id: 'N10', grupo: 'clasico', titulo: 'Propiedades de secciones armadas: PS soldada, perfil + platabanda y cajón', fuente: SRC_CL3, tol: 1e-6,
  enunciado: 'Se comparan las propiedades que calcula el programa para tres secciones armadas con el cálculo directo: (1) perfil soldado doble T «PS» de alma 300×6 y alas 150×10; (2) IPE 100 con una platabanda superior de 150×10 (teorema de Steiner); (3) cajón soldado de 300×200 con alma 8 y ala 10 (torsión de Bredt-Batho). Para la doble T se usan A, Ix, Iy, el módulo plástico, J = Σ b·t³/3 y el alabeo Cw = tf·b³·(h−tf)²/24.',
  perfil: 'PS 320×150×10/6 (alma hw = 300, tw = 6; alas 150×10); IPE 100 + PL 150×10 (A = 10,3 cm², Ix = 171 cm⁴, h = 100 mm); cajón 300×200×8/10.',
  params: [['hw', 300, 'mm', 'Alma de la PS'], ['tw', 6, 'mm', 'Espesor del alma'], ['bf', 150, 'mm', 'Ancho de ala'], ['tf', 10, 'mm', 'Espesor de ala'], ['hh', 'hw+2*tf', 'mm', 'Altura total de la PS'],
    ['A1', '2*bf*tf+hw*tw', 'mm²', 'Área de la PS'], ['Is1', '(bf*hh^3-(bf-tw)*hw^3)/12', 'mm⁴', 'Ix de la PS'], ['Iw1', '2*tf*bf^3/12+hw*tw^3/12', 'mm⁴', 'Iy de la PS'],
    ['Zs1', 'bf*tf*(hw+tf)+tw*hw^2/4', 'mm³', 'Módulo plástico Zx de la PS'], ['J1', '(2*bf*tf^3+hw*tw^3)/3', 'mm⁴', 'Constante de torsión de la PS'], ['Cw1', 'tf*bf^3*(hw+tf)^2/24', 'mm⁶', 'Alabeo de la PS (alas)'],
    ['Ab', 1030, 'mm²', 'Área IPE 100'], ['Ib', 1710000, 'mm⁴', 'Ix IPE 100'], ['hb', 100, 'mm', 'Altura IPE 100'], ['bp', 150, 'mm', 'Ancho de la platabanda'], ['tp', 10, 'mm', 'Espesor de la platabanda'],
    ['A2', 'Ab+bp*tp', 'mm²', 'Área del conjunto'], ['yc2', '(Ab*hb/2+bp*tp*(hb+tp/2))/A2', 'mm', 'Baricentro desde la fibra inferior'],
    ['Is2', 'Ib+Ab*(hb/2-yc2)^2+bp*tp^3/12+bp*tp*(hb+tp/2-yc2)^2', 'mm⁴', 'Ix del conjunto (Steiner)'], ['Ss2', 'Is2/yc2', 'mm³', 'Módulo resistente mínimo (fibra inferior)'],
    ['hc', 300, 'mm', 'Altura del cajón'], ['bc', 200, 'mm', 'Ancho del cajón'], ['twc', 8, 'mm', 'Espesor de las almas'], ['tfc', 10, 'mm', 'Espesor de las alas'],
    ['A3', 'hc*bc-(hc-2*tfc)*(bc-2*twc)', 'mm²', 'Área del cajón'], ['Is3', '(bc*hc^3-(bc-2*twc)*(hc-2*tfc)^3)/12', 'mm⁴', 'Ix del cajón'], ['Iw3', '(hc*bc^3-(hc-2*tfc)*(bc-2*twc)^3)/12', 'mm⁴', 'Iy del cajón'],
    ['Am', '(bc-twc)*(hc-tfc)', 'mm²', 'Área encerrada por la línea media'], ['J3', '4*Am^2/(2*(bc-twc)/tfc+2*(hc-tfc)/twc)', 'mm⁴', 'Constante de torsión de Bredt-Batho']],
  model: p => ({ver: 2, customSections: {'PS 320x150x10/6': {type: 'WI', hw: p.hw, tw: p.tw, bft: p.bf, tft: p.tf, bfb: p.bf, tfb: p.tf}, 'IPE 100 + PL': {type: 'IPL', base: 'IPE 100', top: {b: p.bp, t: p.tp}, bot: {b: 0, t: 0}}, 'Cajón 300x200': {type: 'BOX', h: p.hc, b: p.bc, tw: p.twc, tf: p.tfc}},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, 3000, 0, 0), BN(3, 0, 1000, 0, SUP_FIX), BN(4, 3000, 1000, 0), BN(5, 0, 2000, 0, SUP_FIX), BN(6, 3000, 2000, 0)],
    members: [BM(1, 1, 2, 'PS 320x150x10/6'), BM(2, 3, 4, 'IPE 100 + PL'), BM(3, 5, 6, 'Cajón 300x200')], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: '(1) PS: área', u: 'mm²', ref: {k: 'sec', m: 1, f: 'A'}, t: 'A1'}, {l: '(1) PS: inercia Ix', u: 'mm⁴', ref: {k: 'sec', m: 1, f: 'Is'}, t: 'Is1'}, {l: '(1) PS: inercia Iy', u: 'mm⁴', ref: {k: 'sec', m: 1, f: 'Iw'}, t: 'Iw1'},
    {l: '(1) PS: módulo plástico Zx', u: 'mm³', ref: {k: 'sec', m: 1, f: 'Zs'}, t: 'Zs1'}, {l: '(1) PS: constante de torsión J = Σ b·t³/3', u: 'mm⁴', ref: {k: 'sec', m: 1, f: 'J'}, t: 'J1'},
    {l: '(1) PS: alabeo Cw', u: 'mm⁶', ref: {k: 'sec', m: 1, f: 'Cw'}, t: 'Cw1'},
    {l: '(2) IPE 100 + PL: área', u: 'mm²', ref: {k: 'sec', m: 2, f: 'A'}, t: 'A2'}, {l: '(2) IPE 100 + PL: baricentro', u: 'mm', ref: {k: 'sec', m: 2, f: 'yc'}, t: 'yc2'},
    {l: '(2) IPE 100 + PL: inercia Ix (Steiner)', u: 'mm⁴', ref: {k: 'sec', m: 2, f: 'Is'}, t: 'Is2'}, {l: '(2) IPE 100 + PL: módulo resistente mínimo', u: 'mm³', ref: {k: 'sec', m: 2, f: 'Ss'}, t: 'Ss2'},
    {l: '(3) Cajón: área', u: 'mm²', ref: {k: 'sec', m: 3, f: 'A'}, t: 'A3'}, {l: '(3) Cajón: inercia Ix', u: 'mm⁴', ref: {k: 'sec', m: 3, f: 'Is'}, t: 'Is3'}, {l: '(3) Cajón: inercia Iy', u: 'mm⁴', ref: {k: 'sec', m: 3, f: 'Iw'}, t: 'Iw3'},
    {l: '(3) Cajón: constante de torsión (Bredt-Batho)', u: 'mm⁴', ref: {k: 'sec', m: 3, f: 'J'}, t: 'J3'}]
});

/* ───────────── N11 · pandeo local en compresión (ala esbelta de columna soldada) ───────────── */
const psChain = (hw, tw, bf, tf, nombre) => [
  ['hw', hw, 'mm', nombre + ': alto del alma'], ['tw', tw, 'mm', 'Espesor del alma'], ['bf', bf, 'mm', 'Ancho de las alas'], ['tf', tf, 'mm', 'Espesor de las alas'],
  ['hh', 'hw+2*tf', 'mm', 'Altura total'], ['A', '2*bf*tf+hw*tw', 'mm²', 'Área'], ['Is', '(bf*hh^3-(bf-tw)*hw^3)/12', 'mm⁴', 'Inercia, eje fuerte'], ['Iw', '2*tf*bf^3/12+hw*tw^3/12', 'mm⁴', 'Inercia, eje débil'],
  ['Ss', 'Is/(hh/2)', 'mm³', 'Módulo resistente fuerte'], ['Zs', 'bf*tf*(hw+tf)+tw*hw^2/4', 'mm³', 'Módulo plástico fuerte'], ['J', '(2*bf*tf^3+hw*tw^3)/3', 'mm⁴', 'Constante de torsión'],
  ['Cw', 'tf*bf^3*(hw+tf)^2/24', 'mm⁶', 'Alabeo (alas)'], ['rs', 'SQRT(Is/A)', 'mm', 'Radio de giro fuerte'], ['rw', 'SQRT(Iw/A)', 'mm', 'Radio de giro débil'], ['r02', '(Is+Iw)/A', 'mm²', 'Radio polar al cuadrado'],
  ['kc', 'MIN(0.763,MAX(0.35,4/SQRT(hw/tw)))', '', 'kc = 4/√(h/tw), entre 0,35 y 0,763']];
BENCH.push({
  id: 'N11', grupo: 'reglamento', titulo: 'Pandeo local en compresión: columna soldada con alas esbeltas (factor Qs)', fuente: SRC_REG3, tol: 1e-4,
  enunciado: 'Columna armada soldada PS (alma 300×8, alas 300×8) de 2,50 m articulada en ambos extremos, comprimida. Las alas (b/t = 18,75) superan el límite λr = 0,64·√(kc·E/Fy) = 15,1 de los elementos no rigidizados de perfiles soldados, de modo que se reduce la resistencia con el factor Qs = 1,415 − 0,65·(b/t)·√(Fy/E)/√kc; el alma (h/tw = 37,5) no es esbelta. Se recalculan Qs, la tensión crítica con Q y la resistencia φc·Pn.',
  perfil: 'PS 316×300×8/8 soldada (alma hw = 300, tw = 8; alas 300×8).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia'], ['L', 2500, 'mm', 'Longitud (K = 1 en ambos ejes)']]
    .concat(psChain(300, 8, 300, 8, 'PS soldada')).concat([
    ['lam', '(bf/2)/tf', '', 'Esbeltez del ala b/t'], ['lamr', '0.64*SQRT(kc*E/Fy)', '', 'Límite λr de elementos no rigidizados soldados'],
    ['yq', 'lam*SQRT(Fy/E)/SQRT(kc)', '', 'Esbeltez reducida'], ['Qs', 'IF(yq<=0.64,1,IF(yq<=1.17,1.415-0.65*yq,0.90/yq^2))', '', 'Factor Qs'],
    ['lamw', 'hw/tw', '', 'Esbeltez del alma'], ['lamwr', '1.49*SQRT(E/Fy)', '', 'Límite del alma rigidizada (no esbelta si λ ≤ λr)'],
    ['Fes', 'PI()^2*E/(L/rs)^2', 'MPa', 'Tensión de Euler, eje fuerte'], ['Few', 'PI()^2*E/(L/rw)^2', 'MPa', 'Tensión de Euler, eje débil'], ['Fez', '(PI()^2*E*Cw/L^2+G*J)/(A*r02)', 'MPa', 'Tensión de pandeo torsional'],
    ['Fe', 'MIN(Fes,Few,Fez)', 'MPa', 'Tensión elástica crítica'], ['Fcr', 'IF(Qs*Fy/Fe<=2.25,Qs*0.658^(Qs*Fy/Fe)*Fy,0.877*Fe)', 'MPa', 'Tensión crítica con Q = Qs'], ['phiPc', '0.85*A*Fcr/1000', 'kN', 'Resistencia φc·Pn'],
    ['phiPc1', '0.85*A*IF(Fy/Fe<=2.25,0.658^(Fy/Fe)*Fy,0.877*Fe)/1000', 'kN', 'Resistencia sin reducir por pandeo local (Q = 1), para comparar']]),
  model: p => ({ver: 2, customSections: {'PS 316x300x8/8': {type: 'WI', hw: p.hw, tw: p.tw, bft: p.bf, tft: p.tf, bfb: p.bf, tfb: p.tf}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL, {D: [-100, 0, 0]})], members: [BM(1, 1, 2, 'PS 316x300x8/8')], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: 'Factor Qs de las alas (soldadas, no rigidizadas)', u: '', ref: {k: 'cap', m: 1, f: 'Qs'}, t: 'Qs'},
    {l: 'Factor Q de la sección (el alma no es esbelta: Qa = 1)', u: '', ref: {k: 'cap', m: 1, f: 'Q'}, t: 'Qs'},
    {l: 'Esbeltez del ala b/t', u: '', ref: {k: 'celem', m: 1, i: 0, f: 'lam'}, t: 'lam'},
    {l: 'Límite λr del ala (elemento no rigidizado soldado)', u: '', ref: {k: 'celem', m: 1, i: 0, f: 'lr'}, t: 'lamr'},
    {l: 'Límite de esbeltez del alma (elemento rigidizado)', u: '', ref: {k: 'celem', m: 1, i: 2, f: 'lr'}, t: 'lamwr'},
    {l: 'Tensión elástica crítica Fe', u: 'MPa', ref: {k: 'cap', m: 1, f: 'Fe'}, t: 'Fe'},
    {l: 'Tensión crítica Fcr con Q = Qs', u: 'MPa', ref: {k: 'cap', m: 1, f: 'Fcr'}, t: 'Fcr'},
    {l: 'Resistencia de diseño φc·Pn con pandeo local', u: 'kN', ref: {k: 'cap', m: 1, f: 'phiPc'}, t: 'phiPc'}]
});

/* ───────────── N12 · pandeo local y lateral en flexión (viga soldada, ala no compacta) ───────────── */
const flexWelded = (k, Lb) => [
  ['Lb' + k, Lb, 'mm', 'Longitud sin arriostrar (Cb = 1)'],
  ['Mflb' + k, 'IF(lamf<=lamp,Mp,IF(lamf<=lamr,Mp-(Mp-Mr)*(lamf-lamp)/(lamr-lamp),0.9*E*kc*Ss/lamf^2))', 'N·mm', 'Mn por pandeo local del ala'],
  ['Mltb' + k, 'IF(Lb' + k + '<=Lp,Mp,IF(Lb' + k + '<=Lr,Mp-(Mp-Mr)*(Lb' + k + '-Lp)/(Lr-Lp),PI()/Lb' + k + '*SQRT(E*Iw*G*J+(PI()*E/Lb' + k + ')^2*Iw*Cw)))', 'N·mm', 'Mn por pandeo lateral-torsional'],
  ['Mn' + k, 'MIN(Mp,Mflb' + k + ',Mltb' + k + ')', 'N·mm', 'Resistencia nominal'], ['phiMn' + k, '0.9*Mn' + k + '/1000000', 'kN·m', 'Resistencia de diseño φb·Mn']];
BENCH.push({
  id: 'N12', grupo: 'reglamento', titulo: 'Flexión de viga soldada: ala no compacta y pandeo lateral-torsional', fuente: SRC_REG3, tol: 1e-4,
  enunciado: 'Viga armada soldada PS (alma 400×8, alas 300×7,5), simétrica, con alma compacta (h/tw = 50) y alas no compactas (b/t = 20, entre λp = 11,1 y λr ≈ 29). Con Lb = 3,00 m (menor que Lp) rige el pandeo local del ala: Mn = Mp − (Mp − Mr)·(λ − λp)/(λr − λp), con FL = Fy − 114 MPa, kc = 4/√(h/tw) y Mr = FL·Sxc. Con Lb = 9,00 m (entre Lp ≈ 3,4 m y Lr ≈ 11,2 m) rige el pandeo lateral-torsional inelástico (Cb = 1), más desfavorable que el pandeo local del ala. Se recalculan los límites Lp y Lr y φb·Mn.',
  perfil: 'PS 415×300×7,5/8 soldada (alma hw = 400, tw = 8; alas 300×7,5).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Fy', 235, 'MPa', 'Tensión de fluencia']]
    .concat(psChain(400, 8, 300, 7.5, 'PS soldada')).concat([
    ['Mp', 'Fy*Zs', 'N·mm', 'Momento plástico'], ['FL', 'Fy-114', 'MPa', 'FL = Fy − 114 MPa (soldadas)'], ['Mr', 'FL*Ss', 'N·mm', 'Mr = FL·Sxc'],
    ['lamf', '(bf/2)/tf', '', 'Esbeltez del ala'], ['lamp', '0.38*SQRT(E/Fy)', '', 'λp del ala'], ['lamr', '0.95*SQRT(kc*E/FL)', '', 'λr del ala (soldada)'],
    ['lamw', 'hw/tw', '', 'Esbeltez del alma'], ['lampw', '3.76*SQRT(E/Fy)', '', 'λp del alma (flexión pura): el alma es compacta si λ ≤ λp'],
    ['Lp', '1.76*rw*SQRT(E/Fy)', 'mm', 'Lp'], ['X1', 'PI()/Ss*SQRT(E*G*J*A/2)', 'MPa', 'X1'], ['X2', '4*Cw/Iw*(Ss/(G*J))^2', '1/MPa²', 'X2'], ['Lr', 'rw*X1/FL*SQRT(1+SQRT(1+X2*FL^2))', 'mm', 'Lr']])
    .concat(flexWelded('1', 3000)).concat(flexWelded('2', 9000)),
  model: p => ({ver: 2, customSections: {'PS 415x300x7.5/8': {type: 'WI', hw: p.hw, tw: p.tw, bft: p.bf, tft: p.tf, bfb: p.bf, tfb: p.tf}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.Lb1, 0, 0, SUP_ROL), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.Lb2, 1000, 0, SUP_ROL)],
    members: [BM(1, 1, 2, 'PS 415x300x7.5/8', {q: {D: 5}}), BM(2, 3, 4, 'PS 415x300x7.5/8', {q: {D: 5}})], combos: [cmb('C1: 1,0·D', {D: 1})]}),
  checks: [
    {l: 'Esbeltez del ala b/t', u: '', ref: {k: 'finfo', m: 1, i: 0, f: 'lam'}, t: 'lamf'},
    {l: 'Límite λp del ala', u: '', ref: {k: 'finfo', m: 1, i: 0, f: 'lp'}, t: 'lamp'},
    {l: 'Límite λr del ala (soldada)', u: '', ref: {k: 'finfo', m: 1, i: 0, f: 'lr'}, t: 'lamr'},
    {l: 'Esbeltez del alma h/tw', u: '', ref: {k: 'finfo', m: 1, i: 1, f: 'lam'}, t: 'lamw'},
    {l: 'Límite λp del alma', u: '', ref: {k: 'finfo', m: 1, i: 1, f: 'lp'}, t: 'lampw'},
    {l: 'Longitud límite plástica Lp', u: 'm', ref: {k: 'cap', m: 1, f: 'Lp'}, t: 'Lp/1000'},
    {l: 'Longitud límite inelástica Lr (FL = Fy − 114)', u: 'm', ref: {k: 'cap', m: 1, f: 'Lr'}, t: 'Lr/1000'},
    {l: 'Viga 1 (Lb ≤ Lp): φb·Mn por pandeo local del ala', u: 'kN·m', ref: {k: 'cap', m: 1, f: 'phiMs'}, t: 'phiMn1'},
    {l: 'Viga 2 (Lp < Lb ≤ Lr): φb·Mn con pandeo lateral-torsional y local', u: 'kN·m', ref: {k: 'cap', m: 2, f: 'phiMs'}, t: 'phiMn2'}]
});

/* ───────────── N13 · segundo orden (viga-columna) con solución exacta ───────────── */
BENCH.push({
  id: 'N13', grupo: 'clasico', titulo: 'Segundo orden: voladizo y viga biapoyada comprimidos (solución exacta de la viga-columna)', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Análisis de segundo orden activado (P-Δ y P-δ, funciones de estabilidad exactas, sin amplificadores B1/B2). Se usa un caño CHS 200×6 para que la rigidez sea la misma en los dos ejes y no pandee primero por el eje débil. (1) Voladizo de 3,00 m con compresión P = 0,6·Pe (Pe = π²EI/(4L²)) y carga lateral H en la punta: δ = (H/(P·k))·(tan kL − kL) y M_base = H·tan(kL)/k, con k = √(P/EI); por primer orden serían H·L³/(3EI) y H·L. (2) Viga biapoyada de 5,00 m con compresión P = 0,5·Pe (Pe = π²EI/L²) y carga uniforme w: M_max = (w·EI/P)·(sec u − 1) y δ_max = (w·EI/P²)·(sec u − 1) − w·L²/(8P), con u = (L/2)·√(P/EI); por primer orden serían wL²/8 y 5wL⁴/(384EI).',
  perfil: 'CHS 200×6: A = 3 598 mm², I = (π/64)·(D⁴ − d⁴), igual en los dos ejes.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['Dc', 200, 'mm', 'Diámetro exterior del caño'], ['tc', 6, 'mm', 'Espesor del caño'], ['I', 'PI()/64*(Dc^4-(Dc-2*tc)^4)', 'mm⁴', 'Inercia del caño (ambos ejes)'], ['EI', 'E*I', 'N·mm²', 'Rigidez a flexión'],
    ['L1', 3000, 'mm', 'Largo del voladizo (1)'], ['Pe1', 'PI()^2*EI/(4*L1^2)', 'N', 'Carga de Euler del voladizo'], ['P1', '0.6*Pe1/1000', 'kN', 'Compresión (1)'], ['H', 2, 'kN', 'Carga lateral en la punta (1)'],
    ['k1', 'SQRT(P1*1000/EI)', '1/mm', 'k = √(P/EI)'], ['d1', 'H*1000/(P1*1000*k1)*(TAN(k1*L1)-k1*L1)', 'mm', 'Flecha de la punta (segundo orden)'], ['d1p', 'H*1000*L1^3/(3*EI)', 'mm', 'Flecha de la punta por primer orden (referencia)'],
    ['M1', 'H*1000*TAN(k1*L1)/k1/1000000', 'kN·m', 'Momento de base (segundo orden)'], ['M1p', 'H*L1/1000', 'kN·m', 'Momento de base por primer orden (referencia)'],
    ['L2', 5000, 'mm', 'Luz de la viga (2)'], ['Pe2', 'PI()^2*EI/L2^2', 'N', 'Carga de Euler de la viga'], ['P2', '0.5*Pe2/1000', 'kN', 'Compresión (2)'], ['w', 6, 'kN/m', 'Carga uniforme (2)'],
    ['u2', 'L2/2*SQRT(P2*1000/EI)', '', 'u = (L/2)·√(P/EI)'], ['Mmax2', 'w*EI/(P2*1000)*(1/COS(u2)-1)/1000000', 'kN·m', 'Momento máximo (segundo orden)'], ['Mmax2p', 'w*L2^2/8/1000000', 'kN·m', 'Momento máximo por primer orden (referencia)'],
    ['dmax2', 'w*EI/(P2*1000)^2*(1/COS(u2)-1)-w*L2^2/(8*P2*1000)', 'mm', 'Flecha máxima (segundo orden)'], ['dmax2p', '5*w*L2^4/(384*EI)', 'mm', 'Flecha máxima por primer orden (referencia)']],
  model: p => ({ver: 2, settings: {order: 2}, customSections: {'CHS 200x6': {type: 'CHS', D: p.Dc, t: p.tc}},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.L1, 0, 0, null, {D: [-p.P1, 0, -p.H]}), BN(3, 0, 1000, 0, SUP_PIN), BN(4, p.L2, 1000, 0, SUP_ROL, {D: [-p.P2, 0, 0]})],
    members: [BM(1, 1, 2, 'CHS 200x6'), BM(2, 3, 4, 'CHS 200x6', {q: {D: p.w}})], combos: [cmb('C1: 1,0·D (segundo orden)', {D: 1})]}),
  checks: [
    {l: '(1) Flecha de la punta = (H/(P·k))·(tan kL − kL)', u: 'mm', ref: {k: 'disp', n: 2, d: 'Uz'}, t: '-d1'},
    {l: '(1) Momento en la base = H·tan(kL)/k', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'M1', abs: 1},
    {l: '(1) Momento en la base leído en la barra (x = 0)', u: 'kN·m', ref: {k: 'mem', m: 1, x: 0, f: 'Mz'}, t: 'M1', abs: 1},
    {l: '(1) Reacción axial = P', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx'}, t: 'P1', abs: 1},
    {l: '(2) Momento máximo de segundo orden = (w·EI/P)(sec u − 1)', u: 'kN·m', ref: {k: 'mem', m: 2, x: .5, f: 'Mz'}, t: 'Mmax2', abs: 1},
    {l: '(2) Flecha máxima de segundo orden', u: 'mm', ref: {k: 'mem', m: 2, x: .5, f: 'vy'}, t: 'dmax2', abs: 1},
    {l: '(2) Reacción vertical en el apoyo = w·L/2', u: 'kN', ref: {k: 'reac', n: 3, d: 'Fz'}, t: 'w*L2/2/1000'},
    {l: '(2) Axil constante = −P', u: 'kN', ref: {k: 'mem', m: 2, x: .5, f: 'N'}, t: '-P2'}]
});

/* ───────────── N14 · combinaciones con 0,9D, S, W y E ───────────── */
BENCH.push({
  id: 'N14', grupo: 'reglamento', titulo: 'Combinaciones de acciones con 0,9D, nieve, viento y sismo (once acciones)', fuente: {t: 'Combinaciones de acciones del CIRSOC 301-2005 (A.4.1) y AISC-LRFD 1999 (A4-1 a A4-6); los factores se cargan en el ejercicio, no se toman del reglamento', url: ''}, tol: 1e-6,
  enunciado: 'Columna en voladizo IPE 200 de 3,00 m con cuatro acciones en la punta: D = 10 kN, L = 6 kN, S = 4 kN (hacia abajo), W = 8 kN y E = 5 kN (horizontales en X). Se arman ocho combinaciones de resistencia (1,4D; 1,2D+1,6L+0,5S; 1,2D+0,5L+1,6S; 1,2D+0,8W+1,6S; 1,2D+1,3W+0,5L+0,5S; 0,9D+1,3W; 1,2D+E+0,5L+0,2S; 0,9D−E) y se verifica que cada una combine las acciones con su factor: reacción vertical, reacción horizontal y momento en la base (estática pura).',
  perfil: 'IPE 200 (tabla).',
  params: [['L', 3000, 'mm', 'Altura de la columna'], ['D', 10, 'kN', 'Acción permanente'], ['Lv', 6, 'kN', 'Sobrecarga'], ['S', 4, 'kN', 'Nieve'], ['W', 8, 'kN', 'Viento horizontal en X'], ['Esis', 5, 'kN', 'Sismo horizontal en X']],
  model: p => { const n = BN(2, 0, 0, p.L, null, {D: [0, 0, -p.D], L: [0, 0, -p.Lv], S: [0, 0, -p.S], Wx: [p.W, 0, 0], Ex: [p.Esis, 0, 0]});
    return {ver: 2, nodes: [BN(1, 0, 0, 0, SUP_FIX), n], members: [BM(1, 1, 2, 'IPE 200')], combos: [
      cmb('U1: 1,4D', {D: 1.4}), cmb('U2: 1,2D+1,6L+0,5S', {D: 1.2, L: 1.6, S: 0.5}), cmb('U3: 1,2D+0,5L+1,6S', {D: 1.2, L: 0.5, S: 1.6}), cmb('U4: 1,2D+1,6S+0,8Wx', {D: 1.2, S: 1.6, Wx: 0.8}),
      cmb('U5: 1,2D+0,5L+0,5S+1,3Wx', {D: 1.2, L: 0.5, S: 0.5, Wx: 1.3}), cmb('U6: 0,9D+1,3Wx', {D: 0.9, Wx: 1.3}), cmb('U7: 1,2D+Ex+0,5L+0,2S', {D: 1.2, Ex: 1, L: 0.5, S: 0.2}), cmb('U8: 0,9D-Ex', {D: 0.9, Ex: -1})]}; },
  checks: [
    {l: 'U1 1,4D: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 0}, t: '1.4*D'},
    {l: 'U2 1,2D+1,6L+0,5S: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 1}, t: '1.2*D+1.6*Lv+0.5*S'},
    {l: 'U3 1,2D+0,5L+1,6S: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 2}, t: '1.2*D+0.5*Lv+1.6*S'},
    {l: 'U4 1,2D+1,6S+0,8W: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 3}, t: '1.2*D+1.6*S'},
    {l: 'U4 1,2D+1,6S+0,8W: reacción horizontal', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx', c: 3}, t: '-0.8*W'},
    {l: 'U5 1,2D+0,5L+0,5S+1,3W: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 4}, t: '1.2*D+0.5*Lv+0.5*S'},
    {l: 'U5 1,2D+0,5L+0,5S+1,3W: momento en la base', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My', c: 4}, t: '1.3*W*L/1000', abs: 1},
    {l: 'U6 0,9D+1,3W: reacción vertical (solo 0,9D)', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 5}, t: '0.9*D'},
    {l: 'U6 0,9D+1,3W: reacción horizontal', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx', c: 5}, t: '-1.3*W'},
    {l: 'U7 1,2D+E+0,5L+0,2S: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 6}, t: '1.2*D+0.5*Lv+0.2*S'},
    {l: 'U7 1,2D+E+0,5L+0,2S: reacción horizontal (solo E)', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx', c: 6}, t: '-Esis'},
    {l: 'U8 0,9D−E: reacción horizontal (sismo invertido)', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fx', c: 7}, t: 'Esis'},
    {l: 'U8 0,9D−E: momento en la base', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My', c: 7}, t: 'Esis*L/1000', abs: 1},
    {l: 'U8 0,9D−E: reacción vertical', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz', c: 7}, t: '0.9*D'}]
});

/* ───────────── N15 · segundo orden con deformación por corte ───────────── */
BENCH.push({
  id: 'N15', grupo: 'clasico', titulo: 'Segundo orden con deformación por corte: viga-columna corta de Timoshenko', fuente: SRC_CL3, tol: 1e-4,
  enunciado: 'Caño CHS 200×6 de 1,00 m, biapoyado, con carga uniforme w y compresión P = 0,5·Pcr, donde la carga crítica con deformación por corte es Pcr = Pe/(1 + Pe/(G·As)) (Engesser; As = A/2, la convención del programa para el caño). La ecuación del momento M″ + κ·M = r·w, con κ = r·P/EI y r = 1/(1 − P/(G·As)), da M_max = (w·EI/P)·(sec u − 1) con u = (L/2)·√(P·r/EI). Se compara el momento máximo, la reacción y el axil; la carga crítica Pcr y el momento sin deformación por corte figuran en los datos como referencia.',
  perfil: 'CHS 200×6 (As = A/2, convención del programa).',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['G', 77200, 'MPa', 'Módulo de corte'], ['Dc', 200, 'mm', 'Diámetro'], ['tc', 6, 'mm', 'Espesor'],
    ['I', 'PI()/64*(Dc^4-(Dc-2*tc)^4)', 'mm⁴', 'Inercia'], ['A', 'PI()/4*(Dc^2-(Dc-2*tc)^2)', 'mm²', 'Área'], ['As', 'A/2', 'mm²', 'Área de corte (A/2)'], ['EI', 'E*I', 'N·mm²', 'Rigidez a flexión'], ['GAs', 'G*As', 'N', 'Rigidez de corte'],
    ['L', 1000, 'mm', 'Luz'], ['Pe', 'PI()^2*EI/L^2', 'N', 'Carga de Euler (sin corte)'], ['Pcr', 'Pe/(1+Pe/GAs)', 'N', 'Carga crítica con deformación por corte'], ['P', '0.5*Pcr/1000', 'kN', 'Compresión aplicada'], ['w', 40, 'kN/m', 'Carga uniforme'],
    ['r', '1/(1-P*1000/GAs)', '', 'Factor de corte r'], ['u', 'L/2*SQRT(P*1000*r/EI)', '', 'u = (L/2)·√(P·r/EI)'], ['Mmax', 'w*EI/(P*1000)*(1/COS(u)-1)/1000000', 'kN·m', 'Momento máximo con corte'],
    ['u0', 'L/2*SQRT(P*1000/EI)', '', 'u sin deformación por corte'], ['Mmax0', 'w*EI/(P*1000)*(1/COS(u0)-1)/1000000', 'kN·m', 'Momento máximo sin deformación por corte (referencia)']],
  model: p => ({ver: 2, settings: {order: 2, shearDef: true}, customSections: {'CHS 200x6': {type: 'CHS', D: p.Dc, t: p.tc}},
    nodes: [BN(1, 0, 0, 0, SUP_PIN), BN(2, p.L, 0, 0, SUP_ROL, {D: [-p.P, 0, 0]})], members: [BM(1, 1, 2, 'CHS 200x6', {q: {D: p.w}})], combos: [cmb('C1: 1,0·D (2.º orden con corte)', {D: 1})]}),
  checks: [
    {l: 'Momento máximo con deformación por corte = (w·EI/P)(sec u − 1)', u: 'kN·m', ref: {k: 'mem', m: 1, x: .5, f: 'Mz'}, t: 'Mmax', abs: 1},
    {l: 'Axil constante = −P', u: 'kN', ref: {k: 'mem', m: 1, x: .5, f: 'N'}, t: '-P'},
    {l: 'Reacción vertical = w·L/2', u: 'kN', ref: {k: 'reac', n: 1, d: 'Fz'}, t: 'w*L/2000'}]
});

/* ───────────── N16 · pórtico plano con P-Δ: contraste con PyNite ───────────── */
BENCH.push({
  id: 'N16', grupo: 'clasico', titulo: 'Pórtico plano empotrado con P-Δ: contraste con PyNite FEA 3.2', fuente: {t: 'Contraste con PyNite FEA 3.2.0 (análisis P-Δ iterativo, cada columna dividida en 16 elementos). Los números son los que entregó PyNite al correr el mismo pórtico; no hay solución cerrada.'}, tol: 1e-3,
  enunciado: 'Pórtico plano de dos columnas IPE 300 de 4,00 m empotradas en la base y un dintel IPE 300 de 6,00 m, con 800 kN de compresión en el tope de cada columna y 20 kN horizontales en el nudo izquierdo; la flexión es en el plano del pórtico (eje fuerte) y los nudos tienen impedido el movimiento fuera del plano para que no rija el pandeo del eje débil. Primer orden: el desplazamiento horizontal da 5,1444 mm igual en los dos programas. Segundo orden: PyNite da 5,8115 mm (+13 %) y 26,676 kN·m de momento de base; el elemento exacto del programa llega a los mismos valores sin dividir las barras. La diferencia chica (≈0,002 % en el momento) se debe a que PyNite usa la matriz geométrica aproximada de cada tramo.',
  perfil: 'IPE 300 (tabla): A = 53,8 cm², Ix = 8 356 cm⁴.',
  params: [['E', 200000, 'MPa', 'Módulo elástico'], ['P', 800, 'kN', 'Compresión en cada columna'], ['H', 20, 'kN', 'Carga horizontal'], ['Hc', 4000, 'mm', 'Altura de las columnas'], ['Lb', 6000, 'mm', 'Luz del dintel'],
    ['ux1', 5.144445820515433, 'mm', 'PyNite, primer orden: desplazamiento horizontal del nudo izquierdo'], ['Mb1', 24.13084965923157, 'kN·m', 'PyNite, primer orden: momento de base izquierdo'],
    ['ux2', 5.811526710965078, 'mm', 'PyNite, segundo orden: desplazamiento horizontal del nudo izquierdo'], ['Mb2', 26.676307317359626, 'kN·m', 'PyNite, segundo orden: momento de base izquierdo'], ['Mb2d', 26.457992357711285, 'kN·m', 'PyNite, segundo orden: momento de base derecho'],
    ['uz2', -2.9537801016877667, 'mm', 'PyNite, segundo orden: descenso del nudo izquierdo']],
  model: p => ({ver: 2, settings: {order: 2},
    nodes: [BN(1, 0, 0, 0, SUP_FIX), BN(2, p.Lb, 0, 0, SUP_FIX), BN(3, 0, 0, p.Hc, [0, 1, 0, 1, 0, 1], {D: [p.H, 0, -p.P]}), BN(4, p.Lb, 0, p.Hc, [0, 1, 0, 1, 0, 1], {D: [0, 0, -p.P]})],
    members: [BM(1, 1, 3, 'IPE 300'), BM(2, 2, 4, 'IPE 300'), BM(3, 3, 4, 'IPE 300')], combos: [cmb('C1: 1,0·D (segundo orden)', {D: 1})]}),
  checks: [
    {l: 'Desplazamiento horizontal del nudo izquierdo (PyNite, segundo orden)', u: 'mm', ref: {k: 'disp', n: 3, d: 'Ux'}, t: 'ux2'},
    {l: 'Momento de base izquierdo (PyNite, segundo orden)', u: 'kN·m', ref: {k: 'reac', n: 1, d: 'My'}, t: 'Mb2', abs: 1},
    {l: 'Momento de base derecho (PyNite, segundo orden)', u: 'kN·m', ref: {k: 'reac', n: 2, d: 'My'}, t: 'Mb2d', abs: 1},
    {l: 'Descenso del nudo izquierdo (PyNite, segundo orden)', u: 'mm', ref: {k: 'disp', n: 3, d: 'Uz'}, t: 'uz2', tol: 2e-3, note: 'La diferencia de ≈0,1 % viene de que el elemento exacto calcula el acortamiento axial sin el efecto de arqueo de PyNite.'}]
});

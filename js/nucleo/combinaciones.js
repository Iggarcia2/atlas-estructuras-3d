// js/nucleo/combinaciones.js
'use strict';
/* Combinaciones de carga por defecto. */
const DEF_COMBOS = [
  {n: 'U1: 1,4D', f: [1.4, 0, 0, 0], type: 'ULS'},
  {n: 'U2: 1,2D+1,6L', f: [1.2, 1.6, 0, 0], type: 'ULS'},
  {n: 'U5: 1,2D+1,6Hx+0,5L', f: [1.2, 0.5, 1.6, 0], type: 'ULS'},
  {n: 'U6: 1,2D-1,6Hx+0,5L', f: [1.2, 0.5, -1.6, 0], type: 'ULS'},
  {n: 'U7: 1,2D+1,6Hy+0,5L', f: [1.2, 0.5, 0, 1.6], type: 'ULS'},
  {n: 'U8: 1,2D-1,6Hy+0,5L', f: [1.2, 0.5, 0, -1.6], type: 'ULS'},
  {n: 'S0: D', f: [1, 0, 0, 0], type: 'SLS', lim: 0},
  {n: 'S1: D+L', f: [1, 1, 0, 0], type: 'SLS', lim: 250},
  {n: 'S2: L', f: [0, 1, 0, 0], type: 'SLS', lim: 300}
];

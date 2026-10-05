// js/nucleo/algebra.js
'use strict';
/* Álgebra pequeña: marco local de la barra, rigidez de la barra, Gauss, Cholesky. */
/* ── Álgebra pequeña ── */
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit(v) { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
function memberFrame(d, L, betaDeg) {
  const ex = [d[0] / L, d[1] / L, d[2] / L];
  const r = Math.abs(ex[2]) > 0.999 ? [1, 0, 0] : [0, 0, 1];
  const dd = r[0] * ex[0] + r[1] * ex[1] + r[2] * ex[2];
  let ey = unit([r[0] - dd * ex[0], r[1] - dd * ex[1], r[2] - dd * ex[2]]);
  let ez = cross(ex, ey);
  if (betaDeg) {
    const c = Math.cos(betaDeg * PI / 180), s = Math.sin(betaDeg * PI / 180);
    const ey2 = [c * ey[0] + s * ez[0], c * ey[1] + s * ez[1], c * ey[2] + s * ez[2]];
    const ez2 = [-s * ey[0] + c * ez[0], -s * ey[1] + c * ez[1], -s * ey[2] + c * ez[2]];
    ey = ey2; ez = ez2;
  }
  return {ex, ey, ez};
}
function kLocal(E, G, A, Is, Iw, J, L) {
  const k = new Float64Array(144), set = (i, j, v) => { k[i * 12 + j] = v; k[j * 12 + i] = v; };
  const EA = E * A / L, GJ = G * J / L;
  set(0, 0, EA); set(6, 6, EA); set(0, 6, -EA);
  set(3, 3, GJ); set(9, 9, GJ); set(3, 9, -GJ);
  let a = 12 * E * Is / L ** 3, b = 6 * E * Is / L ** 2, c = 4 * E * Is / L, d = 2 * E * Is / L;     // flexión en el plano del alma (v en y, giro z)
  set(1, 1, a); set(7, 7, a); set(1, 7, -a); set(1, 5, b); set(1, 11, b); set(5, 7, -b); set(7, 11, -b); set(5, 5, c); set(11, 11, c); set(5, 11, d);
  a = 12 * E * Iw / L ** 3; b = 6 * E * Iw / L ** 2; c = 4 * E * Iw / L; d = 2 * E * Iw / L;           // flexión débil (w en z, giro y)
  set(2, 2, a); set(8, 8, a); set(2, 8, -a); set(2, 4, -b); set(2, 10, -b); set(4, 8, b); set(8, 10, b); set(4, 4, c); set(10, 10, c); set(4, 10, d);
  return k;
}
function solveSmall(M, B, n, m) {                      // M n×n (row-major), B n×m → X (Gauss con pivoteo)
  const A = Float64Array.from(M), X = Float64Array.from(B);
  for (let c = 0; c < n; c++) {
    let p = c, mx = Math.abs(A[c * n + c]);
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r * n + c]) > mx) { mx = Math.abs(A[r * n + c]); p = r; }
    if (mx < 1e-300) return null;
    if (p !== c) { for (let k = 0; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[p * n + k]; A[p * n + k] = t; } for (let k = 0; k < m; k++) { const t = X[c * m + k]; X[c * m + k] = X[p * m + k]; X[p * m + k] = t; } }
    for (let r = c + 1; r < n; r++) {
      const f = A[r * n + c] / A[c * n + c]; if (!f) continue;
      for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k];
      for (let k = 0; k < m; k++) X[r * m + k] -= f * X[c * m + k];
    }
  }
  for (let c = n - 1; c >= 0; c--) {
    for (let k = 0; k < m; k++) { let s = X[c * m + k]; for (let j = c + 1; j < n; j++) s -= A[c * n + j] * X[j * m + k]; X[c * m + k] = s / A[c * n + c]; }
  }
  return X;
}
function mulT12(T, v) {                                // v global(12) → local(12) usando T (filas ex,ey,ez)
  const o = new Float64Array(12);
  for (let b = 0; b < 4; b++) for (let r = 0; r < 3; r++) o[3 * b + r] = T[r][0] * v[3 * b] + T[r][1] * v[3 * b + 1] + T[r][2] * v[3 * b + 2];
  return o;
}
function mulT12t(T, v) {                               // local → global
  const o = new Float64Array(12);
  for (let b = 0; b < 4; b++) for (let r = 0; r < 3; r++) o[3 * b + r] = T[0][r] * v[3 * b] + T[1][r] * v[3 * b + 1] + T[2][r] * v[3 * b + 2];
  return o;
}
function kGlobal(k, T) {                               // T12ᵀ k T12
  const t = new Float64Array(144), o = new Float64Array(144);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {          // t = k·T12
    const jb = Math.floor(j / 3) * 3, jr = j % 3; let s = 0;
    for (let m = 0; m < 3; m++) s += k[i * 12 + jb + m] * T[m][jr];
    t[i * 12 + j] = s;
  }
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {          // o = T12ᵀ·t
    const ib = Math.floor(i / 3) * 3, ir = i % 3; let s = 0;
    for (let m = 0; m < 3; m++) s += T[m][ir] * t[(ib + m) * 12 + j];
    o[i * 12 + j] = s;
  }
  return o;
}
function choleskyLower(A, n, isTrans, tolAbs) {        // A (n×n, triángulo inferior) → L; devuelve -1 si OK o índice del pivote que falló. tolAbs[j] (opcional): pivote mínimo aceptable del GDL j
  const diag0 = new Float64Array(n); for (let i = 0; i < n; i++) diag0[i] = A[i * n + i];
  for (let j = 0; j < n; j++) {
    let s = A[j * n + j]; const rj = j * n;
    for (let k = 0; k < j; k++) { const v = A[rj + k]; s -= v * v; }
    const tol = tolAbs && tolAbs[j] != null ? tolAbs[j] : isTrans[j] ? 1e-9 * diag0[j] : 1e-30;
    if (!(s > tol)) return j;
    const d = Math.sqrt(s); A[rj + j] = d;
    for (let i = j + 1; i < n; i++) {
      const ri = i * n; let t = A[ri + j];
      for (let k = 0; k < j; k++) t -= A[ri + k] * A[rj + k];
      A[ri + j] = t / d;
    }
  }
  return -1;
}
function cholSolve(L, n, b) {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; const r = i * n; for (let k = 0; k < i; k++) s -= L[r + k] * y[k]; y[i] = s / L[r + i]; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
}

/* La verificación de resistencia (memberCapacity / checkAll) está en js/nucleo/diseno.js */


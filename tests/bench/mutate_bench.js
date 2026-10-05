// tests/bench/mutate_bench.js
'use strict';
/* Pruebas de mutación: rompe a propósito una constante o una línea del código y comprueba que los 45 ejercicios lo detectan.
   Si una mutación no se detecta, o su patrón ya no existe en el código, el script termina con error (no se saltea en silencio).
   Escribe informe/mut_results.json, que lee informe/build_xlsx.py. */
const fs=require('fs'), path=require('path');
const C=require('../lib/cargar');
const RUTAS=C.rutas(['nucleo','bench-motor','bench-ejercicios']);
const src=C.leer(RUTAS);
// [descripción, archivo, original, mutación]
const muts=[
 // — funciones ya existentes (v1) —
 ['φc 0,85→0,90','js/nucleo/diseno.js','const PHI_C = 0.85','const PHI_C = 0.90'],
 ['Lp 1,76→1,70','js/nucleo/diseno.js','1.76 * ry * r','1.70 * ry * r'],
 ['interacción 8/9→8/10','js/nucleo/diseno.js','ra + 8 / 9 * mom','ra + 8 / 10 * mom'],
 ['corte 0,6→0,5 (alma)','js/nucleo/diseno.js','0.6 * Fy * P.Aws * Cv','0.5 * Fy * P.Aws * Cv'],
 ['curva de columna 0,658→0,66','js/nucleo/diseno.js','Math.pow(0.658, Q * lc2)','Math.pow(0.66, Q * lc2)'],
 ['pandeo débil usa kls','js/nucleo/diseno.js','Fe_w = PI * PI * E / sq(klw / rw)','Fe_w = PI * PI * E / sq(kls / rw)'],
 ['rigidez torsional GJ +5 %','js/nucleo/solver.js','GJ = mr.GJ / L','GJ = 1.05 * mr.GJ / L'],
 // — cargas de barra (v2) —
 ['carga parcial: ignora el fin b','js/nucleo/solver.js','ld.b == null ? L : Math.min(L, ld.b)','L'],
 ['trapecio: w2 → w1','js/nucleo/solver.js','dist(ci, cv, ld.w1 || 0, ld.w2 || 0, a, b)','dist(ci, cv, ld.w1 || 0, ld.w1 || 0, a, b)'],
 ['carga puntual: signo','js/nucleo/solver.js',"t.pz.push({t: 'F', a, F: -F * cv[2]})","t.pz.push({t: 'F', a, F: F * cv[2]})"],
 ['temperatura uniforme −10 %','js/nucleo/solver.js','t.eps0 += al * (ld.dT || 0)','t.eps0 += 0.9 * al * (ld.dT || 0)'],
 ['gradiente térmico usa b en lugar de h','js/nucleo/solver.js','t.kTy += -al * ld.dTy / (P.h || 1)','t.kTy += -al * ld.dTy / (P.b || 1)'],
 ['carga uniforme en plano débil: signo','js/nucleo/solver.js',"t.pz.push({t: 'U', a, b, w1: -w1 * cv[2], w2: -w2 * cv[2]})","t.pz.push({t: 'U', a, b, w1: w1 * cv[2], w2: w2 * cv[2]})"],
 ['carga puntual en plano débil: signo','js/nucleo/solver.js',"if (cv[2]) t.pz.push({t: 'F', a, F: -F * cv[2]})","if (cv[2]) t.pz.push({t: 'F', a, F: F * cv[2]})"],
 ['momento puntual en plano fuerte: signo','js/nucleo/solver.js',"if (cv[2]) t.py.push({t: 'M', a, M: M * cv[2]})","if (cv[2]) t.py.push({t: 'M', a, M: -M * cv[2]})"],
 ['momento puntual en plano débil: signo','js/nucleo/solver.js',"if (cv[1]) t.pz.push({t: 'M', a, M: M * cv[1]})","if (cv[1]) t.pz.push({t: 'M', a, M: -M * cv[1]})"],
 // — apoyos y uniones —
 ['resorte de giro de apoyo en kN·m mal convertido','js/nucleo/solver.js','n.spr[q] * (q < 3 ? 1 : 1e6)','n.spr[q] * (q < 3 ? 1 : 1e3)'],
 ['asentamiento de giro en grados','js/nucleo/solver.js','* (q < 3 ? 1 : 1e-3)','* (q < 3 ? 1 : 1e-2)'],
 ['resorte de unión mal convertido','js/nucleo/solver.js','s = spr.s * 1e6','s = spr.s * 1e5'],
 // — corte y segundo orden —
 ['área de corte Aws→Aww','js/nucleo/solver.js','1 / (G * P.Aws)','1 / (G * P.Aww)'],
 ['segundo orden sin término P·φ (P-Δ)','js/nucleo/elemento.js','const q1 = st.Q0 / S.r + S.P * st.f1;','const q1 = st.Q0 / S.r;'],
 ['segundo orden: cos con 1 % de error','js/nucleo/elemento.js','p[0] = Math.cos(k * x)','p[0] = Math.cos(0.99 * k * x)'],
 ['cortante-P: κ sin factor r','js/nucleo/elemento.js','kap = P / EI * r;','kap = P / EI;'],
 // — Cb, secciones armadas y pandeo local —
 ['Cb: 4·MB → 3·MB','js/nucleo/diseno.js','2.5 * Mmax + 3 * MA + 4 * MB + 3 * MC','2.5 * Mmax + 3 * MA + 3 * MB + 3 * MC'],
 ['Cb: tope 2,3 → 2,6','js/nucleo/diseno.js','Math.min(2.3, 12.5','Math.min(2.6, 12.5'],
 ['Qs soldadas 0,65 → 0,60','js/nucleo/diseno.js','1.415 - 0.65 * y','1.415 - 0.60 * y'],
 ['λr soldadas compresión 0,64 → 0,60','js/nucleo/diseno.js','lb.welded ? 0.64 * Math.sqrt(kc) * r','lb.welded ? 0.60 * Math.sqrt(kc) * r'],
 ['Fr soldadas 114 → 69','js/nucleo/diseno.js','Fr = lb.welded ? 114 : 69','Fr = lb.welded ? 69 : 69'],
 ['λr ala soldada 0,95 → 0,83 (flexión)','js/nucleo/diseno.js','lb.welded ? 0.95 * Math.sqrt(kc * E / FL) : 0.83','lb.welded ? 0.83 * Math.sqrt(kc * E / FL) : 0.83'],
 ['λp ala 0,38 → 0,40','js/nucleo/diseno.js','const lp = 0.38 * r, lrr = lb.welded','const lp = 0.40 * r, lrr = lb.welded'],
 ['alabeo Cw de la PS +10 %','js/nucleo/perfiles.js','P.Cw = hf * hf * Iyt * Iyb / (Iyt + Iyb)','P.Cw = 1.1 * hf * hf * Iyt * Iyb / (Iyt + Iyb)'],
 // — combinaciones y casos —
 ['el caso S no carga los nudos','js/nucleo/solver.js',"key !== 'T' && key !== 'A') v = p[key]","key !== 'T' && key !== 'A' && key !== 'S') v = p[key]"],
 ['signo del axil','js/nucleo/solver.js','return {N: -q[0] - Wx','return {N: q[0] + Wx'],
];
function run(mut){
  const s=Object.assign({},src);
  if(mut){ const [,f,a,b]=mut; if(!(f in s)) return {err:'archivo desconocido: '+f}; if(!s[f].includes(a)) return {err:'patrón no encontrado'}; s[f]=s[f].split(a).join(b); }
  let X; try { X=C.ejecutar(RUTAS,s,'{BENCH,runBench}'); } catch(e){ return {err:'no compila: '+e.message}; }
  let fe=[],fr=0,total=0; for(const ex of X.BENCH){ let r; try{r=X.runBench(ex);}catch(e){fe.push(ex.id+'!');continue;} if(!r.ok){fe.push(ex.id+'?');continue;} total+=r.rows.length; const b=r.rows.filter(q=>!q.ok); if(b.length){fe.push(ex.id+'('+b.length+')'); fr+=b.length;} }
  return {fe,fr,total};
}
const r0=run(null); console.log('sin mutación → ejercicios que fallan:',r0.fe.length,'· comprobaciones',r0.total, r0.fe.join(' '));
let det=0,und=[],nerr=0; const OUT=[];
for(const m of muts){ const r=run(m); if(r.err){ nerr++; console.log('⚠ '+r.err+'  ←  '+m[0]); continue; }
  const d=r.fe.length>0; if(d) det++; else und.push(m[0]); OUT.push({name:m[0],file:m[1],detected:d,exercises:r.fe.map(x=>x.replace(/\(\d+\)|[!?]/g,'')),rows:r.fr});
  console.log((d?'DETECTADA   ':'NO DETECTADA')+' '+(d?(r.fe.length+' ejerc., '+r.fr+' filas: '+r.fe.slice(0,10).join(' ')):'')+'  ←  '+m[0]); }
fs.mkdirSync(path.join(C.RAIZ,'informe'),{recursive:true});
fs.writeFileSync(path.join(C.RAIZ,'informe','mut_results.json'),JSON.stringify({total:muts.length,detected:det,rows:OUT},null,1));
console.log('\nmutaciones detectadas',det,'de',muts.length,'; sin detectar:',und.join(' | '));
process.exitCode=(und.length||nerr||r0.fe.length)?1:0;

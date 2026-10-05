// tests/unit/test_elem.js
const X=require('../lib/cargar').crear(['js/nucleo/elemento.js'],'{PHI,planeMake,planeSolve,planeEnd,planeEval,planeK,planeFeq}');
let nfail=0; const ok=(c,msg)=>{ if(!c){nfail++; console.log('  ✗',msg);} else console.log('  ✓',msg); };
const rel=(a,b)=>Math.abs(a-b)/Math.max(1e-300,Math.abs(b));
const EI=200000*1943e4, L=4000, E=200000, G=77200, As=1120, gs=1/(G*As);

// 1) P=0, sin corte: matriz de Euler-Bernoulli
{ const k=X.planeK(EI,L,0,0); const a=12*EI/L**3,b=6*EI/L**2,c=4*EI/L,d=2*EI/L;
  const ref=[a,b,-a,b, b,c,-b,d, -a,-b,a,-b, b,d,-b,c]; let m=0; for(let i=0;i<16;i++) m=Math.max(m,Math.abs(k[i]-ref[i])/Math.abs(ref[i]));
  ok(m<1e-10,'k(P=0, EB) = matriz clásica  (err rel máx '+m.toExponential(1)+')'); }
// 2) P=0 con corte: Timoshenko
{ const k=X.planeK(EI,L,0,gs); const Ph=12*EI*gs/L**2, f=EI/((1+Ph)*L**3);
  const ref=[12*f,6*L*f,-12*f,6*L*f, 6*L*f,(4+Ph)*L*L*f,-6*L*f,(2-Ph)*L*L*f, -12*f,-6*L*f,12*f,-6*L*f, 6*L*f,(2-Ph)*L*L*f,-6*L*f,(4+Ph)*L*L*f];
  let m=0; for(let i=0;i<16;i++) m=Math.max(m,Math.abs(k[i]-ref[i])/Math.abs(ref[i]));
  ok(m<1e-10,'k(P=0, Timoshenko, Φ='+Ph.toFixed(4)+') = matriz de Timoshenko  (err '+m.toExponential(1)+')'); }
// 3) continuidad de PHI en |κx²| = 1
{ const x=1000; for(const s of [1,-1]){ const kap=s/(x*x); const a=X.PHI(x,kap*0.9999), b=X.PHI(x,kap*1.0001); let m=0; for(let i=0;i<6;i++) m=Math.max(m,Math.abs(a[i]-b[i])/Math.abs(a[i])); ok(m<5e-4,'Φ continua a ambos lados de |κx²|=1 (κ'+(s>0?'>':'<')+'0), dif '+m.toExponential(1)); } }
// 3b) PHI vs serie directa para κx² grande
{ const x=3000, kap=8/(x*x); const p=X.PHI(x,kap); // serie larga
  const ser=m=>{ let t=Math.pow(x,m); let f=1; for(let i=2;i<=m;i++) f*=i; t/=f; let s=t; for(let n=1;n<80;n++){ t*=-kap*x*x/((2*n+m)*(2*n+m-1)); s+=t; } return s; };
  let mx=0; for(let m=0;m<6;m++) mx=Math.max(mx,rel(p[m],ser(m))); ok(mx<1e-12,'Φ (forma cerrada) = serie larga en κx²=8  (err '+mx.toExponential(1)+')'); }
// 4) simetría y equilibrio con P, carga y corte
for (const [P,g] of [[0,0],[500e3,0],[-300e3,0],[800e3,gs],[-200e3,gs]]) {
  const k=X.planeK(EI,L,P,g); let asym=0; for(let i=0;i<4;i++)for(let j=0;j<4;j++) asym=Math.max(asym,Math.abs(k[i*4+j]-k[j*4+i])/Math.max(1,Math.abs(k[i*4+j])));
  const loads=[{t:'U',a:500,b:3000,w1:2,w2:5},{t:'F',a:1500,F:3000},{t:'M',a:2500,M:4e6}]; const S=X.planeMake(EI,L,P,g,loads,1e-6);
  const d=[1.3,0.002,-0.7,0.001]; const st=X.planeSolve(S,...d); const q=X.planeEnd(S,st);
  // equilibrio: Σ fuerzas transversales y momentos respecto del nudo i (incluyendo P·Δ y momentos de las cargas)
  const sumF=q[0]+q[2]+S.sumF;
  let mom=0; for(const pr of S.real){ if(pr.t==='U'){ const dd=pr.b-pr.a, a=pr.a; mom+=pr.w1*dd*(a+dd/2)+(pr.w2-pr.w1)*dd*(a+dd*2/3)/2; } else if(pr.t==='F') mom+=pr.F*pr.a; else mom+=pr.M; }
  const sumM=q[1]+q[3]+L*q[2]+P*(d[2]-d[0])+mom;
  const scale=Math.abs(q[0])+Math.abs(q[2])+1;
  ok(asym<1e-9 && Math.abs(sumF)<1e-6*scale && Math.abs(sumM)<1e-6*scale*L,'P='+(P/1e3)+' kN, gs='+(g?'sí':'no')+': k simétrica ('+asym.toExponential(0)+'), ΣF='+sumF.toExponential(1)+', ΣM='+sumM.toExponential(1)); }
// 5) cargas críticas por determinante
function det2(a,b,c,d){return a*d-b*c;}
function bisect(f,lo,hi){ for(let i=0;i<200;i++){ const mid=(lo+hi)/2; if(f(lo)*f(mid)<=0) hi=mid; else lo=mid; } return (lo+hi)/2; }
const Pe=Math.PI**2*EI/L**2;
{ // biarticulada: bloque de giros
  const f=P=>{ const k=X.planeK(EI,L,P,0); return det2(k[5],k[7],k[13],k[15]); };
  const P=bisect(f,0.2*Pe,1.8*Pe); ok(rel(P,Pe)<1e-8,'Pcr biarticulada = π²EI/L²  (P/Pe='+(P/Pe).toFixed(9)+')'); }
{ // voladizo: bloque (u2, φ2) libres
  const f=P=>{ const k=X.planeK(EI,L,P,0); return det2(k[10],k[11],k[14],k[15]); };
  const P=bisect(f,0.05*Pe,0.6*Pe); ok(rel(P,Pe/4)<1e-8,'Pcr voladizo = π²EI/(4L²)  (P/(Pe/4)='+(P/(Pe/4)).toFixed(9)+')'); }
{ // empotrada-articulada: u1=φ1=u2=0, φ2 libre
  const f=P=>{ const k=X.planeK(EI,L,P,0); return k[15]; };
  const P=bisect(f,1.0*Pe,3.5*Pe); ok(rel(P,2.046*Pe)<1e-3,'Pcr empotrada-articulada ≈ 2,046·Pe (=20,19EI/L²)  (P/Pe='+(P/Pe).toFixed(4)+')'); }
{ // con corte: Engesser  1/Pcr = 1/Pe + 1/GAs
  const f=P=>{ const k=X.planeK(EI,L,P,gs); return det2(k[5],k[7],k[13],k[15]); };
  const Pt=bisect(f,0.2*Pe,1.2*Pe), Pen=1/(1/Pe+1/(G*As)); ok(rel(Pt,Pen)<1e-8,'Pcr con corte (Engesser) = Pe/(1+Pe/GAs)  (P/Pen='+(Pt/Pen).toFixed(9)+')'); }
// 6) viga-columna biarticulada con q uniforme: M máx (2º orden) y flecha
for(const r of [0.1,0.3,0.6]){
  const P=r*Pe, q=1, S=X.planeMake(EI,L,P,0,[{t:'U',a:0,b:L,w1:q,w2:q}],0);
  const k=X.planeK(EI,L,P,0), feq=X.planeFeq(S);
  // resolver giros con u1=u2=0:  [k22 k24;k42 k44]{φ} = feq[1,3]
  const A=[[k[5],k[7]],[k[13],k[15]]], b=[feq[1],feq[3]], dt=det2(A[0][0],A[0][1],A[1][0],A[1][1]);
  const f1=(b[0]*A[1][1]-A[0][1]*b[1])/dt, f2=(A[0][0]*b[1]-A[1][0]*b[0])/dt;
  const st=X.planeSolve(S,0,f1,0,f2); const mid=X.planeEval(S,st,L/2);
  const kk=Math.sqrt(P/EI), u=kk*L/2, Mth=q/(kk*kk)*(1/Math.cos(u)-1);
  const ft=5*q*L**4/(384*EI)*12/(5*u**4)*(2/Math.cos(u)-2-u*u);
  // con signo: la carga +q genera curvatura + (EI u''>0) hacia +ũ? M(x)=EI u'' → en el centro u''<0
  ok(rel(Math.abs(mid.M),Mth)<1e-9 && rel(Math.abs(mid.u),ft)<1e-9,'P/Pe='+r+': M centro '+(Math.abs(mid.M)/1e6).toFixed(6)+' vs '+(Mth/1e6).toFixed(6)+' kN·m ; flecha '+Math.abs(mid.u).toFixed(6)+' vs '+ft.toFixed(6)+' mm'); }
// 7) tracción: la flecha disminuye (viga con tracción P=-0.5Pe) vs fórmula con tanh/sech
{ const P=-0.5*Pe, q=1, S=X.planeMake(EI,L,P,0,[{t:'U',a:0,b:L,w1:q,w2:q}],0);
  const k=X.planeK(EI,L,P,0), feq=X.planeFeq(S);
  const A=[[k[5],k[7]],[k[13],k[15]]], b=[feq[1],feq[3]], dt=det2(A[0][0],A[0][1],A[1][0],A[1][1]);
  const f1=(b[0]*A[1][1]-A[0][1]*b[1])/dt, f2=(A[0][0]*b[1]-A[1][0]*b[0])/dt; const st=X.planeSolve(S,0,f1,0,f2); const mid=X.planeEval(S,st,L/2);
  const T=-P, kk=Math.sqrt(T/EI), u=kk*L/2, Mth=q/(kk*kk)*(1-1/Math.cosh(u));   // M = (q/k²)(1 − sech u)
  ok(rel(Math.abs(mid.M),Mth)<1e-9,'tracción P=−0,5Pe: M centro '+(Math.abs(mid.M)/1e6).toFixed(6)+' vs '+(Mth/1e6).toFixed(6)+' kN·m'); }
// 8) carga puntual + momento: viga simple 1er orden contra fórmulas
{ const S=X.planeMake(EI,L,0,0,[{t:'F',a:1000,F:10000}],0), k=X.planeK(EI,L,0,0), feq=X.planeFeq(S);
  const A=[[k[5],k[7]],[k[13],k[15]]], b=[feq[1],feq[3]], dt=det2(A[0][0],A[0][1],A[1][0],A[1][1]);
  const f1=(b[0]*A[1][1]-A[0][1]*b[1])/dt, f2=(A[0][0]*b[1]-A[1][0]*b[0])/dt; const st=X.planeSolve(S,0,f1,0,f2);
  const a=1000,bb=3000,Pf=10000, Mmax=Pf*a*bb/L, v=Pf*bb*a*(L*L-bb*bb-a*a)/(6*EI*L)*0; // flecha en x=a:
  const va=Pf*a*a*bb*bb/(3*EI*L); const ea=X.planeEval(S,st,a);
  ok(rel(Math.abs(ea.M),Mmax)<1e-9 && rel(Math.abs(ea.u),va)<1e-9,'carga puntual: M(a)='+(Math.abs(ea.M)/1e6).toFixed(5)+' vs '+(Mmax/1e6).toFixed(5)+' kN·m ; f(a)='+Math.abs(ea.u).toFixed(5)+' vs '+va.toFixed(5)+' mm'); }
console.log(nfail?('FALLAS: '+nfail):'TODO OK');
process.exitCode=nfail?1:0;

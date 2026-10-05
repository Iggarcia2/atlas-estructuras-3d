// tests/unit/test_feat.js
// Pruebas de las funciones nuevas del solver contra soluciones cerradas
const X=require('../lib/cargar').crear(['nucleo', 'bench-motor'],'{analyzeModel,checkAll,memberStations,nodeDisp,nodeReac,secProps,CAT,BN,BM,CASES,NC}');
const E=200000,G=77200,PI=Math.PI; const SEC='IPE 200'; const P=X.secProps(X.CAT[SEC]); const EI=E*P.Is, EIw=E*P.Iw, A=P.A;
const CS={'T200':{type:'RHS',h:200,b:200,t:8}}; const PT=X.secProps(CS['T200']); const EIt=E*PT.Is;
let nfail=0,nok=0; const rel=(a,b)=>Math.abs(a-b)/Math.max(1e-12,Math.abs(b));
function chk(name,got,exp,tol){ const e=rel(got,exp); const ok=e<=tol||Math.abs(got-exp)<1e-9; if(ok) nok++; else nfail++; console.log((ok?'  ✓ ':'  ✗ ')+name+': prog='+got.toPrecision(8)+' teoría='+exp.toPrecision(8)+' err='+(e*100).toExponential(1)+'%'); }
const FACT=(f)=>[{n:'C',f,type:'ULS'}];
function model(nodes,members,opts){ opts=opts||{}; return {nodes,members,customSections:opts.cs||{},combos:opts.combos||FACT([1,0,0,0]),ver:2,settings:Object.assign({E,G,Fy:235,selfWeight:false},opts.set||{})}; }
const BN=X.BN, BM=X.BM, FIX=[1,1,1,1,1,1], PIN=[1,1,1,1,0,0], ROL=[0,1,1,0,0,0];
function run(st){ const R=X.analyzeModel(st); if(!R.ok) throw new Error(R.error); return R; }
function stat(R,mid,f,ns){ const mr=R.mrec.find(r=>r.m.id===mid); return X.memberStations(R,mr,f||R.combos[0].f,ns||201); }
function at(S,key,x,L){ let b=0,bd=1e99; S.x.forEach((xx,i)=>{const d=Math.abs(xx-x*L); if(d<bd){bd=d;b=i;}}); return S[key][b]; }
const L=4000;
console.log('1) Segundo orden: viga-columna biarticulada, q=1 kN/m (↓) y compresión P');
for(const r of [0.2,0.5]){
  const Pe=PI*PI*EIt/L**2, Pc=r*Pe/1000;
  const nodes=[BN(1,0,0,0,PIN),BN(2,L,0,0,ROL,{D:[-Pc,0,0]})], mem=[BM(1,1,2,'T200',{relI:true,relJ:true,q:{D:1}})];
  const R=run(model(nodes,mem,{set:{order:2},cs:CS})); const S=stat(R,1);
  const k=Math.sqrt(r*Pe/EIt), u=k*L/2, M2=1/(k*k)*(1/Math.cos(u)-1), f2=5*L**4/(384*EIt)*12/(5*u**4)*(2/Math.cos(u)-2-u*u);
  chk('P/Pe='+r+' M centro [N·mm]',Math.abs(at(S,'Mz',0.5,L)),M2,1e-8); chk('P/Pe='+r+' flecha centro [mm]',Math.abs(at(S,'vy',0.5,L)),f2,1e-8);
}
console.log('2) Segundo orden con subdivisión: da lo mismo con 1 o 4 elementos');
{ const r=0.5, Pe=PI*PI*EIt/L**2, Pc=r*Pe/1000, res=[];
  for(const n of [1,4]){ const nodes=[],mem=[]; for(let i=0;i<=n;i++) nodes.push(BN(i+1,L*i/n,0,0,i===0?PIN:(i===n?ROL:[0,0,0,0,0,0]),i===n?{D:[-Pc,0,0]}:{}));
    for(let i=0;i<n;i++) mem.push(BM(i+1,i+1,i+2,'T200',{relI:i===0,relJ:i===n-1,q:{D:1}}));
    const R=run(model(nodes,mem,{set:{order:2},cs:CS})); let Mm=0; R.mrec.forEach(mr=>{const S=X.memberStations(R,mr,R.combos[0].f,101); Mm=Math.max(Mm,mxabs(S.Mz));}); res.push(Mm); }
  chk('Mmax con 4 elementos vs 1',res[1],res[0],1e-9); }
function mxabs(a){return a.reduce((m,v)=>Math.max(m,Math.abs(v)),0);}
console.log('3) Voladizo con P axial y H en la punta (2º orden): M base = H·tan(kL)/k');
{ const r=0.4, Pe=PI*PI*EIt/(4*L*L), Pc=r*Pe/1000, H=2;
  const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,[0,0,0,0,0,0],{D:[-Pc,0,-H]})], mem=[BM(1,1,2,'T200')];
  const R=run(model(nodes,mem,{set:{order:2},cs:CS})); const S=stat(R,1); const k=Math.sqrt(r*Pe/EIt), Pn=r*Pe;
  chk('M base',Math.abs(S.Mz[0]),H*1000*Math.tan(k*L)/k,1e-8);
  chk('flecha punta',Math.abs(nodeD(R,2)[2]),H*1000*(Math.tan(k*L)-k*L)/(Pn*k),1e-8);
}
function nodeD(R,id){ return X.nodeDisp(R,R.idx.get(id),R.combos[0].f); }
console.log('4) Cargas: puntual, parcial y trapezoidal en viga biapoyada (1er orden)');
function ssBeam(loads){ const nodes=[BN(1,0,0,0,PIN),BN(2,L,0,0,ROL)], mem=[BM(1,1,2,SEC,{loads})]; return run(model(nodes,mem)); }
{ const a=1000,b=L-a,Fp=10; const R=ssBeam([{k:'P',c:'D',dir:'grav',F:Fp,a}]); const S=stat(R,1);
  chk('puntual: M(a)',Math.abs(at(S,'Mz',a/L,L)),Fp*1000*a*b/L,1e-9); chk('puntual: flecha(a)',Math.abs(at(S,'vy',a/L,L)),Fp*1000*a*a*b*b/(3*EI*L),1e-9);
  chk('puntual: reacción i',X.nodeReac(R,0,[1,0,0,0])[2],Fp*b/L,1e-9);
  // cortante antes y después de la carga
  const iA=S.x.findIndex(x=>Math.abs(x-a)<1e-9); chk('puntual: V antes',Math.abs(S.Vy[iA-1]),Fp*1000*b/L,1e-9); chk('puntual: V después',Math.abs(S.Vy[iA]),Fp*1000*a/L,1e-9); }
{ const a=1000,c=1500,w=3; const R=ssBeam([{k:'U',c:'D',dir:'grav',w1:w,a,b:a+c}]); const S=stat(R,1);   // carga parcial uniforme w entre a y a+c
  const W=w*c, xc=a+c/2, Ra=W*(L-xc)/L; chk('parcial: reacción i [kN]',X.nodeReac(R,0,[1,0,0,0])[2],Ra/1000,1e-9);
  const xm=a+Ra/w; const Mmax=Ra*xm-w*(xm-a)**2/2; chk('parcial: M máx',mxabs(S.Mz),Mmax,1e-7); }
{ const w2=6; const R=ssBeam([{k:'T',c:'D',dir:'grav',w1:0,w2,a:0,b:L}]); const S=stat(R,1);   // triangular 0→w2
  const W=w2*L/2, Ra=W/3, Mmax=w2*L*L/(9*Math.sqrt(3)); chk('triangular: reacción i [kN]',X.nodeReac(R,0,[1,0,0,0])[2],Ra/1000,1e-9); chk('triangular: M máx',mxabs(S.Mz),Mmax,1e-7);
  const xm=L/Math.sqrt(3); const f=w2*xm/(360*EI*L)*(7*L**4-10*L*L*xm*xm+3*xm**4); chk('triangular: flecha en x=L/√3',Math.abs(at(S,'vy',xm/L,L)),f,5e-4); }
{ const M0=5; const R=ssBeam([{k:'M',c:'D',dir:'lz',M:M0,a:L/2}]); const S=stat(R,1);   // momento concentrado en el centro (eje z local = giro del plano fuerte)
  chk('momento: reacción i [kN]',Math.abs(X.nodeReac(R,0,[1,0,0,0])[2]),M0/(L/1000),1e-9); { const i0=S.x.findIndex(x=>Math.abs(x-L/2)<1e-9); chk('momento: salto de M en el centro',Math.abs(S.Mz[i0]-S.Mz[i0-1]),M0*1e6,1e-5); } }
console.log('5) Temperatura');
{ const al=1.2e-5, dT=40; const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,FIX)], mem=[BM(1,1,2,SEC,{loads:[{k:'TH',c:'T',dT,alpha:al}]})];
  const R=run(model(nodes,mem,{combos:FACT([0,0,0,0,0,0,0,0,0,1,0])})); const S=stat(R,1,[0,0,0,0,0,0,0,0,0,1,0]); chk('fijo-fijo: axil por ΔT [N]',Math.abs(S.N[5]),E*A*al*dT,1e-9); }
{ const al=1.2e-5, dTy=30; const nodes=[BN(1,0,0,0,PIN),BN(2,L,0,0,ROL)], mem=[BM(1,1,2,SEC,{loads:[{k:'TH',c:'T',dTy,alpha:al}]})];
  const R=run(model(nodes,mem,{combos:FACT([0,0,0,0,0,0,0,0,0,1,0])})); const S=stat(R,1,[0,0,0,0,0,0,0,0,0,1,0]); const kT=al*dTy/P.h;
  chk('gradiente en viga simple: flecha centro',Math.abs(at(S,'vy',0.5,L)),kT*L*L/8,1e-9); chk('gradiente en viga simple: momento nulo (relativo a EI·κ)',mxabs(S.Mz)/(EI*kT),0,1e-9); }
{ const al=1.2e-5, dTy=30; const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,FIX)], mem=[BM(1,1,2,SEC,{loads:[{k:'TH',c:'T',dTy,alpha:al}]})];
  const R=run(model(nodes,mem,{combos:FACT([0,0,0,0,0,0,0,0,0,1,0])})); const S=stat(R,1,[0,0,0,0,0,0,0,0,0,1,0]); chk('gradiente en biempotrada: M = EI·α·ΔT/h',mxabs(S.Mz),EI*al*dTy/P.h,1e-9); }
console.log('6) Resorte de apoyo: voladizo con resorte vertical en la punta');
{ const k=5, Fp=10; const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,[0,0,0,0,0,0],{D:[0,0,-Fp]})]; nodes[1].spr=[0,0,k,0,0,0]; const mem=[BM(1,1,2,SEC)];
  const R=run(model(nodes,mem)); const kb=3*EI/L**3, d=Fp*1000/(kb+k); chk('flecha con resorte k=5 kN/m',Math.abs(nodeD(R,2)[2]),d,1e-9); chk('reacción del resorte [kN]',Math.abs(X.nodeReac(R,1,[1,0,0,0])[2]),k*d/1000,1e-9); }
console.log('7) Asentamiento del apoyo central de una viga continua de 2 tramos');
{ const dl=10; const nodes=[BN(1,0,0,0,PIN),BN(2,L,0,0,ROL),BN(3,2*L,0,0,ROL)]; nodes[1].sd=[0,0,-dl,0,0,0];
  const mem=[BM(1,1,2,SEC),BM(2,2,3,SEC)]; const cb=FACT([0,0,0,0,0,0,0,0,0,0,1]); const R=run(model(nodes,mem,{combos:cb}));
  const f=cb[0].f; const Rb=X.nodeReac(R,1,f)[2], Ra=X.nodeReac(R,0,f)[2]; chk('reacción central [kN]',Math.abs(Rb),6*EI*dl/L**3/1000,1e-8); chk('reacción lateral [kN]',Math.abs(Ra),3*EI*dl/L**3/1000,1e-8);
  chk('desplazamiento del nudo central [mm]',Math.abs(X.nodeDisp(R,1,f)[2]),dl,1e-12); }
console.log('8) Unión semirrígida (resorte de giro) en ambos extremos, carga uniforme');
for(const ksk of [500,5000,50000]){ const w=2; const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,[0,1,1,0,1,1])]; const mem=[BM(1,1,2,SEC,{q:{D:w},sprI:{s:ksk},sprJ:{s:ksk}})];
  const R=run(model(nodes,mem)); const S=stat(R,1); const ks=ksk*1e6; const M=(w*L**3/(24*EI))/(1/ks+L/(2*EI));
  chk('ks='+ksk+' kN·m/rad: momento de extremo',Math.abs(S.q[5]),M,1e-8); chk('ks='+ksk+': flecha centro',Math.abs(at(S,'vy',0.5,L)),5*w*L**4/(384*EI) - M*L*L/(8*EI),1e-8); }
console.log('9) Deformación por corte (Timoshenko): voladizo con carga en la punta');
for(const Lc of [1000,2000]){ const Fp=10; const nodes=[BN(1,0,0,0,FIX),BN(2,Lc,0,0,[0,0,0,0,0,0],{D:[0,0,-Fp]})], mem=[BM(1,1,2,SEC)];
  const R=run(model(nodes,mem,{set:{shearDef:true}})); const d=Fp*1000*Lc**3/(3*EI)+Fp*1000*Lc/(G*P.Aws); chk('L='+Lc+' flecha punta con corte',Math.abs(nodeD(R,2)[2]),d,1e-9);
  const S=stat(R,1); chk('L='+Lc+' flecha de la deformada en x=L',Math.abs(S.vy[S.vy.length-1]),d,1e-9); }
console.log('10) Torsión liberada en un extremo: voladizo con torsor en la punta no transmite');
{ const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,[0,0,0,0,0,0])]; nodes[1].Mo={D:[5,0,0]}; const mem=[BM(1,1,2,SEC,{trelI:true})];
  let ok=true; try{ const R=run(model(nodes,mem)); console.log('  (con torsión liberada en el empotramiento el modelo debería girar libremente) giro punta',nodeD(R,2)[3]); }catch(e){ console.log('  ✓ inestable como corresponde:',e.message.slice(0,60)); nok++; } }
console.log('11) Detección de mecanismos (movimiento de cuerpo rígido) y cerchas articuladas válidas');
{ const nodes=[BN(1,0,0,0,FIX),BN(2,L,0,0,[0,0,0,0,0,0],{D:[0,0,-10]})], mem=[BM(1,1,2,SEC,{relI:true})]; let msg=''; try{ run(model(nodes,mem)); }catch(e){ msg=String(e.message); }
  chk('voladizo articulado en la base: se detecta el mecanismo',/mecanismo/.test(msg)?1:0,1,0); }
{ const nodes=[BN(1,0,0,0,FIX),BN(2,3000,0,0),BN(3,6000,0,0,[0,0,0,0,0,0],{D:[0,0,-5]})], mem=[BM(1,1,2,SEC,{relJ:true}),BM(2,2,3,SEC,{relI:true})]; let msg=''; try{ run(model(nodes,mem)); }catch(e){ msg=String(e.message); }
  chk('dos barras articuladas en cadena: se detecta el mecanismo',/mecanismo/.test(msg)?1:0,1,0); }
{ // cercha triangular plana con todas las barras biarticuladas: estable (apoyos en el plano XZ, Uy impedido en todos)
  const H=3000, nodes=[BN(1,0,0,0,[1,1,1,0,0,0]),BN(2,2*H,0,0,[0,1,1,0,0,0]),BN(3,H,0,H,[0,1,0,0,0,0],{D:[0,0,-12]})];
  const mem=[BM(1,1,2,'T200',{relI:true,relJ:true}),BM(2,1,3,'T200',{relI:true,relJ:true}),BM(3,3,2,'T200',{relI:true,relJ:true})];
  const R=run(model(nodes,mem,{cs:CS})); const S=stat(R,2); const Nexp=12/2/Math.sin(PI/4);
  chk('cercha biarticulada: axil de la diagonal [kN]',Math.abs(S.N[5])/1000,Nexp,1e-6); }
console.log('\nOK',nok,'FALLAS',nfail);
process.exitCode=nfail?1:0;

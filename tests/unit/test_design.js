// tests/unit/test_design.js
// Pruebas del módulo de verificación (p2c_design.js): Cb, pandeo local, secciones armadas, corte
const X=require('../lib/cargar').crear(['nucleo', 'bench-motor'],'{analyzeModel,checkAll,memberStations,memberCapacity,compCap,strongEngine,weakEngine,shearCap,secProps,CAT,BN,BM,CASES,compLocal,solveQ,beStiff,qsOut,effModulus}');
const E=200000,G=77200,PI=Math.PI; let nok=0,nfail=0; const rel=(a,b)=>Math.abs(a-b)/Math.max(1e-12,Math.abs(b));
function chk(name,got,exp,tol){ const e=rel(got,exp); const ok=e<=tol; if(ok) nok++; else nfail++; console.log((ok?'  ✓ ':'  ✗ ')+name+': prog='+got.toPrecision(8)+' ref='+exp.toPrecision(8)+' err='+(e*100).toExponential(1)+'%'); }
function flag(name,c){ if(c) nok++; else nfail++; console.log((c?'  ✓ ':'  ✗ ')+name); }
const BN=X.BN, BM=X.BM, PIN=[1,1,1,1,0,0], ROL=[0,1,1,0,0,0], L=6000;
function run(st){ const R=X.analyzeModel(st); if(!R.ok) throw new Error(R.error); X.checkAll(st,R); return R; }
function beam(loads,q,sec,opts){ opts=opts||{}; const nodes=[BN(1,0,0,0,PIN),BN(2,L,0,0,ROL)]; if(opts.Mo){ nodes[0].Mo={D:[0,opts.Mo[0],0]}; nodes[1].Mo={D:[0,opts.Mo[1],0]}; }
  const st={nodes,members:[BM(1,1,2,sec||'IPE 300',{loads:loads||[],q:q||{}, ...(opts.mem||{})})],customSections:opts.cs||{},combos:[{n:'C',f:[1,0,0,0],type:'ULS'}],ver:2,settings:Object.assign({E,G,Fy:235,selfWeight:false},opts.set||{})}; return run(st); }
console.log('1) Cb del diagrama de momentos (viga biapoyada, Lb = L)');
{ let R=beam([],{D:5}); chk('carga uniforme: Cb = 12,5/(2,5+3·0,75+4+3·0,75) = 1,136',R.checks[0].best.Cb,12.5/11,1e-9);
  R=beam([{k:'P',c:'D',dir:'grav',F:50,a:L/2}]); chk('carga puntual al centro: Cb = 1,316',R.checks[0].best.Cb,12.5/9.5,1e-9);
  R=beam([{k:'P',c:'D',dir:'grav',F:50,a:L/3},{k:'P',c:'D',dir:'grav',F:50,a:2*L/3}]);
  // dos cargas en tercios: M(L/4)=0.75·PL/3·... exacto por superposición
  { const P=50e3, M=x=>x<=L/3?P*x:x<=2*L/3?P*L/3:P*(L-x); const Mm=M(L/3),A=M(L/4),B=M(L/2),C=M(3*L/4); chk('dos cargas en tercios (≈1,01)',R.checks[0].best.Cb,12.5*Mm/(2.5*Mm+3*A+4*B+3*C),1e-9); }
  R=beam([],{},'IPE 300',{Mo:[10,-10]}); chk('momentos iguales en los extremos (curvatura simple): Cb = 1',R.checks[0].best.Cb,1,1e-9);
  R=beam([],{},'IPE 300',{Mo:[10,10]}); chk('momentos iguales y opuestos (doble curvatura): Cb = 2,27',R.checks[0].best.Cb,12.5/5.5,1e-9);
  R=beam([],{D:5},'IPE 300',{set:{cbMode:'unit'}}); chk('modo Cb = 1 forzado',R.checks[0].best.Cb,1,1e-12);
  R=beam([],{D:5},'IPE 300',{mem:{cb:1.5}}); chk('Cb impuesto por barra',R.checks[0].best.Cb,1.5,1e-12);
  // voladizo: Cb = 1
  { const nodes=[BN(1,0,0,0,[1,1,1,1,1,1]),BN(2,3000,0,0,[0,0,0,0,0,0],{D:[0,0,-5]})]; const st={nodes,members:[BM(1,1,2,'IPE 300',{})],customSections:{},combos:[{n:'C',f:[1,0,0,0],type:'ULS'}],ver:2,settings:{E,G,Fy:235,selfWeight:false}}; const R2=run(st); chk('voladizo con extremo libre: Cb = 1',R2.checks[0].best.Cb,1,1e-12); } }
console.log('2) Cb sube el momento resistente en la zona inelástica y elástica');
{ const R=beam([],{D:5}); const cap=R.checks[0].cap, b=R.checks[0].best; const m1=cap.MnS(1,1,0).Mn, mc=cap.MnS(b.Cb,1,0).Mn;
  chk('IPE300, L=6 m, UDL: φMn(Cb)/φMn(1) = min(Mp, Cb·…)',mc,Math.min(cap.Mp,m1*b.Cb),1e-9); }
console.log('3) Perfil I soldado doblemente simétrico (compacto): contra fórmulas independientes');
{ const sec={type:'WI',hw:500,tw:8,bft:200,tft:14,bfb:200,tfb:14}; const P=X.secProps(sec); const Fy=235, r=Math.sqrt(E/Fy);
  const cap=X.memberCapacity({E,G,Fy},P,4000,4000,4000);
  const A=P.A, Ix=P.Is, Iy=P.Iw, Sx=Ix/(P.h/2), Zx=200*14*514*1+8*500*500/4; const Mp=Fy*Zx;
  chk('Zx plástico',P.Zs,Zx,1e-12);
  const ry=Math.sqrt(Iy/A), Lp=1.76*ry*r, FL=Fy-114, J=(2*200*14**3+500*8**3)/3, Cw=(14*200**3/12)*514**2/2;
  const X1=PI/Sx*Math.sqrt(E*G*J*A/2), X2=4*Cw/Iy*(Sx/(G*J))**2, Lr=ry*X1/FL*Math.sqrt(1+Math.sqrt(1+X2*FL*FL)), Mr=FL*Sx;
  chk('Lp',cap.Lp,Lp,1e-9); chk('Lr (Fr = 114 MPa, soldada)',cap.Lr,Lr,1e-9);
  const Lb=4000, Mn = Lb<=Lp?Mp:Lb<=Lr?Math.min(Mp,Mp-(Mp-Mr)*(Lb-Lp)/(Lr-Lp)):Math.min(Mp,PI/Lb*Math.sqrt(E*Iy*G*J+(PI*E/Lb)**2*Iy*Cw));
  chk('φMn (Cb=1) LTB con Lb=4 m',cap.phiMs,0.9*Mn,1e-9);
  // la alma es 500/8 = 62,5 (compacta), ala 100/14 = 7,1 (compacta)
  flag('clasificación: ala y alma compactas',cap.cls.ala==='compacta'&&cap.cls.alma==='compacta'); }
console.log('4) Pandeo local de ala (soldada): tabla de transición continua en λp y λr');
{ const Fy=235, R0={E,G,Fy}; const r=Math.sqrt(E/Fy); const mk=tf=>({type:'WI',hw:600,tw:10,bft:300,tft:tf,bfb:300,tfb:tf});
  const kc=Math.min(0.763,Math.max(0.35,4/Math.sqrt(600/10))), FL=Fy-114, lp=0.38*r, lr=0.95*Math.sqrt(kc*E/FL);
  const f=lam=>{ const tf=150/lam; const P=X.secProps(mk(tf)); const cap=X.memberCapacity(R0,P,100,100,100); return cap.MnS(1,1,0).Mn/cap.Mp; };
  const e=1e-6; chk('Mn/Mp continuo en λp',f(lp*(1+e)),f(lp*(1-e)),1e-4); chk('Mn/Mp continuo en λr (salto propio de las constantes 0,95 vs √0,9)',f(lr*(1+e)),f(lr*(1-e)),5e-3);
  flag('Mn/Mp = 1 en λ < λp',Math.abs(f(lp*0.9)-1)<1e-12); flag('Mn decrece con λ>λp',f(lp*1.1)<1&&f(lr*0.99)<f(lp*1.1)&&f(lr*1.3)<f(lr*0.99));
  // valor independiente en λ = 0,5(λp+λr)
  const lam=(lp+lr)/2, tf=150/lam, P=X.secProps(mk(tf)); const cap=X.memberCapacity(R0,P,100,100,100), Sx=P.Is/(P.h/2), Mp=Fy*P.Zs, Mr=FL*Sx;
  chk('ala no compacta: Mn = Mp − (Mp−Mr)(λ−λp)/(λr−λp)',cap.MnS(1,1,0).Mn,Mp-(Mp-Mr)*(lam-lp)/(lr-lp),1e-9);
  const lam2=1.4*lr, tf2=150/lam2, P2=X.secProps(mk(tf2)); const cap2=X.memberCapacity(R0,P2,100,100,100), Sx2=P2.Is/(P2.h/2);
  chk('ala esbelta: Mn = 0,9·E·kc·Sx/λ²',cap2.MnS(1,1,0).Mn,0.9*E*kc*Sx2/(lam2*lam2),1e-9); }
console.log('5) Compresión con elementos esbeltos (Q)');
{ const Fy=235, R0={E,G,Fy}, r=Math.sqrt(E/Fy);
  // ala esbelta laminada: usa un I armado con ala b/t grande pero 'rolled' no existe → armado: kc
  const sec={type:'WI',hw:400,tw:8,bft:360,tft:8,bfb:360,tfb:8}; const P=X.secProps(sec); // b/t = 22,5
  const kc=Math.min(0.763,Math.max(0.35,4/Math.sqrt(400/8))); const lam=22.5, x=lam*Math.sqrt(Fy/E)/Math.sqrt(kc);
  const Qs = x<=0.64?1:x<=1.17?1.415-0.65*x:0.90/(x*x);
  const cc=X.compCap(P,E,G,Fy,2000,2000); chk('Qs ala armada (kc='+kc.toFixed(3)+')',cc.Qs,Qs,1e-9);
  // alma esbelta en compresión: h/tw = 120 > 1,49√(E/Fy) = 43,5
  const sec2={type:'WI',hw:960,tw:8,bft:300,tft:20,bfb:300,tfb:20}; const P2=X.secProps(sec2);
  const cc2=X.compCap(P2,E,G,Fy,3000,3000); const Aw=960*8; const rr=Math.sqrt(E/Fy);
  // iteración independiente
  let Fcr=Fy, Qa=1, Q; for(let i=0;i<200;i++){ const f=Math.min(Fy,Fcr), lamw=120; const be=lamw<=1.49*Math.sqrt(E/f)?960:Math.min(960,1.91*8*Math.sqrt(E/f)*(1-0.38/lamw*Math.sqrt(E/f))); Qa=1-(960-be)*8/P2.A; const Qs2=1; Q=Qs2*Qa; const lc2=Fy/cc2.Fe; Fcr = Q*lc2<=2.25? Q*Math.pow(0.658,Q*lc2)*Fy : 0.877/lc2*Fy; }
  chk('Qa del alma esbelta (iterando f = Fcr)',cc2.Qa,Qa,1e-7); chk('Fcr con Q',cc2.Fcr,Fcr,1e-7); flag('Q<1 genera una nota',X.memberCapacity(R0,P2,3000,3000,3000).notes.some(s=>/Q =/.test(s))); }
console.log('6) Corte: Cv por esbeltez del alma');
{ const Fy=235, r=Math.sqrt(E/Fy);
  for(const hw of [400, 600, 800, 1500]){ const P=X.secProps({type:'WI',hw,tw:6,bft:300,tft:20,bfb:300,tfb:20}); const sh=X.shearCap(P,E,Fy), lam=hw/6; const Aw=hw*6;
    const Vn = lam<=2.45*r?0.6*Fy*Aw : lam<=3.07*r?0.6*Fy*Aw*2.45*r/lam : Aw*4.52*E/(lam*lam);
    chk('h/tw='+lam.toFixed(1)+': φVn',sh.phiVs,0.9*Vn,2e-3); } }
console.log('7) Viga armada monosimétrica (F4): consistencia');
{ const Fy=235; const sec={type:'WI',hw:500,tw:8,bft:250,tft:16,bfb:150,tfb:10}; const P=X.secProps(sec);
  flag('mono=true, centro de corte fuera del baricentro',P.mono&&P.x0>0);
  const cap=X.memberCapacity({E,G,Fy},P,3000,3000,3000);
  flag('motor F4 en uso',cap.flexEng==='F4');
  const mp=cap.MnS(1,1,0).Mn, mn=cap.MnS(1,-1,0).Mn; flag('Mn con ala sup. comprimida ≠ Mn con ala inf. comprimida',Math.abs(mp-mn)>1);
  flag('ambos ≤ Mp',mp<=cap.Mp*(1+1e-12)&&mn<=cap.Mp*(1+1e-12));
  const cap0=X.memberCapacity({E,G,Fy},P,3000,3000,10);
  // F4 con Lb muy corto, calculado aparte desde la geometría: sup. 250x16, alma 500x8, inf. 150x10
  { const A=250*16+500*8+150*10, yc=(150*10*5+500*8*260+250*16*518)/A, h=526; const I=150*10**3/12+1500*(yc-5)**2+8*500**3/12+4000*(yc-260)**2+250*16**3/12+4000*(518-yc)**2;
    const SxcT=I/(h-yc), SxtT=I/yc; const Mpl=(()=>{ const y=10+(A/2-1500)/8; return 1500*(y-5)+8*(y-10)**2/2+8*(510-y)**2/2+4000*(518-y); })(); const Mp=Fy*Mpl;
    const r=Math.sqrt(E/Fy), hc=2*((h-yc)-16), hp=2*((h-16)-(10+(A/2-1500)/8)), Myc=Fy*SxcT, Myt=Fy*SxtT, lam=hc/8, lrw=5.7*r;
    const lpw=Math.min(hc/hp*r/(0.54*Mp/Myc-0.09)**2,lrw); const Rpc=lam<=lpw?Mp/Myc:Math.min(Mp/Myc,Mp/Myc-(Mp/Myc-1)*(lam-lpw)/(lrw-lpw));
    const lpwt=Math.min(hc/hp*r/(0.54*Mp/Myt-0.09)**2,lrw), lamt=lam; const Rpt=lamt<=lpwt?Mp/Myt:Math.min(Mp/Myt,Mp/Myt-(Mp/Myt-1)*(lamt-lpwt)/(lrw-lpwt));
    chk('Sxc (ala sup.)',P.SsT,SxcT,1e-9); chk('Zx plástico',P.Zs,Mpl,1e-9);
    chk('F4, Lb≈0: Mn(+) = mín(Rpc·Myc, Rpt·Myt)',cap0.MnS(1,1,0).Mn,Math.min(Rpc*Myc,Rpt*Myt),1e-9);
    // ala inferior comprimida (Mz<0): comp = ala inf. 150x10; hc = 2(yc−10)
    const hc2=2*(yc-10), hp2=2*((10+(A/2-1500)/8)-10), lam2=hc2/8, Myc2=Fy*SxtT, Myt2=Fy*SxcT; const lpw2=Math.min(hc2/hp2*r/(0.54*Mp/Myc2-0.09)**2,lrw);
    const Rpc2=lam2<=lpw2?Mp/Myc2:Math.min(Mp/Myc2,Mp/Myc2-(Mp/Myc2-1)*(lam2-lpw2)/(lrw-lpw2));
    const lamF=75/10, kc=Math.min(0.763,Math.max(0.35,4/Math.sqrt(500/8)));
    chk('F4, Lb≈0: Mn(−) = Rpc·Myc con ala inf. comprimida (compacta)',cap0.MnS(1,-1,0).Mn,Math.min(Rpc2*Myc2, (()=>{ const lamt2=lam2; const lpwt2=Math.min(hc2/hp2*r/(0.54*Mp/Myt2-0.09)**2,lrw); return (lamt2<=lpwt2?Mp/Myt2:Math.min(Mp/Myt2,Mp/Myt2-(Mp/Myt2-1)*(lamt2-lpwt2)/(lrw-lpwt2)))*Myt2; })() ),1e-9); }
  flag('Lb largo reduce Mn (+)',cap.MnS(1,1,0).Mn<=cap0.MnS(1,1,0).Mn); }
console.log('8) Alma esbelta en viga armada (F5)');
{ const Fy=235, r=Math.sqrt(E/Fy); const sec={type:'WI',hw:1800,tw:8,bft:400,tft:25,bfb:400,tfb:25}; const P=X.secProps(sec); const cap=X.memberCapacity({E,G,Fy},P,3000,3000,3000);
  flag('motor F5 por alma esbelta (h/tw='+(1800/8)+' > '+(5.7*r).toFixed(1)+')',cap.flexEng==='F5');
  const lamw=1800/8, aw=Math.min(10,1800*8/(400*25)), Rpg=1-aw/(1200+300*aw)*(lamw-5.7*r); const Sxc=P.SsT;
  const rt=Math.sqrt((25*400**3/12)/(400*25+1800*8/6)); const Lp=1.1*rt*r; const Fcr=3000<=Lp?Fy:Math.min(Fy,Fy*(1-0.3*(3000-Lp)/(PI*rt*Math.sqrt(E/(0.7*Fy))-Lp)));
  chk('Mn = Rpg·Fcr·Sxc',cap.MnS(1,1,0).Mn,Math.min(Rpg,1)*Fcr*Sxc,1e-9); }
console.log('9) Cajón armado y tubo rectangular (pandeo local de paredes)');
{ const Fy=235, r=Math.sqrt(E/Fy); const P=X.secProps({type:'RHS',h:300,b:200,t:4}); const cap=X.memberCapacity({E,G,Fy},P,2000,2000,2000);
  const lamF=(200-12)/4, lamW=(300-12)/4; console.log('   λ pared sup. = '+lamF+', λ alma = '+lamW+'; 1,12√(E/Fy) = '+(1.12*r).toFixed(1)+', 1,40√(E/Fy) = '+(1.4*r).toFixed(1));
  flag('pared comprimida esbelta (47 > 40,8)',cap.cls.ala==='esbelta');
  const be=Math.min(188,1.91*4*r*(1-0.34/(188/4)*r)); const Al=(188-be)*4, yf=300/2-2; const es=X.effModulus(P.Is,P.A,150,Al,yf);
  chk('Mn = Fy·Se (ancho efectivo, f = Fy)',cap.MnS(1,1,0).Mn,Fy*Math.min(es.Sc,es.St),1e-9);
  const cc=X.compCap(P,E,G,Fy,2000,2000); flag('compresión: Qa < 1 en paredes esbeltas',cc.Qa<1&&cc.Q<1); }
console.log('10) Tubo circular');
{ const Fy=235; const P=X.secProps({type:'CHS',D:300,t:3}); const cap=X.memberCapacity({E,G,Fy},P,2000,2000,2000); const x=100;
  const lim=0.07*E/Fy, lr=0.31*E/Fy; console.log('   D/t='+x+' (0,07E/Fy='+lim.toFixed(1)+', 0,31E/Fy='+lr.toFixed(1)+')');
  chk('Mn tubo no compacto = (0,0207E/(D/t)+Fy)·S',cap.MnS(1,1,0).Mn,Math.min(Fy*P.Zs,(0.0207*E/x+Fy)*P.Ss),1e-9);
  const cc=X.compCap(P,E,G,Fy,2000,2000); chk('Q tubo (D/t=100 > 0,11E/Fy=93,6): 0,038E/(Fy·D/t)+2/3',cc.Q,0.038*E/(Fy*x)+2/3,1e-9); }
console.log('11) IPE + platabandas (IPL)');
{ const Fy=235; const P=X.secProps({type:'IPL',base:'IPE 300',top:{b:150,t:12},bot:{b:150,t:12}}); const cap=X.memberCapacity({E,G,Fy},P,3000,3000,3000);
  flag('doblemente simétrica → F1',cap.flexEng==='F1'&&!P.mono); flag('la platabanda (b/t = 12,5 < 1,12√(E/Fy)=32,7) es compacta',cap.flexInfo.some(i=>/platabanda/.test(i.n)&&i.cls==='compacta'));
  const P1=X.secProps({type:'IPL',base:'IPE 300',top:{b:150,t:12}}); flag('platabanda solo arriba → monosimétrica',P1.mono===true&&X.memberCapacity({E,G,Fy},P1,3000,3000,3000).flexEng==='F4');
  const P2=X.secProps({type:'IPL',base:'IPE 300',top:{b:150,t:3}}); const cap2=X.memberCapacity({E,G,Fy},P2,3000,3000,3000); flag('platabanda esbelta (b/t=50 > 40,8) reduce Mn',cap2.MnS(1,1,0).Mn<X.memberCapacity({E,G,Fy},X.secProps({type:'IPL',base:'IPE 300',top:{b:150,t:8}}),3000,3000,3000).MnS(1,1,0).Mn); }
console.log('\nOK',nok,'FALLAS',nfail);
process.exitCode=nfail?1:0;

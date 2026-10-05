// tests/unit/test_core.js
const X=require('../lib/cargar').crear(['nucleo','js/datos/ejemplo.js'],'{analyzeModel,checkAll,nodeDisp,nodeReac,DEF_COMBOS,memberStations,secProps,CAT,CASES,EXAMPLE}');
const ex=X.EXAMPLE, exp=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..','datos','expected.json'),'utf8'));
const st={nodes:ex.nodes,members:ex.members,settings:{E:200000,G:77200,Fy:235,selfWeight:true},combos:X.DEF_COMBOS,customSections:{}};
let t0=Date.now(); const R=X.analyzeModel(st); console.log('ok',R.ok,R.error||'', Date.now()-t0,'ms');
X.checkAll(st,R); console.log('tiempo total',Date.now()-t0,'ms');
console.log('eq',JSON.stringify(R.eq.map(e=>[e.applied.map(v=>+v.toFixed(3)),e.err.toFixed(6)])));
console.log('peso',R.weight.toFixed(1),'kg');
const S1=R.combos.findIndex(c=>c.n.startsWith('S1')), S2=R.combos.findIndex(c=>c.n.startsWith('S2')), S0=R.combos.findIndex(c=>c.n.startsWith('S0'));
let maxd=0, worst=null;
R.nodes.forEach((n,i)=>{const u=X.nodeDisp(R,i,R.combos[S1].f); const e=exp.disp[n.id]; if(!e) return; const dd=Math.abs(u[2]-e.DL); if(dd>maxd){maxd=dd;worst=[n.id,u[2],e.DL];}});
console.log('max dif desplazamiento vertical D+L (mm):',maxd.toFixed(4),worst);
console.log('nodo 23: app',X.nodeDisp(R,R.idx.get(23),R.combos[S1].f)[2].toFixed(3),'pynite',exp.disp['23'].DL.toFixed(3));
for(const k of Object.keys(exp.reac)){const i=R.idx.get(+k); const rd=-X.nodeReac(R,i,R.combos[S0].f)[2], rl=-X.nodeReac(R,i,R.combos[S2].f)[2]; console.log('reac',k,'D app',rd.toFixed(2),'py',exp.reac[k].D.toFixed(2),'| L app',rl.toFixed(2),'py',exp.reac[k].L.toFixed(2));}
console.log('r max app',R.maxR.r.toFixed(3),'barra',R.maxR.id,R.maxR.tag,'|| pynite',exp.maxr.toFixed(3));
let md=0; for(const c of R.checks){ if(c.rigid) continue; const e=exp.checks[c.id]; if(!e) continue; md=Math.max(md,Math.abs(c.r-e.r)); }
console.log('max dif de r por barra',md.toFixed(3));
const top=R.checks.filter(c=>!c.rigid).sort((a,b)=>b.r-a.r).slice(0,6).map(c=>`B${c.id} ${c.tag} r=${c.r.toFixed(3)} (${c.best.combo}) py=${(exp.checks[c.id]||{}).r?.toFixed(3)}`); console.log(top.join('\n'));
console.log('flechas no verif:',R.nDeflFail,' maxUz',JSON.stringify(R.maxUz));
console.log('--- barras con diferencia > 0.02 en r (app lineal sin Pc vs PyNite P-Delta + Pc) ---');
for(const c of R.checks){ if(c.rigid) continue; const e=exp.checks[c.id]; if(!e) continue; if(Math.abs(c.r-e.r)>0.02) console.log(`B${c.id} ${c.tag} app ${c.r.toFixed(3)} (${c.best.combo}) pynite ${e.r.toFixed(3)} (${e.combo})`); }
// verificaciones analíticas: voladizo con carga en punta
const st2={nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,1,1],P:{}},{id:2,x:2000,y:0,z:0,sup:[0,0,0,0,0,0],P:{D:[0,0,-1],L:[0,0,0],H:[0,0,0]}}],
  members:[{id:1,i:1,j:2,sec:'IPE 200',beta:0,relI:false,relJ:false,K:1,q:{}}],settings:{E:200000,G:77200,Fy:235,selfWeight:false},combos:X.DEF_COMBOS,customSections:{}};
const R2=X.analyzeModel(st2); const P=X.secProps(X.CAT['IPE 200']);
const dFz=X.nodeDisp(R2,1,[1,0,0,0])[2]; console.log('voladizo IPE200 P=1kN L=2m: app',dFz.toFixed(4),'teoría',(-1000*2000**3/(3*200000*P.Is)).toFixed(4));
const S=X.memberStations(R2,R2.mrec[0],[1,0,0,0],11); console.log('Mz raíz',S.Mz[0].toFixed(0),'(esperado ±2e6 N·mm)','My',S.My[0].toFixed(0),'vy(L)',S.vy[S.vy.length-1].toFixed(4),'vz(L)',S.vz[S.vz.length-1].toFixed(4));
// carga distribuida: viga simple articulada-apoyo, q=1 kN/m
const st3={nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,0,0],P:{}},{id:2,x:4000,y:0,z:0,sup:[0,1,1,0,0,0],P:{}}],
  members:[{id:1,i:1,j:2,sec:'IPE 200',beta:0,relI:false,relJ:false,K:1,q:{D:1}}],settings:{E:200000,G:77200,Fy:235,selfWeight:false},combos:X.DEF_COMBOS,customSections:{}};
const R3=X.analyzeModel(st3); const S3=X.memberStations(R3,R3.mrec[0],[1,0,0,0],21); const imax=S3.vy.reduce((b,v,i)=>Math.abs(v)>Math.abs(S3.vy[b])?i:b,0);
console.log('viga simple q=1kN/m L=4m: Mmax app',mxabsf(S3.Mz)/1e6,'kNm (teoría 2.0) ; flecha app',S3.vy[imax].toFixed(4),'teoría',(-5*1*4000**4/(384*200000*P.Is)).toFixed(4),'; vy(L) consistente:',S3.vy[S3.vy.length-1].toExponential(2));
function mxabsf(a){return a.reduce((m,v)=>Math.max(m,Math.abs(v)),0);}
// débil: voladizo con carga horizontal en Y
st2.nodes[1].P={D:[0,1,0],L:[0,0,0],H:[0,0,0]};
const R4=X.analyzeModel(st2); const u4=X.nodeDisp(R4,1,[1,0,0,0]); const S4=X.memberStations(R4,R4.mrec[0],[1,0,0,0],11);
console.log('débil: Uy app',u4[1].toFixed(4),'teoría',(1000*2000**3/(3*200000*P.Iw)).toFixed(4),'| vz(L)',S4.vz[10].toFixed(4),'My raíz',S4.My[0].toFixed(0),'Mz',S4.Mz[0].toFixed(0));
// articulado en un extremo: viga empotrada-articulada con carga distribuida
const st5={nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,1,1],P:{}},{id:2,x:4000,y:0,z:0,sup:[0,1,1,0,0,0],P:{}}],
  members:[{id:1,i:1,j:2,sec:'IPE 200',beta:0,relI:false,relJ:true,K:1,q:{D:1}}],settings:{E:200000,G:77200,Fy:235,selfWeight:false},combos:X.DEF_COMBOS,customSections:{}};
const R5=X.analyzeModel(st5); const S5=X.memberStations(R5,R5.mrec[0],[1,0,0,0],21);
console.log('empotrada-articulada q=1,L=4m: M raíz',(S5.Mz[0]/1e6).toFixed(3),'(teoría -2.0 =wL²/8 en kNm)','M(L)',(S5.Mz[S5.Mz.length-1]/1e6).toFixed(4),'vy(L)',S5.vy[S5.vy.length-1].toExponential(2));

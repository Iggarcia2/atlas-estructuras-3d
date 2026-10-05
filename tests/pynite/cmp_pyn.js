// tests/pynite/cmp_pyn.js
// Compara Atlas (1.er y 2.º orden) contra el pórtico calculado con PyNite (pyn_out.json). Salida informativa.
const fs=require('fs'), path=require('path');
const X=require('../lib/cargar').crear(['nucleo','bench-motor'],'{BN,BM,cmb,analyzeModel,nodeReac,nodeDisp,SUP_FIX}'); const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'pyn_out.json'),'utf8'));
for (const beta of [0]) for (const order of [1,2]) {
  const nodes=[X.BN(1,0,0,0,X.SUP_FIX),X.BN(2,6000,0,0,X.SUP_FIX),X.BN(3,0,0,4000,[0,1,0,1,0,1],{D:[20,0,-800]}),X.BN(4,6000,0,4000,[0,1,0,1,0,1],{D:[0,0,-800]})];
  const mem=[X.BM(1,1,3,'IPE 300',{beta}),X.BM(2,2,4,'IPE 300',{beta}),X.BM(3,3,4,'IPE 300',{beta:0})];
  const st={nodes,members:mem,customSections:{},combos:[X.cmb('C',{D:1})],ver:2,settings:{E:200000,G:77200,Fy:235,selfWeight:false,order}};
  const R=X.analyzeModel(st); if(!R.ok){console.log(beta,order,R.error);continue;}
  const f=st.combos[0].f; const d=X.nodeDisp(R,2,f), r1=X.nodeReac(R,0,f), r2=X.nodeReac(R,1,f);
  const p=ref[order===1?'first':'second'];
  console.log('beta',beta,'orden',order,'| Atlas ux',d[0].toFixed(4),'uz',d[2].toFixed(4),'Mbase1',(Math.abs(r1[4])).toFixed(4),'Mbase2',(Math.abs(r2[4])).toFixed(4),'H1',r1[0].toFixed(4),' | PyNite ux',p.ux.toFixed(4),'uy',p.uy.toFixed(4),'Mb1',(Math.abs(p.Mbase1)/1e6).toFixed(4),'Mb2',(Math.abs(p.Mbase2)/1e6).toFixed(4),'H1',(p.Hb1/1000).toFixed(4));
}

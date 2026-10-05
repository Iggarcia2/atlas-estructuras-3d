// tests/unit/test_misc.js
const X=require('../lib/cargar').crear(['nucleo'],'{analyzeModel,checkAll,DEF_COMBOS}');
const base={settings:{E:200000,G:77200,Fy:235,selfWeight:true},combos:X.DEF_COMBOS,customSections:{}};
// 1) mecanismo: dos barras alineadas articuladas en el nudo central
let st={...base,nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,1,1],P:{}},{id:2,x:2000,y:0,z:0,sup:[0,0,0,0,0,0],P:{}},{id:3,x:4000,y:0,z:0,sup:[0,1,1,0,0,0],P:{}}],
 members:[{id:1,i:1,j:2,sec:'IPE 200',relJ:true,q:{D:1}},{id:2,i:2,j:3,sec:'IPE 200',relI:true,q:{D:1}}]};
let R=X.analyzeModel(st); console.log('mecanismo ->',R.ok,R.error);
// 2) sin apoyos suficientes
st={...base,nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,0,0,0],P:{}},{id:2,x:2000,y:0,z:0,sup:[0,0,0,0,0,0],P:{}}],members:[{id:1,i:1,j:2,sec:'IPE 200',q:{D:1}}]};
R=X.analyzeModel(st); console.log('pocos apoyos ->',R.ok,R.error);
// 3) sección inexistente
st={...base,nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,1,1],P:{}},{id:2,x:2000,y:0,z:0,sup:[0,0,0,0,0,0],P:{}}],members:[{id:1,i:1,j:2,sec:'XXX',q:{D:1}}]};
R=X.analyzeModel(st); console.log('sección inexistente ->',R.ok,R.error);
// 4) viga articulada-articulada con barras que solo trabajan a axial (reticulado): estabilización de giros
st={...base,nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,0,0,0],P:{}},{id:2,x:3000,y:0,z:0,sup:[0,1,1,0,0,0],P:{}},{id:3,x:1500,y:0,z:2000,sup:[0,1,0,0,0,0],P:{D:[0,0,-10],L:[0,0,0],H:[0,0,0]}}],
 members:[{id:1,i:1,j:3,sec:'L 63,5x6,35',relI:true,relJ:true,q:{}},{id:2,i:3,j:2,sec:'L 63,5x6,35',relI:true,relJ:true,q:{}},{id:3,i:1,j:2,sec:'L 63,5x6,35',relI:true,relJ:true,q:{}}]};
R=X.analyzeModel(st); console.log('reticulado ->',R.ok,R.error||''); if(R.ok){X.checkAll(st,R); console.log('  r por barra',R.checks.map(c=>c.id+':'+c.r.toFixed(3)).join(' '),' eq err',R.eq.map(e=>e.err.toFixed(5)).join(','));}
// 5) rendimiento: grilla 3D
function grid(nx,ny,nz){const nodes=[],members=[];let id=1;const ix={};for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){ix[[i,j,k]]=id;nodes.push({id:id++,x:i*3000,y:j*3000,z:k*3000,sup:k===0?[1,1,1,1,1,1]:[0,0,0,0,0,0],P:{D:[0,0,-5],L:[0,0,0],H:[0,0,0]}});}
 let m=1;for(const key in ix){const [i,j,k]=key.split(',').map(Number);const a=ix[key];if(i+1<nx)members.push({id:m++,i:a,j:ix[[i+1,j,k]],sec:'IPE 200',q:{}});if(j+1<ny)members.push({id:m++,i:a,j:ix[[i,j+1,k]],sec:'IPE 200',q:{}});if(k+1<nz)members.push({id:m++,i:a,j:ix[[i,j,k+1]],sec:'IPE 200',q:{}});}
 return {...base,nodes,members};}
for(const [nx,ny,nz] of [[5,5,4],[7,7,4],[8,8,5]]){const g=grid(nx,ny,nz);const t=Date.now();const r=X.analyzeModel(g);const t1=Date.now()-t;if(r.ok)X.checkAll(g,r);console.log(`grilla ${nx}x${ny}x${nz}: ${g.nodes.length} nudos, ${g.members.length} barras -> ok=${r.ok} solve ${t1} ms, total ${Date.now()-t} ms`);}

// 6) mecanismo real: dos barras colineales articuladas con carga transversal en el nudo central
st={...base,nodes:[{id:1,x:0,y:0,z:0,sup:[1,1,1,1,1,1],P:{}},{id:2,x:2000,y:0,z:0,sup:[0,0,0,0,0,0],P:{D:[0,0,-5],L:[0,0,0],H:[0,0,0]}},{id:3,x:4000,y:0,z:0,sup:[1,1,1,1,1,1],P:{}}],
 members:[{id:1,i:1,j:2,sec:'IPE 200',relI:true,relJ:true,q:{}},{id:2,i:2,j:3,sec:'IPE 200',relI:true,relJ:true,q:{}}]};
R=X.analyzeModel(st); console.log('mecanismo real ->',R.ok,R.error);

# tests/pynite/pyn_frame.py
# Genera pyn_out.json: pórtico plano de 3 barras con PyNite FEA (primer orden y P-Δ). Requiere: pip install PyNiteFEA
import json, math, os
from Pynite import FEModel3D
E=200000.0; G=77200.0
A=5380.0; Iz=83560000.0; Iy=6040000.0; J=200000.0   # IPE 300, J aproximado (no influye en el pórtico plano)
Hc=4000.0; Lb=6000.0; P=800e3; H=20e3   # N
def run(pdelta, nseg=8):
    m=FEModel3D()
    m.add_material('S',E,G,0.3,7.85e-9)
    # nudos (PyNite: Y vertical)
    m.add_node('B1',0,0,0); m.add_node('B2',Lb,0,0)
    cols=[]
    for c,x in (('1',0),('2',Lb)):
        prev='B'+c
        for k in range(1,nseg+1):
            nm=f'C{c}_{k}'; m.add_node(nm,x,Hc*k/nseg,0)
            m.add_member(f'col{c}_{k}',prev,nm,'S','IPE300')   # Iy=débil, Iz=fuerte (flexión en el plano XY)
            prev=nm
    top1=f'C1_{nseg}'; top2=f'C2_{nseg}'
    nb=12
    prev=top1
    for k in range(1,nb+1):
        nm=f'G_{k}' if k<nb else top2
        if k<nb: m.add_node(nm,Lb*k/nb,Hc,0)
        m.add_member(f'gir_{k}',prev,nm,'S','IPE300'); prev=nm
    m.def_support('B1',True,True,True,True,True,True); m.def_support('B2',True,True,True,True,True,True)
    m.add_node_load(top1,'FX',H); m.add_node_load(top1,'FY',-P); m.add_node_load(top2,'FY',-P)
    if pdelta: m.analyze_PDelta(log=False,check_stability=False,max_iter=60,tol=1e-6,combo_name='Combo 1') if False else None
    m.add_load_combo('Combo 1',{'Case 1':1.0})
    # cargas "Case 1"
    return m
def build(pdelta, nseg=8):
    m=FEModel3D(); m.add_material('S',E,G,0.3,7.85e-9,235.0); m.add_section('IPE300',A,Iy,Iz,J)
    m.add_node('B1',0,0,0); m.add_node('B2',Lb,0,0)
    for c,x in (('1',0),('2',Lb)):
        prev='B'+c
        for k in range(1,nseg+1):
            nm=f'C{c}_{k}'; m.add_node(nm,x,Hc*k/nseg,0); m.add_member(f'col{c}_{k}',prev,nm,'S','IPE300'); prev=nm
    top1=f'C1_{nseg}'; top2=f'C2_{nseg}'; nb=12; prev=top1
    for k in range(1,nb+1):
        nm=f'G_{k}' if k<nb else top2
        if k<nb: m.add_node(nm,Lb*k/nb,Hc,0)
        m.add_member(f'gir_{k}',prev,nm,'S','IPE300'); prev=nm
    m.def_support('B1',True,True,True,True,True,True); m.def_support('B2',True,True,True,True,True,True)
    m.add_node_load(top1,'FX',H,'Case 1'); m.add_node_load(top1,'FY',-P,'Case 1'); m.add_node_load(top2,'FY',-P,'Case 1')
    m.add_load_combo('C',{'Case 1':1.0})
    if pdelta: m.analyze_PDelta(log=False,check_stability=False,max_iter=100)
    else: m.analyze(log=False,check_statics=False)
    return dict(ux=m.nodes[top1].DX['C'], uy=m.nodes[top1].DY['C'], ux2=m.nodes[top2].DX['C'],
                Mbase1=m.nodes['B1'].RxnMZ['C'], Mbase2=m.nodes['B2'].RxnMZ['C'], Hb1=m.nodes['B1'].RxnFX['C'], Hb2=m.nodes['B2'].RxnFX['C'])
out={'first':build(False),'second':build(True),'second_n16':build(True,16)}
json.dump(out,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'pyn_out.json'),'w'),indent=1); print(json.dumps(out,indent=1))

"""Original Dawnlight town / nine residents / interiors, authored natively with bpy.
All numeric authoring coordinates are X right, Y up, Z forward. Export is Y-up GLB.
Run: blender --background --python authoring/world.py
"""
import bpy, math, json, random
from mathutils import Vector
from pathlib import Path
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1]
for d in ('models/world','models/npcs','models/props','data','portraits'): (ROOT/d).mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(8833)
PAL={'cream':'F7EFDB','white':'FFFDF2','sky':'76C8DB','indigo':'354B74','gold':'E6B868','glass':'97DFDF','ground':'A9C9A1','grass':'88B68B','leaf':'549B85','leaf2':'75B498','wood':'AF805A','path':'E6D7B3','stone':'D3DCD1','rose':'E9A5B8','purple':'997CC8','skin':'EDBB93','skin2':'CC936F','hair':'433930','gray':'9FA7AD','dark':'253747','orange':'EEA05B','red':'C96B73','mint':'95D5BC','eye':'3D3B48'}
M={}
def lin(h):
    nums=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in nums)+(1,)
for k,v in PAL.items():
    mat=bpy.data.materials.new(k);mat.use_nodes=True;mat.diffuse_color=lin(v);bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=lin(v);bs.inputs['Roughness'].default_value=.7;M[k]=mat
def xyz(p):return (p[0],-p[2],p[1])
PARTS=[]
def finish(o,name,c,bone=None):
    o.name=name;o.data.materials.append(M[c]);PARTS.append(o)
    if bone:
        vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
    return o
def cube(name,p,s,c,bevel=.04,bone=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('rounded edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,c,bone)
def ell(name,p,s,c,bone=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=xyz(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for q in o.data.polygons:q.use_smooth=True
    return finish(o,name,c,bone)
def cyl(name,p,r,h,c,vertices=16,bone=None,r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=h,location=xyz(p));o=bpy.context.object
    for q in o.data.polygons:q.use_smooth=True
    return finish(o,name,c,bone)
def line(name,a,b,r,c,bone=None):
    av,bv=Vector(xyz(a)),Vector(xyz(b));d=bv-av
    o=cyl(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),r,d.length,c,10,bone);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def torus(name,p,r,t,c,front=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=xyz(p),major_radius=r,minor_radius=t);o=bpy.context.object
    if front:o.rotation_euler.x=pi/2
    return finish(o,name,c)
def mesh(name,verts,faces,c):
    me=bpy.data.meshes.new(name);me.from_pydata([xyz(v) for v in verts],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,c)
def batch(name,rig=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:o.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    # Coalesce equal-material slots: one draw primitive per palette material.
    mats=list(o.data.materials);unique=[];mapping={}
    for i,m in enumerate(mats):
        if m not in unique:unique.append(m)
        mapping[i]=unique.index(m)
    indices=[mapping[p.material_index] for p in o.data.polygons];o.data.materials.clear()
    for m in unique:o.data.materials.append(m)
    for p,i in zip(o.data.polygons,indices):p.material_index=i
    o.data.validate(clean_customdata=False);o.data.update()
    if rig:
        mod=o.modifiers.new('Skeleton deformation','ARMATURE');mod.object=rig;o.parent=rig
    return o
def export(path,objects,anim=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    kw=dict(filepath=str(ROOT/path),export_format='GLB',use_selection=True,export_animations=anim,export_yup=True)
    if anim:kw.update(export_animation_mode='NLA_TRACKS',export_force_sampling=True)
    bpy.ops.export_scene.gltf(**kw)
def clear_parts():
    global PARTS;PARTS=[]
def plant(x,z,size=1):
    cyl('Planter',(x,.18,z),.34*size,.36,'cream');line('Plant stem',(x,.3,z),(x,1.0*size,z),.035,'leaf')
    for a in range(5):
        t=a*2.4;ell('Oval leaf',(x+sin(t)*.16*size,.58*size+a*.08,z+cos(t)*.16*size),(.2*size,.1*size,.13*size),'leaf2')
def bench(x,z):
    cube('Bench seat',(x,.48,z),(1.7,.16,.6),'wood');cube('Bench back',(x,.95,z-.22),(1.7,.65,.12),'cream')
    for dx in (-.62,.62):cube('Bench foot',(x+dx,.23,z),(.13,.5,.43),'indigo')
def table(x,z,w=2,d=1):
    cube('Tabletop',(x,.9,z),(w,.18,d),'wood')
    for dx in (-w*.4,w*.4):
        for dz in (-d*.35,d*.35):cube('Table leg',(x+dx,.42,z+dz),(.11,.84,.11),'indigo')
def shelf(x,z,books=True):
    cube('Shelf cabinet',(x,1.3,z),(1.8,2.6,.6),'wood')
    for y in (.35,1.12,1.88):
        cube('Shelf inset',(x,y+.23,z+.32),(1.58,.6,.03),'indigo')
        for i in range(6):cube('Book' if books else 'Archive',(x-.66+i*.26,y+.22,z+.37),(.18,.46,.2),['sky','cream','rose','mint'][i%4],.01)
def counter(x,z,c='sky'):
    cube('Reception counter',(x,.55,z),(3.4,1.1,.95),c);cube('Countertop',(x,1.14,z),(3.65,.13,1.08),'cream')
    cube('Terminal',(x+1,1.5,z),( .65,.6,.12),'indigo');cube('Terminal screen',(x+1,1.52,z+.072),(.51,.4,.01),'glass')
def star(name,x,y,z,r,c,front=True):
    vv=[]
    for i in range(10):
        a=i*pi/5;rr=r if i%2==0 else r*.45;vv.append((x+sin(a)*rr,y+cos(a)*rr,z))
    mesh(name,vv,[tuple(range(9,-1,-1)),tuple(range(10))],c)
BUILDINGS=[
    dict(id='care_center',name='幻靈照護所',position=[0,0,-8],w=10,d=8,h=4.0,color='sky',npcIds=['care_nova','shop_vendor']),
    dict(id='ranger_station',name='初光巡護局',position=[-20,0,-8],w=9,d=8,h=4.4,color='indigo',npcIds=['ranger_lumo']),
    dict(id='dream_lab',name='大夢研究所',position=[20,0,-8],w=10,d=9,h=4.6,color='mint',npcIds=['prof_daydream']),
    dict(id='gym_light',name='初光道館',position=[-20,0,18],w=11,d=9,h=5,color='gold',npcIds=['gym_master']),
    dict(id='tower_starspire',name='星穹挑戰塔',position=[20,0,18],w=8,d=8,h=8,color='purple',npcIds=['tower_keeper']),
    dict(id='house_resident_a',name='居民民房 A',position=[0,0,22],w=8,d=7,h=3.5,color='rose',npcIds=['resident_berry'])]
COLLISIONS=[]
def exterior(b):
    x,_,z=b['position'];w,d,h=b['w'],b['d'],b['h'];front=z+d/2
    cube(b['id']+' foundation',(x,.2,z),(w+.8,.4,d+.8),'stone',.12)
    cube(b['id']+' walls',(x,h/2+.4,z),(w,h,d),'cream',.16)
    cube('Plinth',(x,.65,z),(w+.15,.5,d+.15),b['color'])
    if b['id']=='tower_starspire':
        cyl('Octagonal spire',(x,h+1.3,z),4,3,'indigo',8,r2=2.2);cyl('Gold pinnacle',(x,h+4,z),2.3,3.0,'gold',8,r2=0)
        for dx in (-2.6,2.6):cube('Tower facade pillar',(x+dx,h/2,z+d/2+.08),(.26,h,.22),'purple')
        star('Tower celestial emblem',x,h-.9,front+.14,.8,'gold')
    elif b['id']=='dream_lab':
        cube('Research rooftop',(x,h+.55,z),(w+.7,.36,d+.7),'indigo',.12);ell('Observatory dome',(x+1.5,h+.7,z-1),(2.6,2.2,2.6),'glass');torus('Dome rim',(x+1.5,h+.65,z-1),2.6,.14,'gold')
    elif b['id']=='gym_light':
        cube('Arena flat crown',(x,h+.7,z),(w+1,.55,d+1),'indigo',.12)
        for dx in (-w*.41,w*.41):cyl('Gym facade column',(x+dx,h/2+.4,front+.3),.35,h,'gold',12)
        star('Gym sun emblem',x,h-.5,front+.15,.85,'gold')
    else:
        roofY=h+.4;roofTop=h+2.1;verts=[(x-w*.56,roofY,z-d*.57),(x+w*.56,roofY,z-d*.57),(x+w*.56,roofY,z+d*.57),(x-w*.56,roofY,z+d*.57),(x,roofTop,z-d*.57),(x,roofTop,z+d*.57)]
        mesh('Pitched roof',verts,[(0,4,5,3),(4,1,2,5),(0,1,4),(3,5,2)],b['color'])
        if b['id']=='care_center':
            torus('Care halo',(x,h-.65,front+.18),.68,.095,'gold',True);ell('Care glowing core',(x,h-.65,front+.2),(.36,.48,.13),'sky')
        if b['id']=='ranger_station':star('Ranger crest',x,h-.5,front+.14,.67,'gold')
        if b['id']=='house_resident_a':cube('Chimney',(x+2.1,h+1.1,z-1.2),(.8,2,.7),'cream')
    # Door and trim are recessed in the solid exterior; the trigger is outside.
    cube('Door surround',(x,1.55,front+.09),(2.3,2.9,.2),'indigo',.14);cube('Luminous sliding entrance',(x,1.5,front+.21),(1.8,2.65,.1),'glass')
    cube('Door center seam',(x,1.5,front+.27),(.04,2.55,.02),'cream')
    cube('Entrance canopy',(x,3.04,front+.56),(3.0,.23,1.6),b['color'],.1)
    for dx in (-w*.33,w*.33):
        cube('Window trim',(x+dx,2.35,front+.08),(1.9,1.75,.15),'white');cube('Window glass',(x+dx,2.35,front+.18),(1.64,1.49,.06),'glass');cube('Window mullion',(x+dx,2.35,front+.23),(.08,1.5,.06),'cream')
    for dx in (-2.2,2.2):plant(x+dx,front+1)
    b.update(entrance=[x,front+1.8],interiorModel='models/world/'+b['id']+'-interior.glb',spawn=[0,5.4],exit=[0,6.7],bounds=dict(minX=-6.5,maxX=6.5,minZ=-7,maxZ=7),collisions=[])
    COLLISIONS.append(dict(x=x,z=z,w=w+.8,d=d+.8,id=b['id']))
def town():
    clear_parts();cube('Town meadow',(0,-.22,0),(74,.4,74),'ground',0)
    cube('Central main street',(0,.005,0),(7,.03,72),'path',0);cube('North boulevard',(0,.01,1),(72,.025,6),'path',0);cube('South promenade',(0,.01,29),(64,.025,5),'path',0)
    cyl('Care center forecourt',(0,.025,0),7.5,.06,'cream',48);torus('Plaza gold inlay',(0,.065,0),6.4,.07,'gold')
    for b in BUILDINGS:
        exterior(b);x,_,z=b['position'];front=z+b['d']/2
        cube('Entry walk',(x,.03,(front+29)/2 if z>0 else (front+1)/2),(3,.07,29-front if z>0 else 1-front),'path',0)
    # Open park / arena avoids building collisions and serves capture and duel areas.
    cyl('Open duel ring',(-19,.055,-26),6.0,.08,'cream',48);torus('Duel floor marking',(-19,.105,-26),4.9,.085,'gold')
    for dx in (-3,3):star('Floor sigil',-19+dx,.12,-26,.5,'gold')
    for x,z in [(-6,1),(6,1),(-13,6),(12,6),(-27,28),(27,28),(-9,-19),(9,-19)]:bench(x,z)
    for x,z in [(-31,-28),(-29,-19),(-31,-4),(-31,7),(-30,19),(-31,32),(31,-28),(29,-18),(32,-5),(31,7),(32,28),(-10,-30),(2,-31),(14,-31),(-10,32),(9,32)]:
        cyl('Tree trunk',(x,1.2,z),.28,2.4,'wood',10);ell('Tree crown',(x,3.15,z),(1.65,1.85,1.55),'leaf');ell('Tree highlight',(x-.65,3.8,z+.25),(1.2,1.05,1.1),'leaf2');COLLISIONS.append(dict(x=x,z=z,w=.75,d=.75))
    for i in range(80):
        x=random.uniform(-34,34);z=random.uniform(-34,34)
        if abs(x)<5 or abs(z-1)<5 or any(abs(x-b['position'][0])<b['w']/2+2 and abs(z-b['position'][2])<b['d']/2+2 for b in BUILDINGS):continue
        for j in range(3):
            dx=sin(j*2)*.22;dz=cos(j*2)*.22;cyl('Flower stem',(x+dx,.22,z+dz),.017,.44,'leaf',5);ell('Wildflower',(x+dx,.45,z+dz),(.12,.055,.12),['white','rose','gold'][j])
    o=batch('Dawnlight Town · original Blender architecture');export('models/world/town.glb',[o]);return o
def interior(b):
    clear_parts();key=b['id'];c=b['color'];cols=[]
    cube('Interior floor',(0,-.12,0),(14,.24,16),'cream',0);cube('Back wall',(0,1.8,-7.6),(14,3.6,.22),'white');cube('Left cutaway wall',(-6.9,.65,0),(.22,1.3,15),'white');cube('Right cutaway wall',(6.9,.65,0),(.22,1.3,15),'white')
    cube('Back wall skirting',(0,.18,-7.42),(13.5,.35,.08),c);cube('Exit rug',(0,.012,6.4),(2.4,.03,2.1),c,0)
    for x in (-5.6,5.6):plant(x,5.5)
    def box(x,z,w,d):cols.append(dict(x=x,z=z,w=w,d=d))
    def desk(x,z):counter(x,z,c);box(x,z,3.7,1.1)
    def shelves(x,z,books=True):shelf(x,z,books);box(x,z,1.85,.8)
    if key=='care_center':
        desk(0,-3.8);bench(-4,1);bench(-4,3);box(-4,2,2,3)
        cyl('Healing pedestal',(4,.42,-3),1.2,.8,'indigo');torus('Healing light halo',(4,1,-3),.9,.12,'sky');ell('Healing crystal',(4,1.35,-3),(.4,.65,.4),'mint');box(4,-3,2.5,2.5)
        cube('Care info board',(-4,2,-7.38),(2.6,1.4,.08),'sky');star('Care board emblem',-4,2,-7.31,.45,'white');desk(4,2.5)
    elif key=='ranger_station':
        desk(0,-3.7);cube('Town map frame',(0,2.3,-7.34),(4,2,.12),'wood');cube('Town map',(0,2.3,-7.23),(3.7,1.7,.07),'mint')
        for x in (-.7,.7):cube('Map street',(x,2.3,-7.18),(.1,1.5,.015),'cream')
        cube('Map avenue',(0,2.2,-7.17),(3.5,.09,.015),'cream');shelves(-4.7,-6,False);shelves(4.7,-6,False);table(4,1);box(4,1,2.2,1.2);bench(-4,2)
    elif key=='dream_lab':
        desk(0,-3.5);shelves(-4.6,-6.5);shelves(4.6,-6.5);table(-4,0,2.4,1.3);box(-4,0,2.6,1.5)
        for x in (-4.7,-4,-3.3):cyl('Specimen jar',(x,1.3,0),.17,.65,'glass');ell('Specimen',(x,1.25,0),(.11,.15,.1),'gold')
        cyl('Observation chamber base',(4,.3,0),1.1,.6,'indigo');torus('Observation ring',(4,1.0,0),.85,.07,'gold');ell('Floating research crystal',(4,1.6,0),(.45,.9,.45),'sky');box(4,0,2.4,2.4)
        for z in (-.6,.6):line('Chamber support',(3.3,.5,z),(3.3,2.7,z),.06,'indigo')
    elif key=='gym_light':
        cyl('Main challenge floor',(0,.05,-1.5),4.2,.08,'sky',48);torus('Arena perimeter',(0,.12,-1.5),3.7,.06,'gold');cube('Preparation rug',(0,.025,4),(5,.05,2),'indigo',0)
        for x in (-5.6,5.6):
            cube('Gym banner',(x,2.0,-5),(.95,2.8,.07),'indigo');star('Banner sun',x,2.25,-4.95,.35,'gold')
        shelves(5.2,1,False);box(5.2,1,1.8,.8);desk(-4.6,3.6)
    elif key=='tower_starspire':
        desk(-3.7,1.5);torus('Portal arch',(0,2.05,-5.8),1.85,.17,'purple',True);torus('Portal inner light',(0,2.05,-5.8),1.63,.05,'sky',True);cube('Portal steps',(0,.2,-5.5),(3.8,.4,1.5),'indigo');box(0,-5.8,4,1.3)
        for a in range(5):star('Portal mote',sin(a*1.8)*1.2,2.1+cos(a*1.8)*1.1,-5.72,.17,'gold')
        shelves(4.8,-2,False);bench(3.5,2.6);box(3.5,2.6,2,.8)
    else:
        cube('Sofa base',(-4,.43,-1),(2.5,.75,1.2),'rose');cube('Sofa back',(-4,.95,-1.5),(2.5,1.25,.24),'rose');box(-4,-1,2.6,1.4)
        table(1.6,1,2,1.5);box(1.6,1,2.1,1.6);bench(1.6,2.4);box(1.6,2.4,1.8,.7)
        cube('Bed frame',(3.7,.3,-5.5),(2.5,.6,3.3),'wood');cube('Cloud blanket',(3.7,.68,-5.1),(2.35,.28,2.4),'sky');cube('Pillow',(3.7,.85,-6.5),(1.55,.3,.7),'white');box(3.7,-5.5,2.6,3.4);shelves(-4.4,-6)
    b['collisions']=cols;b['interiorSize']=[14,16]
    o=batch(key+' · furnished cutaway interior');export(b['interiorModel'],[o]);o.hide_set(True);o.hide_render=True
NPCS=[
 ('prof_daydream','大夢博士','dream_lab','white','gray','skin',1.05,'博士',['圖鑑記錄的不只是外貌，也是你與幻靈一起留下的故事。','先和一位幻靈締約，研究終端就能保存牠的資料。'],['research','dex']),
 ('care_nova','星霧護理員','care_center','sky','hair','skin',1,'護理',['歡迎來到幻靈照護所！旅途中也要記得照顧自己。','我可以協助夥伴回復精神，也會替你準備一些旅行補給。'],['heal','supplies']),
 ('ranger_lumo','巡護員魯莫','ranger_station','indigo','hair','skin2',1.08,'巡護',['初光鎮由每一位旅人一起守護。請沿著道路探索，留意附近的幻靈。','巡護公告：北側林地近日有稀有幻靈的足跡。'],['notices','supplies']),
 ('arena_coach','幻靈擂台訓練家',None,'orange','hair','skin2',1.02,'訓練',['想試試你的幻靈隊伍嗎？我們進行三對三的友誼對戰。','每回合可選招式或替換夥伴。準備好三位夥伴再來挑戰吧！'],['battle','tutorial']),
 ('gym_master','初光館主','gym_light','indigo','dark','skin',1.1,'館主',['真正的力量來自彼此信任。歡迎參觀初光道館。','正式道館試煉將於未來開放，目前可以先向擂台訓練家磨練技巧。'],['gym-info']),
 ('tower_keeper','星穹管理者','tower_starspire','purple','white','skin2',1.06,'星穹',['星穹之上，還有尚未被記錄的旅程。','這裡是挑戰塔大廳。樓層連戰、排行與印記獎勵仍在籌備中。'],['tower-info']),
 ('resident_berry','果姨','house_resident_a','rose','hair','skin',.99,'居民',['這些星霧果是今天早上新鮮摘下的，帶一些在路上吧。','多和鎮上的人聊聊，也許能聽到稀有幻靈的消息。'],['supplies']),
 ('resident_kid','小探險家阿洛',None,'mint','hair','skin',.78,'孩童',['我最喜歡在草地找幻靈！小小的夥伴也有自己的厲害招式。','你去過研究所嗎？博士知道好多進階的秘密！'],['tips']),
 ('shop_vendor','旅用品員','care_center','gold','hair','skin2',1.0,'商店',['靈核球能與幻靈建立連結；星霧果能讓牠們放鬆心情。','旅行補給不一定每次都有，過一會兒再來找我吧。'],['supplies','items'])]
def rig_make(name):
    bpy.ops.object.select_all(action='DESELECT');arm=bpy.data.armatures.new(name+' Rig');rig=bpy.data.objects.new(name+' Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for key,a,b,parent in [('Root',(0,0,0),(0,.2,0),None),('Body',(0,.8,0),(0,1.5,0),'Root'),('Head',(0,1.5,0),(0,2.1,0),'Body'),('ArmL',(-.34,1.42,0),(-.38,.84,0),'Body'),('ArmR',(.34,1.42,0),(.38,.84,0),'Body'),('LegL',(-.15,.85,0),(-.15,.16,0),'Root'),('LegR',(.15,.85,0),(.15,.16,0),'Root')]:
        bone=arm.edit_bones.new(key);bone.head=xyz(a);bone.tail=xyz(b)
        if parent:bone.parent=arm.edit_bones[parent]
        bone.align_roll(Vector((0,-1,0)))
    bpy.ops.object.mode_set(mode='OBJECT');return rig
def npc(n):
    ident,name,building,coat,hair,skin,scale,role,dialogue,func=n;clear_parts();rig=rig_make(ident)
    ell('Uniform torso',(0,1.16,0),(.33,.42,.2),coat,'Body');cyl('Neck',(0,1.54,0),.105,.2,skin,bone='Head')
    ell('Head',(0,1.81,.015),(.31,.36,.28),skin,'Head');ell('Hair volume',(0,1.98,-.055),(.325,.25,.285),hair,'Head')
    for x in (-.315,.315):ell('Ear',(x,1.79,.01),(.057,.092,.053),skin,'Head')
    # Hair fringe is solid rounded geometry with visible lift, not scalp decal.
    for x in (-.21,-.105,0,.105,.21):ell('Hair fringe',(x,2.047,.16),(.092,.115,.11),hair,'Head')
    for x in (-.115,.115):
        ell('Eye white',(x,1.83,.253),(.076,.091,.042),'white','Head');ell('Iris',(x,1.823,.286),(.037,.053,.014),'eye','Head');ell('Eye sparkle',(x-.009,1.841,.301),(.009,.013,.006),'white','Head')
    ell('Nose',(0,1.745,.29),(.044,.047,.045),skin,'Head');ell('Smile',(0,1.672,.272),(.073,.026,.019),'rose','Head')
    for s,tag in [(-1,'L'),(1,'R')]:
        ell('Sleeve',(s*.345,1.37,0),(.135,.21,.145),coat,'Arm'+tag);line('Forearm',(s*.38,1.2,.015),(s*.4,.92,.025),.08,skin,'Arm'+tag);ell('Hand',(s*.4,.89,.025),(.085,.108,.074),skin,'Arm'+tag)
        line('Pants',(s*.15,.88,0),(s*.15,.28,0),.12,'indigo','Leg'+tag);ell('White shoe',(s*.15,.11,.055),(.135,.12,.22),'white','Leg'+tag)
    cube('Uniform collar',(0,1.5,.13),(.3,.1,.12),'white',.025,'Body');ell('Name badge',(.16,1.31,.188),(.074,.045,.015),'gold','Body')
    if role=='博士':
        for x in (-.12,.12):
            # Round spectacles with frame as four thin sides, owned by head bone.
            for a in range(16):line('Spectacle rim',(x+.098*cos(a*2*pi/16),1.825+.11*sin(a*2*pi/16),.301),(x+.098*cos((a+1)*2*pi/16),1.825+.11*sin((a+1)*2*pi/16),.301),.01,'indigo','Head')
        line('Glasses bridge',(-.025,1.825,.307),(.025,1.825,.307),.011,'indigo','Head');cube('Lab coat tail',(0,.88,0),(.64,.55,.35),'white',.08,'Body');cube('Blue shirt',(0,1.24,.205),(.14,.43,.02),'sky',.015,'Body')
    if role in ('護理','居民'):
        ell('Hair bun',(0,2.03,-.26),(.2,.21,.18),hair,'Head');cube('Apron',(0,1.06,.19),(.45,.54,.06),'white',.04,'Body')
        if role=='護理':cube('Nurse headband',(0,2.09,.04),(.51,.07,.42),'sky',.03,'Head')
    if role=='巡護':
        ell('Patrol cap',(0,2.13,0),(.35,.1,.3),'indigo','Head');cube('Patrol cap visor',(0,2.095,.24),(.45,.04,.21),'indigo',.07,'Head');cube('Belt',(0,.96,.03),(.61,.07,.42),'gold',.015,'Body')
    if role=='館主':
        cube('Gold shoulder mantle',(0,1.47,-.04),(.78,.14,.42),'gold',.07,'Body');cube('Cape',(0,1.15,-.21),(.68,.8,.06),'indigo',.08,'Body')
    if role=='星穹':
        cyl('Starspire hat',(0,2.33,-.025),.32,.62,'purple',12,'Head',0);ell('Hat brim',(0,2.045,0),(.41,.05,.35),'purple','Head');cube('Robe tail',(0,.69,0),(.58,.62,.39),'purple',.09,'Body');cube('Gold sash',(0,1.13,.21),(.075,.7,.04),'gold',.01,'Body')
    if role=='商店':cube('Merchant apron',(0,1.01,.20),(.45,.53,.04),'indigo',.03,'Body')
    if role=='訓練':cube('Training headband',(0,2.04,.08),(.6,.07,.45),'gold',.03,'Head');cube('Scarf',(0,1.5,.15),(.41,.13,.12),'indigo',.04,'Body')
    if role=='孩童':cube('Small satchel',(0,1.18,-.24),(.43,.45,.16),'gold',.07,'Body')
    skinobj=batch(name,rig);rig.scale=(scale,scale,scale)
    for label,dur in [('Idle',48),('Walk',24)]:
        rig.animation_data_create();rig.animation_data.action=None
        for f in range(1,dur+2,3):
            t=(f-1)/dur*2*pi
            for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
            rig.pose.bones['Head'].rotation_euler.z=.035*sin(t)
            if label=='Walk':
                for tag,ph in [('L',0),('R',pi)]:rig.pose.bones['Leg'+tag].rotation_euler.x=.36*sin(t+ph);rig.pose.bones['Arm'+tag].rotation_euler.x=-.3*sin(t+ph)
                rig.pose.bones['Root'].location.y=.015*abs(sin(t))
            for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=f);pb.keyframe_insert('location',frame=f)
        action=rig.animation_data.action;action.name=ident+'_'+label;action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=label;track.strips.new(label,1,action);rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.context.scene.frame_set(1);export('models/npcs/'+ident+'.glb',[rig,skinobj],True)
    rig.hide_set(True);skinobj.hide_set(True);skinobj.hide_render=True
    return dict(id=ident,name=name,buildingId=building,role=role,model='models/npcs/'+ident+'.glb',height=round(2.2*scale,2),dialogue=dialogue,functions=func,portraits={expression:'portraits/'+ident+'-'+expression+'.svg' for expression in ['normal','happy','serious']})
def portraits(n):
    ident,name,building,coat,hair,skin,scale,role,*_=n
    for expression in ['normal','happy','serious']:
        mouth='<path d="M155 242 Q180 257 205 242"/>' if expression=='happy' else '<path d="M162 246 Q180 250 198 246"/>' if expression=='normal' else '<path d="M165 248 L195 248"/>'
        extra=''
        if role=='博士':extra='<g fill="none" stroke="#354B74" stroke-width="5"><circle cx="140" cy="203" r="27"/><circle cx="220" cy="203" r="27"/><path d="M167 202H193"/></g>'
        if role=='巡護':extra='<path d="M89 153Q180 70 271 153L259 165H103Z" fill="#354B74"/><path d="M111 153H248Q247 174 202 170H111Z" fill="#253747"/><circle cx="180" cy="138" r="13" fill="#E6B868"/>'
        if role=='護理':extra='<path d="M100 143Q180 123 258 144" fill="none" stroke="#76C8DB" stroke-width="19"/>'
        if role=='星穹':extra='<path d="M98 151L173 25L256 151Z" fill="#997CC8"/><ellipse cx="180" cy="150" rx="98" ry="14" fill="#997CC8"/><path d="M169 104L180 78L191 104L180 119Z" fill="#E6B868"/>'
        if role=='訓練':extra='<path d="M94 151Q180 132 264 152" fill="none" stroke="#E6B868" stroke-width="16"/>'
        apron='<path d="M130 320H230L253 480H107Z" fill="#FFFDF2"/>' if role in ['護理','居民','博士'] else ''
        svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#F7EFDB"/><stop offset="1" stop-color="#DBECE9"/></linearGradient></defs><rect width="360" height="480" rx="30" fill="url(#bg)"/><circle cx="180" cy="200" r="137" fill="white" opacity=".6"/><path d="M64 480V382Q68 313 143 309H216Q292 313 296 382V480Z" fill="#{PAL[coat]}" stroke="#354B74" stroke-width="3"/>{apron}<path d="M152 277V319Q180 340 208 319V277" fill="#{PAL[skin]}"/><ellipse cx="88" cy="207" rx="18" ry="28" fill="#{PAL[skin]}"/><ellipse cx="272" cy="207" rx="18" ry="28" fill="#{PAL[skin]}"/><path d="M88 180Q87 83 180 83Q277 84 274 180V225Q265 294 180 303Q96 291 88 225Z" fill="#{PAL[skin]}"/><path d="M86 179Q66 71 175 67Q290 69 277 181L255 168L243 128Q188 155 141 128L115 167Z" fill="#{PAL[hair]}"/><path d="M102 139Q167 64 247 125M117 120Q179 62 237 102" fill="none" stroke="#ffffff" stroke-opacity=".11" stroke-width="8" stroke-linecap="round"/><g fill="#FFFDF2"><ellipse cx="140" cy="203" rx="24" ry="30"/><ellipse cx="220" cy="203" rx="24" ry="30"/></g><g fill="#3D3B48"><ellipse cx="144" cy="208" rx="12" ry="20"/><ellipse cx="216" cy="208" rx="12" ry="20"/></g><g fill="#fff"><circle cx="140" cy="201" r="5"/><circle cx="212" cy="201" r="5"/></g><path d="M123 166Q140 158 157 165M203 165Q220 158 236 167" stroke="#{PAL[hair]}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M178 216Q168 233 184 232" fill="none" stroke="#BE886C" stroke-width="3"/><g fill="none" stroke="#9B6263" stroke-width="5" stroke-linecap="round">{mouth}</g>{extra}<path d="M143 316L171 344L147 353L126 325M215 316L189 344L214 354L237 326" fill="#FFFDF2"/><circle cx="240" cy="369" r="16" fill="#E6B868"/><path d="M240 357L249 372L232 372Z" fill="#FFFDF2"/></svg>'''
        (ROOT/'portraits'/f'{ident}-{expression}.svg').write_text(svg,encoding='utf-8')
def props():
    result={}
    for ident,color in [('core','sky'),('great_core','purple'),('master_core','gold')]:
        clear_parts();ell('Floating spirit core',(0,.34,0),(.22,.26,.22),color);torus('Gyroscopic gold orbit',(0,.34,0),.29,.028,'gold');torus('Second orbital band',(0,.34,0),.29,.025,'cream',True)
        for a in range(4):ell('Orbit anchor',(sin(a*pi/2)*.29,.34,cos(a*pi/2)*.29),(.055,.055,.055),'white')
        o=batch(ident);export('models/props/'+ident+'.glb',[o]);result[ident]='models/props/'+ident+'.glb'
    clear_parts();ell('Star mist fruit',(0,.23,0),(.23,.23,.21),'purple');ell('Fruit bloom',(0,.32,.13),(.15,.12,.12),'rose');line('Fruit stem',(0,.4,0),(.045,.57,0),.026,'wood');ell('Fruit leaf',(.12,.49,0),(.14,.045,.07),'leaf');o=batch('Star mist fruit');export('models/props/berry.glb',[o]);result['berry']='models/props/berry.glb'
    clear_parts();cyl('Recovery bottle',(0,.27,0),.17,.43,'glass',12);cyl('Bottle lid',(0,.52,0),.13,.13,'gold',12);cube('Bottle label',(0,.28,.164),(.20,.23,.016),'cream',.02);star('Recovery emblem',0,.29,.18,.085,'sky');o=batch('Restorative potion');export('models/props/potion.glb',[o]);result['potion']='models/props/potion.glb'
    clear_parts();cyl('Advancement crystal',(0,.29,0),.21,.56,'sky',6,r2=.035);cyl('Crystal lower point',(0,.04,0),.08,.23,'purple',6,r2=.21);torus('Crystal gilding',(0,.17,0),.19,.018,'gold');o=batch('Advancement stone');export('models/props/evolution-stone.glb',[o]);result['evolutionStone']='models/props/evolution-stone.glb'
    return result
def arena():
    clear_parts();cube('Arena floating foundation',(0,-.35,0),(22,.7,26),'indigo',.4);cube('Arena smooth floor',(0,.035,0),(21,.08,25),'cream',.15)
    for x in (-10.1,10.1):cube('Arena longitudinal trim',(x,.10,0),(.12,.05,24),'gold',0)
    for z in (-12.1,12.1):cube('Arena transverse trim',(0,.10,z),(20,.05,.12),'gold',0)
    torus('Central spirit ring',(0,.13,0),3,.075,'sky');torus('Inner spirit ring',(0,.13,0),2.5,.045,'gold')
    for z in (-6,6):
        cyl('Team position',(0,.09,z),2.35,.08,'sky' if z>0 else 'purple',48);torus('Team inlay',(0,.145,z),2.08,.05,'white')
    for x in (-9.3,9.3):
        for z in (-10.7,10.7):
            cyl('Corner beacon base',(x,.3,z),.55,.6,'indigo',12);ell('Corner crystal',(x,1.0,z),(.24,.65,.24),'gold')
    o=batch('Phantom 3 on 3 battle arena');export('models/world/arena.glb',[o]);o.hide_set(True)
townobj=town()
for b in BUILDINGS:interior(b)
npcdata=[]
locations={'prof_daydream':[17.3,0,-1.2],'care_nova':[-2.8,0,-1.2],'ranger_lumo':[-17,0,-1.2],'arena_coach':[-18,0,-19],'gym_master':[-17,0,25.5],'tower_keeper':[17,0,25],'resident_berry':[-3,0,28],'resident_kid':[8,0,9],'shop_vendor':[3,0,-.8]}
interiorpos={'prof_daydream':[0,-5],'care_nova':[0,-5.2],'ranger_lumo':[0,-5.1],'gym_master':[0,-5.8],'tower_keeper':[-3.7,0],'resident_berry':[-2,1],'shop_vendor':[4,1]}
for n in NPCS:
    obj=npc(n);obj['position']=locations[n[0]];obj['interiorPosition']=interiorpos.get(n[0],[0,0]);obj['roamRadius']=1.3 if n[0] not in ['arena_coach','resident_kid'] else 3;portraits(n);npcdata.append(obj)
pr=props();pr['spiritBall']=pr['core'];arena()
data=dict(model='models/world/town.glb',worldModel='models/world/town.glb',battleModel='models/world/arena.glb',spawn=[0,0,4],bounds=dict(minX=-36,maxX=36,minZ=-36,maxZ=36),collisions=COLLISIONS,buildings=BUILDINGS,interiors={b['id']:b['interiorModel'] for b in BUILDINGS},props=pr,arena=dict(center=[-19,0,-26],radius=6),npcData='data/npcs.json')
(ROOT/'data/world.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');(ROOT/'data/npcs.json').write_text(json.dumps({'npcs':npcdata},ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'authoring/world-build-report.json').write_text(json.dumps({'blender':bpy.app.version_string,'buildings':6,'interiors':6,'npcs':9,'portraits':27,'props':len(pr),'authoring':'Native Blender meshes and skeletons. No inherited creature assets.'},indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring/dawnlight-world.blend'))
print('DAWNLIGHT_WORLD_COMPLETE',str(ROOT))

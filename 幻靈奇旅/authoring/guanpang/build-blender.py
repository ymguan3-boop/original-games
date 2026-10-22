"""Independent Blender B model: curved forged armor, smooth human anatomy, actual armature.
Run: blender --background --python authoring/guanpang/build-blender.py
Coordinates in this authoring file are Blender native: Z up, -Y front.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector, Quaternion, Euler, Matrix
from math import sin, cos, pi
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'models'/'characters'
HERE=Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
random.seed(42)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
parts=[]
def srgb(c):
    return tuple((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for v in c)
def mat(name,hexcol,metal=0,rough=.45,emit=0):
    col=tuple(int(hexcol[i:i+2],16)/255 for i in (1,3,5));col=srgb(col)
    m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emit:p.inputs['Emission Color'].default_value=(*col,1);p.inputs['Emission Strength'].default_value=emit
    return m
steel=mat('B / forged silver','#89828b',.78,.3)
edge=mat('B / bevel highlights','#d0c8cc',.82,.24)
dark=mat('B / armor recesses','#302733',.6,.4)
inlay=mat('B / obsidian purple','#24102f',.45,.35)
violet=mat('B / violet magic','#9718ff',.25,.25,2)
core=mat('B / rune highlights','#c770ff',.15,.3,1.6)
skin=mat('B / warm skin','#eab17c',0,.62)
skinshadow=mat('B / warm contour','#b97952',0,.7)
lip=mat('B / lip','#a46550',0,.66)
hair=mat('B / black brown hair','#201a1b',0,.7)
hair2=mat('B / hair ridges','#352625',0,.66)
frame=mat('B / spectacle frame','#18171b',.2,.33)
white=mat('B / sclera','#f5e8d6',0,.4)
iris=mat('B / iris','#593923',0,.35)
leather=mat('B / brown leather','#4d3023',0,.85)
leatheredge=mat('B / leather seams','#78513b',0,.75)
suit=mat('B / padded undersuit','#211a28',0,.9)
cloth=mat('B / violet tabard','#4c2558',0,.93)
embroider=mat('B / embroidered violet','#9635bd',.05,.8)

# Independent armature with semantic joint names shared with the game.
spec={
 'root':((0,0,0),(0,0,.2),None),
 'hips':((0,0,.94),(0,0,1.34),'root'),
 'chest':((0,0,1.34),(0,0,2.05),'hips'),
 'head':((0,0,2.04),(0,0,2.58),'chest'),
}
for s,sd in [(1,'L'),(-1,'R')]:
 spec.update({
  'upperArm'+sd:((s*.66,0,1.93),(s*.80,0,1.48),'chest'),
  'forearm'+sd:((s*.80,0,1.48),(s*.87,-.015,1.08),'upperArm'+sd),
  'hand'+sd:((s*.87,-.015,1.08),(s*.89,-.04,.94),'forearm'+sd),
  'thigh'+sd:((s*.31,0,.96),(s*.34,-.035,.52),'hips'),
  'shin'+sd:((s*.34,-.035,.52),(s*.36,0,.16),'thigh'+sd),
  'foot'+sd:((s*.36,0,.16),(s*.36,-.26,.08),'shin'+sd),
 })
for name,head in [('browL',(.097,-.23,2.48)),('browR',(-.097,-.23,2.48)),('eyeL',(.097,-.23,2.414)),('eyeR',(-.097,-.23,2.414)),('mouth',(0,-.245,2.26))]:
 spec[name]=(head,(head[0],head[1],head[2]+.06),'head')
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name='Guanpang_B_Armature'
rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(h,t,parent) in spec.items():
 b=rig.data.edit_bones.new(name);b.head=h;b.tail=t
 if parent:b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
def finish(o,name,material,bone,smooth=True,bevel=0):
 o.name=name;o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Forged rounded bevel','BEVEL');mod.width=bevel;mod.segments=4
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 if smooth:
  for f in o.data.polygons:f.use_smooth=True
 bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if bone=='head':
  if name=='Eyebrow':bone='browL' if sum(v.co.x for v in o.data.vertices)>0 else 'browR'
  elif name in ['Eye','Iris','Pupil','Eye highlight','Upper eyelid']:bone='eyeL' if sum(v.co.x for v in o.data.vertices)>0 else 'eyeR'
  elif name in ['Confident smile','Lower lip','Expression mouth','Expression teeth']:bone='mouth'
 group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
 parts.append(o);return o
def ell(name,p,s,m,b='chest',rot=(0,0,0),seg=48,rings=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=p)
 o=bpy.context.object;o.scale=s;o.rotation_euler=rot;return finish(o,name,m,b)
def box(name,p,s,m,b='chest',rot=(0,0,0),bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,m,b,True,bevel)
def tube(name,points,r,m,b='chest',resolution=10):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=16;cu.bevel_depth=r;cu.bevel_resolution=3;cu.resolution_u=resolution
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for dst,p in zip(sp.points,points):dst.co=(*p,1)
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 return finish(bpy.context.object,name,m,b)
def cone(name,p,tip,r,m=edge,b='chest'):
 vec=Vector(tip)-Vector(p);mid=(Vector(tip)+Vector(p))/2
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=.005,depth=vec.length,location=mid)
 o=bpy.context.object;o.rotation_euler=vec.to_track_quat('Z','Y').to_euler();return finish(o,name,m,b,True,.006)
def panel(name,p,pts,depth,m,b='chest',yaw=0,bevel=.018):
 # Front surface is -Y; 2D polygon coordinates are (X,Z).
 verts=[];faces=[];q=Quaternion((0,0,1),yaw)
 for d in [-depth/2,depth/2]:
  for x,z in pts:verts.append(q@Vector((x,d,z))+Vector(p))
 n=len(pts);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
 for i in range(n):k=(i+1)%n;faces.append((i,k,k+n,i+n))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,m,b,False,bevel)
def shell(name,center,rad,theta0,theta1,m,b='chest',nt=14,np=80,thickness=.028):
 # Thick elliptical shell; real curved shoulder, greave, and breastplate layers.
 verts=[];faces=[]
 for inner in [False,True]:
  rr=[r-(thickness if inner else 0) for r in rad]
  for k in range(nt+1):
   for j in range(np):
    ph=2*pi*j/np
    cutoff=(1.45-.40*cos(ph)) if name=='Fitted short hair' else theta1
    th=theta0+(cutoff-theta0)*k/nt
    verts.append((center[0]+rr[0]*sin(th)*sin(ph),center[1]-rr[1]*sin(th)*cos(ph),center[2]+rr[2]*cos(th)))
 layer=(nt+1)*np
 for s in range(2):
  for k in range(nt):
   for j in range(np):
    a=s*layer+k*np+j;c=s*layer+k*np+(j+1)%np;d=c+np;e=a+np
    faces.append((a,c,d,e) if not s else (a,e,d,c))
 for k in [0,nt]:
  for j in range(np):a=k*np+j;c=k*np+(j+1)%np;faces.append((a,a+layer,c+layer,c))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,m,b,True)
def gem(name,p,size,b='chest',yaw=0):
 pts=[(0,.16),(.11,0),(0,-.16),(-.11,0)];pts=[(x*size,z*size)for x,z in pts]
 panel(name+' rim',p,[(x*1.35,z*1.25)for x,z in pts],.055,edge,b,yaw,.012)
 front=Quaternion((0,0,1),yaw)@Vector((0,-.043,0))+Vector(p)
 panel(name+' inset',front,pts,.035,inlay,b,yaw,.008)
 rune(name+' rune',front+Quaternion((0,0,1),yaw)@Vector((0,-.027,0)),size*.75,b,yaw)
def rune(name,p,s,b='chest',yaw=0,m=violet):
 pts=[(0,.18),(.1,.03),(.045,-.025),(0,-.18),(-.1,-.03),(-.045,.025),(0,.18)]
 q=Quaternion((0,0,1),yaw);p=Vector(p)
 w=[p+q@Vector((x*s,0,z*s))for x,z in pts]
 tube(name,w,.014*s,m,b)
 tube(name+' cross',[p+q@Vector((-.045*s,0,.025*s)),p+q@Vector((.045*s,0,-.025*s))],.012*s,m,b)
shield=[(-.24,.15),(-.16,.29),(0,.34),(.16,.29),(.24,.15),(.19,-.13),(0,-.31),(-.19,-.13)]
def badge(name,p,s,b='chest',yaw=0,seal=False):
 panel(name+' steel rim',p,[(x*s,z*s)for x,z in shield],.055,edge,b,yaw,.022)
 q=Quaternion((0,0,1),yaw);front=Vector(p)+q@Vector((0,-.041,0))
 panel(name+' black inset',front,[(x*s*.83,z*s*.83)for x,z in shield],.035,inlay,b,yaw,.015)
 rune(name+' purple rune',front+q@Vector((0,-.033,0)),s*1.28,b,yaw)
 if seal:
  font=bpy.data.curves.new('Raised 官 seal','FONT');font.body='官';font.align_x='CENTER';font.align_y='CENTER';font.size=.30; font.extrude=.012;font.bevel_depth=.003;font.bevel_resolution=3
  font.font=bpy.data.fonts.load('C:/Windows/Fonts/kaiu.ttf')
  ob=bpy.data.objects.new('Chest 官 character',font);bpy.context.collection.objects.link(ob);ob.location=front+Vector((0,-.061,0));ob.rotation_euler=(pi/2,0,0)
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');finish(bpy.context.object,'Raised 官 character',edge,b)

# Torso: a rounded, continuous heavy silhouette under overlapping curved steel armor.
ell('Padded body',(0,0,1.50),(.55,.32,.55),suit)
# Continuous tailored cuirass: rings share vertices, with no stacked flat belly plaques.
def tailored(name,profile,material,bone):
 verts=[];faces=[];n=96
 for z,rx,ry in profile:
  for j in range(n):
   a=2*pi*j/n;verts.append((rx*sin(a),-ry*cos(a),z))
 for k in range(len(profile)-1):
  for j in range(n):
   a=k*n+j;b=k*n+(j+1)%n;faces.append((a,b,b+n,a+n))
 faces.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+j for j in range(n))])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 return finish(o,name,material,bone)
profile=[(1.20,.48,.32),(1.25,.51,.355),(1.34,.565,.397),(1.44,.587,.407),(1.56,.58,.39),(1.70,.56,.355),(1.84,.50,.30),(1.98,.34,.23),(2.03,.25,.20)]
tailored('Continuous forged cuirass',profile,steel,'chest')
# A deep flexible waist gusset spans both joints; lower armor never terminates in an open gap.
o=tailored('Flexible purple waist gusset',[(1.02,.48,.30),(1.12,.51,.34),(1.24,.51,.35),(1.36,.52,.35)],inlay,'hips')
ch=o.vertex_groups.new(name='chest')
for v in o.data.vertices:
 w=max(0,min(1,(v.co.z-1.12)/.24));o.vertex_groups['hips'].add([v.index],1-w,'REPLACE');ch.add([v.index],w,'REPLACE')
# Forged chevron seams follow the curved surface instead of floating above the abdomen.
for side in [-1,1]:
 tube('Fitted breastplate seam',[(side*.46,-.256,1.82),(side*.46,-.32,1.66),(side*.31,-.36,1.50),(side*.15,-.39,1.38),(0,-.397,1.34)],.012,dark)
 for x,z,y in [( .40,1.62,-.31),(.30,1.39,-.35)]:
  ell('Cuirass forged rivet',(side*x,y-.025,z),(.022,.016,.022),edge,seg=24,rings=16)
# Individually beveled, fitted forged facets follow the same cuirass profile.
def front_surface(x,z):
 for (z0,rx0,ry0),(z1,rx1,ry1) in zip(profile,profile[1:]):
  if z0<=z<=z1:
   t=(z-z0)/(z1-z0);rx=rx0+(rx1-rx0)*t;ry=ry0+(ry1-ry0)*t
   return -ry*math.sqrt(max(.03,1-(x/rx)**2))
 return -.3
for side in [-1,1]:
 for j,(x,z,w,h) in enumerate([(.27,1.45,.21,.13),(.41,1.70,.12,.14),(.19,1.30,.14,.065)]):
  ob=panel('Fitted angular cuirass facet',(side*x,0,z),[(-w,0),(-w*.4,h),(w*.55,h*.72),(w,0),(w*.35,-h),(-w*.6,-h*.64)],.025,steel,bevel=.014)
  for v in ob.data.vertices:v.co.y+=front_surface(v.co.x,v.co.z)-.019
ell('Neck',(0,0,2.08),(.205,.19,.18),skin)
for i in range(16):
 a=2*pi*i/16
 box('Collar segment '+str(i),(.255*sin(a),-.205*cos(a),2.055),(.105,.06,.085),edge,rot=(0,0,a),bevel=.015)
 ell('Collar rivet '+str(i),(.26*sin(a),-.239*cos(a),2.06),(.014,.014,.014),dark,seg=16,rings=12)
badge('Chest emblem',(0,-.405,1.74),1.0,seal=True)
badge('Back emblem',(0,.345,1.76),.88,yaw=pi)
for s in [-1,1]:
 tube('Shoulder leather strap',[(s*.20,-.23,2.02),(s*.38,-.29,1.86),(s*.47,-.31,1.72)],.047,leather)
 box('Collar buckle',(s*.31,-.326,1.92),(.115,.04,.12),edge,rot=(0,s*.15,s*-.35),bevel=.016)
 box('Collar buckle hollow',(s*.31,-.352,1.92),(.065,.015,.065),leather,rot=(0,s*.15,s*-.35),bevel=.009)
 # Flank rune, small side plates.
 gem('Side armor gem',(s*.53,-.21,1.38),.6,yaw=s*-.8)

# Human head, gently tapered jaw, cheeks blend into the face, sculptural nose and lips.
ell('Head',(0,-.01,2.37),(.266,.233,.306),skin,'head',seg=64,rings=48)
ell('Jaw',(0,-.042,2.235),(.222,.196,.163),skin,'head',seg=56,rings=40)
for s in [-1,1]:
 ell('Cheek',(s*.13,-.181,2.31),(.105,.053,.085),skin,'head')
 ell('Ear',(s*.26,-.003,2.35),(.052,.038,.08),skin,'head')
 ell('Inner ear',(s*.278,-.030,2.35),(.023,.014,.045),skinshadow,'head',seg=24,rings=16)
 ell('Eye',(s*.097,-.223,2.414),(.056,.019,.029),white,'head')
 ell('Iris',(s*.097,-.239,2.413),(.023,.008,.024),iris,'head')
 ell('Pupil',(s*.096,-.246,2.414),(.011,.005,.017),frame,'head',seg=24,rings=16)
 ell('Eye highlight',(s*.091,-.251,2.423),(.005,.003,.006),white,'head',seg=16,rings=12)
 tube('Upper eyelid',[(s*.045,-.232,2.426),(s*.09,-.243,2.444),(s*.15,-.220,2.433)],.008,skinshadow,'head')
 tube('Eyebrow',[(s*.045,-.231,2.476),(s*.095,-.237,2.484),(s*.158,-.209,2.475)],.013,hair,'head')
 # Continuous rounded rectangle, instead of four straight bars.
 cx=s*.103;w=.082;h=.048;r=.019;pts=[]
 for xc,zc,start in [(cx+w-r,2.413+h-r,0),(cx-w+r,2.413+h-r,pi/2),(cx-w+r,2.413-h+r,pi),(cx+w-r,2.413-h+r,3*pi/2)]:
  for k in range(7):a=start+k/6*pi/2;pts.append((xc+r*cos(a),-.266,zc+r*sin(a)))
 pts.append(pts[0]);tube('Rounded black spectacle frame',pts,.009,frame,'head')
 tube('Spectacle temple',[(s*.185,-.262,2.43),(s*.247,-.13,2.43),(s*.266,-.005,2.412)],.008,frame,'head')
tube('Spectacle bridge',[(-.025,-.267,2.427),(0,-.271,2.435),(.025,-.267,2.427)],.008,frame,'head')
ell('Nose bridge',(0,-.227,2.37),(.028,.035,.057),skin,'head')
ell('Nose tip',(0,-.260,2.344),(.037,.037,.028),skin,'head')
for s in [-1,1]:ell('Nostril',(s*.025,-.277,2.329),(.009,.006,.006),skinshadow,'head',seg=16,rings=12)
tube('Confident smile',[(-.068,-.229,2.267),(-.025,-.248,2.256),(.024,-.248,2.256),(.065,-.231,2.271)],.0048,lip,'head')
ell('Lower lip',(0,-.237,2.248),(.046,.014,.012),skin,'head')
ell('Expression mouth',(0,-.252,2.26),(.047,.009,.025),dark,'head')
ell('Expression teeth',(0,-.262,2.272),(.035,.004,.006),white,'head')
# Smooth fitted hair cap using dense elliptical shell and layered tapered swept locks.
shell('Fitted short hair',(0,-.002,2.38),(.274,.242,.306),.015,1.55,hair,'head',nt=24,np=96,thickness=.016)
for i in range(22):
 a=i/22*2*pi
 x=.205*sin(a);y=-.17*cos(a)
 ell('Swept hair lock '+str(i),(x,y,2.635+.025*sin(i*1.7)),(.10,.07,.036),hair if i%4 else hair2,'head',rot=(.1,.15,-.45+a*.15),seg=40,rings=24)
for i in range(8):
 x=-.21+i*.057
 ell('Side swept fringe '+str(i),(x,-.189,2.588+.025*sin(i*.8)),(.056,.034,.065),hair if i%3 else hair2,'head',rot=(.2,-.3,-.15),seg=40,rings=24)

# Broad leather belt, curved around the body rather than an unsupported cylinder.
ell('Hip undersuit',(0,0,.95),(.50,.32,.25),suit,'hips')
shell('Heavy waist belt',(0,0,1.12),(.548,.383,.13),.75,2.38,leather,'hips',nt=8,np=80,thickness=.045)
for s in [-1,1]:
 box('Belt buckle',(s*.31,-.339,1.12),(.14,.055,.15),edge,'hips',bevel=.018)
 box('Belt buckle center',(s*.31,-.373,1.12),(.084,.022,.09),leather,'hips',bevel=.009)
 box('Belt buckle pin',(s*.31,-.391,1.12),(.015,.012,.105),edge,'hips',bevel=.004)
 for i in range(3):ell('Belt rivet',(s*(.12+i*.042),-.38,1.12),(.012,.01,.012),edge,'hips',seg=16,rings=12)
gem('Belt central crystal',(0,-.414,1.12),.64,'hips')
tabard=[(-.22,.02),(.22,.02),(.18,-.35),(.11,-.33),(.035,-.51),(-.035,-.43),(-.11,-.48),(-.19,-.35)]
panel('Front torn tabard',(0,-.345,1.05),tabard,.018,cloth,'hips',bevel=.006)
rune('Tabard stitched rune',(0,-.363,.81),.72,'hips',m=embroider)
panel('Rear torn tabard',(0,.32,1.06),tabard,.018,cloth,'hips',yaw=pi,bevel=.006)
rune('Rear tabard stitched rune',(0,.34,.82),.72,'hips',yaw=pi,m=embroider)
for s,sd in [(1,'L'),(-1,'R')]:
 arm='upperArm'+sd;fore='forearm'+sd;hand='hand'+sd;thigh='thigh'+sd;shin='shin'+sd;foot='foot'+sd
 ell('Upper arm leather',(s*.73,0,1.70),(.23,.225,.34),leather,arm)
 # Three concentric curved shoulder lames, continuous across front / side / back.
 for i,(a0,a1) in enumerate([(.05,1.15),(.9,1.5),(1.27,1.90)]):
  rad=(.363+i*.009,.305+i*.009,.28)
  shell('Curved pauldron lame '+str(i),(s*.72,0,1.95),rad,a0,a1,steel,arm,nt=18,np=80)
  pts=[(s*.72+rad[0]*sin(a1)*sin(a),-rad[1]*sin(a1)*cos(a),1.95+rad[2]*cos(a1))for a in [k/80*2*pi for k in range(81)]]
  tube('Rounded pauldron silver lip',pts,.017,edge,arm)
 badge('Shoulder rune',(s*.76,-.31,2.015),.72,arm,yaw=s*-.14)
 for i in range(4):
  p=(s*(.48+i*.15),.015,2.17-abs(i-1.3)*.028)
  cone('Pauldron crown spike',p,(p[0]+s*(i-1)*.045,p[1]+.015,p[2]+.22),.075,edge,arm)
 cone('Pauldron outer spike',(s*1.04,.01,1.98),(s*1.22,.01,2.055),.085,edge,arm)
 ell('Elbow padded hinge',(s*.80,0,1.47),(.175,.18,.18),suit,fore)
 # Forged gauntlets taper towards the wrist and have thick beveled cuffs.
 ell('Forearm armor',(s*.845,0,1.31),(.218,.215,.285),steel,fore)
 for z in [1.49,1.17]:
  pts=[(s*.845+.218*sin(a),-.218*cos(a),z)for a in [k/64*2*pi for k in range(65)]]
  tube('Arm cuff leather strap',pts,.029,leatheredge,fore)
 badge('Gauntlet rune',(s*.85,-.224,1.33),.63,fore,yaw=s*-.1)
 for z in [1.42,1.27]:cone('Forearm spike',(s*1.035,0,z),(s*1.19,0,z+.04),.06,edge,fore)
 ell('Gauntlet palm',(s*.89,-.01,1.015),(.153,.14,.16),dark,hand)
 box('Rounded gauntlet back',(s*.89,-.121,1.035),(.253,.085,.175),steel,hand,rot=(0,s*.08,0),bevel=.042)
 for f in range(4):
  x=s*(.79+f*.065)
  ell('Curled armored finger',(x,-.054,.918),(.032,.064,.072),steel,hand,seg=32,rings=20)
  box('Finger segment',(x,-.10,.943),(.055,.032,.048),edge,hand,bevel=.012)
 ell('Gauntlet thumb',(s*.76,-.105,1.015),(.057,.064,.09),edge,hand,rot=(0,s*-.5,0))
 # Natural relaxed grip: palms inward, thumbs forward. Transform all hand pieces as a unit.
 pivot=Vector((s*.87,-.015,1.08));q=Quaternion((0,0,1),s*pi/2)
 for ob in parts:
  if any(g.name==hand for g in ob.vertex_groups):
   for v in ob.data.vertices:v.co=pivot+q@(v.co-pivot)
 # Flared layered tassets, kept on hips; upper legs remain free to stride.
 for i in range(2):
  panel('Hip tasset '+str(i),(s*(.43+i*.035),-.20,1.00-i*.13),[(-.15,.08),(.13,.10),(.21,-.12),(.03,-.18),(-.17,-.08)],.065,steel,'hips',yaw=s*-.30,bevel=.028)
 panel('Rear tasset',(s*.39,.25,.88),[(-.16,.15),(.15,.12),(.19,-.13),(-.11,-.18)],.06,steel,'hips',yaw=pi+s*.2,bevel=.027)
 ell('Thigh padded leather',(s*.32,0,.76),(.24,.25,.27),leather,thigh)
 panel('Thigh curved face',(s*.33,-.225,.79),[(-.16,.12),(.16,.12),(.19,-.11),(0,-.18),(-.18,-.10)],.075,steel,thigh,bevel=.036)
 ell('Knee joint',(s*.34,-.035,.51),(.19,.19,.16),dark,shin)
 gem('Knee crystal',(s*.34,-.25,.53),.72,thigh)
 ell('Calf armor',(s*.35,.02,.33),(.185,.19,.22),steel,shin)
 panel('Greave front',(s*.35,-.18,.34),[(-.145,.14),(.145,.14),(.13,-.14),(0,-.19),(-.13,-.14)],.055,steel,shin,bevel=.025)
 ell('Armored boot',(s*.36,-.10,.115),(.235,.32,.115),dark,foot)
 ell('Boot toe shell',(s*.36,-.20,.135),(.23,.245,.105),steel,foot)
 box('Boot sole',(s*.36,-.10,.038),(.46,.58,.055),dark,foot,bevel=.022)
 for k in range(3):
  box('Rounded toe cap',(s*.36+(k-1)*.14,-.35,.115),(.13,.12,.12),edge,foot,rot=(.2,0,0),bevel=.025)
 for z in [.21,.285]:
  pts=[(s*.36+.19*sin(a),-.19*cos(a),z)for a in [k/56*2*pi for k in range(57)]]
  tube('Boot ankle collar',pts,.017,edge,foot)

# Rune axe: real curved cutting edges with a thick central head and tapered silhouette.
AXE='handR'
grip=(-.89,-.045,1.00);head=(-1.78,-.05,.77)
tube('Axe leather haft',[(-.72,-.045,1.06),(-1.96,-.05,.70)],.046,leather,AXE)
for i in range(14):
 t=.14+i*.052;x=-.72-1.24*t;z=1.06-.36*t
 pts=[]
 for k in range(33):
  a=k/32*2*pi;pts.append((x+.013*sin(a),-.05+.052*cos(a),z+.05*sin(a)))
 tube('Axe grip winding',pts,.008,leatheredge if i%4 else edge,AXE)
outline=[(-.44,.40),(-.28,.51),(-.18,.38),(-.08,.27),(.05,.27),(.19,.40),(.34,.49),(.43,.34),(.37,.23),(.29,.12),(.26,-.02),(.31,-.19),(.43,-.34),(.29,-.50),(.14,-.41),(.03,-.30),(-.09,-.28),(-.22,-.39),(-.35,-.49),(-.46,-.31),(-.34,-.17),(-.29,-.02),(-.32,.14),(-.40,.26)]
panel('Axe broad forged cutting edges',head,outline,.19,edge,AXE,bevel=.04)
panel('Axe dark metal core',(head[0],head[1]-.11,head[2]),[(x*.74,z*.75)for x,z in outline],.035,inlay,AXE,bevel=.02)
panel('Axe rear dark core',(head[0],head[1]+.11,head[2]),[(x*.74,z*.75)for x,z in outline],.035,inlay,AXE,bevel=.02)
rune('Axe front runic sigil',(head[0],head[1]-.14,head[2]),1.46,AXE)
rune('Axe back runic sigil',(head[0],head[1]+.14,head[2]),1.46,AXE,yaw=pi)
for sign in [-1,1]:
 for s in [-1,1]:tube('Axe rune branch',[(head[0]+s*.12,head[1]-.145,head[2]+sign*.20),(head[0]+s*.25,head[1]-.145,head[2]+sign*.27)],.016,violet,AXE)
cone('Axe pommel',(-.72,-.045,1.06),(-.62,-.045,1.10),.063,edge,AXE)

# Bring the entire weapon forward from the right fist; blade plane faces the direction of travel.
# Rotate independently from the mirrored anatomical hands, retaining the same grasp center.
axe_pivot=Vector(grip);axe_turn=Quaternion((0,0,1),pi/2)
for ob in parts:
 if ob.name.lower().startswith('axe'):
  for v in ob.data.vertices:v.co=axe_pivot+axe_turn@(v.co-axe_pivot)

# Fuse facial skin into one continuous sculpted surface before skinning: cheeks, jaw,
# ears and nose blend together rather than showing intersecting primitive seams.
face_parts=[o for o in parts if o.data.materials[0]==skin and any(g.name=='head'for g in o.vertex_groups)]
bpy.ops.object.select_all(action='DESELECT')
for ob in face_parts:ob.select_set(True)
bpy.context.view_layer.objects.active=face_parts[0];bpy.ops.object.join();face=bpy.context.object
parts=[o for o in parts if o not in face_parts];parts.append(face)
face.name='Continuous sculpted human face'
face.vertex_groups.clear();face.data.remesh_voxel_size=.0065;face.data.remesh_voxel_adaptivity=0
bpy.ops.object.voxel_remesh()
mod=face.modifiers.new('Smooth facial transitions','SMOOTH');mod.factor=.60;mod.iterations=6;bpy.ops.object.modifier_apply(modifier=mod.name)
for f in face.data.polygons:f.use_smooth=True
group=face.vertex_groups.new(name='head');group.add(list(range(len(face.data.vertices))),1,'REPLACE')

# Join into a standard, weighted, skinned mesh. Each hard-surface part has one bone influence.
axe_parts=[o for o in parts if o.name.lower().startswith('axe')]
body_parts=[o for o in parts if o not in axe_parts]
def join_skin(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 mod=o.modifiers.new('Guanpang skeletal deformation','ARMATURE');mod.object=rig;o.parent=rig
 return o
mesh=join_skin(body_parts,'Guanpang_B_SkinnedMesh')
axe=join_skin(axe_parts,'guanpangAxe')
# Deduplicate material slots after joining; glTF exports compact material primitives.
foot_indices=[]
foot_groups={g.index for g in mesh.vertex_groups if g.name in ['footL','footR']}
for v in mesh.data.vertices:
 if any(g.group in foot_groups for g in v.groups):foot_indices.append(v.index)

# All nine named clips use actual pose bones. Arm axes use world reference, mapped into local rests.
fps=30;scene=bpy.context.scene;scene.render.fps=fps
def rotate(name,rx=0,ry=0,rz=0):
 pb=rig.pose.bones[name];rest=rig.data.bones[name].matrix_local.to_quaternion()
 world=Euler((rx,-rz,ry),'XYZ').to_quaternion();pb.rotation_mode='QUATERNION';pb.rotation_quaternion=rest.inverted()@world@rest
def root_up(delta):
 pb=rig.pose.bones['root'];pb.location+=rig.data.bones['root'].matrix_local.to_3x3().inverted()@Vector((0,0,delta))
def solve_arm(side,grasp,delta):
 # Analytic two-bone IK, baked to ordinary glTF bone transforms.
 bpy.context.view_layer.update()
 upper=rig.pose.bones['upperArm'+side];fore=rig.pose.bones['forearm'+side];hand=rig.pose.bones['hand'+side]
 rest_wrist=rig.data.bones[hand.name].head_local
 palm=Vector((.89 if side=='L' else -.89,-.045,1.0))
 wrist=Vector(grasp)-delta@(palm-rest_wrist)
 shoulder=upper.head.copy();axis=wrist-shoulder;distance=axis.length;axis.normalize()
 a=upper.length;b=fore.length;d=min(a+b-.003,max(abs(a-b)+.003,distance))
 wrist=shoulder+axis*d
 pole=Vector((1.3 if side=='L' else -1.3,-.12,-.1));pole-=axis*pole.dot(axis);pole.normalize()
 along=(a*a-b*b+d*d)/(2*d);elbow=shoulder+axis*along+pole*math.sqrt(max(0,a*a-along*along))
 for pb,start,end in [(upper,shoulder,elbow),(fore,elbow,wrist)]:
  rest=rig.data.bones[pb.name];q=(rest.tail_local-rest.head_local).rotation_difference(end-start)@rest.matrix_local.to_quaternion()
  pb.matrix=Matrix.LocRotScale(start,q,Vector((1,1,1)));bpy.context.view_layer.update()
 hand.matrix=Matrix.LocRotScale(wrist,delta@rig.data.bones[hand.name].matrix_local.to_quaternion(),Vector((1,1,1)))
 bpy.context.view_layer.update()

def squat(amount,spread):
 for sign,side in [(1,'L'),(-1,'R')]:
  rotate('thigh'+side,-amount,0,sign*spread)
  rotate('shin'+side,amount*1.8)
  rotate('foot'+side,-amount*.8,0,-sign*spread)

durations={'Idle':3,'Walk':1.2,'Run':.72,'Hurt':1.2,'React':1.6,'Wave':1.6,'Jump':1.5,'Attack':1.05,'Ultimate':2.7}
actions=[]
for name,dur in durations.items():
 action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action
 frames=round(dur*fps)
 for f in range(frames+1):
  u=f/frames;phase=u*2*pi;air=0
  for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
  rotate('chest',.015*sin(phase),.018*sin(phase),0);rotate('head',0,.04*sin(phase),0)
  rotate('upperArmR',0,0,-.10);rotate('forearmR',-.10);rotate('upperArmL',.02,0,.10);rotate('forearmL',-.08)
  if name in ['Walk','Run']:
   amp=.46 if name=='Walk' else 1.02;s=sin(phase)
   rotate('thighL',-amp*s);rotate('thighR',amp*s)
   knee=.5 if name=='Walk' else 1.18
   rotate('shinL',.08+knee*max(0,s));rotate('shinR',.08+knee*max(0,-s))
   rotate('footL',amp*s-.08-knee*max(0,s));rotate('footR',-amp*s-.08-knee*max(0,-s))
   rotate('hips',.07 if name=='Run' else .02,-.10*s,.035*s)
   rotate('upperArmL',amp*.8*s-.18,0,.13);rotate('upperArmR',-amp*.55*s-.18,0,-.13)
   rotate('forearmL',-.42-.15*s);rotate('forearmR',-.28+.12*s)
   rotate('chest',.13 if name=='Run' else .035,.20*s,-.055*s)
   rotate('head',-.06,-.09*s,.025*s)
   if name=='Run':air=.15*max(0,sin(phase)**2-.12)/.88
  if name in ['React','Wave']:
   k=sin(pi*u)**.8;rotate('upperArmL',-2.25*k,0,.15+.2*k*sin(phase*2));rotate('forearmL',-.4*k);rotate('head',0,-.10*k,.06*k)
  if name=='Hurt':
   k=sin(pi*u)**2;rotate('chest',-.18*k,0,.06*k);rotate('head',-.12*k);rotate('upperArmL',-.25*k,0,.12)
  if name=='Jump':
   k=sin(pi*u)**2;root_up(.30*k);rotate('upperArmL',-1.0*k,0,.2);rotate('head',-.12*k)
  # Explicit wrist poses in every clip; no hand twist is inherited from a weapon-axis workaround.
  rotate('handR',.025,0,0);rotate('handL',.025,0,0)
  def pose_curve(keys):
   for i in range(len(keys)-1):
    t0,v0=keys[i];t1,v1=keys[i+1]
    if u<=t1:
     t=max(0,min(1,(u-t0)/(t1-t0)));t=t*t*(3-2*t)
     return [a+(b-a)*t for a,b in zip(v0,v1)]
   return keys[-1][1]
  if name=='Attack':
   lift,bend,crouch=pose_curve([(0,[0,0,0]),(.25,[-1.0,-.35,.38]),(.34,[-1.15,-.3,.40]),(.48,[.00,.02,.48]),(.55,[.00,.02,.46]),(.86,[0,0,0]),(1,[0,0,0])])
   squat(crouch,.13*sin(pi*u)**2)
   rotate('upperArmR',lift,0,-.10);rotate('forearmR',-.10+bend);rotate('handR',.03)
   rotate('chest',.14*sin(pi*u)**2,0,0);rotate('upperArmL',-.3,0,.18)
  if name=='Ultimate':
   # Acquire two-handed grip, wide deep squat, launch, high airborne apex, impact, recover.
   crouch,spread,height,gy,gz,tilt=pose_curve([(0,[0,0,0,-.045,1.0,0]),(.12,[.35,.18,0,-.45,1.55,-.25]),(.25,[1.0,.40,0,-.45,1.55,-.3]),(.34,[.25,.22,.4,-.25,2.38,-1.45]),(.46,[.30,.22,1.9,-.25,2.38,-1.45]),(.53,[.25,.20,1.65,-.30,2.30,-1.35]),(.64,[.80,.36,0,-.45,1.52,-.20]),(.69,[.64,.30,0,-.45,1.52,-.20]),(.86,[0,0,0,-.045,1.0,0]),(1,[0,0,0,-.045,1.0,0])])
   squat(crouch,spread);air=height;rotate('chest',.08 if u<.53 else .18*sin(pi*u),0,0)
   rotate('head',-.10 if u<.53 else .08)
   # Targets are in armature space before root height correction; grip follows the crouching torso.
   if .04<=u<=.86:
    blend=min(1,(u-.04)/.08,(.86-u)/.14);blend=max(0,blend)
    q=Quaternion((1,0,0),tilt)
    gripR=Vector((-.89*(1-blend),gy, gz))
    gripL=gripR+q@Vector((0,.22,.06))
    solve_arm('R',gripR,q)
    natural=rig.pose.bones['handL'].head.copy()+Vector((.02,-.03,-.08))
    solve_arm('L',natural.lerp(gripL,blend),q)
  # Baked facial expressions: eyebrows, eye squint, mouth opening and smile change per action.
  intensity=sin(pi*u)**2
  brow=0;eye=1;mouth=.12
  if name=='Idle':eye=1-.75*max(0,1-abs(u-.68)/.035)
  elif name=='Walk':brow=.04;mouth=.18
  elif name=='Run':brow=.20;eye=.78;mouth=.45
  elif name in ['React','Wave','Jump']:brow=-.18*intensity;eye=1+.12*intensity;mouth=.15+.65*intensity
  elif name=='Hurt':brow=.35*intensity;eye=1-.72*intensity;mouth=.12+.75*intensity
  elif name=='Attack':brow=.32*intensity;eye=1-.35*intensity;mouth=.12+.7*intensity
  elif name=='Ultimate':brow=.42*intensity;eye=1-.40*intensity;mouth=.12+1.3*intensity
  for side,sign in [('L',1),('R',-1)]:
   rotate('brow'+side,0,0,sign*brow);rig.pose.bones['eye'+side].scale=(1,eye,1)
  rig.pose.bones['mouth'].scale=(1,mouth,1)
  # Keep the axe above the support plane while preserving the two-hand shaft constraint.
  if name=='Ultimate' and .12<=u<=.86:
   for correction in range(3):
    bpy.context.view_layer.update();dep=bpy.context.evaluated_depsgraph_get()
    body_eval=mesh.evaluated_get(dep);axe_eval=axe.evaluated_get(dep)
    sole=min((body_eval.matrix_world@body_eval.data.vertices[i].co).z for i in foot_indices)
    blade=min((axe_eval.matrix_world@v.co).z for v in axe_eval.data.vertices)
    delta=max(0,sole+.02-blade)
    if delta<.001:break
    gripR.z+=delta;gripL=gripR+q@Vector((0,.22,.06))
    solve_arm('R',gripR,q);solve_arm('L',gripL,q)
  # Correct soles using actual evaluated skin vertices; preserve the deliberate jump arc.
  bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();ev=mesh.evaluated_get(deps);coords=ev.data.vertices
  minz=min((ev.matrix_world@coords[i].co).z for i in foot_indices)
  if name!='Jump':root_up(.012-minz+air)
  else:root_up(max(0,.012-minz))
  for pb in rig.pose.bones:
   pb.keyframe_insert(data_path='rotation_quaternion',frame=f+1,group=pb.name)
   pb.keyframe_insert(data_path='scale',frame=f+1,group=pb.name)
   if pb.name=='root':pb.keyframe_insert(data_path='location',frame=f+1,group=pb.name)
 action.use_fake_user=True;actions.append(action)
 rig.animation_data.action=None
 # One named NLA track per game clip, used by glTF's NLA animation export.
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);strip.action_frame_start=1;strip.action_frame_end=frames+1
 track.mute=True
scene.frame_set(1)
for pb in rig.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
rig['reference']='大熊厚重比例與動作命名；Blender 獨立曲面建模與蒙皮骨架'
rig['variant']='B / Blender';rig['front']='-Y in Blender; +Z in GLB'
# Native file retains rig, weights, editable meshes/materials and nine actions.
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'guanpang-blender.blend'))
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);axe.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'guanpang-blender.glb'),export_format='GLB',use_selection=True,
 export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
 export_skins=True,export_all_influences=False,export_materials='EXPORT',export_cameras=False,export_lights=False)
triangles=sum(len(p.vertices)-2 for ob in [mesh,axe] for p in ob.data.polygons)
report={'name':'官胖','variant':'B / Blender','source':'authoring/guanpang/guanpang-blender.blend','model':'models/characters/guanpang-blender.glb','fileBytes':(OUT/'guanpang-blender.glb').stat().st_size,'trianglesBeforeExport':triangles,'bones':len(rig.data.bones),'animations':durations,'notes':'Independent curved surface modeling; standard armature with rigid per-part skin weights; no bear meshes reused.'}
(HERE/'blender-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('GUANPANG_BLENDER_DONE',json.dumps(report,ensure_ascii=False))

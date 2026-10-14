"""Three original spiral spirits, native Blender authoring from supplied turnarounds.
Coordinates authored X right, Y up, Z forward. No imported meshes.
Run: Blender --background --python generator.py
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'models/spirits'
REVIEW=ROOT.parents[1]/'artifacts/spiral-final';REVIEW.mkdir(parents=True,exist_ok=True)
PARTS=[];BONES={};MATS={}
def xyz(p):return (p[0],-p[2],p[1])
def col(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)
def addbone(n,p,parent='Root',end=None):BONES[n]=(p,end or (p[0],p[1]+.15,p[2]),parent)
def mat(n,h,metal=0,rough=.36):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.diffuse_color=col(h);b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=col(h);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 if n=='Body':b.inputs['Subsurface Weight'].default_value=.045
 MATS[n]=m

def mesh(n,v,f,m,weight=None):
 me=bpy.data.meshes.new(n);me.from_pydata([xyz(p) for p in v],[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);me.materials.append(MATS[m]);PARTS.append(o)
 for p in me.polygons:p.use_smooth=True
 if weight:
  for i,p in enumerate(v):
   for key,w in (weight(p) if callable(weight) else {weight:1}).items():
    if w>0:
     vg=o.vertex_groups.get(key) or o.vertex_groups.new(name=key);vg.add([i],w,'REPLACE')
 return o

def ell(n,p,s,m,w=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=xyz(p));o=bpy.context.object;o.name=n;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(MATS[m]);PARTS.append(o)
 for q in o.data.polygons:q.use_smooth=True
 if w:
  vg=o.vertex_groups.new(name=w);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
 return o

def tube(n,pts,r,m,w=None,segments=12):
 v=[];f=[];previous_u=None
 for j,p in enumerate(pts):
  tan=(Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)])).normalized();u=tan.cross(Vector((1,0,0)))
  if u.length<.01:u=tan.cross(Vector((0,0,1)))
  u.normalize()
  if previous_u is not None and u.dot(previous_u)<0:u=-u
  previous_u=u.copy();q=tan.cross(u).normalized();rr=r[j] if isinstance(r,list) else r
  for i in range(segments):v.append(tuple(Vector(p)+rr*(u*cos(i*2*pi/segments)+q*sin(i*2*pi/segments))))
 for j in range(len(pts)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;f.append((a,b,b+segments,a+segments))
 f.extend([tuple(range(segments-1,-1,-1)),tuple((len(pts)-1)*segments+i for i in range(segments))]);return mesh(n,v,f,m,w)

def blendkeys(t,names):
 t=max(0,min(len(names)-1,t));i=int(t);j=min(i+1,len(names)-1);a=t-i
 return {names[i]:1} if i==j else {names[i]:1-a,names[j]:a}

def bodyweights(p):
 x,y,z=p
 if y>1.66 and abs(x)>.18:
  side='L' if x<0 else 'R';a=blendkeys((y-1.65)/.30,[f'Feel{side}{i}' for i in range(3)])
  return a
 neck=max(0,min(1,(y-.40)/.75))*max(0,min(1,(z-.45)/.35))
 foot=blendkeys((z+1.35)/.45,[f'Foot{i}' for i in range(7)])
 if neck>0:
  nw=blendkeys((y-.5)/.46,['Neck0','Neck1','Head'])
  return {**{k:v*(1-neck) for k,v in foot.items()},**{k:v*neck for k,v in nw.items()}}
 return foot

def body():
 start=len(PARTS)
 ell('Continuous broad creeping foot',(0,.24,-.10),(.52,.205,1.45),'Body')
 # Overlapping smooth volumes are voxel fused into one continuous soft-body surface.
 rings=[(.12,.49,.48,.88),(.25,.51,.46,.90),(.50,.49,.43,.93),(.80,.45,.40,.97),(1.10,.40,.36,1.0),(1.38,.35,.31,1.01),(1.58,.29,.25,1.01),(1.70,.20,.16,1.01),(1.75,.04,.04,1.01)]
 vv=[];ff=[];n=48
 for y,rx,rz,zc in rings:
  for j in range(n):aa=j/n*2*pi;vv.append((rx*cos(aa),y,zc+rz*sin(aa)))
 for k in range(len(rings)-1):
  for j in range(n):a=k*n+j;b=k*n+(j+1)%n;ff.append((a,b,b+n,a+n))
 ff.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+j for j in range(n))]);neck=mesh('Continuous tapered head and neck',vv,ff,'Body')
 sm=neck.modifiers.new('Smooth head profile','SUBSURF');sm.levels=2;bpy.context.view_layer.objects.active=neck;bpy.ops.object.modifier_apply(modifier=sm.name)
 for side,s in [('L',-1),('R',1)]:
  pts=[(s*(.24+.18*t),1.55+.84*t,1.01-.03*t) for t in [j/20 for j in range(21)]]
  tube('Long organic feeler '+side,pts,[.10-.033*j/20 for j in range(21)],'Body')
  ell('Rounded antenna tip '+side,(s*.42,2.4,.98),(.155,.165,.148),'Body')
 bpy.ops.object.select_all(action='DESELECT')
 for o in PARTS[start:]:o.select_set(True)
 bpy.context.view_layer.objects.active=PARTS[start];bpy.ops.object.join();o=bpy.context.object;o.name='ContinuousBodyAndFeelers';PARTS[start:]=[o]
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 rem=o.modifiers.new('Unified organic manifold','REMESH');rem.mode='VOXEL';rem.voxel_size=.023;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
 sm=o.modifiers.new('Soft tissue surface relaxation','SMOOTH');sm.factor=.7;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
 dec=o.modifiers.new('Efficient smooth organic topology','DECIMATE');dec.ratio=.42;bpy.ops.object.modifier_apply(modifier=dec.name)
 for v in o.data.vertices:
  p=(v.co.x,v.co.z,-v.co.y)
  for k,w in bodyweights(p).items():
   if w>0:
    vg=o.vertex_groups.get(k) or o.vertex_groups.new(name=k);vg.add([v.index],w,'REPLACE')
 for s in (-1,1):
  ell('Small round black eye',(s*.21,1.28,1.312),(.048,.052,.029),'Eye','Head')
  ell('Subtle eye catchlight',(s*.21-.011,1.298,1.335),(.008,.009,.004),'Highlight','Head')
 tube('Flat quiet mouth',[(-.26,1.075,1.365),(-.13,1.075,1.38),(0,1.075,1.386),(.13,1.075,1.38),(.26,1.075,1.365)],.019,'Mouth','Neck1',16)
 # Restrained recessed feeler edge traces remain attached by the same gradient weights.
 for s in (-1,1):
  pts=[(s*(.30+.18*t),1.64+.70*t,1.06) for t in [j/25 for j in range(26)]]
  tube('Feeler warm edge',pts,.012,'WarmEdge',bodyweights,8)

SPIRAL=[]
for i in range(241):
 t=i/240;a=-.55+t*2*pi*1.34;r=.075+.84*t
 SPIRAL.append((r*sin(a),r*cos(a),t))
def smooth01(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def shell_base(r):return .56*max(0,1-r*r)**.40
def shell_surface(y,z):
 yy=y-1.22;zz=(z+.26)/1.04;r=(yy*yy+zz*zz)**.5
 # Euclidean nearest-point channel with rounded, smoothly faded endpoints:
 # no atan2 branch cut and no signed-distance switch at the spiral center.
 d2=100;t=0
 for i in range(len(SPIRAL)-1):
  ay,az,at=SPIRAL[i];by,bz,bt=SPIRAL[i+1];dy=by-ay;dz=bz-az
  u=max(0,min(1,((yy-ay)*dy+(zz-az)*dz)/(dy*dy+dz*dz)))
  dd=(yy-ay-u*dy)**2+(zz-az-u*dz)**2
  if dd<d2:d2=dd;t=at+(bt-at)*u
 fade=smooth01(t/.10)*smooth01((1-t)/.12)*smooth01((1-r)/.10)*smooth01((r-.09)/.20)
 relief=(.080*math.exp(-d2/.18**2)-.065*math.exp(-d2/.070**2))*fade
 return shell_base(r)+relief

def shell():
 v=[];f=[];nr=48;na=112
 for side in (-1,1):
  center=len(v);v.append((side*shell_surface(1.22,-.26),1.22,-.26));offset=len(v)
  for j in range(1,nr+1):
   r=j/nr
   for i in range(na):
    a=i/na*2*pi;y=1.22+r*sin(a);z=-.26+r*1.04*cos(a);v.append((side*shell_surface(y,z),y,z))
  for i in range(na):
   tri=(center,offset+i,offset+(i+1)%na);f.append(tri if side<0 else tri[::-1])
  for j in range(nr-1):
   for i in range(na):a=offset+j*na+i;b=offset+j*na+(i+1)%na;c=b+na;d=a+na;f.append((a,b,c,d) if side>0 else (d,c,b,a))
 o=mesh('Smooth sculpted double spiral shell',v,f,'Shell','Shell')
 import bmesh
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()

def feather_base(r):
 # Smooth convex hull extension avoids the infinite rim slope of the shell.
 if r<=.94:return shell_base(r)
 base=shell_base(.94);slope=-.56*.8*.94*(1-.94**2)**(-.60)
 return max(.025,base+slope*(r-.94))

def feather(index,side,start,width,stage):
 names=[];steps=20;span=.98 if stage==2 else .88
 def center(t):
  r=.86+(.12 if stage==2 else .17)*t;a=start+span*t;y=1.22+r*sin(a);z=-.26+r*1.04*cos(a)
  offset=.105+.018*(index%2)+.025*t*t
  x=feather_base(r)+offset
  x=(shell_surface(y,z)-.022)*(1-smooth01(t/.20))+x*smooth01(t/.20)
  return Vector((side*x,y,z))
 for j in range(3):
  n=f'Blade{side}_{index}_{j}';names.append(n);addbone(n,tuple(center(j/3)),'Shell' if j==0 else names[j-1],tuple(center((j+1)/3)))
 v=[];f=[];vw=[]
 for j in range(steps+1):
  t=j/steps;c=center(t);a=start+span*t;r=.86+(.12 if stage==2 else .17)*t;half=width*sin(pi*t)**.85+.001
  for across,depth in [(-1,0),(-.45,.030),(0,.045),(.45,.030),(1,0),(.45,-.022),(0,-.028),(-.45,-.022)]:
   rr=r+half*across;y=1.22+rr*sin(a);z=-.26+rr*1.04*cos(a)
   x=abs(c.x)+feather_base(rr)-feather_base(r)+depth*sin(pi*t)
   v.append((side*x,y,z));vw.append(blendkeys(t*2,names))
 for j in range(steps):
  for k in range(8):a=j*8+k;b=j*8+(k+1)%8;f.append((a,b,b+8,a+8))
 f.extend([tuple(range(7,-1,-1)),tuple(steps*8+k for k in range(8))])
 o=mesh(f'Curved fitted feather {side} {index}',v,f,'Feather' if index%2 else 'FeatherLight')
 for i,weights in enumerate(vw):
  for n,w in weights.items():
   if w>0:
    vg=o.vertex_groups.get(n) or o.vertex_groups.new(name=n);vg.add([i],w,'REPLACE')
 mod=o.modifiers.new('Smooth closed leaf plate','SUBSURF');mod.levels=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)

def feathers(stage):
 if stage==1:return
 angles=[-1.48,-.70,.85] if stage==2 else [-1.65,-1.05,-.45,.20,.86,1.52,2.18]
 for side in (-1,1):
  for i,a in enumerate(angles):feather(i,side,a,.115 if stage==2 else .105,stage)

def make_rig():
 arm=bpy.data.armatures.new('Spiral spirit articulated skeleton');rig=bpy.data.objects.new('SpiralSpiritRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for key,(p,end,parent) in BONES.items():
  b=arm.edit_bones.new(key);b.head=xyz(p);b.tail=xyz(end)
  if parent:b.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT')
 for o in PARTS:
  o.parent=rig;mod=o.modifiers.new('True gradient skeletal skin','ARMATURE');mod.object=rig
 return rig

def animate(rig):
 sc=bpy.context.scene;sc.render.fps=24
 for label,dur in [('Idle',96),('Walk',48),('React',48)]:
  for frame in range(1,dur+2,2):
   ph=(frame-1)/dur*2*pi;pb=rig.pose.bones
   for b in pb:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
   amp=.018 if label=='Idle' else .055 if label=='Walk' else .032
   for j in range(7):
    b=pb[f'Foot{j}'];wave=ph*2-j*.70
    b.location.z=amp*.38*sin(wave);b.location.y=amp*(.55+.45*sin(wave));b.scale.x=1+.035*sin(wave);b.scale.z=1+.035*cos(wave)
   for j,n in enumerate(['Neck0','Neck1','Head']):
    pb[n].rotation_euler.x=(.018 if label=='Idle' else .036)*sin(ph+j*.5);pb[n].rotation_euler.z=.013*sin(ph+.7*j)
   pb['Shell'].location.y=.017*(1+sin(ph*2-.5));pb['Shell'].rotation_euler.z=.014*sin(ph)
   for side,sgn in [('L',-1),('R',1)]:
    for j in range(3):
     b=pb[f'Feel{side}{j}'];b.rotation_euler.x=.045*sin(ph+j*.65+sgn*.4);b.rotation_euler.z=sgn*.025*sin(ph+1+j*.6)
   for n in pb.keys():
    if n.startswith('Blade'):
     spl=n.split('_');j=int(spl[-1]);i=int(spl[-2]);side=-1 if '-1' in spl[0] else 1
     pb[n].rotation_euler.x=(.008+.013*j)*sin(ph+i*.75+j*.50);pb[n].rotation_euler.z=(.007+.007*j)*side*sin(ph+i*.75+.6)
   if label=='React':
    q=sin(ph/2)**2;pb['Neck0'].rotation_euler.x=-.20*q;pb['Neck1'].rotation_euler.x=-.14*q;pb['Shell'].location.y+=.08*q
    for side in ['L','R']:
     for j in range(3):pb[f'Feel{side}{j}'].rotation_euler.x+=.15*q
   for b in pb:
    b.keyframe_insert('rotation_euler',frame=frame,group=b.name);b.keyframe_insert('location',frame=frame,group=b.name);b.keyframe_insert('scale',frame=frame,group=b.name)
  ac=rig.animation_data.action;ac.name=label;ac.use_fake_user=True;tr=rig.animation_data.nla_tracks.new();tr.name=label;tr.strips.new(label,1,ac);rig.animation_data.action=None;tr.mute=True
 for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
 sc.frame_set(1)

def build(stage):
 global PARTS,BONES,MATS
 bpy.ops.wm.read_factory_settings(use_empty=True);PARTS=[];MATS={};BONES={'Root':((0,0,0),(0,.15,0),None)}
 for i in range(7):addbone(f'Foot{i}',(0,.20,-1.35+i*.45))
 addbone('Neck0',(0,.48,.91),'Foot5');addbone('Neck1',(0,.94,1.0),'Neck0');addbone('Head',(0,1.35,1.0),'Neck1');addbone('Shell',(0,1.05,-.26),'Foot3')
 for side,s in [('L',-1),('R',1)]:
  for j in range(3):addbone(f'Feel{side}{j}',(s*(.24+.06*j),1.65+j*.27,1.0),'Head' if j==0 else f'Feel{side}{j-1}')
 for args in [('Body','B7794D',0,.40),('Shell','126477',.24,.29),('Groove','083742',.15,.35),('ShellRidge','236B7B',.25,.32),('Eye','24120D',0,.24),('Mouth','4D281A',0,.4),('Highlight','EEDCC8',0,.3),('WarmEdge','784529',0,.4),('Feather','267F99',.50,.28),('FeatherLight','398FA6',.48,.28)]:mat(*args)
 if stage>1:
  palette={'Shell':'963ED4','Feather':'C995F5','FeatherLight':'E2B145'} if stage==2 else {'Shell':'B83C28','Feather':'DF7135','FeatherLight':'F0BD58'}
  for key,h in palette.items():
   m=MATS[key];m.diffuse_color=col(h);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=col(h);bs.inputs['Metallic'].default_value=.52;bs.inputs['Roughness'].default_value=.31
 body();shell();feathers(stage);rig=make_rig();animate(rig)
 # Combine by material after retaining weight maps to reduce runtime draw calls.
 bpy.ops.object.select_all(action='DESELECT')
 for o in PARTS:o.select_set(True)
 bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();skin=bpy.context.object;skin.name=f'SpiralSpiritStage{stage}Skin'
 slots=list(skin.data.materials);unique=[];mapping={}
 for i,m in enumerate(slots):
  if m not in unique:unique.append(m)
  mapping[i]=unique.index(m)
 inds=[mapping[p.material_index] for p in skin.data.polygons];skin.data.materials.clear()
 for m in unique:skin.data.materials.append(m)
 for p,i in zip(skin.data.polygons,inds):p.material_index=i
 bpy.ops.object.select_all(action='DESELECT');skin.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'spiral-snail-{stage}.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_frame_range=False,export_force_sampling=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_cameras=False,export_lights=False)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'authoring'/f'spiral-snail-stage-{stage}.blend'))
 skin.data.calc_loop_triangles();coords=[v.co for v in skin.data.vertices]
 out={'stage':stage,'model':f'models/spirits/spiral-snail-{stage}.glb','blend':f'authoring/spiral-snail-stage-{stage}.blend','vertices':len(coords),'triangles':len(skin.data.loop_triangles),'bones':len(BONES),'featherCount':0 if stage==1 else 6 if stage==2 else 14,'materials':len(unique),'meshCount':1,'drawPrimitives':len(unique),'fileBytes':(OUT/f'spiral-snail-{stage}.glb').stat().st_size,'weightedVertices':sum(bool(v.groups) for v in skin.data.vertices),'blendedVertices':sum(len([g for g in v.groups if g.weight>.001])>1 for v in skin.data.vertices),'clips':[{'name':'Idle','duration':4},{'name':'Walk','duration':2},{'name':'React','duration':2}],'dimensions':[max(v[i] for v in coords)-min(v[i] for v in coords) for i in (0,2,1)],'forward':'+Z','up':'+Y','bodyBoneCount':7,'feelerSegmentsEach':3,'featherSegmentsEach':3}
 print('STAGE_COMPLETE',json.dumps(out),flush=True);return out
if __name__=='__main__':
 results=[build(stage) for stage in (1,2,3)];(REVIEW/'model-manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print('ALL_STAGES_COMPLETE')

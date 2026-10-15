import bpy, math, json, os, random
from mathutils import Vector, Quaternion
from math import sin, cos, pi
from pathlib import Path
OUT=str(Path(__file__).resolve().parents[3]/'artifacts'/'pepper-chick')
os.makedirs(OUT,exist_ok=True)
random.seed(23)

def mat(name,c,rough=.4,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
def bind(o,bone):
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE')
 mod=o.modifiers.new('Articulated feather rig','ARMATURE');mod.object=rig
 o.parent=rig;parts.append(o);o.select_set(False)
 return o
def uv(name,loc,scale,material,bone='body',rot=(0,0,0),segments=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler=rot;o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 return bind(o,bone)
def tube(name,points,radii,material,bone='body',sides=12):
 verts=[];faces=[]
 for i,p in enumerate(points):
  tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
  tangent.normalize();u=tangent.cross(Vector((0,1,0))).normalized()
  if u.length<.1:u=tangent.cross(Vector((1,0,0))).normalized()
  v=tangent.cross(u).normalized()
  for j in range(sides):
   a=2*pi*j/sides;verts.append(Vector(p)+radii[i]*(u*cos(a)+v*sin(a)))
 for i in range(len(points)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 for f in mesh.polygons:f.use_smooth=True
 return bind(o,bone)
def feather(name,p,length,width,material,bone='body',tilt=0):
 # Tapered flattened teardrop, curved toward the tip; a sculpted feather rather than a flat card.
 x,y,z=p;verts=[];faces=[];N=12;S=10
 for i in range(N+1):
  t=i/N;w=width*(sin(pi*t)**.7)*(.95+.15*t)
  for j in range(S):
   a=j/S*2*pi;xx=w*cos(a);zz=-length*t;yy=.22*w*sin(a)-.12*t-.025*sin(pi*t)
   verts.append((x+xx*cos(tilt)+zz*sin(tilt),y+yy,z-xx*sin(tilt)+zz*cos(tilt)))
 for i in range(N):
  for j in range(S):a=i*S+j;b=i*S+(j+1)%S;faces.append((a,b,b+S,a+S))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 for f in mesh.polygons:f.use_smooth=True
 return bind(o,bone)
def key(b,f,loc=None,rot=None,scale=None):
 p=rig.pose.bones[b]
 if loc is not None:p.location=loc;p.keyframe_insert('location',frame=f)
 if rot is not None:p.rotation_euler=rot;p.keyframe_insert('rotation_euler',frame=f)
 if scale is not None:p.scale=scale;p.keyframe_insert('scale',frame=f)
def reset():
 for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
def action(name,end):
 reset();a=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=a
 for b in bones:key(b,1,(0,0,0),(0,0,0),(1,1,1));key(b,end,(0,0,0),(0,0,0),(1,1,1))
 return a
def finish(a,end):
 track=rig.animation_data.nla_tracks.new();track.name=a.name;strip=track.strips.new(a.name,1,a);strip.action_frame_start=1;strip.action_frame_end=end
 rig.animation_data.action=None;track.mute=True
 clips.append({'name':a.name,'duration':(end-1)/30,'frames':end})

allmeta=[]
for stage in (1,2,3):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 parts=[];clips=[];n=[1,2,5][stage-1]
 yellow=mat('Warm golden down',(1,.49,.018),.58);light=mat('Sunlit feather',(1,.59,.035),.48);orange=mat('Amber flight feather',(1,.39,.025),.45)
 beak=mat('Tangerine beak and feet',(1,.285,.025),.3);eye=mat('Deep glossy black brown',(.013,.006,.003),.12);iris=mat('Chestnut eye rim',(.15,.052,.008),.25)
 white=mat('Catchlight',(1,.98,.86),.13);pink=mat('Peach cheek',(.98,.36,.12),.7);green=mat('Pickled green pepper',(.22,.32,.025),.22);stem=mat('Olive stem',(.12,.19,.015),.3);leaf=mat('Shoulder leaf',(.17,.25,.035),.38);vein=mat('Golden leaf vein',(.5,.42,.11),.45);rope=mat('Braided vine',(.22,.105,.035),.4);red=mat('Ripe red pepper tips',(.8,.025,.008),.22);mouth=mat('Mouth interior',(.13,.015,.004),.6)
 bones={'root':((0,0,0),None),'body':((0,0,1),'root'),'head':((0,0,1.9),'body'),'beak':((0,-.75,2.05),'head'),'jaw':((0,-.75,1.98),'head'),'crest':((0,0,2.7),'head'),'tail':((0,.48,.95),'body')}
 for s in (-1,1):
  tag='L' if s<0 else 'R'
  bones['wing'+tag]=((s*.62,-.05,1.55),'body');bones['forearm'+tag]=((s*.86,.03,1.20),'wing'+tag);bones['hand'+tag]=((s*.62,-.38,1.35),'forearm'+tag)
  bones['leg'+tag]=((s*.32,0,.62),'body');bones['shin'+tag]=((s*.32,-.015,.36),'leg'+tag);bones['foot'+tag]=((s*.32,-.08,.13),'shin'+tag);bones['eye'+tag]=((s*.3,-.69,2.22),'head')
 pepperpos=[]
 for j in range(n):
  x=([.54] if n==1 else [-.66,.66] if n==2 else [-.77,-.4,0,.4,.77])[j]
  y=.43+(.18 if n==5 and j in (1,2,3) else 0);z=1.53+( .12 if n==5 and j in (1,2,3) else 0)
  pepperpos.append(Vector((x,y,z)));bones['pepper%d'%j]=((x,y,z),'body')
 arm=bpy.data.armatures.new('PepperChick_Skeleton');rig=bpy.data.objects.new('PepperChick_Stage%d'%stage,arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,(p,parent) in bones.items():
  b=arm.edit_bones.new(name);b.head=p;b.tail=Vector(p)+Vector((0,.15,0))
  if parent:b.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 for p in rig.pose.bones:p.rotation_mode='XYZ'
 uv('Pear shaped plump body',(0,0,.98),(.7,.55,.78),yellow)
 uv('Round baby chick head',(0,-.06,2.02),(.77,.65,.76),light,'head',segments=40,rings=28)
 uv('Soft lower face',(0,-.21,1.8),(.65,.52,.37),light,'head')
 for s in (-1,1):
  tag='L' if s<0 else 'R';x=s*.31
  uv('Eye socket '+tag,(x,-.661,2.14),(.18,.079,.211),iris,'head')
  uv('Glossy eye '+tag,(x,-.713,2.15),(.153,.074,.183),eye,'eye'+tag)
  uv('Eye glint '+tag,(x-.042,-.779,2.22),(.044,.012,.047),white,'eye'+tag,segments=16,rings=10)
  uv('Small reflected glint '+tag,(x+.048,-.777,2.09),(.016,.008,.018),white,'eye'+tag,segments=12,rings=8)
  uv('Peach cheek '+tag,(s*.48,-.568,1.94),(.126,.018,.079),pink,'head',rot=(0,0,-s*.30))
  uv('Folded wing '+tag,(s*.635,-.14,1.23),(.25,.27,.40),yellow,'wing'+tag,rot=(0,-s*.25,0))
  uv('Little gripping hand '+tag,(s*.59,-.402,1.35),(.22,.17,.23),light,'hand'+tag)
  for k in range(3):uv('Hand feather finger '+tag+str(k),(s*(.54+.035*k),-.535,1.48-k*.095),(.15,.081,.067),light,'hand'+tag)
  uv('Shin '+tag,(s*.32,-.04,.25),(.092,.09,.15),beak,'shin'+tag)
  tube('Continuous upper leg '+tag,[(s*.32,0,.62),(s*.32,-.015,.36)],[.13,.10],yellow,'leg'+tag)
  tube('Continuous upper wing '+tag,[(s*.62,-.05,1.55),(s*.86,.03,1.20)],[.19,.15],yellow,'wing'+tag)
  uv('Soft elbow '+tag,(s*.86,.03,1.20),(.17,.17,.17),yellow,'forearm'+tag)
  tube('Continuous folded forewing '+tag,[(s*.86,.03,1.20),(s*.62,-.38,1.35)],[.15,.17],yellow,'forearm'+tag)
  uv('Foot pad '+tag,(s*.32,-.09,.11),(.19,.23,.10),beak,'foot'+tag)
  for k in (-1,0,1):uv('Rounded toe '+tag+str(k),(s*.32+k*.11,-.255,.085),(.072,.17,.072),beak,'foot'+tag,rot=(0,0,-k*.23))
  for k in range(2+stage):
   feather('Layered wing feather '+tag+str(k),(s*(.67+.075*k),-.27,1.45-k*.035),.4+.08*stage,.1,orange if k%2 else light,'wing'+tag,tilt=-s*.3)
  if stage>1:
   for k in range(3):feather('Cheek tufts '+tag+str(k),(s*(.59+.035*k),-.3,1.99-k*.07),.21,.073,light,'head',tilt=-s*.9)
  # Leaf straps connect chest over shoulder and onto the pepper pack.
  pts=[(s*(.48+.04*sin(t*pi)), -.47+1.02*t,1.52+.17*sin(pi*t)) for t in [i/16 for i in range(17)]]
  tube('Leaf shoulder harness '+tag,pts,[.037]*17,leaf)
  if stage==3:
   feather('Broad shoulder leaf '+tag,(s*.58,-.25,1.69),.43,.18,leaf,tilt=-s*.75)
   tube('Shoulder gold midrib '+tag,[(s*.58,-.3,1.66),(s*.71,-.34,1.54),(s*.87,-.31,1.36)],[.011]*3,vein)
   uv('Leaf clasp '+tag,(s*.49,-.50,1.48),(.065,.028,.10),vein)
 # Split orange bill with dark smiling gap.
 uv('Mouth gap',(0,-.733,1.995),(.145,.126,.041),mouth,'head')
 uv('Upper bill',(0,-.78,2.035),(.155,.17,.075),beak,'beak',rot=(.18,0,0))
 uv('Lower bill',(0,-.782,1.963),(.137,.146,.046),beak,'jaw')
 for s in (-1,1):uv('Nostril',(s*.056,-.891,2.067),(.014,.007,.009),iris,'beak',segments=12,rings=8)
 for k in range(stage+1):
  feather('Upright crest plume %d'%k,((k-stage/2)*.14,.00,2.62),-.31-.12*stage+.08*abs(k-stage/2),.12,light if k%2 else yellow,'crest',tilt=(k-stage/2)*.3)
 for k in range(3+stage):feather('Tail fan '+str(k),((k-(2+stage)/2)*.12,.46,1.1),-.40,.10,orange,'tail',tilt=(k-(2+stage)/2)*.23)
 if stage>1:
  for row in range(stage+1):
   count=5+row
   for j in range(count):
    x=(j-(count-1)/2)*.135;z=1.58-row*.16;y=-.51+abs(x)*.18
    feather('Chest ruff %d %d'%(row,j),(x,y,z),.31,.095,light if row%2==0 else yellow,tilt=x*.45)
 if stage==3:
  for row in range(4):
   for j in range(11):
    a=-pi*.85+j*pi*1.7/10;x=.66*sin(a);y=-.51*cos(a);z=1.16-row*.15
    feather('Belly plumage %d %d'%(row,j),(x,y,z),.27,.09,light if (row+j)%4==0 else yellow,tilt=.18*sin(a))
 for j,pos in enumerate(pepperpos):
  b='pepper%d'%j;x,y,z=pos
  # Main pepper lobes have a soft, irregular pickled skin silhouette.
  points=[];radii=[]
  for k in range(25):
   t=k/24;points.append((x+.10*sin(pi*t)+.10*(1-t)**3,y+.025*sin(3*pi*t),z-.65+1.23*t));radii.append(max(.012,.205*sin(pi*t)**.45*(.80+.20*t)*(1+.045*sin(t*27+j))))
  tube('Whole pickled pepper %d'%j,points,radii,green,b,sides=20)
  if stage==3:
   tube('Scarlet ripe tip %d'%j,points[:7],radii[:7],red,b,sides=20)
  uv('Pepper calyx %d'%j,(x,y,z+.56),(.22,.18,.07),stem,b)
  tube('Curved pepper stem %d'%j,[(x,y,z+.58),(x+.015,y,z+.74),(x+.08,y,z+.87),(x+.17,y,z+.9)],[.064,.052,.045,.025],stem,b)
  if stage>1:
   # The loose pack vines remain on the pack, independent of the picked fruit.
   for off in (-.22,.21):
    pts=[(x+.225*cos(a),y+.19*sin(a),z+off+.045*sin(2*a)) for a in [k*2*pi/32 for k in range(33)]]
    tube('Pack binding %d %.1f'%(j,off),pts,[.023]*33,rope)
   feather('Pepper leaf %d'%j,(x+.16,y-.13,z+.25),.38,.12,leaf,b,tilt=-.50)
   tube('Pepper leaf vein %d'%j,[(x+.16,y-.16,z+.23),(x+.23,y-.18,z+.05),(x+.32,y-.14,z-.07)],[.009]*3,vein,b)
 # Join all pieces into a single skinned mesh with preserved per-bone weights.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='PepperChick_Stage%d_SkinnedMesh'%stage
 # All rigid segment groups share one armature; eliminate duplicate modifiers from join if any.
 for mod in list(mesh.modifiers)[1:]:mesh.modifiers.remove(mod)
 a=action('Idle',121)
 for f in range(1,122,10):
  t=(f-1)/120*2*pi;key('body',f,(0,0,.018*sin(t)),(0,.012*sin(t),.012*sin(t)))
  key('head',f,rot=(.025*sin(t),0,.11*sin(t)));key('crest',f,rot=(.03*sin(t+.4),0,0))
 for f,v in [(1,1),(49,1),(52,.12),(55,1),(121,1)]:
  for tag in ('L','R'):key('eye'+tag,f,scale=(1,1,v))
 finish(a,121)
 a=action('Walk',61)
 for f in range(1,62,5):
  t=(f-1)/60*4*pi;key('body',f,(0,0,.045*(1-cos(2*t))),(0,.035*sin(t),.045*sin(t)))
  key('head',f,rot=(.055*sin(2*t),.04*sin(t),.22*sin(t/2)));key('crest',f,rot=(.09*sin(2*t+.5),0,0));key('tail',f,rot=(.12*sin(t),0,0))
  for s,tag in [(-1,'L'),(1,'R')]:
   phase=t+(pi if s<0 else 0);key('leg'+tag,f,(0,.11*sin(phase),.075*max(0,sin(phase))),(.42*sin(phase),0,0));key('foot'+tag,f,rot=(-.20*sin(phase),0,0));key('wing'+tag,f,rot=(-.12*sin(phase),s*.07,0))
 finish(a,61)
 # Pick-up trajectories: back -> outward side -> front -> mouth. Continuous sampled keys.
 a=action('Eat',211)
 take=min(stage,n)
 for j in range(take):
  p=pepperpos[j];side=-1 if p.x<0 else 1;target=Vector(((j-(take-1)/2)*.17,-.93,1.83))
  path=[(1,p),(20,p),(40,Vector((side*1.02,.35,1.8))),(64,Vector((side*.92,-.65,1.65))),(87,target),(112,target),(138,target),(158,Vector((side*.92,-.65,1.65))),(183,Vector((side*1.02,.35,1.8))),(201,p),(211,p)]
  for f,q in path:key('pepper%d'%j,f,q-p,rot=(.20 if 87<=f<=138 else 0,0,0))
  for f in [95,103,111,119,127,135]:key('pepper%d'%j,f,target-p+Vector((0,.035 if f%16==7 else 0,0)))
 for side,tag in [(-1,'L'),(1,'R')]:
  # Shoulder rotation reaches around back before bringing the hand forward.
  for f,rx,rz in [(1,0,0),(20,0,0),(40,-.65,side*.45),(64,.5,side*.15),(87,.75,-side*.32),(138,.75,-side*.32),(158,.5,side*.15),(183,-.65,side*.45),(201,0,0),(211,0,0)]:key('wing'+tag,f,rot=(rx,0,rz))
  for f,dy,dz in [(1,0,0),(40,.40,.24),(64,-.12,.20),(87,-.17,.30),(138,-.17,.30),(183,.40,.24),(201,0,0),(211,0,0)]:key('hand'+tag,f,(0,dy,dz))
 for f in range(88,140,6):key('jaw',f,rot=(.22 if f%12==4 else 0,0,0));key('head',f,rot=(.07 if f%12==4 else -.025,0,0))
 key('head',160,rot=(0,0,0));key('jaw',160,rot=(0,0,0))
 # Bake exact hand contact to the carried pepper, using evaluated parent transforms.
 for f in range(20,212):
  scene=bpy.context.scene;scene.frame_set(f);bpy.context.view_layer.update()
  for tag,sgn in [('L',-1),('R',1)]:
   candidates=[j for j in range(take) if (-1 if pepperpos[j].x<0 else 1)==sgn]
   if not candidates:continue
   j=candidates[0];hand=rig.pose.bones['hand'+tag];orig=hand.matrix.copy();q=rig.pose.bones['pepper%d'%j].matrix.translation+Vector((sgn*.13,-.12,-.12))
   weight=min(1,max(0,(f-20)/20),max(0,(211-f)/10))
   m=orig.copy();m.translation=orig.translation.lerp(q,weight);hand.matrix=m;hand.keyframe_insert('location',frame=f)
 finish(a,211)
 a=action('Count',301)
 for f,z in [(1,0),(25,-.30),(260,-.30),(290,0),(301,0)]:key('body',f,(0,0,z))
 for tag in ('L','R'):
  for f,rx,dy in [(1,0,0),(25,-.65,-.18),(260,-.65,-.18),(290,0,0),(301,0,0)]:key('leg'+tag,f,(0,dy,0),(rx,0,0))
 for j,p in enumerate(pepperpos):
  q=Vector(((j-(n-1)/2)*.40,-1.0,.27));start=30+j*9;end=85+j*9
  # body is sitting .30 lower; compensate to keep placed peppers on ground.
  for f,v in [(1,Vector((0,0,0))),(start,Vector((0,0,0))),(start+16,Vector(((-1 if j%2==0 else 1)*1.08,.0,1.4))-p),(end,q-p+Vector((0,0,.3))),(218,q-p+Vector((0,0,.3))),(244,Vector(((-1 if j%2==0 else 1)*1.08,0,1.4))-p),(260,Vector((0,0,0))),(301,Vector((0,0,0)))]:key('pepper%d'%j,f,v)
  for f,r in [(1,0),(start,0),(end,pi/2),(218,pi/2),(260,0),(301,0)]:key('pepper%d'%j,f,rot=(r,0,0))
 for j in range(n):
  f=135+j*13;x=(j-(n-1)/2)*.40
  key('head',f,rot=(.28,0,-x*.28));key('wingR',f,rot=(.7,0,-.65));key('handR',f,(x-.45,-.30,-.28));key('handR',f+6,(x-.45,-.27,-.21))
 for f in [1,30,260,301]:key('head',f,rot=(0,0,0));key('wingR',f,rot=(0,0,0));key('handR',f,(0,0,0))
 for tag,sgn in [('L',-1),('R',1)]:
  for f,rx in [(1,0),(35,-.5),(70,.6),(118,.55),(125,0),(218,.6),(244,-.5),(260,0),(301,0)]:key('wing'+tag,f,rot=(rx,0,sgn*.12 if rx else 0))
 # Hand contact during placing and retrieving, baked in armature space.
 for f in list(range(30,128))+list(range(218,261)):
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
  for tag,sgn in [('L',-1),('R',1)]:
   eligible=[j for j in range(n) if (-1 if j%2==0 else 1)==sgn]
   if not eligible:continue
   j=min(eligible,key=lambda j:abs(f-(58+j*9))) if f<128 else eligible[0]
   start=30+j*9;end=85+j*9
   if f<128:weight=min(1,max(0,(f-start)/14),max(0,(end+8-f)/8))
   else:weight=min(1,(f-218)/8,(260-f)/8)
   if weight<=0:continue
   hand=rig.pose.bones['hand'+tag];m=hand.matrix.copy();q=rig.pose.bones['pepper%d'%j].matrix.translation+Vector((sgn*.12,-.08,.04))
   m.translation=m.translation.lerp(q,weight);hand.matrix=m;hand.keyframe_insert('location',frame=f)
 finish(a,301)
 a=action('React',91)
 for f,z in [(1,0),(16,-.08),(27,.3),(40,0),(49,-.04),(60,0),(91,0)]:key('body',f,(0,0,z))
 for tag,s in [('L',-1),('R',1)]:
  for f,r in [(1,0),(22,s*.9),(40,s*.6),(63,0),(91,0)]:key('wing'+tag,f,rot=(0,r,0))
 for f,r in [(1,0),(22,-.15),(40,.1),(60,0),(91,0)]:key('head',f,rot=(r,0,0));key('jaw',f,rot=(-r,0,0))
 finish(a,91)
 # Rebuild all limb motion using two-bone IK. No animated hand/leg translation.
 # Shoulder and hip bones are anchored to body; only rotation changes limb pose.
 def solve_chain(upper,lower,end,target,bend):
  body=rig.pose.bones['body'];base=Vector(bones['body'][0]);S=Vector(bones[upper][0])-base;E=Vector(bones[lower][0])-base;H=Vector(bones[end][0])-base
  v1=E-S;v2=H-E;l1=v1.length;l2=v2.length
  local=body.matrix.inverted()@target;delta=local-S;d=max(.025,min(delta.length,l1+l2-.008));direction=delta.normalized()
  bend=Vector(bend);bend=(bend-direction*bend.dot(direction)).normalized()
  along=(l1*l1-l2*l2+d*d)/(2*d);height=math.sqrt(max(0,l1*l1-along*along));elbow=S+direction*along+bend*height;tip=S+direction*d
  q1=v1.rotation_difference(elbow-S);q2=q1.inverted()@v2.rotation_difference(tip-elbow)
  for name,q in [(upper,q1),(lower,q2)]:
   pb=rig.pose.bones[name];pb.rotation_mode='QUATERNION';pb.rotation_quaternion=q;pb.location=(0,0,0);pb.scale=(1,1,1)
   pb.keyframe_insert('rotation_quaternion',frame=f);pb.keyframe_insert('location',frame=f);pb.keyframe_insert('scale',frame=f)
  pb=rig.pose.bones[end];pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
  if end.startswith('foot'):pb.rotation_quaternion=(body.matrix.to_quaternion()@q1@q2).inverted()
  pb.keyframe_insert('rotation_quaternion',frame=f);pb.keyframe_insert('location',frame=f);pb.keyframe_insert('scale',frame=f)
  bpy.context.view_layer.update()
  return body.matrix@tip
 for clip in clips:
  act=bpy.data.actions[clip['name']];rig.animation_data.action=act
  for f in range(1,clip['frames']+1):
   bpy.context.scene.frame_set(f)
   if clip['name']=='Count':
    w=min(1,max(0,(f-1)/24),max(0,(291-f)/31));pb=rig.pose.bones['body'];pb.scale=(1,1,1-.20*w);pb.rotation_euler=(.28*w,0,0);pb.keyframe_insert('scale',frame=f);pb.keyframe_insert('rotation_euler',frame=f)
   bpy.context.view_layer.update();bm=rig.pose.bones['body'].matrix.copy();base=Vector(bones['body'][0])
   for tag,sgn in [('L',-1),('R',1)]:
    rest=bm@(Vector(bones['hand'+tag][0])-base);goal=rest.copy();weight=0;chosen=None
    if clip['name']=='Eat':
     ids=[j for j in range(take) if (-1 if pepperpos[j].x<0 else 1)==sgn]
     if ids:
      chosen=ids[0];weight=min(1,max(0,(f-20)/20),max(0,(211-f)/10));goal=rig.pose.bones['pepper%d'%chosen].matrix.translation+Vector((sgn*.12,.16,-.20))
    elif clip['name']=='Count':
     ids=[j for j in range(n) if (-1 if j%2==0 else 1)==sgn]
     if ids and (30<=f<=127 or 218<=f<=260):
      chosen=min(ids,key=lambda j:abs(f-(58+j*9))) if f<128 else ids[0];start=30+chosen*9;end=85+chosen*9
      weight=min(1,max(0,(f-start)/14),max(0,(end+8-f)/8)) if f<128 else min(1,(f-218)/8,(260-f)/8)
      goal=rig.pose.bones['pepper%d'%chosen].matrix.translation+Vector((sgn*.12,.12,.04))
     elif 132<=f<=207 and tag=='R':
      chosen=min(n-1,max(0,int((f-132)/13)));weight=min(1,(f-132)/7,(207-f)/7);goal=rig.pose.bones['pepper%d'%chosen].matrix.translation+Vector((0,.10,.18))
    elif clip['name']=='React':
     weight=max(0,sin(min(1,(f-1)/65)*pi));goal=rest+Vector((sgn*.25,-.05,.27))
    elif clip['name']=='Walk':weight=1;goal=rest+Vector((0,.07*sin((f-1)/60*4*pi+sgn*pi/2),.015))
    solved=solve_chain('wing'+tag,'forearm'+tag,'hand'+tag,rest.lerp(goal,max(0,weight)),(sgn,0,-.15))
    # Fruit follows the grasp when the target is outside the short wing reach.
    if clip['name']=='Eat' and chosen is not None and weight>=.999:
     pb=rig.pose.bones['pepper%d'%chosen];m=pb.matrix.copy();m.translation+=solved-goal;pb.matrix=m;pb.keyframe_insert('location',frame=f)
    foot=Vector(bones['foot'+tag][0])
    if clip['name']=='Walk':
     phase=(f-1)/60*4*pi+(pi if sgn<0 else 0);foot.y+=.11*sin(phase);foot.z+=.08*max(0,sin(phase))
    elif clip['name']=='React':foot.z+=max(0,rig.pose.bones['body'].location.z)
    elif clip['name']=='Count':foot.y-=.12*min(1,max(0,(f-1)/24),max(0,(291-f)/31))
    solve_chain('leg'+tag,'shin'+tag,'foot'+tag,foot,(0,-1,.15))
  rig.animation_data.action=None
 reset();scene=bpy.context.scene;scene.render.fps=30;scene.frame_set(1)
 # Export animation NLA tracks as separate named clips. Muted state restored afterward.
 for tr in rig.animation_data.nla_tracks:tr.mute=False
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 glb=os.path.join(OUT,'stage-%d.glb'%stage)
 bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_anim_slide_to_zero=True)
 for tr in rig.animation_data.nla_tracks:tr.mute=True
 reset();scene.frame_set(1)
 # Neutral studio lights are saved only in blend, not exported into the game asset.
 world=bpy.data.worlds.new('Warm studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.12,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
 def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for name,p,power,size in [('Key',(-3,-4,6),650,4),('Fill',(4,-2,4),450,3),('Rim',(2,3,5),900,3)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1.5))
 bpy.ops.object.camera_add(location=(4,-7,3.6));cam=bpy.context.object;aim(cam,(0,0,1.55));cam.data.type='ORTHO';cam.data.ortho_scale=4.1;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'pepper-chick-stage-%d.png'%stage)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'pepper-chick-stage-%d.blend'%stage))
 bpy.ops.render.render(write_still=True)
 if stage==3:
  for clipname,frame in [('Eat',104),('Count',168),('React',27)]:
   rig.animation_data.action=bpy.data.actions[clipname];scene.frame_set(frame);scene.render.filepath=os.path.join(OUT,'pose-'+clipname.lower()+'.png');bpy.ops.render.render(write_still=True)
  rig.animation_data.action=None;reset();scene.frame_set(1)
 allmeta.append({'stage':stage,'pepperCount':n,'eatSimultaneousCount':take,'bones':list(bones),'boneCount':len(bones),'meshVertices':len(mesh.data.vertices),'meshPolygons':len(mesh.data.polygons),'blenderBounds':[list(mesh.matrix_world @ Vector(mesh.bound_box[0])),list(mesh.matrix_world @ Vector(mesh.bound_box[6]))],'clips':clips,'glbBytes':os.path.getsize(glb)})
 with open(os.path.join(OUT,'model-meta.json'),'w',encoding='utf-8') as f:json.dump({'name':'剝皮辣椒雞','units':'meters (stylized scale)','blenderForward':'-Y','glbForward':'+Z','glbUp':'+Y','fps':30,'stages':allmeta,'notes':['Independent authored assets; no original-games integration.','Continuous pepper bone trajectories; reusable looping Eat returns intact stylized peppers to pack.','Count sits, places all peppers in a row, points across them, and returns peppers to pack.','Segment-weighted articulated rig: editable body/head/crest/jaw/eyes/wings/hands/legs/feet/tail/peppers.']},f,ensure_ascii=False,indent=2)
 print('COMPLETED_STAGE',stage,flush=True)

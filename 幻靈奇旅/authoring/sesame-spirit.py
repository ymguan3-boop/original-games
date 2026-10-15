import bpy, math, json, os, random, struct
import numpy as np
from mathutils import Vector, Quaternion, Matrix
from math import sin,cos,pi
from pathlib import Path
OUT=str(Path(__file__).resolve().parents[3]/'artifacts'/'sesame-spirit')
os.makedirs(OUT,exist_ok=True)

def felt_normal():
 rng=np.random.default_rng(73);a=rng.random((512,512)).astype(np.float32)
 dx=(np.roll(a,1,1)-np.roll(a,-1,1))*.44;dy=(np.roll(a,1,0)-np.roll(a,-1,0))*.44
 data=np.ones((512,512,4),np.float32);data[:,:,0]=.5+dx;data[:,:,1]=.5+dy;data[:,:,2]=np.sqrt(np.maximum(.1,1-dx*dx-dy*dy))
 im=bpy.data.images.new('Packed_Felt_Fibre_Normal',512,512);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(data.ravel());im.filepath_raw=os.path.join(OUT,'felt-normal.png');im.file_format='PNG';im.save();im.pack();return im
def mat(name,c,rough=.85,felt=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough
 if felt:
  p.inputs['Sheen Weight'].default_value=.25;t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=fibre;n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.52;m.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);m.node_tree.links.new(n.outputs['Normal'],p.inputs['Normal'])
 return m
def bind(o,bone):
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');md=o.modifiers.new('Sesame articulated skeleton','ARMATURE');md.object=rig;o.parent=rig;parts.append(o);o.select_set(False);return o
def uv(name,loc,scale,m,bone='body',segments=20,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return bind(o,bone)
def meshpart(name,verts,faces,m,bone='body'):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(m)
 layer=me.uv_layers.new()
 for face in me.polygons:
  face.use_smooth=True
  for li in face.loop_indices:
   p=me.vertices[me.loops[li].vertex_index].co;layer.data[li].uv=((p.x*1.31+p.y*.73)%1,(p.z*1.37+p.y*.41)%1)
 return bind(o,bone)
def tube(name,pts,rs,m,bone='body',sides=7):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  tangent=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized();u=tangent.cross(Vector((0,1,0)))
  if u.length<.01:u=tangent.cross(Vector((1,0,0)))
  u.normalize();v=tangent.cross(u).normalized()
  for j in range(sides):vs.append(Vector(p)+rs[i]*(u*cos(j*2*pi/sides)+v*sin(j*2*pi/sides)))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 fs.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);return meshpart(name,vs,fs,m,bone)
def curl(name,center,u,v,r,m,bone='body',thick=.045,turns=1.10):
 pts=[];rs=[]
 for j in range(23):
  t=j/22;a=t*2*pi*turns;rr=r*(1-.83*t);pts.append(Vector(center)+Vector(u)*(rr*cos(a))+Vector(v)*(rr*sin(a)));rs.append(thick*(1-.77*t)+.006)
 return tube(name,pts,rs,m,bone)
def lathe(name,profile,m,bone='hat',sy=.82):
 vs=[];fs=[];N=64
 for r,z in profile:
  for j in range(N):a=j*2*pi/N;vs.append((r*cos(a),sy*r*sin(a),z))
 for i in range(len(profile)-1):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 return meshpart(name,vs,fs,m,bone)
def star(name,x,y,z,r,m,bone='hat'):
 vs=[(x,y-.018,z)]+[(x+r*(1 if j%2==0 else .35)*sin(j*pi/4),y,z+r*(1 if j%2==0 else .35)*cos(j*pi/4)) for j in range(8)];fs=[(0,1+j,1+(j+1)%8) for j in range(8)];return meshpart(name,vs,fs,m,bone)
def interp(path,t):
 for i in range(len(path)-1):
  a,v=path[i];b,w=path[i+1]
  if a<=t<=b:q=(t-a)/(b-a);q=q*q*(3-2*q);return np.asarray(v)*(1-q)+np.asarray(w)*q
 return np.asarray(path[-1][1])
def solve(upper,lower,end,goal,bend,f):
 bm=rig.pose.bones['body'].matrix;base=Vector(bones['body'][0]);S=Vector(bones[upper][0])-base;E=Vector(bones[lower][0])-base;H=Vector(bones[end][0])-base;v1=E-S;v2=H-E;l1=v1.length;l2=v2.length;delta=bm.inverted()@goal-S;d=max(.02,min(delta.length,l1+l2-.002));di=delta.normalized();be=Vector(bend);be=(be-di*be.dot(di)).normalized();along=(l1*l1-l2*l2+d*d)/(2*d);el=S+di*along+be*math.sqrt(max(0,l1*l1-along*along));tip=S+di*d;q1=v1.rotation_difference(el-S);q2=q1.inverted()@v2.rotation_difference(tip-el)
 for name,q in [(upper,q1),(lower,q2),(end,(bm.to_quaternion()@q1@q2).inverted() if end.startswith('foot') else Quaternion())]:
  p=rig.pose.bones[name];p.rotation_quaternion=q;p.keyframe_insert('rotation_quaternion',frame=f)
 bpy.context.view_layer.update();return (bm@tip-goal).length
def reset():
 for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=Quaternion();p.scale=(1,1,1)

allmeta=[]
for stage in (1,2,3):
 random.seed(48+stage);bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 fibre=felt_normal();parts=[];clips=[]
 bodycolor=[(.125,.010,.23),(.17,.025,.25),(.25,.055,.36)][stage-1];hatcolor=[(.75,.63,.43),(.035,.42,.31),(.80,.16,.075)][stage-1]
 purple=mat('Felt body',bodycolor,felt=True);highlight=mat('Lighter wool curls',tuple(min(1,x*1.19+.018) for x in bodycolor),felt=True);shadow=mat('Deeper wool',tuple(x*.85 for x in bodycolor),felt=True);hatmat=mat(['Cream bucket hat','Lake teal bucket hat','Coral orange bucket hat'][stage-1],hatcolor,felt=True);ink=mat('Embroidered aubergine',(.115,.025,.20),felt=True);cream=mat('Ivory embroidery',(.96,.83,.56),felt=True);black=mat('Black bean eyes',(.008,.004,.009),.57);pink=mat('Pink tongue',(.96,.16,.28),.62)
 bones={'root':((0,0,0),None),'body':((0,0,1.1),'root'),'hat':((0,0,1.88),'body')}
 for s,tag in [(-1,'L'),(1,'R')]:
  bones['arm'+tag]=((s*.58,0,1.32),'body');bones['forearm'+tag]=((s*.80,.02,.98),'arm'+tag);bones['hand'+tag]=((s*.78,-.02,.60),'forearm'+tag)
  bones['thigh'+tag]=((s*.27,0,.50),'body');bones['shin'+tag]=((s*.27,-.08,.29),'thigh'+tag);bones['foot'+tag]=((s*.27,0,.095),'shin'+tag);bones['eye'+tag]=((s*.24,-.583,1.45),'body')
 arm=bpy.data.armatures.new('SesameSkeleton');rig=bpy.data.objects.new('SesameSpiritStage%d'%stage,arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for n,(p,par) in bones.items():
  b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.1,0))
  if par:b.parent=arm.edit_bones[par]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 for p in rig.pose.bones:p.rotation_mode='QUATERNION'
 uv('Complete round wool body including scalp',(0,0,1.13),(.68,.54,.76),purple,segments=40,rings=28)
 # Tangible spiral locks are larger and more numerous at later stages.
 count=[66,100,132][stage-1]
 for k in range(count):
  z=1-2*(k+.5)/count;a=k*pi*(3-math.sqrt(5));rr=math.sqrt(1-z*z);n=Vector((rr*cos(a),rr*sin(a),z));p=Vector((n.x*.685,n.y*.545,1.13+n.z*.765))
  if n.y<-.55 and abs(p.x)<.43 and 1.00<p.z<1.73:continue
  u=n.cross(Vector((0,0,1))).normalized();v=n.cross(u).normalized();curl('Sculpted spiral fleece %02d'%k,p,u,v,[.075,.105,.135][stage-1],highlight if k%3 else purple,thick=[.028,.039,.046][stage-1],turns=[.78,1.03,1.20][stage-1])
 # Tiny real fibre loops supplement the packed glTF normal texture.
 for k in range(300):
  z=random.uniform(-1,1);a=random.uniform(0,2*pi);rr=math.sqrt(1-z*z);n=Vector((rr*cos(a),rr*sin(a),z));p=Vector((n.x*.705,n.y*.563,1.13+n.z*.775))
  if n.y<-.55 and abs(p.x)<.43 and 1.00<p.z<1.73:continue
  u=n.cross(Vector((0,0,1))).normalized();tube('Fine wool fibre', [p,p+n*.018+u*.012,p+n*.023+u*.025,p+n*.010+u*.031],[.0018]*4,purple,sides=4)
 for s,tag in [(-1,'L'),(1,'R')]:
  uv('Black bean eye '+tag,(s*.245,-.541,1.46),(.067,.035,.082),black,'eye'+tag,segments=24,rings=16)
  for upper,lower,end,rad in [('arm','forearm','hand',.105),('thigh','shin','foot',.09)]:
   S=Vector(bones[upper+tag][0]);E=Vector(bones[lower+tag][0]);H=Vector(bones[end+tag][0]);tube('Connected upper '+upper+tag,[S,E],[rad,rad*.9],purple,upper+tag,sides=12);uv('Soft joint '+lower+tag,E,(rad,rad,rad),purple,lower+tag,segments=12,rings=8);tube('Connected lower '+lower+tag,[E,H],[rad*.9,rad],purple,lower+tag,sides=12)
  uv('Mitten '+tag,bones['hand'+tag][0],(.125,.11,.145),highlight,'hand'+tag,segments=16,rings=10);uv('Rounded foot '+tag,(s*.27,-.07,.09),(.13,.185,.095),purple,'foot'+tag,segments=16,rings=10)
 # Smile surface is a curved inset-like bowl with a flat smiling upper edge.
 vs=[(0,-.573,1.18)];edge=[]
 for k in range(25):
  a=k*pi/24;x=.225*cos(a);z=1.30-.205*sin(a);edge.append((x,-.563+.06*(x/.225)**2,z))
 edge += [(-.225+.45*k/12,-.565+.055*((-.225+.45*k/12)/.225)**2,1.30-.020*sin(k*pi/12)) for k in range(1,12)]
 vs+=edge;meshpart('Open happy smile',vs,[(0,1+i,1+(i+1)%len(edge)) for i in range(len(edge))],black);uv('Pink smiling tongue',(0,-.595,1.145),(.12,.025,.055),pink,segments=24,rings=12)
 # Bucket hat is hollow, with rounded fabric brim and a closed crown.
 lathe('Bucket hat tailored hollow crown',[(.70,1.88),(.69,2.00),(.62,2.29),(.56,2.36),(.42,2.39),(.01,2.40),(.01,2.36),(.41,2.35),(.54,2.32),(.58,2.26),(.65,1.99),(.66,1.88)],hatmat)
 lathe('Padded soft circular hat brim',[(.66,1.91),(.78,1.89),(.91,1.84),(.94,1.80),(.93,1.77),(.89,1.77),(.77,1.82),(.66,1.85),(.66,1.91)],hatmat)
 lathe('Embroidered hat band',[(.698,1.94),(.681,2.02),(.664,2.09)],ink if stage>1 else cream)
 for j in range(12):
  a=j*2*pi/12;p=Vector((.685*sin(a),-.562*cos(a),2.018));u=Vector((cos(a),.82*sin(a),0));curl('Hat band scrolling embroidery',p,u,(0,0,1),.066,ink if stage==1 else cream,'hat',.010,1.05)
 # Front eye applique and lash stitching.
 for sign in (-1,1):
  pts=[(-.17+.34*k/16,-.550,2.224+sign*.066*sin(k*pi/16)) for k in range(17)];tube('All seeing embroidered eye',pts,[.012]*17,ink,'hat',sides=8)
 uv('Hat eye pupil',(0,-.560,2.225),(.044,.018,.044),ink,'hat',segments=16,rings=10)
 for x in (-.11,0,.11):tube('Eye eyelash',[(x,-.51,2.286),(x*1.16,-.505,2.326)],[.010,.009],ink,'hat')
 for s in (-1,1):
  # Crescent is a filled tapered arc, not a circular button.
  pts=[];rs=[]
  for k in range(19):t=k/18;a=-pi*.68+pi*1.36*t;pts.append((s*.34+s*.074*cos(a),-.455,2.23+.083*sin(a)));rs.append(.003+.021*sin(pi*t))
  tube('Embroidered crescent',pts,rs,ink,'hat',sides=8)
 if stage>=2:
  star('Central ivory band star',0,-.579,2.022,.068,cream)
  for s in (-1,1):
   uv('Round star badge',(s*.63,-.30,1.995),(.09,.035,.10),cream,'hat',segments=20,rings=12);star('Badge dark star',s*.63,-.34,1.995,.066,ink)
   for j in range(stage+1):curl('Hat side plume',(s*(.62+.055*j),.05,2.02+j*.105),(s,0,0),(0,0,1),.10+.012*j,highlight,'hat',.032+.007*stage,1.05)
 if stage==3:
  star('Crown star',0,-.48,2.355,.052,ink)
  for s in (-1,1):
   for j in range(3):uv('Crown embroidered dot',(s*(.18+.07*j),-.49+.03*j,2.32-j*.033),(.014,.012,.014),ink,'hat',segments=10,rings=6)
 # Join pieces: one skinned mesh, shared packed materials and 15 bones.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='SesameStage%d_SkinnedMesh'%stage
 for md in list(mesh.modifiers)[1:]:mesh.modifiers.remove(md)
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();contacterr=0
 for name,end in [('Idle',121),('Walk',61),('Hop',91),('InspectHat',241),('React',91)]:
  reset();act=bpy.data.actions.new(name);rig.animation_data.action=act
  for f in range(1,end+1):
   scene.frame_set(f);reset();t=(f-1)/(end-1);body=rig.pose.bones['body'];hat=rig.pose.bones['hat'];dz=0;tilt=0;grasp=0
   if name=='Idle':dz=.013*sin(t*2*pi);tilt=.015*sin(t*2*pi)
   if name=='Walk':dz=.025*(1-cos(t*8*pi));tilt=.035*sin(t*4*pi)
   if name=='Hop':dz=float(interp([(0,[0]),(.20,[-.15]),(.31,[-.15]),(.45,[.48]),(.58,[.48]),(.74,[0]),(.81,[-.12]),(.94,[0]),(1,[0])],t)[0])
   if name=='React':dz=.045*sin(t*2*pi);tilt=.12*sin(t*4*pi)*sin(t*pi)
   body.location.z=dz;body.rotation_quaternion=Quaternion((0,0,1),tilt)
   if name=='InspectHat':
    tr=interp([(0,[0,0,0]),(.15,[0,0,0]),(.27,[0,0,.17]),(.43,[0,-.58,-.16]),(.64,[0,-.58,-.16]),(.79,[0,0,.17]),(.88,[0,0,0]),(1,[0,0,0])],t);hat.location=tr
    rx=float(interp([(0,[0]),(.27,[0]),(.43,[1.30]),(.64,[1.30]),(.79,[0]),(1,[0])],t)[0]);rz=.10*sin((t-.43)/.21*2*pi) if .43<t<.64 else 0;hat.rotation_quaternion=Quaternion((0,0,1),rz)@Quaternion((1,0,0),rx)
    grasp=min(1,max(0,t/.15),max(0,(1-t)/.12))
   for p in (body,hat):p.keyframe_insert('location',frame=f);p.keyframe_insert('rotation_quaternion',frame=f)
   bpy.context.view_layer.update();bm=body.matrix.copy();base=Vector(bones['body'][0])
   for s,tag in [(-1,'L'),(1,'R')]:
    # Default hands hang alongside the hips; IK keeps both limb segments joined.
    rest=bm@(Vector((s*.78,.015,.58))-base);goal=rest.copy()
    if name=='InspectHat':goal=rest.lerp(hat.matrix@Vector((s*.81,0,-.035)),grasp)
    if name=='Walk':goal+=Vector((0,s*.095*sin(t*4*pi),.015*(1-cos(t*8*pi))))
    if name=='React':goal+=Vector((s*.06,-.10*sin(t*pi),.80*sin(t*pi)))
    if name=='Hop':goal+=Vector((0,-.07*max(0,dz)/.48,.09*max(0,dz)/.48))
    err=solve('arm'+tag,'forearm'+tag,'hand'+tag,goal,(s,.3,-.12),f)
    if name=='InspectHat' and grasp>.999:contacterr=max(contacterr,err)
    foot=Vector(bones['foot'+tag][0])
    if name=='Walk':phase=t*4*pi+(pi if s<0 else 0);foot.y+=.115*sin(phase);foot.z+=.07*max(0,sin(phase))
    if name in ('Hop','React'):foot.z+=max(0,dz)
    solve('thigh'+tag,'shin'+tag,'foot'+tag,foot,(0,-1,0),f)
    eye=rig.pose.bones['eye'+tag];blink=max(0,1-abs(t-.42)/.025) if name=='Idle' else 0;eye.scale.z=1-.86*blink;eye.keyframe_insert('scale',frame=f)
   # Explicit complete neutral endpoints keep all clips seamlessly loopable.
  tr=rig.animation_data.nla_tracks.new();tr.name=name;strip=tr.strips.new(name,1,act);strip.action_frame_start=1;strip.action_frame_end=end;rig.animation_data.action=None;tr.mute=True;clips.append({'name':name,'duration':(end-1)/30,'frames':end})
 reset();scene.frame_set(1)
 for tr in rig.animation_data.nla_tracks:tr.mute=False
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,'stage-%d.glb'%stage);bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_anim_slide_to_zero=True)
 for tr in rig.animation_data.nla_tracks:tr.mute=True
 reset();scene.frame_set(1)
 world=bpy.data.worlds.new('Soft neutral wool studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.18,.23,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
 def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for n,p,power,size in [('Key',(-3,-4,5),550,4),('Fill',(3,-2,3),300,3),('Rim',(1,3,4),650,3)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.size=size;aim(o,(0,0,1.3))
 bpy.ops.object.camera_add(location=(3.0,-7,3.2));cam=bpy.context.object;aim(cam,(0,-.05,1.2));cam.data.type='ORTHO';cam.data.ortho_scale=3.1;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=850;scene.render.resolution_y=950;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'preview-stage-%d.png'%stage)
 rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(1)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'stage-%d.blend'%stage));bpy.ops.render.render(write_still=True)
 if stage==3:
  for clip,frame in [('InspectHat',121),('Hop',46)]:
   rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);scene.render.filepath=os.path.join(OUT,'pose-'+clip.lower()+'.png');bpy.ops.render.render(write_still=True)
  rig.animation_data.action=None;reset();scene.frame_set(1)
 with open(path,'rb') as fp:
  data=fp.read();sz=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+sz])
 triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
 allmeta.append({'stage':stage,'name':['小芝麻','絨芝麻','星冠芝麻'][stage-1],'hatColor':['奶油白','湖水綠','珊瑚橘'][stage-1],'bodyColor':['紫羅蘭','暖葡萄紫','淡薰衣紫'][stage-1],'triangles':triangles,'bones':len(bones),'clips':clips,'exportedAnimations':[a['name'] for a in gltf.get('animations',[])],'glbBytes':len(data),'maxHatGripTargetError':contacterr,'textureImages':len(gltf.get('images',[]))})
 with open(os.path.join(OUT,'model-meta.json'),'w',encoding='utf-8') as fp:json.dump({'name':'芝麻幻靈','glbForward':'+Z','glbUp':'+Y','fps':30,'heightUnits':2.4,'stages':allmeta,'notes':['Closed wool scalp remains complete when hat is removed.','Two-bone analytic IK preserves shoulder/elbow/hand and hip/knee/foot attachment.','Hat is independently rigged; hands track brim through lifting, forward tilting, examination, and return.','Packed glTF normal texture plus real wool tufts, spiral locks and micro fibres.']},fp,ensure_ascii=False,indent=2)
 print('COMPLETED_STAGE',stage,'TRIANGLES',triangles,'HAT_CONTACT_ERROR',contacterr,flush=True)
